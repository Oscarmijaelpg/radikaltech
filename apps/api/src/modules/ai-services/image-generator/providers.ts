import { env } from '../../../config/env.js';
import {
  LLM_MODELS,
  PROVIDER_URLS,
  geminiGenerateContentUrl,
} from '../../../config/providers.js';
import { logger } from '../../../lib/logger.js';
import type { ImageSize, ImageStyle } from './types.js';

const IMAGE_REF_TIMEOUT_MS = 20_000;
const GEMINI_TIMEOUT_MS = 60_000;
const DALLE_TIMEOUT_MS = 60_000;
const IMAGE_DOWNLOAD_TIMEOUT_MS = 30_000;

export type ProviderResult = { buffer?: Buffer; error?: string };

export async function downloadAsBase64(
  url: string,
): Promise<{ base64: string; mimeType: string } | undefined> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(IMAGE_REF_TIMEOUT_MS) });
    if (!r.ok) {
      logger.warn({ url, status: r.status }, 'asset download failed');
      return undefined;
    }
    const ct = r.headers.get('content-type') ?? 'image/png';
    const buf = Buffer.from(await r.arrayBuffer());
    return { base64: buf.toString('base64'), mimeType: ct.split(';')[0]?.trim() || 'image/png' };
  } catch (err) {
    logger.warn({ err, url }, 'ref image download exception');
    return undefined;
  }
}

async function tryGeminiDirectModel(
  model: string,
  prompt: string,
  refs: Array<{ base64: string; mimeType: string }>,
): Promise<ProviderResult> {
  if (!env.GEMINI_API_KEY) return { error: 'GEMINI_API_KEY missing' };
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  for (const r of refs) {
    parts.push({ inline_data: { mime_type: r.mimeType, data: r.base64 } });
  }
  const body = {
    contents: [{ parts }],
    generationConfig: { responseModalities: ['IMAGE'] },
  };
  try {
    const res = await fetch(geminiGenerateContentUrl(model, env.GEMINI_API_KEY), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      logger.warn(
        { model, status: res.status, body: txt.slice(0, 200) },
        'gemini direct image model failed',
      );
      return { error: `gemini direct ${res.status}` };
    }
    const json = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inline_data?: { mime_type?: string; data?: string };
            inlineData?: { mimeType?: string; data?: string };
          }>;
        };
      }>;
    };
    const candidateParts = json.candidates?.[0]?.content?.parts ?? [];
    for (const p of candidateParts) {
      const data = p.inline_data?.data ?? p.inlineData?.data;
      if (data) {
        logger.info({ model }, 'gemini direct image generated');
        return { buffer: Buffer.from(data, 'base64') };
      }
    }
    return { error: 'gemini direct returned no image part' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err, model }, 'gemini direct exception');
    return { error: msg };
  }
}

/**
 * Ruta alternativa por OpenRouter (formato OpenAI-compat). Modelos de Gemini
 * 3.1 Flash Image Preview no siempre exponen el payload igual: pueden devolver
 * la imagen en (a) parts tipo image_url base64, (b) reasoning_details, o
 * (c) un content string con data URI. Probamos las tres.
 */
