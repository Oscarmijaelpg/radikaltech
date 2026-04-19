import { randomUUID } from 'node:crypto';
import { prisma, Prisma } from '@radikal/db';
import { LLM_MODELS } from '../../../config/providers.js';
import { logger } from '../../../lib/logger.js';
import { imageAnalyzer, type ImageVisualAnalysis } from '../image-analyzer.js';
import { notificationService } from '../../notifications/service.js';
import {
  buildBrandContext,
  computeQualityScore,
  uploadBuffer,
} from './helpers.js';
import {
  downloadAsBase64,
  generateWithDalle,
  generateWithGemini,
} from './providers.js';
import {
  VARIATION_SUFFIXES,
  type EditImageInput,
  type EditImageOutput,
  type GenerateImageInput,
  type GenerateImageOutput,
  type GeneratedVariation,
  type ImageModel,
  type ImageSize,
  type ImageStyle,
} from './types.js';

export type {
  EditImageInput,
  EditImageOutput,
  GenerateImageInput,
  GenerateImageOutput,
  GeneratedVariation,
  ImageModel,
  ImageSize,
  ImageStyle,
};

const DEFAULT_SIZE: ImageSize = '1024x1024';
const DEFAULT_STYLE: ImageStyle = 'vivid';
const EDIT_SIZE: ImageSize = '1024x1024';
const EDIT_STYLE: ImageStyle = 'vivid';
const MIN_VARIATIONS = 1;
const MAX_VARIATIONS = 4;

export class ImageGenerator {
  async generate(input: GenerateImageInput): Promise<GenerateImageOutput> {
    const size: ImageSize = input.size ?? DEFAULT_SIZE;
    const style: ImageStyle = input.style ?? DEFAULT_STYLE;
    const refIds = input.referenceAssetIds ?? [];
    const useBrandPalette = input.useBrandPalette ?? true;
    const requested = Math.max(
      MIN_VARIATIONS,
      Math.min(MAX_VARIATIONS, input.variations ?? 1),
    );

    const enrichedPrompt = await buildBrandContext(input.projectId, useBrandPalette, input.prompt);

    const batchId = randomUUID();

    const job = await prisma.aiJob.create({
      data: {
        kind: 'image_generate',
        status: 'running',
        input: {
          prompt: input.prompt,
          enrichedPrompt,
          size,
          style,
          referenceAssetIds: refIds,
          variations: requested,
          batchId,
        },
        projectId: input.projectId,
        userId: input.userId,
        startedAt: new Date(),
      },
    });

    try {
      const refs: Array<{ base64: string; mimeType: string }> = [];
      if (refIds.length) {
        const assets = await prisma.contentAsset.findMany({
          where: { id: { in: refIds }, userId: input.userId },
        });
        for (const a of assets) {
          const dl = await downloadAsBase64(a.assetUrl);
          if (dl) refs.push(dl);
        }
      }

      const runOne = async (idx: number): Promise<GeneratedVariation | null> => {
        const suffix = VARIATION_SUFFIXES[idx] ?? '';
        const variantPrompt = `${enrichedPrompt}${suffix}`;
        let modelUsed: ImageModel | undefined;
        let buf: Buffer | undefined;

        if (refs.length > 0) {
          buf = await generateWithGemini(variantPrompt, refs);
          if (buf) modelUsed = LLM_MODELS.image.geminiDefault;
        }
        if (!buf) {
          buf = await generateWithDalle(variantPrompt, size, style);
          if (buf) modelUsed = LLM_MODELS.image.dalle3;
        }
        if (!buf || !modelUsed) return null;

        const { url, path } = await uploadBuffer(input.userId, buf);

        let qualityScore: number | undefined;
        let visualAnalysis: ImageVisualAnalysis | null = null;
        try {
          visualAnalysis = await imageAnalyzer.analyze(url);
          qualityScore = computeQualityScore(visualAnalysis);
        } catch (err) {
          logger.warn({ err }, 'quality scoring failed');
        }

        let assetId: string | undefined;
        if (input.projectId) {
          try {
            const asset = await prisma.contentAsset.create({
              data: {
                projectId: input.projectId,
                userId: input.userId,
                assetUrl: url,
                assetType: 'image',
                aiDescription: input.prompt,
                aestheticScore:
                  qualityScore !== undefined ? new Prisma.Decimal(qualityScore) : null,
                tags: ['generated', 'ai', `variation_batch:${batchId}`],
                metadata: {
                  model: modelUsed,
                  references: refIds,
                  size,
                  style,
                  storage_path: path,
                  batch_id: batchId,
                  variant_index: idx + 1,
                  variant_label: `Variante ${idx + 1}`,
                  quality_score: qualityScore,
                  visual_analysis: visualAnalysis ?? undefined,
                } as unknown as Prisma.InputJsonValue,
              },
            });
            assetId = asset.id;
          } catch (err) {
            logger.warn({ err }, 'failed to persist generated ContentAsset');
          }
        }

        return {
          assetId,
          url,
          variant_label: `Variante ${idx + 1}`,
          model: modelUsed,
          quality_score: qualityScore,
        };
      };

      const results = await Promise.allSettled(
        Array.from({ length: requested }, (_, i) => runOne(i)),
      );
      const variations: GeneratedVariation[] = [];
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) variations.push(r.value);
      }

