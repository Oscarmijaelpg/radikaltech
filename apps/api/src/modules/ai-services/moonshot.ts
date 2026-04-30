import { env } from '../../config/env.js';
import { LLM_MODELS, PROVIDER_URLS } from '../../config/providers.js';
import { BadRequest } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

export interface MoonshotWebSearchOptions {
  systemPrompt?: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxIterations?: number;
  timeoutMs?: number;
}

export interface MoonshotWebSearchResult {
  text: string;
  iterations: number;
  toolCallsMade: number;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface ChatChoice {
  message: ChatMessage;
  finish_reason: 'stop' | 'tool_calls' | 'length' | string;
}

interface ChatCompletion {
  choices: ChatChoice[];
}

// Kimi K2 (kimi-k2.5 / kimi-k2.6) impone temperature = 0.6 estricto. Cualquier
// otro valor devuelve 400 invalid_request_error. Para mantener una API estable
// hardcodeamos 0.6 — el `temperature` opt del caller queda como hint para
// modelos futuros, pero hoy se ignora si el modelo es de la familia kimi-k2.
const KIMI_K2_FORCED_TEMPERATURE = 0.6;
const DEFAULT_TEMPERATURE = KIMI_K2_FORCED_TEMPERATURE;
const DEFAULT_MAX_ITERATIONS = 4;
const DEFAULT_TIMEOUT_MS = 300_000; // 5 minutos para búsquedas profundas

const TOOLS_PAYLOAD = [
  { type: 'builtin_function', function: { name: '$web_search' } },
] as const;

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

/**
 * Llama a Moonshot Kimi K2 con la builtin `$web_search` activa y resuelve
 * el loop de tool_calls hasta obtener la respuesta final.
 *
 * El motor server-side de Moonshot ejecuta la búsqueda; nosotros solo
 * tenemos que devolver un mensaje `role:tool` con los args echoeados
 * para que el modelo continúe.
 */
export async function moonshotWebSearch(
  opts: MoonshotWebSearchOptions,
): Promise<MoonshotWebSearchResult> {
  if (!env.MOONSHOT_API_KEY) {
    throw new BadRequest('MOONSHOT_API_KEY no está configurada');
  }
  const model = opts.model ?? env.MOONSHOT_MODEL ?? LLM_MODELS.search.moonshot;
  const isKimiK2 = model.startsWith('kimi-k2');
  const temperature = isKimiK2
    ? KIMI_K2_FORCED_TEMPERATURE
    : (opts.temperature ?? DEFAULT_TEMPERATURE);
  const maxIterations = opts.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const messages: ChatMessage[] = [];
  if (opts.systemPrompt) {
    messages.push({ role: 'system', content: opts.systemPrompt });
  }
  messages.push({ role: 'user', content: opts.userPrompt });

  let toolCallsMade = 0;
  let iterations = 0;
  let lastText = '';

  while (iterations < maxIterations) {
    iterations += 1;
    const body = {
      model,
      messages,
      temperature,
      tools: TOOLS_PAYLOAD,
      thinking: { type: 'disabled' },
    };

    const res = await fetch(PROVIDER_URLS.moonshot.chatCompletions, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.MOONSHOT_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      logger.warn(
        { status: res.status, body: errBody.slice(0, 400), model },
        'moonshot chat.completions failed',
      );
      throw new BadRequest(`Moonshot ${res.status}: ${errBody.slice(0, 300)}`);
    }

    const json = (await res.json()) as ChatCompletion;
    const choice = json.choices?.[0];
    if (!choice) {
      throw new BadRequest('Moonshot devolvió respuesta vacía (sin choices)');
    }

    lastText = choice.message.content ?? lastText;

    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
      messages.push(choice.message);
      for (const call of choice.message.tool_calls) {
        toolCallsMade += 1;
        const args = safeJsonParse(call.function.arguments);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: call.function.name,
          content: JSON.stringify(args),
        });
      }
      continue;
    }

    return { text: lastText ?? '', iterations, toolCallsMade };
  }

  logger.warn({ iterations, toolCallsMade }, 'moonshot loop hit maxIterations');
  return { text: lastText ?? '', iterations, toolCallsMade };
}

/**
 * Quita ``` ```json fences y aísla el primer bloque JSON ({...} o [...]) del texto.
 * Tolerante a respuestas con preámbulo/cierre del modelo.
 */
export function stripJsonWrapping(text: string): string {
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const objStart = t.indexOf('{');
  const arrStart = t.indexOf('[');
  let start = -1;
  let end = -1;
  if (objStart >= 0 && (arrStart < 0 || objStart < arrStart)) {
    start = objStart;
    end = t.lastIndexOf('}');
  } else if (arrStart >= 0) {
    start = arrStart;
    end = t.lastIndexOf(']');
  }
  if (start >= 0 && end > start) return t.slice(start, end + 1);
  return t;
}
