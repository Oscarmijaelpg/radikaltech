import { randomUUID } from 'node:crypto';
import { prisma, Prisma } from '@radikal/db';
import { env } from '../../config/env.js';
import {
  LLM_MODELS,
  PROVIDER_URLS,
  geminiGenerateContentUrl,
} from '../../config/providers.js';
import { logger } from '../../lib/logger.js';
import { supabaseAdmin } from '../../lib/supabase.js';
import { imageAnalyzer, type ImageVisualAnalysis } from './image-analyzer.js';
import { notificationService } from '../notifications/service.js';

export type ImageSize = '1024x1024' | '1792x1024' | '1024x1792';
export type ImageStyle = 'vivid' | 'natural';
export type ImageModel = 'gemini-2.5-flash-image' | 'dall-e-3';

export interface GenerateImageInput {
  prompt: string;
  size?: ImageSize;
  style?: ImageStyle;
  userId: string;
  projectId?: string;
  referenceAssetIds?: string[];
  useBrandPalette?: boolean;
  variations?: number;
}

export interface GeneratedVariation {
  assetId?: string;
  url: string;
  variant_label: string;
  model: ImageModel;
  quality_score?: number;
}

export interface GenerateImageOutput {
  jobId: string;
  batchId: string;
  variations: GeneratedVariation[];
  // backwards-compat for variations=1
  assetId?: string;
  url: string;
  prompt: string;
  size: ImageSize;
  style: ImageStyle;
  model: ImageModel;
}

export interface EditImageInput {
  sourceAssetId: string;
  editInstruction: string;
  userId: string;
  projectId?: string;
}

export interface EditImageOutput {
  jobId: string;
  assetId?: string;
  url: string;
  model: ImageModel;
  parent_asset_id: string;
}

const STORAGE_BUCKET = 'assets';

const VARIATION_SUFFIXES: string[] = [
  '',
  '\n\nVariante alternativa: enfoque más minimalista',
  '\n\nVariante alternativa: composición más dinámica, ángulos inusuales',
  '\n\nVariante alternativa: estilo fotográfico editorial',
];

async function downloadAsBase64(
  url: string,
): Promise<{ base64: string; mimeType: string } | undefined> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!r.ok) return undefined;
    const ct = r.headers.get('content-type') ?? 'image/png';
    const buf = Buffer.from(await r.arrayBuffer());
    return { base64: buf.toString('base64'), mimeType: ct.split(';')[0]?.trim() || 'image/png' };
  } catch (err) {
    logger.warn({ err, url }, 'ref image download failed');
    return undefined;
  }
}

async function tryGeminiModel(
  model: string,
  prompt: string,
  refs: Array<{ base64: string; mimeType: string }>,
): Promise<Buffer | undefined> {
  if (!env.GEMINI_API_KEY) return undefined;
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  for (const r of refs) {
    parts.push({ inline_data: { mime_type: r.mimeType, data: r.base64 } });
  }
  const body = {
    contents: [{ parts }],
    generationConfig: { responseModalities: ['IMAGE'] },
  };
  const res = await fetch(
    geminiGenerateContentUrl(model, env.GEMINI_API_KEY),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    logger.warn({ model, status: res.status, body: txt.slice(0, 200) }, 'gemini image model failed');
    return undefined;
  }
  const json = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inline_data?: { mime_type?: string; data?: string };
          inlineData?: { mimeType?: string; data?: string };
        }>;
      };
    }>;
  };
  const candidateParts = json.candidates?.[0]?.content?.parts ?? [];
  for (const p of candidateParts) {
    const data = p.inline_data?.data ?? p.inlineData?.data;
    if (data) {
      logger.info({ model }, 'gemini image generated');
      return Buffer.from(data, 'base64');
    }
  }
  return undefined;
}

async function generateWithGemini(
  prompt: string,
  refs: Array<{ base64: string; mimeType: string }>,
): Promise<Buffer | undefined> {
  for (const m of LLM_MODELS.image.geminiCandidates) {
    const buf = await tryGeminiModel(m, prompt, refs);
    if (buf) return buf;
  }
  logger.warn('all gemini image models failed');
  return undefined;
}

