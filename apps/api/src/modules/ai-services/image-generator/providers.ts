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

export async function downloadAsBase64(
  url: string,
): Promise<{ base64: string; mimeType: string } | undefined> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(IMAGE_REF_TIMEOUT_MS) });
    if (!r.ok) return undefined;
    const ct = r.headers.get('content-type') ?? 'image/png';
    const buf = Buffer.from(await r.arrayBuffer());
    return { base64: buf.toString('base64'), mimeType: ct.split(';')[0]?.trim() || 'image/png' };
  } catch (err) {
    logger.warn({ err, url }, 'ref image download failed');
    return undefined;
  }
}

async function tryGeminiModel(
  model: string,
  prompt: string,
  refs: Array<{ base64: string; mimeType: string }>,
): Promise<Buffer | undefined> {
  if (!env.GEMINI_API_KEY) return undefined;
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  for (const r of refs) {
    parts.push({ inline_data: { mime_type: r.mimeType, data: r.base64 } });
  }
  const body = {
    contents: [{ parts }],
    generationConfig: { responseModalities: ['IMAGE'] },
  };
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
      'gemini image model failed',
    );
    return undefined;
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
      logger.info({ model }, 'gemini image generated');
      return Buffer.from(data, 'base64');
    }
  }
  return undefined;
}

export async function generateWithGemini(
  prompt: string,
  refs: Array<{ base64: string; mimeType: string }>,
): Promise<Buffer | undefined> {
  for (const m of LLM_MODELS.image.geminiCandidates) {
    const buf = await tryGeminiModel(m, prompt, refs);
    if (buf) return buf;
  }
  logger.warn('all gemini image models failed');
  return undefined;
}

export async function generateWithDalle(
  prompt: string,
  size: ImageSize,
  style: ImageStyle,
): Promise<Buffer | undefined> {
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
        if (!imageUrl && b64) return Buffer.from(b64, 'base64');
      } else {
        logger.warn({ status: res.status }, 'openrouter images not ok, trying openai');
      }
    } catch (err) {
      logger.warn({ err }, 'openrouter images failed');
    }
  }

  if (!imageUrl && env.OPENAI_API_KEY) {
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
      throw new Error(`OpenAI images error ${res.status}: ${txt.slice(0, 200)}`);
    }
    const body = (await res.json()) as { data?: Array<{ url?: string }> };
    imageUrl = body.data?.[0]?.url;
  }

  if (!imageUrl) return undefined;
  const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS) });
  if (!imgRes.ok) throw new Error(`image download failed ${imgRes.status}`);
  return Buffer.from(await imgRes.arrayBuffer());
}
