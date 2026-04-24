import { env } from '../../../config/env.js';
import { LLM_MODELS, PROVIDER_URLS } from '../../../config/providers.js';

const LLM_TIMEOUT_MS = 60_000;
const DEFAULT_TEMPERATURE = 0.4;

export async function callOpenRouter(options: {
  system: string;
  user: string;
  temperature?: number;
  jsonMode?: boolean;
}): Promise<string> {
  if (!env.OPENROUTER_API_KEY) {
    return '# Resumen\n\nGeneración automática no disponible: falta configurar OPENROUTER_API_KEY.';
  }
  const body: Record<string, unknown> = {
    model: LLM_MODELS.chat.openrouter,
    temperature: options.temperature ?? DEFAULT_TEMPERATURE,
    messages: [
      { role: 'system', content: options.system },
      { role: 'user', content: options.user },
    ],
  };
  if (options.jsonMode) {
    body.response_format = { type: 'json_object' };
  }
  const res = await fetch(PROVIDER_URLS.openrouter.chatCompletions, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': env.WEB_URL,
      'X-Title': 'Radikal',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${text}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? '';
}

export function clip(text: string | null | undefined, max: number): string {
  if (!text) return '';
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
