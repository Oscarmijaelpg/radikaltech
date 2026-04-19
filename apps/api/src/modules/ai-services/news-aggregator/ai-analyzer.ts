import { env } from '../../../config/env.js';
import { LLM_MODELS, PROVIDER_URLS } from '../../../config/providers.js';
import { logger } from '../../../lib/logger.js';
import type { NewsAnalysis, NewsItem, ProjectContext } from './types.js';

const MIN_ITEMS_FOR_AI = 3;
const AI_TIMEOUT_MS = 40_000;
const AI_TEMPERATURE = 0.3;
const MAX_THEMES = 5;
const MAX_KEY_INSIGHTS = 5;
const MAX_KEYWORDS = 10;
const MAX_SUMMARY_CHARS = 280;
const MAX_BUSINESS_SUMMARY_CHARS = 400;
const MAX_UNIQUE_VALUE_CHARS = 200;
const MAX_PRODUCTS_CHARS = 200;
const MAX_RELEVANCE_REASON_CHARS = 280;
const DEFAULT_BUSINESS_KEYWORDS = 5;

export interface AnalyzeAIResult {
  analysis: NewsAnalysis;
  per_item_relevance: Record<string, { score: number; reason: string }>;
}

export function buildEnhancedQuery(topic: string, ctx: ProjectContext | null): string {
  if (!ctx) return topic;
  const bits: string[] = [topic];
  if (ctx.industry) bits.push(`sector ${ctx.industry}`);
  if (ctx.operating_countries && ctx.operating_countries.length > 0) {
    bits.push(ctx.operating_countries.join(' '));
  }
  if (ctx.business_summary) {
    const keywords = ctx.business_summary
      .split(/\s+/)
      .filter((w) => w.length > 4 && !/[.,;:]/.test(w))
      .slice(0, DEFAULT_BUSINESS_KEYWORDS)
      .join(' ');
    if (keywords) bits.push(keywords);
  }
  return bits.join(' ');
}

