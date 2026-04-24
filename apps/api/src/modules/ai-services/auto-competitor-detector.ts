import { prisma, Prisma } from '@radikal/db';
import { logger } from '../../lib/logger.js';
import { notificationService } from '../notifications/service.js';
import { moonshotWebSearch, stripJsonWrapping } from './moonshot.js';

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

const FINAL_COMPETITORS_TARGET = 8;

const SYSTEM_PROMPT = `Eres analista estratégico senior especializado en inteligencia competitiva internacional.
Tienes acceso a la web mediante la herramienta $web_search y DEBES usarla para validar cada competidor que propongas.

Reglas estrictas:
- Competidor DIRECTO: misma categoría exacta de producto/servicio (no solo misma industria).
- Mismo mercado geográfico o llegada operativa al país objetivo.
- Empresa real con website propio y operación vigente verificable.
- Si no encuentras evidencia real con $web_search → NO incluyas el competidor.
- Excluye Wikipedia, LinkedIn, Facebook, Instagram, TikTok, Twitter/X, YouTube, Reddit, agregadores y marketplaces genéricos (Amazon, Mercado Libre) salvo que compitan como producto.

Tu única salida es un objeto JSON válido, sin texto adicional, sin markdown fences, sin comentarios.
Empieza con { y termina con }.`;

interface KimiCompetitor {
  name?: unknown;
  website?: unknown;
  country_hq?: unknown;
  country_competing?: unknown;
  business_model?: unknown;
  evidence_url?: unknown;
  evidence_summary?: unknown;
  social_links?: unknown;
}

interface KimiCompetitorResponse {
  competitors?: unknown;
}

const EXCLUDED_HOSTS =
  /(?:wikipedia|linkedin|facebook|instagram|tiktok|twitter|x\.com|youtube|reddit|amazon|mercadolibre)\./i;

interface ParsedCompetitor {
  name: string;
  website: string | null;
  description: string | null;
  country: string | null;
  why_competitor: string | null;
  social_links: Record<string, string>;
}

function asTrimmedString(v: unknown, max = 500): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

function normalizeSocialLinks(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'string' && val.trim()) out[k] = val.trim();
  }
  return out;
}