async function generateWithDalle(
  prompt: string,
  size: ImageSize,
  style: ImageStyle,
): Promise<Buffer | undefined> {
  const payload = {
    model: LLM_MODELS.image.dalle3,
    prompt,
    n: 1,
    size,
    style,
    quality: 'standard',
    response_format: 'url' as const,
  };

  let imageUrl: string | undefined;

  if (env.OPENROUTER_API_KEY) {
    try {
      const res = await fetch(PROVIDER_URLS.openrouter.imageGenerations, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': env.WEB_URL,
          'X-Title': 'Radikal',
        },
        body: JSON.stringify({ ...payload, model: `openai/${LLM_MODELS.image.dalle3}` }),
        signal: AbortSignal.timeout(60_000),
      });
      if (res.ok) {
        const body = (await res.json()) as { data?: Array<{ url?: string; b64_json?: string }> };
        imageUrl = body.data?.[0]?.url;
        const b64 = body.data?.[0]?.b64_json;
        if (!imageUrl && b64) return Buffer.from(b64, 'base64');
      } else {
        logger.warn({ status: res.status }, 'openrouter images not ok, trying openai');
      }
    } catch (err) {
      logger.warn({ err }, 'openrouter images failed');
    }
  }

  if (!imageUrl && env.OPENAI_API_KEY) {
    const res = await fetch(PROVIDER_URLS.openai.imageGenerations, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`OpenAI images error ${res.status}: ${txt.slice(0, 200)}`);
    }
    const body = (await res.json()) as { data?: Array<{ url?: string }> };
    imageUrl = body.data?.[0]?.url;
  }

  if (!imageUrl) return undefined;
  const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
  if (!imgRes.ok) throw new Error(`image download failed ${imgRes.status}`);
  return Buffer.from(await imgRes.arrayBuffer());
}

async function uploadBuffer(userId: string, buf: Buffer): Promise<{ url: string; path: string }> {
  const path = `${userId}/generated/${randomUUID()}.png`;
  const up = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(path, buf, { contentType: 'image/png', upsert: false });
  if (up.error) throw up.error;
  const pub = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const url = pub.data?.publicUrl ?? '';
  if (!url) throw new Error('No public URL after upload');
  return { url, path };
}

function computeQualityScore(analysis: ImageVisualAnalysis | null): number | undefined {
  if (!analysis) return undefined;
  const desc = analysis.description ?? '';
  if (!desc || desc.length < 30) return 4;
  const tags = analysis.style_tags?.length ?? 0;
  const colors = analysis.dominant_colors?.length ?? 0;
  if (tags >= 3 && colors >= 3) return 8;
  return 6;
}

async function buildBrandContext(
  projectId: string | undefined,
  useBrandPalette: boolean,
  basePrompt: string,
): Promise<string> {
  if (!projectId) return basePrompt;
  try {
    const brand = await prisma.brandProfile.findUnique({ where: { projectId } });
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    const brandCtx: string[] = [];
    if (project?.companyName) brandCtx.push(`Marca: "${project.companyName}"`);
    if (project?.industry) brandCtx.push(`Industria: ${project.industry}`);
    if (brand?.voiceTone) brandCtx.push(`Tono: ${brand.voiceTone}`);
    const palette = Array.isArray(brand?.colorPalette)
      ? (brand.colorPalette as string[]).filter((c) => typeof c === 'string')
      : [];
    if (useBrandPalette && palette.length > 0) brandCtx.push(`Paleta obligatoria: ${palette.join(', ')}`);
    if (brand?.visualDirection) brandCtx.push(`Dirección visual: ${brand.visualDirection}`);
    if (Array.isArray(brand?.brandValues) && brand.brandValues.length > 0) {
      brandCtx.push(`Valores de marca: ${brand.brandValues.slice(0, 4).join(', ')}`);
    }
    if (brandCtx.length > 0) {
      logger.info({ projectId, ctxLines: brandCtx.length }, 'prompt enriched with brand context');
      return `${basePrompt}\n\n[CONTEXTO DE MARCA - respétalo estrictamente]\n${brandCtx.join('\n')}`;
    }
  } catch (err) {
    logger.warn({ err }, 'failed to enrich prompt with brand context');
  }
  return basePrompt;
}

export class ImageGenerator {
  async generate(input: GenerateImageInput): Promise<GenerateImageOutput> {
    const size: ImageSize = input.size ?? '1024x1024';
    const style: ImageStyle = input.style ?? 'vivid';
    const refIds = input.referenceAssetIds ?? [];
    const useBrandPalette = input.useBrandPalette ?? true;
    const requested = Math.max(1, Math.min(4, input.variations ?? 1));

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
      // Load references (ownership checked)
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

        // Quality score via vision
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
        throw new Error('No image generation provider succeeded (check GEMINI/OPENROUTER/OPENAI keys)');
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
        buf = await generateWithDalle(enrichedPrompt, '1024x1024', 'vivid');
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
          output: { assetId, url, model: modelUsed, parent_asset_id: source.id } as unknown as Prisma.InputJsonValue,
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
