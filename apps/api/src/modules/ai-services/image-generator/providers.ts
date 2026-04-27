import { env } from '../../../config/env.js';
import {
  LLM_MODELS,
  PROVIDER_URLS,
  geminiGenerateContentUrl,
} from '../../../config/providers.js';
import { logger } from '../../../lib/logger.js';
import type { ImageSize, ImageStyle } from './types.js';

const GEMINI_TIMEOUT_MS = 120_000;
const DALLE_TIMEOUT_MS = 90_000;
const IMAGE_REF_TIMEOUT_MS = 20_000;
const IMAGE_DOWNLOAD_TIMEOUT_MS = 30_000;

export type ProviderResult = { buffer?: Buffer; url?: string; error?: string };

export async function downloadAsBase64(
  url: string,
): Promise<{ base64: string; mimeType: string } | undefined> {
  const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(IMAGE_REF_TIMEOUT_MS) });
    if (!r.ok) {
      logger.warn({ url, status: r.status }, 'downloadAsBase64: HTTP error, skipping reference');
      return undefined;
    }
    const ct = r.headers.get('content-type') ?? '';
    const mimeType = ct.split(';')[0]?.trim() || 'image/png';

    // Reject SVG and other non-raster formats that models can't process
    if (mimeType === 'image/svg+xml' || mimeType.includes('svg')) {
      logger.warn({ url, mimeType }, 'downloadAsBase64: SVG not supported, skipping reference');
      return undefined;
    }

    const buf = Buffer.from(await r.arrayBuffer());

    // Check minimum size to skip empty or broken images
    if (buf.length < 1024) {
      logger.warn({ url, size: buf.length }, 'downloadAsBase64: image too small, likely broken, skipping');
      return undefined;
    }

    // Detect actual format from magic bytes for accuracy
    let detectedMime = mimeType;
    if (buf[0] === 0x89 && buf[1] === 0x50) detectedMime = 'image/png';
    else if (buf[0] === 0xff && buf[1] === 0xd8) detectedMime = 'image/jpeg';
    else if (buf[0] === 0x47 && buf[1] === 0x49) detectedMime = 'image/gif';
    else if (buf[0] === 0x52 && buf[1] === 0x49) detectedMime = 'image/webp';

    return { base64: buf.toString('base64'), mimeType: detectedMime };
  } catch (err) {
    logger.warn({ url, err }, 'downloadAsBase64: exception, skipping reference');
    return undefined;
  }
}

async function downloadBuffer(url: string): Promise<Buffer | undefined> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(IMAGE_DOWNLOAD_TIMEOUT_MS) });
    if (!r.ok) return undefined;
    return Buffer.from(await r.arrayBuffer());
  } catch {
    return undefined;
  }
}

/**
 * OpenRouter CHAT endpoint — for Gemini imagen models.
 * OpenRouter does NOT have a /images/generations endpoint.
 * All image generation must go through /chat/completions with image modality.
 */
