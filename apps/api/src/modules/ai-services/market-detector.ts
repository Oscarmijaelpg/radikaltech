import { prisma } from '@radikal/db';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export interface DetectMarketsInput {
  projectId: string;
  userId: string;
  websiteMarkdown?: string;
}

export interface DetectMarketsResult {
  countries: string[];
  regions: string[];
  evidence: string;
  confidence?: number;
}

async function callOpenRouter(system: string, user: string): Promise<string> {
  if (!env.OPENROUTER_API_KEY && !env.OPENAI_API_KEY) {
    throw new Error('No hay proveedor de IA configurado');
  }
  const payload = {
    model: env.OPENROUTER_API_KEY ? 'openai/gpt-4o-mini' : 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  };
  const url = env.OPENROUTER_API_KEY
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.OPENROUTER_API_KEY ?? env.OPENAI_API_KEY}`,
  };
  if (env.OPENROUTER_API_KEY) {
    headers['HTTP-Referer'] = env.WEB_URL;
    headers['X-Title'] = 'Radikal';
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`AI provider ${res.status}: ${await res.text().catch(() => '')}`);
  const body = await res.json();
  return body.choices?.[0]?.message?.content ?? '{}';
}

export class MarketDetector {
  async detect(input: DetectMarketsInput): Promise<DetectMarketsResult> {
    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) return { countries: [], regions: [], evidence: '' };

    const markdown = (input.websiteMarkdown ?? '').slice(0, 8000);
    const summary = project.businessSummary ?? '';

    if (markdown.length < 50 && summary.length < 20) {
      return { countries: [], regions: [], evidence: '' };
    }

    const system =
      "Eres un analista de mercado. Devuelves SOLO JSON con { countries: array de códigos ISO-3166-1 alpha-2 (ej ['PE','BO','CO']), regions: array de nombres de regiones/ciudades si aplica, confidence: 0-1, evidence: string con la frase del sitio que lo indica }.";
    const user = `Contenido del sitio:\n${markdown}\n\nDescripción del negocio:\n${summary}`;

    try {
      const raw = await callOpenRouter(system, user);
      const parsed = JSON.parse(raw);
      const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;
      if (confidence < 0.5) return { countries: [], regions: [], evidence: '', confidence };
      const countries = Array.isArray(parsed.countries)
        ? parsed.countries
            .filter((c: unknown): c is string => typeof c === 'string')
            .map((c: string) => c.toUpperCase().slice(0, 2))
        : [];
      const regions = Array.isArray(parsed.regions)
        ? parsed.regions.filter((r: unknown): r is string => typeof r === 'string')
        : [];
      return {
        countries,
        regions,
        evidence: typeof parsed.evidence === 'string' ? parsed.evidence : '',
        confidence,
      };
    } catch (err) {
      logger.warn({ err }, 'market detector failed');
      return { countries: [], regions: [], evidence: '' };
    }
  }
}