      if (variations.length === 0) {
        throw new Error(
          'No image generation provider succeeded (check GEMINI/OPENROUTER/OPENAI keys)',
        );
      }

      const first = variations[0]!;

      await prisma.aiJob.update({
        where: { id: job.id },
        data: {
          status: 'succeeded',
          output: {
            batchId,
            variations: variations.map((v) => ({
              assetId: v.assetId,
              url: v.url,
              variant_label: v.variant_label,
              quality_score: v.quality_score,
            })),
            model: first.model,
          } as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });

      return {
        jobId: job.id,
        batchId,
        variations,
        assetId: first.assetId,
        url: first.url,
        prompt: input.prompt,
        size,
        style,
        model: first.model,
      };
    } catch (err) {
      logger.error({ err }, 'image generator failed');
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: String(err), finishedAt: new Date() },
      });
      await notificationService
        .jobFailed({
          userId: input.userId,
          projectId: input.projectId ?? null,
          jobKind: 'image_generate',
          error: String(err),
        })
        .catch(() => null);
      throw err;
    }
  }

  async edit(input: EditImageInput): Promise<EditImageOutput> {
    const source = await prisma.contentAsset.findUnique({
      where: { id: input.sourceAssetId },
    });
    if (!source) throw new Error('Source asset not found');
    if (source.userId !== input.userId) throw new Error('Forbidden');

    const instruction = input.editInstruction.trim();
    const prompt = `Edita esta imagen siguiendo la instrucción: ${instruction}. Mantén los elementos principales y el branding.`;

    const projectId = input.projectId ?? source.projectId ?? undefined;
    const enrichedPrompt = await buildBrandContext(projectId, true, prompt);

    const job = await prisma.aiJob.create({
      data: {
        kind: 'image_edit',
        status: 'running',
        input: {
          sourceAssetId: input.sourceAssetId,
          editInstruction: instruction,
          enrichedPrompt,
        },
        projectId,
        userId: input.userId,
        startedAt: new Date(),
      },
    });

    try {
      const dl = await downloadAsBase64(source.assetUrl);
      const refs = dl ? [dl] : [];

      let modelUsed: ImageModel | undefined;
      let buf: Buffer | undefined;

      if (refs.length > 0) {
        buf = await generateWithGemini(enrichedPrompt, refs);
        if (buf) modelUsed = LLM_MODELS.image.geminiDefault;
      }
      if (!buf) {
        buf = await generateWithDalle(enrichedPrompt, EDIT_SIZE, EDIT_STYLE);
        if (buf) modelUsed = LLM_MODELS.image.dalle3;
      }
      if (!buf || !modelUsed) {
        throw new Error('No image editor provider succeeded');
      }

      const { url, path } = await uploadBuffer(input.userId, buf);

      let qualityScore: number | undefined;
      let visualAnalysis: ImageVisualAnalysis | null = null;
      try {
        visualAnalysis = await imageAnalyzer.analyze(url);
        qualityScore = computeQualityScore(visualAnalysis);
      } catch (err) {
        logger.warn({ err }, 'quality scoring failed (edit)');
      }

      let assetId: string | undefined;
      if (projectId) {
        try {
          const asset = await prisma.contentAsset.create({
            data: {
              projectId,
              userId: input.userId,
              assetUrl: url,
              assetType: 'image',
              aiDescription: `Edición: ${instruction}`,
              aestheticScore:
                qualityScore !== undefined ? new Prisma.Decimal(qualityScore) : null,
              tags: ['generated', 'ai', 'edited'],
              metadata: {
                model: modelUsed,
                parent_asset_id: source.id,
                edit_instruction: instruction,
                storage_path: path,
                quality_score: qualityScore,
                visual_analysis: visualAnalysis ?? undefined,
              } as unknown as Prisma.InputJsonValue,
            },
          });
          assetId = asset.id;
        } catch (err) {
          logger.warn({ err }, 'failed to persist edited ContentAsset');
        }
      }

      await prisma.aiJob.update({
        where: { id: job.id },
        data: {
          status: 'succeeded',
          output: {
            assetId,
            url,
            model: modelUsed,
            parent_asset_id: source.id,
          } as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
        },
      });

      return {
        jobId: job.id,
        assetId,
        url,
        model: modelUsed,
        parent_asset_id: source.id,
      };
    } catch (err) {
      logger.error({ err }, 'image editor failed');
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: String(err), finishedAt: new Date() },
      });
      await notificationService
        .jobFailed({
          userId: input.userId,
          projectId: input.projectId ?? null,
          jobKind: 'image_edit',
          error: String(err),
        })
        .catch(() => null);
      throw err;
    }
  }
}
