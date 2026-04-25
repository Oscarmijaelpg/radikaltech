import { env } from '../../../config/env.js';
import { LLM_MODELS, PROVIDER_URLS } from '../../../config/providers.js';
import { logger } from '../../../lib/logger.js';
import type { WebsiteAnalysisResult } from './types.js';

const LLM_TIMEOUT_MS = 30_000;
const LLM_TEMPERATURE = 0.3;
const MAX_MARKDOWN_CHARS = 8000;

async function callChatCompletion(prompt: string): Promise<string> {
  const payload = {
    model: LLM_MODELS.chat.openai,
    messages: [
      {
        role: 'system',
        content: 'Eres un analista de marcas experto. Respondes siempre con JSON válido.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: LLM_TEMPERATURE,
  };

  if (env.OPENAI_API_KEY) {
    const res = await fetch(PROVIDER_URLS.openai.chatCompletions, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });
    if (res.ok) {
      const body = await res.json();
      return body.choices?.[0]?.message?.content ?? '{}';
    }
    const txt = await res.text().catch(() => '');
    logger.warn(
      { status: res.status, body: txt.slice(0, 200) },
      'OpenAI failed, trying OpenRouter',
    );
  }

  if (env.OPENROUTER_API_KEY) {
    const res = await fetch(PROVIDER_URLS.openrouter.chatCompletions, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': env.WEB_URL,
        'X-Title': 'Radikal',
      },
      body: JSON.stringify({ ...payload, model: LLM_MODELS.chat.openrouter }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`OpenRouter ${res.status}: ${await res.text().catch(() => '')}`);
    }
    const body = await res.json();
    return body.choices?.[0]?.message?.content ?? '{}';
  }

  throw new Error('No hay proveedor de IA configurado (OPENAI_API_KEY u OPENROUTER_API_KEY)');
}

export async function extractInfoWithAI(
  markdown: string,
  url: string,
): Promise<WebsiteAnalysisResult['detected_info']> {
  const trimmed = markdown.slice(0, MAX_MARKDOWN_CHARS);
  const prompt = `Analiza el siguiente contenido de un sitio web y devuelve un JSON con los campos: brand_name, industry, business_summary (50-150 palabras), main_products (una cadena con una línea por producto/servicio), ideal_customer (1-2 frases), unique_value (1 frase), value_propositions (array de 3-5 strings). Si un campo no se puede deducir, usa null o array vacío. Devuelve SOLO el JSON.

URL: ${url}

Contenido:
${trimmed}`;

  const content = await callChatCompletion(prompt);
  try {
    const parsed = JSON.parse(content);
    return {
      brand_name: parsed.brand_name ?? undefined,
      industry: parsed.industry ?? undefined,
      business_summary: parsed.business_summary ?? undefined,
      main_products: Array.isArray(parsed.main_products)
        ? parsed.main_products.join('\n')
        : (parsed.main_products ?? undefined),
      ideal_customer: parsed.ideal_customer ?? undefined,
      unique_value: parsed.unique_value ?? undefined,
      value_propositions: Array.isArray(parsed.value_propositions)
        ? parsed.value_propositions
        : [],
    };
  } catch (err) {
    logger.warn({ err, content: content.slice(0, 200) }, 'failed to parse OpenAI extraction');
    return {};
  }
}
