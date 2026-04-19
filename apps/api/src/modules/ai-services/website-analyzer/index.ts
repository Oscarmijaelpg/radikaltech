import { prisma, Prisma } from '@radikal/db';
import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';
import { BadRequest } from '../../../lib/errors.js';
import { notificationService } from '../../notifications/service.js';
import { extractInfoWithAI } from './ai-extractor.js';
import { detectLogoCandidates, downloadAndStoreLogo } from './logo-detector.js';
import { firecrawlScrape } from './scrape.js';
import type {
  AnalyzeWebsiteInput,
  FirecrawlScrapeResponse,
  WebsiteAnalysisResult,
} from './types.js';

export { detectLogoCandidates } from './logo-detector.js';
export type {
  AnalyzeWebsiteInput,
  WebsiteAnalysisResult,
} from './types.js';

const MIN_MARKDOWN_CHARS_FOR_AI = 100;
const MIN_MARKDOWN_CHARS_FOR_USEFUL_CONTENT = 40;
const EXCERPT_MAX_CHARS = 280;

export class WebsiteAnalyzer {
  async analyze(
    input: AnalyzeWebsiteInput,
  ): Promise<{ jobId: string; result: WebsiteAnalysisResult }> {
    const job = await prisma.aiJob.create({
      data: {
        kind: 'website_analyze',
        status: 'running',
        input: { url: input.url },
        projectId: input.projectId,
        userId: input.userId,
      },
    });

    try {
      let markdown = '';
      let metadata: WebsiteAnalysisResult['metadata'] = {};
      let scrape: FirecrawlScrapeResponse | undefined;

      if (env.FIRECRAWL_API_KEY) {
        logger.info({ url: input.url }, 'firecrawl scrape start');
        scrape = await firecrawlScrape(input.url);
        if (scrape.success && scrape.data) {
          markdown = scrape.data.markdown ?? '';
          metadata = {
            title: scrape.data.metadata?.title ?? scrape.data.metadata?.ogTitle,
            description:
              scrape.data.metadata?.description ?? scrape.data.metadata?.ogDescription,
            language: scrape.data.metadata?.language,
          };
          logger.info(
            { url: input.url, mdLen: markdown.length, title: metadata.title },
            'firecrawl scrape ok',
          );
        } else {
          logger.warn({ url: input.url, scrape }, 'firecrawl returned success:false');
          throw new BadRequest(
            `No pudimos acceder al sitio web. Verifica que la URL sea correcta y el sitio esté accesible públicamente.`,
          );
        }
      } else {
        logger.warn('FIRECRAWL_API_KEY not set — returning empty analysis');
      }

      // Si el sitio respondió pero sin contenido útil (SPA sin SSR, 404 con poco contenido,
      // bloqueo anti-bot), avisamos al usuario en vez de devolver un análisis vacío silencioso.
      if (
        env.FIRECRAWL_API_KEY &&
        markdown.trim().length < MIN_MARKDOWN_CHARS_FOR_USEFUL_CONTENT
      ) {
        logger.warn(
          { url: input.url, mdLen: markdown.length, title: metadata.title },
          'firecrawl returned near-empty markdown',
        );
        throw new BadRequest(
          `El sitio respondió pero no devolvió contenido legible (puede ser una app JavaScript sin renderizado del servidor o un bloqueo anti-bot).`,
        );
      }

      let detected: WebsiteAnalysisResult['detected_info'] = {};
      if (markdown.length > MIN_MARKDOWN_CHARS_FOR_AI) {
        logger.info('openai extraction start');
        detected = await extractInfoWithAI(markdown, input.url);
        logger.info({ fields: Object.keys(detected) }, 'openai extraction ok');
      }

      let logoAssetId: string | undefined;
      let logoFinalUrl: string | undefined;
      try {
        if (scrape) {
          const candidates = detectLogoCandidates(scrape, input.url);
          logger.info(
            { count: candidates.length, first: candidates.slice(0, 3) },
            'logo candidates',
          );
          if (candidates.length > 0) {
            const stored = await downloadAndStoreLogo(candidates, input.userId, input.projectId);
            if (stored) {
              logoFinalUrl = stored.publicUrl;
              logoAssetId = stored.assetId;
            }
          }
        }
      } catch (err) {
        logger.warn({ err }, 'logo auto-detection failed');
      }

      // Extraer paleta de colores del logo con Gemini Vision (sugerida).
      if (logoFinalUrl && input.projectId && env.GEMINI_API_KEY) {
        try {
          const { imageAnalyzer } = await import('../image-analyzer.js');
          const analysis = await imageAnalyzer.analyze(logoFinalUrl);
          if (analysis?.dominant_colors?.length) {
            const existing = await prisma.brandProfile.findUnique({
              where: { projectId: input.projectId },
            });
            // Solo guardar como sugerida (no pisa la confirmada).
            if (existing) {
              await prisma.brandProfile.update({
                where: { projectId: input.projectId },
                data: {
                  colorPaletteSuggested:
                    analysis.dominant_colors as unknown as Prisma.InputJsonValue,
                },
              });
            } else {
              await prisma.brandProfile.create({
                data: {
                  projectId: input.projectId,
                  userId: input.userId,
                  colorPaletteSuggested:
                    analysis.dominant_colors as unknown as Prisma.InputJsonValue,
                },
              });
            }
            logger.info(
              { colors: analysis.dominant_colors.length },
              'palette suggested from logo',
            );
          }
        } catch (err) {
          logger.warn({ err }, 'palette extraction from logo failed');
        }
      }

      const result: WebsiteAnalysisResult = {
        url: input.url,
        pages: [
          { url: input.url, title: metadata.title, excerpt: markdown.slice(0, EXCERPT_MAX_CHARS) },
        ],
        metadata,
        detected_info: detected,
        logo_url: logoFinalUrl,
        logo_asset_id: logoAssetId,
      };

      await prisma.aiJob.update({
        where: { id: job.id },
        data: {
          status: 'succeeded',
          output: result as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });

      return { jobId: job.id, result };
    } catch (err) {
      logger.error({ err }, 'website analyzer failed');
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: String(err), finishedAt: new Date() },
      });
      await notificationService.jobFailed({
        userId: input.userId,
        projectId: input.projectId ?? null,
        jobKind: 'website_analyze',
        error: String(err),
      });
      throw err;
    }
  }
}
