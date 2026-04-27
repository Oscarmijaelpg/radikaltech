import { prisma } from '@radikal/db';
import { logger } from '../../lib/logger.js';
import { notificationService } from '../notifications/service.js';
import { moonshotWebSearch, stripJsonWrapping } from './moonshot.js';
import { brandSynthesizer } from './index.js';
import fs from 'node:fs/promises';
import path from 'node:path';

export class InitialIntelligenceOrchestrator {
  async runInitialIntelligence(input: { projectId: string; userId: string }) {
    const { projectId, userId } = input;
    
    // 1. Obtener contexto de la empresa (lo generado por brandOrchestrator)
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    const brand = await prisma.brandProfile.findUnique({ where: { projectId } });

    if (!project) {
      logger.error('Project not found for initial intelligence');
      return;
    }

    const companyData = {
      name: project.companyName ?? project.name,
      website: project.websiteUrl,
      industry: project.industry,
      industryCustom: project.industryCustom,
      businessSummary: project.businessSummary,
      products: project.mainProducts,
      markets: project.operatingCountries,
      essence: brand?.essence,
      mission: brand?.mission,
      values: brand?.brandValues,
      targetAudience: brand?.targetAudience,
      competitiveAdvantage: brand?.competitiveAdvantage,
    };

    const companyDataStr = JSON.stringify(companyData, null, 2);

    try {
      // 2. Leer los prompts base
      // Asumimos que process.cwd() es apps/api y docs/ está en ../../docs
      const docsDir = path.join(process.cwd(), '..', '..', 'docs');
      const newsPromptBase = await fs.readFile(path.join(docsDir, 'busqueda_noticias.txt'), 'utf-8');
      const compPromptBase = await fs.readFile(path.join(docsDir, 'busqueda_competencia.txt'), 'utf-8');

      // 3. Generar el prompt final de noticias
      const newsInstruction = `
${newsPromptBase}

Datos de la empresa:
${companyDataStr}
`;
      logger.info('Generando prompt final de noticias...');
      const finalNewsPrompt = await brandSynthesizer.getLLMCompletion(newsInstruction);

      // 4. Buscar Noticias con Kimi K2.5
      logger.info('Ejecutando búsqueda de noticias en Kimi...');
      const newsSearch = await moonshotWebSearch({
        systemPrompt: 'Eres un analista senior de inteligencia. HOY ES 27 DE ABRIL DE 2026. Tu misión es buscar noticias y tendencias ACTUALES (2025-2026). Devuelve tu análisis en formato Markdown limpio, estructurado y usando las fuentes encontradas con enlaces reales.',
        userPrompt: finalNewsPrompt || 'Busca noticias para esta empresa: ' + companyData.name,
      });

      // Guardar el reporte de noticias
      await prisma.report.create({
        data: {
          projectId,
          userId,
          title: 'Reporte Inicial de Noticias',
          reportType: 'news',
          content: newsSearch.text,
          summary: 'Análisis sectorial generado a partir del escaneo del sitio web.',
          sourceData: { pipeline: 'initial-intelligence-news', promptUsed: finalNewsPrompt },
        },
      });

      // 5. Generar el prompt final de competencia
      const compInstruction = `
${compPromptBase}

Datos de la empresa:
${companyDataStr}
`;
      logger.info('Generando prompt final de competencia...');
      const finalCompPrompt = await brandSynthesizer.getLLMCompletion(compInstruction);

      // 6. Buscar Competencia con Kimi K2.5
      logger.info('Ejecutando búsqueda de competencia en Kimi...');
      const compSearch = await moonshotWebSearch({
        systemPrompt: 'Eres un analista estratégico senior. HOY ES 27 DE ABRIL DE 2026. Tu misión es buscar competidores y estrategias ACTUALES (2025-2026). Devuelve tu análisis en formato Markdown limpio, estructurado y usando las fuentes encontradas con enlaces reales.',
        userPrompt: finalCompPrompt || 'Busca competencia para esta empresa: ' + companyData.name,
      });

      // Guardar el reporte de competencia
      await prisma.report.create({
        data: {
          projectId,
          userId,
          title: 'Reporte Inicial de Competencia',
          reportType: 'competition',
          content: compSearch.text,
          summary: 'Análisis competitivo inicial generado a partir del escaneo del sitio web.',
          sourceData: { pipeline: 'initial-intelligence-comp', promptUsed: finalCompPrompt },
        },
      });

      // 7. Extraer competidores del Markdown para crear tarjetas en la DB
      logger.info('Extrayendo competidores a tarjetas de base de datos...');
      const extractPrompt = `
Tienes un reporte en Markdown sobre la competencia de una empresa.
Necesito que extraigas la lista de competidores mencionados y devuelvas un JSON estricto con esta estructura:
{
  "competitors": [
    {
      "name": "Nombre de la empresa",
      "website": "URL si está disponible, o null",
      "country": "ISO país de 2 letras (ej. CO, MX, US), o null",
      "business_model": "Breve descripción",
      "evidence_summary": "Por qué es competidor"
    }
  ]
}
Solo devuelve el JSON, sin markdown.

REPORTE:
${compSearch.text}
`;
      const extractedCompetitorsStr = await brandSynthesizer.getLLMCompletion(extractPrompt);
      if (extractedCompetitorsStr) {
        try {
          const cleanJson = stripJsonWrapping(extractedCompetitorsStr);
          const parsed = JSON.parse(cleanJson);
          const competitors = Array.isArray(parsed.competitors) ? parsed.competitors : [];
          
          for (const c of competitors) {
            if (!c.name) continue;
            await prisma.competitor.create({
              data: {
                projectId,
                userId,
                name: String(c.name).slice(0, 200),
                website: c.website ? String(c.website).slice(0, 500) : null,
                notes: c.evidence_summary ? String(c.evidence_summary) : null,
                status: 'suggested',
                source: 'auto_detected',
                analysisData: {
                  businessModel: c.business_model,
                  country: c.country,
                  pipeline: 'initial-intelligence',
                },
              },
            });
          }
        } catch (err) {
          logger.warn({ err }, 'Fallo al parsear los competidores extraídos');
        }
      }

      logger.info('Initial Intelligence finalizada con éxito.');
      
      await notificationService.notify({
        userId,
        projectId,
        title: 'Inteligencia Inicial Completada',
        message: 'Los reportes de noticias y competencia han sido generados exitosamente.',
        type: 'success',
      }).catch(() => null);

    } catch (err) {
      logger.error({ err }, 'Error en InitialIntelligenceOrchestrator');
    }
  }
}