function parseCompetitorsFromKimi(text: string): ParsedCompetitor[] {
  const clean = stripJsonWrapping(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch (err) {
    logger.warn({ err, snippet: clean.slice(0, 300) }, 'failed to parse Kimi competitors JSON');
    return [];
  }
  const list = Array.isArray(parsed)
    ? (parsed as unknown[])
    : Array.isArray((parsed as KimiCompetitorResponse)?.competitors)
      ? ((parsed as KimiCompetitorResponse).competitors as unknown[])
      : [];

  return list
    .filter((c): c is KimiCompetitor => !!c && typeof c === 'object')
    .map((c) => {
      const name = asTrimmedString(c.name, 200) ?? 'Competidor';
      const website = asTrimmedString(c.website, 500);
      const businessModel = asTrimmedString(c.business_model, 600);
      const evidenceSummary = asTrimmedString(c.evidence_summary, 400);
      const description = businessModel ?? evidenceSummary;
      const country = asTrimmedString(c.country_competing, 2) ?? asTrimmedString(c.country_hq, 2);
      const why = evidenceSummary ?? businessModel;
      return {
        name,
        website,
        description,
        country: country ? country.toUpperCase().slice(0, 2) : null,
        why_competitor: why,
        social_links: normalizeSocialLinks(c.social_links),
      };
    })
    .filter((c) => !c.website || !EXCLUDED_HOSTS.test(c.website));
}

function dedupByWebsite(list: ParsedCompetitor[]): ParsedCompetitor[] {
  const seen = new Set<string>();
  const out: ParsedCompetitor[] = [];
  for (const c of list) {
    const key = (c.website ?? c.name).toLowerCase().replace(/\/$/, '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

function buildUserPrompt(project: {
  companyName: string | null;
  websiteUrl: string | null;
  businessSummary: string | null;
  mainProducts: string | null;
  uniqueValue: string | null;
  industry: string;
  countryText: string;
}): string {
  const lines = [
    'EMPRESA OBJETIVO',
    `- Nombre: ${project.companyName ?? 'sin nombre'}`,
    `- Web: ${project.websiteUrl ?? 'sin website'}`,
    `- Industria: ${project.industry}`,
    `- Países objetivo: ${project.countryText}`,
    `- Resumen: ${project.businessSummary ?? 'sin descripción'}`,
  ];
  if (project.mainProducts) lines.push(`- Productos: ${project.mainProducts}`);
  if (project.uniqueValue) lines.push(`- Propuesta de valor: ${project.uniqueValue}`);

  lines.push(
    '',
    'TAREA',
    `Identifica entre 5 y ${FINAL_COMPETITORS_TARGET} competidores REALES y VIGENTES en los países objetivo.`,
    'Usa $web_search exhaustivamente desde múltiples ángulos:',
    '1. "alternativas a [producto principal] en [país]"',
    '2. "competidores de [marca conocida similar] en [industria]"',
    '3. "[categoría] empresas [país]"',
    '4. "[producto] para [cliente ideal]"',
    '',
    'FORMATO DE SALIDA (JSON estricto, sin markdown fences):',
    '{',
    '  "competitors": [',
    '    {',
    '      "name": "Nombre de la marca",',
    '      "website": "https://dominio-raiz.com",',
    '      "country_hq": "ISO alpha-2 país sede (CO, MX, US...)",',
    '      "country_competing": "ISO alpha-2 país donde compite con la empresa objetivo",',
    '      "business_model": "Qué vende y a quién (max 60 palabras)",',
    '      "evidence_url": "URL real verificada con $web_search",',
    '      "evidence_summary": "1 frase: por qué compite directamente con la empresa objetivo",',
    '      "social_links": { "instagram": "URL o omitir", "tiktok": "URL o omitir", "linkedin": "URL o omitir" }',
    '    }',
    '  ]',
    '}',
  );
  return lines.join('\n');
}

export class AutoCompetitorDetector {
  async detect(input: AutoCompetitorDetectInput): Promise<AutoCompetitorResult> {
    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) throw new Error('Project not found');

    const countryText =
      (project.operatingCountries?.trim() ||
        project.operatingCountriesSuggested?.trim() ||
        'Latinoamérica');
    const industry = project.industry ?? project.industryCustom ?? 'general';

    const job = await prisma.aiJob.create({
      data: {
        kind: 'auto_competitor_detect',
        status: 'running',
        input: { industry, countries: countryText } as unknown as Prisma.InputJsonValue,
        projectId: input.projectId,
        userId: input.userId,
      },
    });

    try {
      const userPrompt = buildUserPrompt({
        companyName: project.companyName,
        websiteUrl: project.websiteUrl,
        businessSummary: project.businessSummary,
        mainProducts: project.mainProducts,
        uniqueValue: project.uniqueValue,
        industry,
        countryText,
      });

      const search = await moonshotWebSearch({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt,
      });

      const parsed = parseCompetitorsFromKimi(search.text);
      const deduped = dedupByWebsite(parsed).slice(0, FINAL_COMPETITORS_TARGET);

      if (deduped.length === 0) {
        logger.warn(
          { snippet: search.text.slice(0, 400), iterations: search.iterations },
          'kimi returned 0 usable competitors',
        );
      }

      logger.info(
        {
          parsedCount: parsed.length,
          finalCount: deduped.length,
          iterations: search.iterations,
          toolCalls: search.toolCallsMade,
        },
        'auto-competitor-detector pipeline',
      );

      const created: DetectedCompetitor[] = [];
      for (const c of deduped) {
        try {
          const rec = await prisma.competitor.create({
            data: {
              projectId: input.projectId,
              userId: input.userId,
              name: c.name,
              website: c.website ?? null,
              notes: c.why_competitor ?? c.description ?? null,
              socialLinks: c.social_links,
              status: 'suggested',
              source: 'auto_detected',
              detectedAt: new Date(),
              analysisData: {
                autoDetected: {
                  pipeline: 'moonshot-kimi-k2',
                  evidenceUrl: null,
                },
              } as unknown as Prisma.InputJsonValue,
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
            iterations: search.iterations,
            toolCalls: search.toolCallsMade,
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
