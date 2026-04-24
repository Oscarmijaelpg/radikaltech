import { env } from '../../../config/env.js';
import {
  LLM_MODELS,
  PROVIDER_URLS,
  geminiGenerateContentUrl,
} from '../../../config/providers.js';
import { logger } from '../../../lib/logger.js';
import fs from 'node:fs';
import path from 'node:path';
import type { ImageSize, ImageStyle } from './types.js';

const DEBUG_LOG_PATH = path.join(process.cwd(), 'openrouter_debug.log');

function debugLog(data: any) {
  const msg = `\n--- ${new Date().toISOString()} ---\n${JSON.stringify(data, null, 2)}\n`;
  fs.appendFileSync(DEBUG_LOG_PATH, msg);
}

const IMAGE_REF_TIMEOUT_MS = 20_000;
const GEMINI_TIMEOUT_MS = 60_000;
const DALLE_TIMEOUT_MS = 60_000;
const IMAGE_DOWNLOAD_TIMEOUT_MS = 30_000;

export async function downloadAsBase64(
  url: string,
): Promise<{ base64: string; mimeType: string } | undefined> {
  try {
    logger.debug({ url }, 'downloading asset for ai reference');
    const r = await fetch(url, { signal: AbortSignal.timeout(IMAGE_REF_TIMEOUT_MS) });
    if (!r.ok) {
      logger.warn({ url, status: r.status }, 'asset download failed');
      return undefined;
    }
    const ct = r.headers.get('content-type') ?? 'image/png';
    const buf = Buffer.from(await r.arrayBuffer());
    logger.info({ url, size: buf.length, ct }, 'asset downloaded for ai reference');
    return { base64: buf.toString('base64'), mimeType: ct.split(';')[0]?.trim() || 'image/png' };
  } catch (err) {
    logger.warn({ err, url }, 'ref image download exception');
    return undefined;
  }
}

async function tryGeminiModel(
  model: string,
  prompt: string,
  refs: Array<{ base64: string; mimeType: string }>,
): Promise<Buffer | undefined> {
  if (!env.OPENROUTER_API_KEY) {
    logger.warn('OPENROUTER_API_KEY is missing, cannot generate image');
    return undefined;
  }

  try {
    const messages: any[] = [
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

    const res = await fetch(PROVIDER_URLS.openrouter.chatCompletions, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': env.WEB_URL,
        'X-Title': 'Radikal Nexo',
      },
      body: JSON.stringify({
        model,
        messages,
        modalities: ['image', 'text'], // Mandatory for Gemini multimodal models on OpenRouter
      }),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    });

    if (res.ok) {
      const json = (await res.json()) as any;
      debugLog({ model, status: res.status, json });
      const choice = json.choices?.[0]?.message;
      if (!choice) return undefined;

      // Caso 1: Array de partes (Gemini 3.1+)
      if (Array.isArray(choice.content)) {
        for (const part of choice.content) {
          if (part.type === 'image_url' && part.image_url?.url?.includes('base64,')) {
            const b64 = part.image_url.url.split('base64,')[1];
            if (b64) return Buffer.from(b64, 'base64');
          }
        }
      }

      // Caso 2: reasoning_details (Sometimes Gemini 3.1 Flash Image returns data here)
      if (json.choices?.[0]?.reasoning_details) {
        const details = json.choices[0].reasoning_details;
        const detailArr = Array.isArray(details) ? details : [details];
        for (const d of detailArr) {
          if (d.data && typeof d.data === 'string') {
            // If it's a huge base64 string, it's likely the image
            return Buffer.from(d.data, 'base64');
          }
        }
      }

      // Caso 3: String con data URI
      const content = choice.content;
      if (typeof content === 'string' && content.includes('data:image')) {
        const b64 = content.split('base64,')[1]?.split('"')[0]?.split(')')[0]?.split(' ')[0];
        if (b64) return Buffer.from(b64, 'base64');
      }
    } else {
      const txt = await res.text().catch(() => '');
      debugLog({ model, status: res.status, error: txt });
      logger.warn({ model, status: res.status, body: txt.slice(0, 100) }, 'openrouter gemini failed');
    }
  } catch (err) {
    debugLog({ model, exception: err instanceof Error ? err.message : String(err) });
    logger.warn({ err, model }, 'openrouter gemini attempt failed');
  }

  return undefined;
}

export async function generateWithGemini(
  prompt: string,
  refs: Array<{ base64: string; mimeType: string }>,
): Promise<{ buffer?: Buffer; error?: string }> {
  for (const m of LLM_MODELS.image.geminiCandidates) {
    const buf = await tryGeminiModel(m, prompt, refs);
    if (buf) return { buffer: buf };
  }
  return { error: 'OpenRouter Gemini failed all candidates' };
}

export async function generateWithDalle(
  prompt: string,
  size: ImageSize,
  style: ImageStyle,
): Promise<{ buffer?: Buffer; error?: string }> {
  if (!env.OPENROUTER_API_KEY) return { error: 'OPENROUTER_API_KEY missing' };

  const payload = {
    model: `openai/${LLM_MODELS.image.dalle3}`,
    prompt,
    n: 1,
    size,
    style,
    quality: 'standard',
  };

  try {
    const res = await fetch(PROVIDER_URLS.openrouter.imageGenerations, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': env.WEB_URL,
        'X-Title': 'Radikal Nexo',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(DALLE_TIMEOUT_MS),
    });

    if (res.ok) {
      const body = (await res.json()) as any;
      debugLog({ model: payload.model, status: res.status, body });
      const imageUrl = body.data?.[0]?.url;
      const b64 = body.data?.[0]?.b64_json;

      if (b64) return { buffer: Buffer.from(b64, 'base64') };
      if (imageUrl) {
        const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS) });
        if (!imgRes.ok) return { error: `dalle download failed ${imgRes.status}` };
        return { buffer: Buffer.from(await imgRes.arrayBuffer()) };
      }
    } else {
      const txt = await res.text().catch(() => '');
      debugLog({ model: payload.model, status: res.status, error: txt });
      return { error: `OpenRouter Dalle failed: ${res.status} ${txt.slice(0, 100)}` };
    }
  } catch (err) {
    debugLog({ model: payload.model, exception: err instanceof Error ? err.message : String(err) });
    return { error: `OpenRouter Dalle exception: ${err instanceof Error ? err.message : String(err)}` };
  }
  return { error: 'OpenRouter Dalle returned no data' };
}
