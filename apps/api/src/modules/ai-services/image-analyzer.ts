import { prisma, Prisma } from '@radikal/db';
import { env } from '../../config/env.js';
import {
  LLM_MODELS,
  PROVIDER_URLS,
  geminiGenerateContentUrl,
} from '../../config/providers.js';
import { logger } from '../../lib/logger.js';

export interface ImageVisualAnalysis {
  dominant_colors: string[];
  lighting: string;
  mood: string;
  composition: string;
  style_tags: string[];
  description: string;
}

const PROMPT =
  'Analiza esta imagen como director de arte experto. Devuelve SOLO JSON con { dominant_colors: array 3-5 hex (formato #RRGGBB), lighting: string (natural, studio, dramatic, flat, etc), mood: string corto, composition: string corto, style_tags: array 3-6 strings, description: 50-100 palabras sobre dirección de arte, paleta, iluminación, ángulo, valores de marca }. No incluyas texto fuera del JSON.';

function inferMimeFromContentType(ct: string | null): string {
  if (!ct) return 'image/jpeg';
  const lc = ct.toLowerCase();
  if (lc.includes('png')) return 'image/png';
  if (lc.includes('webp')) return 'image/webp';
  if (lc.includes('gif')) return 'image/gif';
  if (lc.includes('svg')) return 'image/svg+xml';
  if (lc.includes('jpeg') || lc.includes('jpg')) return 'image/jpeg';
  if (lc.startsWith('image/')) return lc.split(';')[0]!.trim();
  return 'image/jpeg';
}

async function fetchAsBase64(
  url: string,
): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20_000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RadikalBot/1.0)' },
    });
    if (!res.ok) {
      logger.warn({ url, status: res.status }, 'image download failed');
      return null;
    }
    const ct = res.headers.get('content-type');
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 100 || buf.byteLength > 12 * 1024 * 1024) {
      logger.warn({ url, size: buf.byteLength }, 'image size out of bounds');
      return null;
    }
    // Convert to base64 (node Buffer)
    const b64 = Buffer.from(buf).toString('base64');
    return { data: b64, mimeType: inferMimeFromContentType(ct) };
  } catch (err) {
    logger.warn({ err, url }, 'image fetch error');
    return null;
  }
}

function safeParse(content: string): ImageVisualAnalysis | null {
  if (!content) return null;
  let txt = content.trim();
  txt = txt.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  try {
    const parsed = JSON.parse(txt);
    return {
      dominant_colors: Array.isArray(parsed.dominant_colors) ? parsed.dominant_colors.slice(0, 5) : [],
      lighting: typeof parsed.lighting === 'string' ? parsed.lighting : '',
      mood: typeof parsed.mood === 'string' ? parsed.mood : '',
      composition: typeof parsed.composition === 'string' ? parsed.composition : '',
      style_tags: Array.isArray(parsed.style_tags) ? parsed.style_tags.slice(0, 6) : [],
      description: typeof parsed.description === 'string' ? parsed.description : '',
    };
  } catch (err) {
    logger.warn({ err, snippet: txt.slice(0, 200) }, 'failed to parse image analysis');
    return null;
  }
}

export class ImageAnalyzer {
  /**
   * Busca un ContentAsset existente con metadata.visual_analysis para esa URL.
   */
  async getCached(imageUrl: string): Promise<ImageVisualAnalysis | null> {
    try {
      const existing = await prisma.contentAsset.findFirst({
        where: { assetUrl: imageUrl },
        select: { metadata: true },
      });
      const meta = existing?.metadata as Record<string, unknown> | null | undefined;
      const va = meta?.visual_analysis as ImageVisualAnalysis | undefined;
      if (va && typeof va === 'object' && Array.isArray(va.dominant_colors)) {
        return va;
      }
      return null;
    } catch {
      return null;
    }
  }

  async analyze(imageUrl: string): Promise<ImageVisualAnalysis | null> {
    const cached = await this.getCached(imageUrl);
    if (cached) return cached;

    const fetched = await fetchAsBase64(imageUrl);
    if (!fetched) return null;

    let parsed: ImageVisualAnalysis | null = null;

    // 1) Gemini 2.5 Flash (modelo estable)
    if (env.GEMINI_API_KEY) {
      try {
        const endpoint = geminiGenerateContentUrl(LLM_MODELS.vision.gemini, env.GEMINI_API_KEY);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: PROMPT },
                  { inline_data: { mime_type: fetched.mimeType, data: fetched.data } },
                ],
              },
            ],
            generationConfig: { responseMimeType: 'application/json' },
          }),
          signal: AbortSignal.timeout(45_000),
        });
        if (res.ok) {
          const body = (await res.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const text = body.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          parsed = safeParse(text);
          if (parsed) logger.info({ imageUrl: imageUrl.slice(0, 80) }, 'vision ok (gemini)');
        } else {
          const t = await res.text().catch(() => '');
          logger.warn({ status: res.status, body: t.slice(0, 200) }, 'gemini vision failed, falling back');
        }
      } catch (err) {
        logger.warn({ err }, 'gemini vision errored, falling back');
      }
    }

    // 2) Fallback: OpenRouter con GPT-4o (soporta vision)
    if (!parsed && env.OPENROUTER_API_KEY) {
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
            model: LLM_MODELS.chat.openrouter,
            response_format: { type: 'json_object' },
            temperature: 0.3,
            messages: [
              { role: 'system', content: 'Responde SOLO con JSON válido.' },
              {
                role: 'user',
                content: [
                  { type: 'text', text: PROMPT },
                  {
                    type: 'image_url',
                    image_url: { url: `data:${fetched.mimeType};base64,${fetched.data}` },
                  },
                ],
              },
            ],
          }),
          signal: AbortSignal.timeout(45_000),
        });
        if (res.ok) {
          const body = await res.json();
          const text = body.choices?.[0]?.message?.content ?? '';
          parsed = safeParse(text);
          if (parsed) logger.info({ imageUrl: imageUrl.slice(0, 80) }, 'vision ok (openrouter fallback)');
        } else {
          const t = await res.text().catch(() => '');
          logger.warn({ status: res.status, body: t.slice(0, 200) }, 'openrouter vision failed');
        }
      } catch (err) {
        logger.warn({ err }, 'openrouter vision errored');
      }
    }

    if (!parsed) return null;

    try {

      // Cache: if asset exists for this URL, patch its metadata.visual_analysis
      try {
        const existing = await prisma.contentAsset.findFirst({
          where: { assetUrl: imageUrl },
          select: { id: true, metadata: true },
        });
        if (existing) {
          const prev = (existing.metadata as Record<string, unknown> | null) ?? {};
          await prisma.contentAsset.update({
            where: { id: existing.id },
            data: { metadata: { ...prev, visual_analysis: parsed } as unknown as Prisma.InputJsonValue },
          });
        }
      } catch (err) {
        logger.warn({ err }, 'failed caching visual_analysis on asset');
      }

      return parsed;
    } catch (err) {
      logger.warn({ err, imageUrl }, 'image analyzer errored');
      return null;
    }
  }
}

export const imageAnalyzer = new ImageAnalyzer();
