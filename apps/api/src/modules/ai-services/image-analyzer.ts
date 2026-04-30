import { prisma, Prisma } from '@radikal/db';
import { env } from '../../config/env.js';
import {
  PROVIDER_URLS,
  geminiGenerateContentUrl,
} from '../../config/providers.js';
import { logger } from '../../lib/logger.js';

export interface ImageVisualAnalysis {
  category: string;
  subject: string;
  dominant_colors: string[];
  lighting: string;
  mood: string;
  composition: string;
  style_tags: string[];
  description: string;
  full_narrative: string;
  // Visual & Technical fields
  aesthetic_score: number;
  suggestions: string[];
  detected_elements: string[];
  tags: string[];
}

const PROMPT = `Actúa como un Director de Arte y Experto en Identidad Visual. Analiza esta imagen extraída de una página web corporativa y responde ÚNICAMENTE con un objeto JSON válido.

### ESTRUCTURA NARRATIVA (Para el campo full_narrative)
Sigue estrictamente esta estructura:
1. Etiqueta Inicial: Una ÚNICA palabra en mayúsculas que categorice la imagen (PRODUCTO, LIFESTYLE, MARCA, ESPACIO, TEXTURA, PERSONA) seguida de dos puntos.
2. Identificación del Sujeto: Nombre explícito y directo del sujeto u objeto principal terminado en punto seguido.
3. Análisis Fotográfico y de Marca: Un párrafo técnico de entre 10 y 100 palabras. Enfócate en: tipo de iluminación, ángulo de cámara, paleta de colores, encuadre, profundidad de campo y atmósfera/valores de marca que transmite.

### OTROS DATOS TÉCNICOS
4. Aesthetic Score: Puntuación del 0 al 10.
5. Suggestions: 3 a 5 recomendaciones técnicas para mejorar el asset.
6. Tags: 5 a 10 etiquetas de ADN visual.

ESTRUCTURA JSON REQUERIDA:
{
  "category": "UNA PALABRA",
  "subject": "Nombre del sujeto",
  "dominant_colors": ["#hex1", "#hex2"],
  "lighting": "Breve descripción",
  "mood": "Breve descripción",
  "composition": "Breve descripción",
  "style_tags": ["tag1", "tag2"],
  "description": "Resumen técnico corto",
  "full_narrative": "CATEGORIA: Sujeto. Análisis técnico...",
  "aesthetic_score": 8.5,
  "suggestions": ["Sugerencia 1", "Sugerencia 2"],
  "detected_elements": ["Elemento 1", "Elemento 2"],
  "tags": ["tag1", "tag2"]
}

No incluyas ningún texto fuera del JSON.`;

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
  // Strip any text before or after the JSON object
  const jsonStart = txt.indexOf('{');
  const jsonEnd = txt.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    txt = txt.slice(jsonStart, jsonEnd + 1);
  }
  try {
    const parsed = JSON.parse(txt);
    const category = typeof parsed.category === 'string' ? parsed.category : '';
    const subject = typeof parsed.subject === 'string' ? parsed.subject : '';
    const description = typeof parsed.description === 'string' ? parsed.description : '';
    const fullNarrative =
      typeof parsed.full_narrative === 'string' && parsed.full_narrative
        ? parsed.full_narrative
        : category && subject
          ? `${category}: ${subject}. ${description}`
          : description;

    return {
      category,
      subject,
      dominant_colors: Array.isArray(parsed.dominant_colors) ? parsed.dominant_colors.slice(0, 5) : [],
      lighting: String(parsed.lighting || ''),
      mood: String(parsed.mood || ''),
      composition: String(parsed.composition || ''),
      style_tags: Array.isArray(parsed.style_tags) ? parsed.style_tags.slice(0, 6) : [],
      description: String(parsed.description || ''),
      full_narrative: fullNarrative,
      // Visual & Technical fields
      aesthetic_score: Number(parsed.aesthetic_score) || 0,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : [],
      detected_elements: Array.isArray(parsed.detected_elements) ? parsed.detected_elements.map(String) : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
    };
  } catch (err) {
    logger.warn({ err, snippet: txt.slice(0, 200) }, 'failed to parse image analysis');
    return null;
  }
}

export class ImageAnalyzer {
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

    // 1) PRIMARY: OpenRouter with google/gemini-2.5-flash (multimodal vision)
    if (!parsed && env.OPENROUTER_API_KEY) {
      try {
        const res = await fetch(PROVIDER_URLS.openrouter.chatCompletions, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': env.WEB_URL ?? 'https://radikal.ai',
            'X-Title': 'Radikal',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            temperature: 0.2,
            messages: [
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
          signal: AbortSignal.timeout(60_000),
        });
        if (res.ok) {
          const body = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const text = body.choices?.[0]?.message?.content ?? '';
          parsed = safeParse(text);
          if (parsed) {
            logger.info({ imageUrl: imageUrl.slice(0, 80) }, 'vision ok (openrouter gemini-2.5-flash)');
          }
        } else {
          const t = await res.text().catch(() => '');
          logger.warn(
            { status: res.status, body: t.slice(0, 300) },
            'openrouter gemini-2.5-flash vision failed, falling back',
          );
        }
      } catch (err) {
        logger.warn({ err }, 'openrouter gemini-2.5-flash vision errored, falling back');
      }
    }

    // 2) FALLBACK: OpenRouter with gpt-4o-mini
    if (!parsed && env.OPENROUTER_API_KEY) {
      try {
        const res = await fetch(PROVIDER_URLS.openrouter.chatCompletions, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': env.WEB_URL ?? 'https://radikal.ai',
            'X-Title': 'Radikal',
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            temperature: 0.2,
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
          const body = (await res.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const text = body.choices?.[0]?.message?.content ?? '';
          parsed = safeParse(text);
          if (parsed) {
            logger.info({ imageUrl: imageUrl.slice(0, 80) }, 'vision ok (openrouter gpt-4o-mini)');
          }
        } else {
          const t = await res.text().catch(() => '');
          logger.warn({ status: res.status, body: t.slice(0, 200) }, 'openrouter gpt-4o-mini vision failed');
        }
      } catch (err) {
        logger.warn({ err }, 'openrouter gpt-4o-mini vision errored');
      }
    }

    // 3) LAST RESORT: Direct Gemini API
    if (!parsed && env.GEMINI_API_KEY) {
      try {
        const endpoint = geminiGenerateContentUrl('gemini-2.0-flash', env.GEMINI_API_KEY);
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
          if (parsed) logger.info({ imageUrl: imageUrl.slice(0, 80) }, 'vision ok (direct gemini)');
        }
      } catch (err) {
        logger.warn({ err }, 'direct gemini vision errored');
      }
    }

    if (!parsed) return null;

    // Persist result: metadata.visual_analysis (structured) + ai_description (display text)
    try {
      const existing = await prisma.contentAsset.findFirst({
        where: { assetUrl: imageUrl },
        select: { id: true, metadata: true },
      });
      if (existing) {
        const prev = (existing.metadata as Record<string, unknown> | null) ?? {};
        await prisma.contentAsset.update({
          where: { id: existing.id },
          data: {
            metadata: { ...prev, visual_analysis: parsed } as unknown as Prisma.InputJsonValue,
            aiDescription: parsed.full_narrative || parsed.description || null,
          },
        });
      }
    } catch (err) {
      logger.warn({ err }, 'failed persisting visual_analysis on asset');
    }

    return parsed;
  }
}

export const imageAnalyzer = new ImageAnalyzer();
