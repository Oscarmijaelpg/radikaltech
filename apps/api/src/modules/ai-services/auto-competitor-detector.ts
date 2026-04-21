import { prisma, Prisma } from '@radikal/db';
import { logger } from '../../lib/logger.js';
import { notificationService } from '../notifications/service.js';
import { moonshotWebSearch } from './moonshot.js';

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

export class AutoCompetitorDetector {
  async detect(input: AutoCompetitorDetectInput): Promise<AutoCompetitorResult> {
    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) throw new Error('Project not found');

    const countries =
      project.operatingCountries.length > 0
        ? project.operatingCountries
        : project.operatingCountriesSuggested;
    const industry = project.industry ?? project.industryCustom ?? 'general';
    const countryText = countries.length > 0 ? countries.join(', ') : 'Global';

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
      const systemPrompt = `Actúa como analista estratégico senior especializado en inteligencia competitiva internacional. Tienes acceso a la web mediante la herramienta \`$web_search\`. TU TAREA PRINCIPAL es buscar competidores reales y actuales en internet.
Debes devolver tu respuesta EXCLUSIVAMENTE en formato JSON válido.

Empresa objetivo:
Nombre: ${project.companyName || 'Desconocida'}
Contexto de la empresa: ${project.businessSummary || 'No especificado'}
Industria principal: ${industry}
Ubicación o mercado geográfico: ${countryText}

Objetivo de la investigación:
El análisis competitivo debe limitarse a los países válidos identificados en el contexto. Utiliza \`$web_search\` para descubrir, verificar la presencia geográfica y validar el producto/servicio de los competidores.

Fase 1 – Identificación de competidores
Selecciona entre 5 y 10 competidores reales validados mediante tus búsquedas.
⚠️ Regla estricta: Si no encuentras evidencia en la web con un enlace verificable para un competidor, NO LO INCLUYAS.

Formato Obligatorio de Salida (JSON):
Debes devolver un JSON con esta estructura exacta:
{
  "competitors": [
    {
      "name": "Nombre de marca",
      "website": "URL oficial",
      "country": "País donde compite (ISO 2 letras, ej: 'MX', 'CO')",
      "description": "Modelo de Negocio (máx 60 palabras)",
      "why_competitor": "Evidencia verificable y razón por la cual compite, incluyendo URL probatoria de su existencia"
    }
  ]
}`;

      const userPrompt = `Inicia la búsqueda de competidores para ${project.companyName || 'la empresa'} en ${countryText}. Recuerda usar $web_search y devolver SOLO el formato JSON.`;

      const rawMoonshotResult = await moonshotWebSearch(systemPrompt, userPrompt);
      
      let parsedData: any;
      try {
        const jsonStr = rawMoonshotResult.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        parsedData = JSON.parse(jsonStr);
      } catch (err) {
        logger.error({ err, rawMoonshotResult }, 'Failed to parse Moonshot Competitors JSON');
        throw new Error('Moonshot output was not valid JSON');
      }

      const synthed = Array.isArray(parsedData?.competitors) ? parsedData.competitors : [];

      const created: DetectedCompetitor[] = [];
      for (const c of synthed) {
        if (!c.name) continue;
        try {
          const rec = await prisma.competitor.create({
            data: {
              projectId: input.projectId,
              userId: input.userId,
              name: c.name,
              website: c.website ?? null,
              notes: c.why_competitor ?? c.description ?? null,
              status: 'suggested', // Se guarda como sugerido para la UI
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