async function tryGeminiOpenRouterModel(
  model: string,
  prompt: string,
  refs: Array<{ base64: string; mimeType: string }>,
): Promise<ProviderResult> {
  if (!env.OPENROUTER_API_KEY) return { error: 'OPENROUTER_API_KEY missing' };
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        ...refs.map((r) => ({
          type: 'image_url',
          image_url: { url: `data:${r.mimeType};base64,${r.base64}` },
        })),
      ],
    },
  ];
  try {
    const res = await fetch(PROVIDER_URLS.openrouter.chatCompletions, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': env.WEB_URL,
        'X-Title': 'Radikal',
      },
      body: JSON.stringify({
        model,
        messages,
        modalities: ['image', 'text'],
      }),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      logger.warn(
        { model, status: res.status, body: txt.slice(0, 200) },
        'openrouter gemini failed',
      );
      return { error: `openrouter gemini ${res.status}` };
    }
    const json = (await res.json()) as {
      choices?: Array<{
        message?: {
          content?: unknown;
        };
        reasoning_details?: unknown;
      }>;
    };
    const choice = json.choices?.[0];
    const content = choice?.message?.content;

    if (Array.isArray(content)) {
      for (const part of content as Array<{ type?: string; image_url?: { url?: string } }>) {
        const url = part?.image_url?.url;
        if (part?.type === 'image_url' && url && url.includes('base64,')) {
          const b64 = url.split('base64,')[1];
          if (b64) {
            logger.info({ model }, 'openrouter gemini image generated (content array)');
            return { buffer: Buffer.from(b64, 'base64') };
          }
        }
      }
    }

    const details = choice?.reasoning_details;
    const detailArr: unknown[] = Array.isArray(details) ? details : details ? [details] : [];
    for (const d of detailArr as Array<{ data?: unknown }>) {
      if (typeof d?.data === 'string' && d.data.length > 100) {
        logger.info({ model }, 'openrouter gemini image generated (reasoning_details)');
        return { buffer: Buffer.from(d.data, 'base64') };
      }
    }

    if (typeof content === 'string' && content.includes('data:image')) {
      const afterMarker = content.split('base64,')[1];
      const b64 = afterMarker?.split(/["')\s]/)[0];
      if (b64) {
        logger.info({ model }, 'openrouter gemini image generated (data URI)');
        return { buffer: Buffer.from(b64, 'base64') };
      }
    }

    return { error: 'openrouter gemini returned no image payload' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err, model }, 'openrouter gemini exception');
    return { error: msg };
  }
}

export async function generateWithGemini(
  prompt: string,
  refs: Array<{ base64: string; mimeType: string }>,
): Promise<ProviderResult> {
  let lastError = 'no provider configured';
  for (const m of LLM_MODELS.image.geminiCandidates) {
    const direct = await tryGeminiDirectModel(m, prompt, refs);
    if (direct.buffer) return direct;
    if (direct.error) lastError = direct.error;

    const viaRouter = await tryGeminiOpenRouterModel(m, prompt, refs);
    if (viaRouter.buffer) return viaRouter;
    if (viaRouter.error) lastError = viaRouter.error;
  }
  return { error: `all gemini candidates failed (last: ${lastError})` };
}

export async function generateWithDalle(
  prompt: string,
  size: ImageSize,
  style: ImageStyle,
): Promise<ProviderResult> {
  const payload = {
    model: LLM_MODELS.image.dalle3,
    prompt,
    n: 1,
    size,
    style,
    quality: 'standard',
    response_format: 'url' as const,
  };

  let imageUrl: string | undefined;
  let lastError = 'no provider configured';

  if (env.OPENROUTER_API_KEY) {
    try {
      const res = await fetch(PROVIDER_URLS.openrouter.imageGenerations, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': env.WEB_URL,
          'X-Title': 'Radikal',
        },
        body: JSON.stringify({ ...payload, model: `openai/${LLM_MODELS.image.dalle3}` }),
        signal: AbortSignal.timeout(DALLE_TIMEOUT_MS),
      });
      if (res.ok) {
        const body = (await res.json()) as { data?: Array<{ url?: string; b64_json?: string }> };
        imageUrl = body.data?.[0]?.url;
        const b64 = body.data?.[0]?.b64_json;
        if (!imageUrl && b64) return { buffer: Buffer.from(b64, 'base64') };
      } else {
        lastError = `openrouter ${res.status}`;
        logger.warn({ status: res.status }, 'openrouter images not ok, trying openai');
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      logger.warn({ err }, 'openrouter images failed');
    }
  }

  if (!imageUrl && env.OPENAI_API_KEY) {
    try {
      const res = await fetch(PROVIDER_URLS.openai.imageGenerations, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(DALLE_TIMEOUT_MS),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        return { error: `openai images ${res.status}: ${txt.slice(0, 200)}` };
      }
      const body = (await res.json()) as { data?: Array<{ url?: string }> };
      imageUrl = body.data?.[0]?.url;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  if (!imageUrl) return { error: lastError };
  try {
    const imgRes = await fetch(imageUrl, {
      signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS),
    });
    if (!imgRes.ok) return { error: `image download ${imgRes.status}` };
    return { buffer: Buffer.from(await imgRes.arrayBuffer()) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
