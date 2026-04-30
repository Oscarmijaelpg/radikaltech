import { randomUUID } from 'node:crypto';
import { prisma, Prisma } from '@radikal/db';
import { LLM_MODELS, PROVIDER_URLS } from '../../../config/providers.js';
import { env } from '../../../config/env.js';
import { BadRequest, Forbidden, NotFound } from '../../../lib/errors.js';
import { logger } from '../../../lib/logger.js';
import { imageAnalyzer, type ImageVisualAnalysis } from '../image-analyzer.js';
import { watermarkImageWithPadding } from './watermark.js';
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
  private async analyzeAndEnrich(assetId: string, url: string): Promise<void> {
    try {
      const analysis = await imageAnalyzer.analyze(url);
      if (analysis) {
        await prisma.contentAsset.update({
          where: { id: assetId },
          data: {
            aiDescription: analysis.description,
            aestheticScore: analysis.aesthetic_score,
            tags: { push: analysis.style_tags || [] },
            metadata: {
              visual_analysis: analysis as any,
              quality_score: analysis.aesthetic_score,
            },
          },
        });
        logger.info({ assetId }, 'asset enriched with visual analysis');
      }
    } catch (err) {
      logger.warn({ err, assetId }, 'failed to background-analyze generated asset');
    }
  }

  private async synthesizePrompt(context: string): Promise<string> {
    if (!env.OPENROUTER_API_KEY) return context;
    
    try {
      const res = await fetch(PROVIDER_URLS.openrouter.chatCompletions, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': env.WEB_URL,
          'X-Title': 'Radikal',
        },
        body: JSON.stringify({
          model: LLM_MODELS.chat.openrouter,
          temperature: 0.5,
          messages: [
            {
              role: 'system',
              content: `Eres un Director de Arte experto en Prompt Engineering para IAs generativas de imagen (DALL-E 3 y Gemini Pro Vision). 
Tu misión es transformar el ADN de marca y las referencias visuales en un PROMPT CINEMATOGRÁFICO Y TÉCNICO de alta fidelidad.

REGLAS DE ORO:
1. NO USES PALABRAS GENÉRICAS como "basado en", "siguiendo". Describe la escena, la luz, la textura y el ángulo de forma poética pero técnica.
2. LOGOS: Si las reglas dicen NO LOGO, sé agresivo en prohibirlo. Si dicen LOGO SELECCIONADO, descríbelo como un "flat watermark overlay" exacto, sin sombras ni reinterpretaciones.
3. ADN DE MARCA: Los colores y el tono deben impregnar la descripción de la escena.
4. MODO REFERENCIAL (IDENTITY LOCK): Si el modo es "referential", activa el protocolo "Identity Lock". Debes describir el sujeto de las referencias (objetos, arquitectura, personas) con precisión fotogramétrica. El entorno puede cambiar si se pide, pero el sujeto principal NO SE REINTERPRETA, se clona.
5. NO LITERALISMO: Está TERMINANTEMENTE PROHIBIDO dibujar iconos, animales o plantas basándote únicamente en el nombre de la empresa.
6. NEGATIVE PROMPT: Incluye siempre una sección final de "NEGATIVE PROMPT" prohibiendo logos inventados, texto aleatorio, deformidades, y elementos que contradigan las referencias provistas en modo referencial.`,
            },
            { role: 'user', content: `Sintetiza un prompt maestro basado en este contexto:\n\n${context}` },
          ],
        }),
      });

      if (!res.ok) return context;
      const body = await res.json();
      return body.choices?.[0]?.message?.content ?? context;
    } catch (err) {
      logger.warn({ err }, 'Prompt synthesis failed, falling back to raw context');
      return context;
    }
  }

  async generate(input: GenerateImageInput): Promise<GenerateImageOutput> {
    const size: ImageSize = input.size ?? DEFAULT_SIZE;
    const style: ImageStyle = input.style ?? DEFAULT_STYLE;
    const refIds = input.referenceAssetIds ?? [];
    const useBrandPalette = input.useBrandPalette ?? true;
    const requested = Math.max(
      MIN_VARIATIONS,
      Math.min(MAX_VARIATIONS, input.variations ?? 1),
    );

    const context = await buildBrandContext(input.projectId, useBrandPalette, input.prompt, refIds, input.mode ?? 'creative');
    const enrichedPrompt = await this.synthesizePrompt(context);

    const batchId = randomUUID();

    let job: { id: string } | null = null;
    try {
      job = await prisma.aiJob.create({
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
    } catch (err) {
      logger.warn({ err }, 'failed to create aiJob, continuing without persistence');
    }

    try {
      const refs: Array<{ base64: string; mimeType: string }> = [];
      let logoBuf: Buffer | undefined;

      if (refIds.length) {
        // Cap at 3 reference images max
        const cappedRefIds = refIds.slice(0, 3);
        const assets = await prisma.contentAsset.findMany({
          where: { id: { in: cappedRefIds }, userId: input.userId },
        });
        let skipped = 0;
        for (const a of assets) {
          const dl = await downloadAsBase64(a.assetUrl);
          if (dl) {
            refs.push(dl);
            if (a.tags?.includes('logo')) {
              logoBuf = Buffer.from(dl.base64, 'base64');
            }
          } else {
            skipped++;
            logger.warn({ assetId: a.id, assetUrl: a.assetUrl }, 'reference image skipped (unsupported/inaccessible), continuing without it');
          }
        }
        if (skipped > 0) {
          logger.info({ requested: cappedRefIds.length, loaded: refs.length, skipped }, 'some reference images were skipped, generation continues');
        }
        // Don't block generation even if ALL refs failed
      }

      // Auto-detect if user requested a logo in the prompt, even if they didn't select it in references
      const lowerPrompt = input.prompt.toLowerCase();
      if (!logoBuf && lowerPrompt.includes('logo') && input.projectId) {
        const logoAsset = await prisma.contentAsset.findFirst({
          where: { projectId: input.projectId, tags: { has: 'logo' } },
        });
        if (logoAsset) {
          const logoDl = await downloadAsBase64(logoAsset.assetUrl);
          if (logoDl) logoBuf = Buffer.from(logoDl.base64, 'base64');
        }
      }

      const runOne = async (idx: number): Promise<GeneratedVariation | null> => {
        const suffix = VARIATION_SUFFIXES[idx] ?? '';
        const variantPrompt = `${enrichedPrompt}${suffix}`;
        let modelUsed: ImageModel | undefined;
        let buf: Buffer | undefined;

        const gem = await generateWithGemini(variantPrompt, refs);
        if (gem.buffer) {
          buf = gem.buffer;
          modelUsed = LLM_MODELS.image.geminiDefault;
        } else {
          logger.warn({ idx, error: gem.error }, 'gemini generation failed, trying dalle');
        }
        if (!buf) {
          const dalle = await generateWithDalle(variantPrompt, size, style);
          if (dalle.buffer) {
            buf = dalle.buffer;
            modelUsed = LLM_MODELS.image.dalle3;
          } else {
            logger.warn({ idx, error: dalle.error }, 'dalle generation failed');
          }
        }
        if (!buf || !modelUsed) return null;

        if (logoBuf) {
          buf = await watermarkImageWithPadding(buf, logoBuf);
        }

        const { url, path } = await uploadBuffer(input.userId, buf);



        let assetId: string | undefined;
        if (input.projectId) {
          try {
            const asset = await prisma.contentAsset.create({
              data: {
                projectId: input.projectId,
                userId: input.userId,
                assetUrl: url,
                assetType: 'image',
                aiDescription: 'Analizando composición...',
                aestheticScore: null,
                tags: [
                  'generated',
                  'ai',
                  `variation_batch:${batchId}`,
                  ...(input.sourceSection ? [`section:${input.sourceSection}`] : []),
                ],
                metadata: {
                  model: modelUsed,
                  references: refIds,
                  size,
                  style,
                  storage_path: path,
                  batch_id: batchId,
                  variant_index: idx + 1,
                  variant_label: `Variante ${idx + 1}`,
                  quality_score: undefined,
                  visual_analysis: undefined,
                } as unknown as Prisma.InputJsonValue,
              },
            });
            assetId = asset.id;
            // Trigger background analysis
            this.analyzeAndEnrich(asset.id, url).catch(() => null);
          } catch (err) {
            logger.warn({ err }, 'failed to persist generated ContentAsset');
          }
        }

        return {
          assetId,
          url,
          variant_label: `Variante ${idx + 1}`,
          model: modelUsed,
          quality_score: undefined,
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
        throw new BadRequest(
          'Ningún proveedor de generación de imágenes respondió (revisa las claves GEMINI/OPENROUTER/OPENAI)',
        );
      }

      const first = variations[0]!;

      if (job) {
        try {
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
                debug: {
                  logoDetected: typeof logoBuf !== 'undefined'
                }
              } as unknown as Prisma.InputJsonValue,
              finishedAt: new Date(),
            },
          });
        } catch (err) {
          logger.warn({ err }, 'failed to update aiJob to succeeded');
        }
      }

      return {
        jobId: job?.id ?? batchId,
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
      if (job) {
        try {
          await prisma.aiJob.update({
            where: { id: job.id },
            data: { status: 'failed', error: String(err), finishedAt: new Date() },
          });
        } catch (jErr) {
          logger.warn({ err: jErr }, 'failed to update aiJob to failed');
        }
      }
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
    if (!source) throw new NotFound('Asset de origen no encontrado');
    if (source.userId !== input.userId) throw new Forbidden();

    const instruction = input.editInstruction.trim();
    const prompt = `Edita esta imagen siguiendo la instrucción: ${instruction}. Mantén los elementos principales y el branding.`;

    const projectId = input.projectId ?? source.projectId ?? undefined;
    const context = await buildBrandContext(projectId, true, prompt, [source.id], 'referential');
    const enrichedPrompt = await this.synthesizePrompt(context);

    let job: { id: string } | null = null;
    try {
      job = await prisma.aiJob.create({
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
    } catch (err) {
      logger.warn({ err }, 'failed to create aiJob for edit, continuing without persistence');
    }

    try {
      const dl = await downloadAsBase64(source.assetUrl);
      const refs = dl ? [dl] : [];
      let logoBuf: Buffer | undefined;

      // Check if user requested adding a logo
      const lowerInstruction = instruction.toLowerCase();
      if (
        lowerInstruction.includes('logo') && 
        (lowerInstruction.includes('add') || lowerInstruction.includes('pon') || lowerInstruction.includes('agrega') || lowerInstruction.includes('incluye'))
      ) {
        if (projectId) {
          const logoAsset = await prisma.contentAsset.findFirst({
            where: { projectId, tags: { has: 'logo' } },
          });
          if (logoAsset) {
            const logoDl = await downloadAsBase64(logoAsset.assetUrl);
            if (logoDl) logoBuf = Buffer.from(logoDl.base64, 'base64');
          }
        }
      }

      let modelUsed: ImageModel | undefined;
      let buf: Buffer | undefined;

      if (refs.length > 0) {
        const gem = await generateWithGemini(enrichedPrompt, refs);
        if (gem.buffer) {
          buf = gem.buffer;
          modelUsed = LLM_MODELS.image.geminiDefault;
        } else {
          logger.warn({ error: gem.error }, 'gemini edit failed, trying dalle');
        }
      }
      if (!buf) {
        const dalle = await generateWithDalle(enrichedPrompt, EDIT_SIZE, EDIT_STYLE);
        if (dalle.buffer) {
          buf = dalle.buffer;
          modelUsed = LLM_MODELS.image.dalle3;
        } else {
          logger.warn({ error: dalle.error }, 'dalle edit failed');
        }
      }
      if (!buf || !modelUsed) {
        throw new BadRequest('Ningún proveedor de edición de imágenes respondió');
      }

      if (logoBuf) {
        buf = await watermarkImageWithPadding(buf, logoBuf);
      }

      const { url, path } = await uploadBuffer(input.userId, buf);



      let assetId: string | undefined;
      if (projectId) {
        try {
          const asset = await prisma.contentAsset.create({
            data: {
              projectId,
              userId: input.userId,
              assetUrl: url,
              assetType: 'image',
              aiDescription: 'Analizando cambios...',
              aestheticScore: null,
              tags: [
                'generated',
                'ai',
                'edited',
                ...(input.sourceSection ? [`section:${input.sourceSection}`] : []),
              ],
              metadata: {
                model: modelUsed,
                parent_asset_id: source.id,
                edit_instruction: instruction,
                storage_path: path,
                quality_score: undefined,
                visual_analysis: undefined,
              } as unknown as Prisma.InputJsonValue,
            },
          });
          assetId = asset.id;
          // Trigger background analysis
          this.analyzeAndEnrich(asset.id, url).catch(() => null);
        } catch (err) {
          logger.warn({ err }, 'failed to persist edited ContentAsset');
        }
      }

      if (job) {
        try {
          await prisma.aiJob.update({
            where: { id: job.id },
            data: {
              status: 'succeeded',
              output: {
                assetId,
                url,
                model: modelUsed,
                parent_asset_id: source.id,
                debug: {
                  logoDetected: !!logoBuf,
                  logoSize: logoBuf?.length,
                }
              } as unknown as Prisma.InputJsonValue,
              finishedAt: new Date(),
            },
          });
        } catch (err) {
          logger.warn({ err }, 'failed to update edit aiJob to succeeded');
        }
      }

      return {
        jobId: job?.id ?? source.id,
        assetId,
        url,
        model: modelUsed,
        parent_asset_id: source.id,
      };
    } catch (err) {
      logger.error({ err }, 'image editor failed');
      if (job) {
        try {
          await prisma.aiJob.update({
            where: { id: job.id },
            data: { status: 'failed', error: String(err), finishedAt: new Date() },
          });
        } catch (jErr) {
          logger.warn({ err: jErr }, 'failed to update edit aiJob to failed');
        }
      }
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