async function tryViaOpenRouterChat(
  model: string,
  prompt: string,
  refs: Array<{ base64: string; mimeType: string }>,
): Promise<ProviderResult> {
  if (!env.OPENROUTER_API_KEY) return { error: 'No OPENROUTER_API_KEY' };

  const userContent: string | Array<Record<string, unknown>> = refs.length === 0 
    ? prompt 
    : [{ type: 'text', text: prompt }];
  
  if (Array.isArray(userContent)) {
    for (const r of refs) {
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${r.mimeType};base64,${r.base64}` },
      });
    }
  }

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
        messages: [{ role: 'user', content: userContent }],
        modalities: ['image', 'text'],
      }),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    });

    const rawText = await res.text();

    if (!res.ok) {
      logger.error(
        { model, status: res.status, body: rawText.slice(0, 500) },
        'OPENROUTER CHAT IMAGE FAILED',
      );
      return { error: `openrouter chat ${res.status}: ${rawText.slice(0, 200)}` };
    }

    let json: Record<string, unknown>;
    try {
      json = JSON.parse(rawText);
    } catch {
      return { error: 'openrouter chat: invalid JSON response' };
    }

    const choices = (json.choices as Array<Record<string, unknown>>) ?? [];
    for (const choice of choices) {
      const msg = choice.message as Record<string, unknown> | undefined;
      const content = msg?.content;

      if (Array.isArray(content)) {
        for (const part of content as Array<Record<string, unknown>>) {
          const imgUrl = (part.image_url as Record<string, string> | undefined)?.url;
          if (part.type === 'image_url' && imgUrl) {
            if (imgUrl.startsWith('data:')) {
              const b64 = imgUrl.split('base64,')[1];
              if (b64) return { buffer: Buffer.from(b64, 'base64') };
            } else {
              return { url: imgUrl };
            }
          }
        }
      }

      if (typeof content === 'string' && content.includes('data:image')) {
        const b64 = content.split('base64,')[1]?.split(/["'\s)]/)[0];
        if (b64) return { buffer: Buffer.from(b64, 'base64') };
      }

      const images = msg?.images;
      if (Array.isArray(images)) {
        for (const img of images as Array<Record<string, unknown>>) {
          const imgUrl = (img.image_url as Record<string, string> | undefined)?.url;
          if (img.type === 'image_url' && imgUrl) {
            if (imgUrl.startsWith('data:')) {
              const b64 = imgUrl.split('base64,')[1];
              if (b64) return { buffer: Buffer.from(b64, 'base64') };
            } else {
              return { url: imgUrl };
            }
          }
        }
      }
    }

    logger.error({ model, json: JSON.stringify(json).slice(0, 500) }, 'OPENROUTER: no image in response');
    return { error: 'openrouter chat: no image in response' };
  } catch (err) {
    logger.error({ model, err }, 'OPENROUTER CHAT EXCEPTION');
    return { error: String(err) };
  }
}

/**
 * Direct Google Gemini API fallback.
 */
async function tryGeminiDirect(
  model: string,
  prompt: string,
  refs: Array<{ base64: string; mimeType: string }>,
): Promise<ProviderResult> {
  if (!env.GEMINI_API_KEY) return { error: 'No GEMINI_API_KEY' };

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  for (const r of refs) {
    parts.push({ inline_data: { mime_type: r.mimeType, data: r.base64 } });
  }

  try {
    const res = await fetch(geminiGenerateContentUrl(model, env.GEMINI_API_KEY), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    });

    const rawText = await res.text();
    if (!res.ok) {
      logger.error({ model, status: res.status, body: rawText.slice(0, 500) }, 'GEMINI DIRECT FAILED');
      return { error: `gemini direct ${res.status}: ${rawText.slice(0, 200)}` };
    }

    const json = JSON.parse(rawText);
    const data =
      json.candidates?.[0]?.content?.parts?.[0]?.inline_data?.data ||
      json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (data) return { buffer: Buffer.from(data, 'base64') };

    return { error: 'gemini direct: no image in response' };
  } catch (err) {
    return { error: String(err) };
  }
}

/**
 * DALL-E 3 via OpenAI directly (last resort).
 */
async function tryDalleDirectOpenAI(
  prompt: string,
  size: ImageSize,
): Promise<ProviderResult> {
  if (!env.OPENAI_API_KEY) return { error: 'No OPENAI_API_KEY' };

  try {
    const res = await fetch(PROVIDER_URLS.openai.imageGenerations, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODELS.image.dalle3,
        prompt,
        n: 1,
        size,
        response_format: 'url',
      }),
      signal: AbortSignal.timeout(DALLE_TIMEOUT_MS),
    });

    const rawText = await res.text();
    if (!res.ok) {
      logger.error({ status: res.status, body: rawText.slice(0, 500) }, 'OPENAI DALLE DIRECT FAILED');
      return { error: `openai dalle ${res.status}: ${rawText.slice(0, 200)}` };
    }

    const json = JSON.parse(rawText);
    const url = json.data?.[0]?.url;
    if (url) return { url };
    return { error: 'openai dalle: no url in response' };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function generateWithGemini(
  prompt: string,
  refs: Array<{ base64: string; mimeType: string }>,
): Promise<ProviderResult> {
  // Models to try via OpenRouter chat endpoint
  const orModels = LLM_MODELS.image.geminiCandidates.filter(m =>
    m.startsWith('google/'),
  );

  // Direct Gemini models (no openrouter prefix)
  const directModels = LLM_MODELS.image.geminiCandidates.filter(m =>
    !m.startsWith('google/'),
  );

  let lastError = 'no providers configured';

  // 1. Try via OpenRouter first
  for (const model of orModels) {
    const result = await tryViaOpenRouterChat(model, prompt, refs);
    if (result.buffer) return result;
    if (result.url) {
      const buf = await downloadBuffer(result.url);
      if (buf) return { buffer: buf };
    }
    lastError = result.error ?? lastError;
  }

  // 2. Try direct Google API
  for (const model of directModels) {
    const result = await tryGeminiDirect(model, prompt, refs);
    if (result.buffer) return result;
    lastError = result.error ?? lastError;
  }

  return { error: lastError };
}

export async function generateWithDalle(
  prompt: string,
  size: ImageSize,
  _style: ImageStyle,
): Promise<ProviderResult> {
  let lastError = 'no providers configured';

  // 1. Try DALL-E 3 via OpenRouter chat endpoint
  if (env.OPENROUTER_API_KEY) {
    const result = await tryViaOpenRouterChat(
      LLM_MODELS.image.dalle3,
      `Generate a high-quality image: ${prompt}`,
      [],
    );
    if (result.buffer) return result;
    if (result.url) {
      const buf = await downloadBuffer(result.url);
      if (buf) return { buffer: buf };
    }
    lastError = result.error ?? lastError;
  }

  // 2. Try DALL-E 3 directly via OpenAI
  const directResult = await tryDalleDirectOpenAI(prompt, size);
  if (directResult.buffer) return directResult;
  if (directResult.url) {
    const buf = await downloadBuffer(directResult.url);
    if (buf) return { buffer: buf };
  }
  lastError = directResult.error ?? lastError;

  return { error: lastError };
}
