import { env } from '../../config/env.js';
import {
  preferredChatEndpoint,
  preferredChatModel,
  preferredChatProvider,
} from '../../config/providers.js';
import { logger } from '../../lib/logger.js';

const MAX_INPUT_CHARS = 1500;
const MAX_TITLE_CHARS = 80;
const SYSTEM_PROMPT =
  'Eres un experto generando títulos cortos para conversaciones. Devuelves SOLO el título, en español, máximo 6 palabras, sin comillas, sin punto final, sin emojis.';

// Genera un título corto a partir del primer mensaje del usuario.
// Devuelve null si no hay key de proveedor configurada o si el LLM falla.
export async function generateChatTitle(firstMessage: string): Promise<string | null> {
  const provider = preferredChatProvider();
  const apiKey = provider === 'openrouter' ? env.OPENROUTER_API_KEY : env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const trimmed = firstMessage.trim().slice(0, MAX_INPUT_CHARS);
  if (!trimmed) return null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = env.WEB_URL;
    headers['X-Title'] = 'Radikal';
  }

  try {
    const r = await fetch(preferredChatEndpoint(), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: preferredChatModel(),
        temperature: 0.3,
        max_tokens: 30,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: trimmed },
        ],
      }),
    });

    if (!r.ok) {
      logger.warn({ status: r.status }, '[chat-title] llm http error');
      return null;
    }

    const data = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!raw) return null;

    const cleaned = raw
      .replace(/^["'`«»“”‘’]+|["'`«»“”‘’]+$/g, '')
      .replace(/[.!?…]+$/, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) return null;
    return cleaned.slice(0, MAX_TITLE_CHARS);
  } catch (err) {
    logger.warn({ err }, '[chat-title] llm fetch failed');
    return null;
  }
}
