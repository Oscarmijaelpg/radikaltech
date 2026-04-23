import { prisma, Prisma } from '@radikal/db';
import { logger } from '../../lib/logger.js';
import { notificationService } from '../notifications/service.js';
import { geminiSearch } from './gemini-search.js';

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
  social_links?: Record<string, string>;
}

export interface AutoCompetitorResult {
  jobId: string;
  competitors: DetectedCompetitor[];
}

const SYSTEM_PROMPT = `Eres analista estratégico senior en inteligencia competitiva internacional.
Usa la búsqueda web de Google para identificar competidores reales y vigentes del negocio que te indique el usuario.

Criterios estrictos:
- Competidor DIRECTO: misma categoría exacta de producto/servicio (no solo misma industria).
- Mismo mercado geográfico o llegada operativa al país objetivo.
- Empresa real con website propio y operación comparable.

Descarta de raíz: Wikipedia, LinkedIn, Facebook, Instagram, TikTok, Twitter/X, directorios, agregadores, medios/blogs de noticias, foros, marketplaces genéricos (Amazon, Mercado Libre) salvo que compitan como producto.

Tu única salida es un array JSON válido, sin texto adicional, sin markdown fences, sin comentarios.
Empieza con [ y termina con ].`;

function stripJsonWrapping(text: string): string {
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const start = t.indexOf('[');
  const end = t.lastIndexOf(']');
  if (start >= 0 && end > start) return t.slice(start, end + 1);
  return t;
}

interface RawCompetitor {
  name?: unknown;
  website?: unknown;
  description?: unknown;
  country?: unknown;
  why_competitor?: unknown;
  social_links?: unknown;
}

const EXCLUDED_HOSTS = /(?:wikipedia|linkedin|facebook|instagram|tiktok|twitter|x\.com|youtube|reddit|amazon|mercadolibre)\./i;

function parseCompetitors(text: string): Array<Omit<DetectedCompetitor, 'id'>> {
  const clean = stripJsonWrapping(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch (err) {
    logger.warn({ err, snippet: clean.slice(0, 200) }, 'failed to parse competitor JSON');
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((c): c is RawCompetitor => !!c && typeof c === 'object')
    .map((c) => {
      const social =
        c.social_links && typeof c.social_links === 'object'
          ? (c.social_links as Record<string, unknown>)
          : {};
      const normalized: Record<string, string> = {};
      for (const [k, v] of Object.entries(social)) {
        if (typeof v === 'string' && v.trim()) normalized[k] = v.trim();
      }
      return {
        name: typeof c.name === 'string' ? c.name.trim() || 'Competidor' : 'Competidor',
        website: typeof c.website === 'string' ? c.website.trim() : null,
        description: typeof c.description === 'string' ? c.description : null,
        country:
          typeof c.country === 'string' ? c.country.toUpperCase().slice(0, 2) : null,
        why_competitor:
          typeof c.why_competitor === 'string' ? c.why_competitor : null,
        social_links: normalized,
      };
    })
    .filter((c) => !c.website || !EXCLUDED_HOSTS.test(c.website))
    .slice(0, 6);
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
      const lines = [
        'Negocio a analizar:',
        `- Nombre: ${project.companyName ?? 'sin nombre'}`,
        `- Industria: ${industry}`,
        `- Países/mercados objetivo: ${countryText}`,
        `- Descripción: ${project.businessSummary ?? 'sin descripción'}`,
      ];
      if (project.mainProducts) {
        lines.push(`- Productos/servicios: ${project.mainProducts}`);
      }
      if (project.uniqueValue) {
        lines.push(`- Propuesta de valor: ${project.uniqueValue}`);
      }
      lines.push(
        '',
        'Instrucciones:',
        '1. Busca competidores DIRECTOS con presencia en al menos uno de los países objetivo.',
        '2. Valida cada competidor con la web: debe existir, tener website propio y operación comparable.',
        '3. Si no encuentras suficientes con certeza, devuelve menos (mínimo 2, máximo 6).',
        '',
        'Devuelve SOLO un array JSON con esta estructura exacta:',
        '[',
        '  {',
        '    "name": "nombre de marca",',
        '    "website": "URL raíz (https://marca.com)",',
        '    "description": "10-25 palabras: qué vende y a quién",',
        '    "country": "ISO alpha-2 del país principal",',
        '    "why_competitor": "1 frase concreta",',
        '    "social_links": { "instagram": "URL o omitir", "tiktok": "URL o omitir", "linkedin": "URL o omitir" }',
        '  }',
        ']',
      );
      const userPrompt = lines.join('\n');

      const search = await geminiSearch(userPrompt, {
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.3,
        timeoutMs: 60_000,
      });

      const synthed = parseCompetitors(search.text);
      if (synthed.length === 0) {
        logger.warn(
          { snippet: search.text.slice(0, 300), sourceCount: search.sources.length },
          'gemini search returned 0 usable competitors',
        );
      }

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
              socialLinks: c.social_links || {},
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
            social_links: rec.socialLinks as Record<string, string>,
          });
        } catch (err) {
          logger.warn({ err, name: c.name }, 'failed to persist auto competitor');
        }
      }

      await prisma.aiJob.update({
        where: { id: job.id },
        data: {
          status: 'succeeded',
          output: {
            count: created.length,
            sources: search.sources.slice(0, 20),
            queries: search.queriesUsed,
          } as unknown as Prisma.InputJsonValue,
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