export async function analyzeNewsWithAI(
  topic: string,
  items: NewsItem[],
  ctx: ProjectContext | null,
): Promise<AnalyzeAIResult | null> {
  if (!env.OPENROUTER_API_KEY || items.length < MIN_ITEMS_FOR_AI) return null;

  const context = items
    .map(
      (it, i) =>
        `[${i + 1}] ${it.title ?? ''} | ${it.source ?? ''} | ${(it.summary ?? '').slice(0, MAX_SUMMARY_CHARS)} | ${it.url}`,
    )
    .join('\n');

  const brandContext = ctx
    ? [
        ctx.company_name && `Marca: "${ctx.company_name}"`,
        ctx.industry && `Industria: ${ctx.industry}`,
        ctx.business_summary && `Negocio: ${ctx.business_summary.slice(0, MAX_BUSINESS_SUMMARY_CHARS)}`,
        ctx.unique_value && `Valor único: ${ctx.unique_value.slice(0, MAX_UNIQUE_VALUE_CHARS)}`,
        ctx.main_products && `Productos: ${ctx.main_products.slice(0, MAX_PRODUCTS_CHARS)}`,
        ctx.operating_countries?.length && `Opera en: ${ctx.operating_countries.join(', ')}`,
      ]
        .filter(Boolean)
        .join('\n')
    : '(sin contexto de marca — análisis genérico)';

  const systemPrompt = `Eres un analista senior de tendencias e inteligencia competitiva. Analizas noticias SIEMPRE en el contexto específico de una marca. Devuelves SOLO JSON válido.

REGLAS de escritura para "narrative":
- 200-350 palabras en español.
- ES LO MÁS IMPORTANTE: escribe un análisis corrido (3-5 párrafos) en ESPAÑOL que explique qué está pasando y QUÉ IMPLICA PARA LA MARCA específica.
- CITA fuentes inline usando notación [N] donde N es el índice de la noticia (1-based). Ej: "El mercado de delivery creció 22% [2][5], pero la regulación sanitaria se endureció [1]."
- Cada afirmación importante debe llevar al menos una cita [N].
- NO incluyas URLs directas en el texto, solo los [N].
- Conecta los hallazgos con la marca del usuario concretamente.`;

  const userPrompt = `CONTEXTO DE LA MARCA:
${brandContext}

TEMA CONSULTADO: "${topic}"

NOTICIAS ENCONTRADAS (formato [índice] título | source | summary | url):
${context}

Devuelve SOLO JSON con:
- narrative: análisis 200-350 palabras EN ESPAÑOL sobre qué pasa y qué significa para ESTA marca específica. Usa citas [N] inline (índices 1..${items.length}).
- executive_summary: 2-3 frases que resumen el narrative (sin citas).
- top_themes: array 3-5 objetos { name, count, description }.
- overall_sentiment: "positive" | "neutral" | "negative".
- sentiment_breakdown: { positive: N, neutral: N, negative: N } suma = ${items.length}.
- per_item_sentiment: objeto que mapea cada URL del listado al sentiment individual.
- per_item_relevance: objeto que mapea cada URL a { score: 0-100, reason: string corto en español explicando por qué es o no relevante para ESTA marca específica }.
- key_insights: 3-5 bullets accionables ESPECÍFICOS para esta marca (no genéricos).
- trending_keywords: 5-10 palabras clave del sector.

Devuelve SOLO JSON válido.`;

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
        temperature: AI_TEMPERATURE,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, 'openrouter news analysis failed');
      return null;
    }
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content) as Partial<NewsAnalysis> & {
      per_item_relevance?: Record<string, { score?: number; reason?: string }>;
    };

    const sb = parsed.sentiment_breakdown ?? { positive: 0, neutral: 0, negative: 0 };
    const validSentiments: Array<'positive' | 'neutral' | 'negative'> = [
      'positive',
      'neutral',
      'negative',
    ];
    const overall = validSentiments.includes(parsed.overall_sentiment as 'positive')
      ? (parsed.overall_sentiment as 'positive' | 'neutral' | 'negative')
      : 'neutral';

    const per_item_relevance: Record<string, { score: number; reason: string }> = {};
    if (parsed.per_item_relevance && typeof parsed.per_item_relevance === 'object') {
      for (const [url, v] of Object.entries(parsed.per_item_relevance)) {
        const score = Math.max(0, Math.min(100, Number(v?.score ?? 50)));
        per_item_relevance[url] = {
          score: isFinite(score) ? score : 50,
          reason: typeof v?.reason === 'string' ? v.reason.slice(0, MAX_RELEVANCE_REASON_CHARS) : '',
        };
      }
    }

    const analysis: NewsAnalysis = {
      narrative: typeof parsed.narrative === 'string' ? parsed.narrative : '',
      executive_summary:
        typeof parsed.executive_summary === 'string' ? parsed.executive_summary : '',
      top_themes: Array.isArray(parsed.top_themes)
        ? parsed.top_themes.slice(0, MAX_THEMES).map((t) => ({
            name: String(t?.name ?? ''),
            count: Number(t?.count ?? 0),
            description: String(t?.description ?? ''),
          }))
        : [],
      overall_sentiment: overall,
      sentiment_breakdown: {
        positive: Number(sb.positive ?? 0),
        neutral: Number(sb.neutral ?? 0),
        negative: Number(sb.negative ?? 0),
      },
      per_item_sentiment:
        parsed.per_item_sentiment && typeof parsed.per_item_sentiment === 'object'
          ? (parsed.per_item_sentiment as Record<string, 'positive' | 'neutral' | 'negative'>)
          : {},
      key_insights: Array.isArray(parsed.key_insights)
        ? parsed.key_insights
            .filter((s): s is string => typeof s === 'string')
            .slice(0, MAX_KEY_INSIGHTS)
        : [],
      trending_keywords: Array.isArray(parsed.trending_keywords)
        ? parsed.trending_keywords
            .filter((s): s is string => typeof s === 'string')
            .slice(0, MAX_KEYWORDS)
        : [],
    };
    return { analysis, per_item_relevance };
  } catch (err) {
    logger.warn({ err }, 'news ai analysis failed');
    return null;
  }
}
