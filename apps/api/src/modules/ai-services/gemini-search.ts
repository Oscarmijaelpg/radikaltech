import { env } from '../../config/env.js';
import { LLM_MODELS, geminiGenerateContentUrl } from '../../config/providers.js';
import { BadRequest } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

export interface GeminiSearchSource {
  uri: string;
  title: string;
}

export interface GeminiSearchResult {
  text: string;
  sources: GeminiSearchSource[];
  queriesUsed: string[];
}

export interface GeminiSearchOptions {
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
}

interface GeminiCandidate {
  content?: { parts?: Array<{ text?: string }> };
  groundingMetadata?: {
    groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    webSearchQueries?: string[];
  };
}

export async function geminiSearch(
  userPrompt: string,
  opts: GeminiSearchOptions = {},
): Promise<GeminiSearchResult> {
  if (!env.GEMINI_API_KEY) {
    throw new BadRequest('GEMINI_API_KEY no está configurada');
  }

  const model = opts.model ?? LLM_MODELS.vision.gemini;
  const endpoint = geminiGenerateContentUrl(model, env.GEMINI_API_KEY);

  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    tools: [{ googleSearch: {} }],
    generationConfig: {
      temperature: opts.temperature ?? 0.3,
    },
  };
  if (opts.systemPrompt) {
    body.systemInstruction = { parts: [{ text: opts.systemPrompt }] };
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    logger.warn({ status: res.status, body: errBody.slice(0, 300) }, 'gemini search failed');
    throw new Error(`Gemini search ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const json = (await res.json()) as { candidates?: GeminiCandidate[] };
  const cand = json.candidates?.[0];
  const text = cand?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';

  const sources: GeminiSearchSource[] = (cand?.groundingMetadata?.groundingChunks ?? [])
    .map((c) => c.web)
    .filter((w): w is { uri?: string; title?: string } => !!w && typeof w.uri === 'string')
    .map((w) => ({ uri: String(w.uri), title: w.title ?? '' }));

  const queriesUsed = cand?.groundingMetadata?.webSearchQueries ?? [];

  return { text, sources, queriesUsed };
}
