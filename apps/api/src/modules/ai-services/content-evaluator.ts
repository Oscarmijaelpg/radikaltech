import { prisma, Prisma } from '@radikal/db';
import { env } from '../../config/env.js';
import { LLM_MODELS, PROVIDER_URLS, preferredChatProvider } from '../../config/providers.js';
import { logger } from '../../lib/logger.js';
import { imageAnalyzer } from './image-analyzer.js';
import { NotFound, Forbidden } from '../../lib/errors.js';

export interface ContentEvaluationResult {
  aesthetic_score: number;
  marketing_feedback: string;
  tags: string[];
  suggestions: string[];
  detected_elements: string[];
}

export interface EvaluateContentInput {
  assetId: string;
  userId: string;
  projectId?: string;
}



export class ContentEvaluator {
  /**
   * Realiza el análisis completo (Marketing + Dirección de Arte) sobre una URL.
   * Útil para flujos donde queremos los datos ANTES de persistir en la DB.
   */
  static async evaluateImageUrl(imageUrl: string): Promise<{ 
    marketing: ContentEvaluationResult; 
    art: ImageVisualAnalysis | null;
  }> {
    // SINGLE CALL: ImageAnalyzer now performs both Art Direction and Marketing analysis
    const art = await imageAnalyzer.analyze(imageUrl).catch(() => null);
    
    if (!art) {
      return {
        marketing: {
          aesthetic_score: 0,
          marketing_feedback: '',
          tags: [],
          suggestions: [],
          detected_elements: [],
        } as any,
        art: null
      };
    }

    return {
      marketing: {
        aesthetic_score: art.aesthetic_score,
        marketing_feedback: '', // Removed marketing analysis
        tags: art.tags,
        suggestions: art.suggestions,
        detected_elements: art.detected_elements,
      } as any,
      art
    };
  }

  async evaluate(
    input: EvaluateContentInput,
  ): Promise<{ jobId: string; result: ContentEvaluationResult }> {
    const asset = await prisma.contentAsset.findUnique({ where: { id: input.assetId } });
    if (!asset) throw new NotFound('Asset not found');
    if (asset.userId !== input.userId) throw new Forbidden();

    const job = await prisma.aiJob.create({
      data: {
        kind: 'content_evaluate',
        status: 'running',
        input: { asset_id: asset.id, asset_type: asset.assetType },
        projectId: asset.projectId,
        userId: input.userId,
      },
    });

    try {
      let result: ContentEvaluationResult;

      if (asset.assetType === 'image') {
        const { marketing } = await ContentEvaluator.evaluateImageUrl(asset.assetUrl);
        result = marketing;
      } else {
        result = {
          aesthetic_score: 0,
          marketing_feedback:
            'La evaluación automática solo soporta imágenes por ahora. Próximamente añadiremos soporte para video, audio y documentos.',
          tags: [],
          suggestions: [],
          detected_elements: [],
        };
      }

      const existingMeta =
        asset.metadata && typeof asset.metadata === 'object' && !Array.isArray(asset.metadata)
          ? (asset.metadata as Record<string, unknown>)
          : {};

      const existingTags = Array.isArray(asset.tags) ? asset.tags : [];
      const newTags = Array.from(new Set([...existingTags, ...result.tags]));

      await prisma.contentAsset.update({
        where: { id: asset.id },
        data: {
          aestheticScore: result.aesthetic_score,
          marketingFeedback: '', // Removed marketing feedback
          tags: newTags,
          metadata: {
            ...existingMeta,
            suggestions: result.suggestions,
            detected_elements: result.detected_elements,
            evaluated_at: new Date().toISOString(),
          },
        },
      });

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
      logger.error({ err }, 'content evaluator failed');
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: String(err), finishedAt: new Date() },
      });
      throw err;
    }
  }
}

// Para retrocompatibilidad y facilidad de uso
import { ImageVisualAnalysis } from './image-analyzer.js';
