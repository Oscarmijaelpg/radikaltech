import { prisma, Prisma } from '@radikal/db';
import { env } from '../../config/env.js';
import {
  PROVIDER_URLS,
  preferredChatEndpoint,
  preferredChatModel,
} from '../../config/providers.js';
import { logger } from '../../lib/logger.js';
import { notificationService } from '../notifications/service.js';

export interface AutoCompetitorDetectInput {
  projectId: string;
  userId: string;
}

export interface DetectedCompetitor {
  id: string;
  name: string;
  website: string | null;
  description: string | null;
  country: string | null;
  why_competitor: string | null;
}

export interface AutoCompetitorResult {
  jobId: string;
  competitors: DetectedCompetitor[];
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

async function tavilySearch(query: string): Promise<TavilyResult[]> {
  if (!env.TAVILY_API_KEY) return [];
  const res = await fetch(PROVIDER_URLS.tavily.search, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: env.TAVILY_API_KEY,
      query,
      search_depth: 'advanced',
      include_answer: false,
      max_results: 12,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}`);
  const body = await res.json();
  return Array.isArray(body.results) ? body.results : [];
}

async function synthesize(
  industry: string,
  countries: string[],
  businessSummary: string,
  results: TavilyResult[],
): Promise<Array<Omit<DetectedCompetitor, 'id'>>> {
  if (!env.OPENROUTER_API_KEY && !env.OPENAI_API_KEY) return [];
  const ctx = results
    .slice(0, 10)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.content.slice(0, 500)}`)
    .join('\n\n');
  const url = preferredChatEndpoint();
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
    body: JSON.stringify({
      model: preferredChatModel(),
      response_format: { type: 'json_object' },
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `Eres un analista estratégico senior especializado en análisis competitivo. Tu objetivo es identificar competidores DIRECTOS del negocio descrito, NO generales de la industria.

Criterios estrictos para considerar "competidor":
1. Opera en la MISMA categoría exacta de producto/servicio (no solo la misma industria).
2. Sirve a un público objetivo similar.
3. Está presente o llega al MISMO mercado geográfico.
4. Es una empresa real con website propio (no directorios, agregadores, noticias).

Descarta:
- Medios/blogs ("tripadvisor", "yelp", "revista X")
- Empresas de otra categoría aunque compartan industria (ej: si es una hamburguesería, NO incluyas pizzerías genéricas)
- Empresas muy grandes globales si el negocio es local/regional
- URLs de Wikipedia, LinkedIn, redes sociales

Devuelves SOLO JSON con:
{
  competitors: [
    {
      name: string (nombre de marca),
      website: string (URL raíz, ej "https://marca.com"),
      description: string (10-25 palabras sobre QUÉ vende y a QUIÉN),
      country: string (ISO alpha-2),
      why_competitor: string (1 frase concreta: por qué compite con el negocio del usuario)
    }
  ]
}

3-6 competidores MUY relevantes. Si no hay suficientes certeros, devuelve solo los que sí lo son (mínimo 2).`,
        },
        {
          role: 'user',
          content: `Negocio a analizar:
- Industria: ${industry}
- Países objetivo: ${countries.join(', ') || 'global'}
- Descripción: ${businessSummary}

Resultados de búsqueda Tavily (evalúa cuáles son realmente competidores directos):
${ctx}

Filtra y devuelve SOLO los competidores directos reales.`,
        },
      ],
    }),
    signal: AbortSignal.timeout(40_000),
  });
  if (!res.ok) throw new Error(`AI ${res.status}`);
  const body = await res.json();
  const content = body.choices?.[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.competitors)) return [];
    return parsed.competitors
      .filter((c: unknown): c is Record<string, unknown> => !!c && typeof c === 'object')
      .slice(0, 6)
      .map((c: Record<string, unknown>) => ({
        name: String(c.name ?? '').trim() || 'Competidor',
        website: typeof c.website === 'string' ? c.website : null,
        description: typeof c.description === 'string' ? c.description : null,
        country: typeof c.country === 'string' ? c.country.toUpperCase().slice(0, 2) : null,
        why_competitor: typeof c.why_competitor === 'string' ? c.why_competitor : null,
      }));
  } catch {
    return [];
  }
}

export class AutoCompetitorDetector {
  async detect(input: AutoCompetitorDetectInput): Promise<AutoCompetitorResult> {
    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) throw new Error('Project not found');

    const countries =
      project.operatingCountries.length > 0
        ? project.operatingCountries
        : project.operatingCountriesSuggested;
    const industry = project.industry ?? project.industryCustom ?? 'general';
    const countryText = countries.length > 0 ? countries.join(', ') : 'Latinoamérica';

    const job = await prisma.aiJob.create({
      data: {
        kind: 'auto_competitor_detect',
        status: 'running',
        input: { industry, countries } as unknown as Prisma.InputJsonValue,
        projectId: input.projectId,
        userId: input.userId,
      },
    });

    try {
      // Query más específica basada en el business_summary (no solo industry genérica)
      const bizSnippet = (project.businessSummary ?? '').split(/[.!?]/)[0]?.trim().slice(0, 100);
      const query = bizSnippet
        ? `competidores directos de "${bizSnippet}" en ${countryText}`
        : `competidores directos de ${industry} en ${countryText}`;
      const results = await tavilySearch(query);
      const synthed = await synthesize(
        industry,
        countries,
        project.businessSummary ?? '',
        results,
      );

      const created: DetectedCompetitor[] = [];
      for (const c of synthed) {
        try {
          const rec = await prisma.competitor.create({
            data: {
              projectId: input.projectId,
              userId: input.userId,
              name: c.name,
              website: c.website ?? null,
              notes: c.why_competitor ?? c.description ?? null,
              status: 'suggested',
              source: 'auto_detected',
              detectedAt: new Date(),
            },
          });
          created.push({
            id: rec.id,
            name: rec.name,
            website: rec.website,
            description: c.description,
            country: c.country,
            why_competitor: c.why_competitor,
          });
        } catch (err) {
          logger.warn({ err, name: c.name }, 'failed to persist auto competitor');
        }
      }

      await prisma.aiJob.update({
        where: { id: job.id },
        data: {
          status: 'succeeded',
          output: { count: created.length } as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });

      return { jobId: job.id, competitors: created };
    } catch (err) {
      logger.error({ err }, 'auto competitor detector failed');
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: String(err), finishedAt: new Date() },
      });
      await notificationService
        .jobFailed({
          userId: input.userId,
          projectId: input.projectId,
          jobKind: 'auto_competitor_detect',
          error: String(err),
        })
        .catch(() => null);
      throw err;
    }
  }
}
