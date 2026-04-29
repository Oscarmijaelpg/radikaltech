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

const SYSTEM_PROMPT = `Eres un director creativo y especialista en marketing visual. Analizas imágenes para marcas y devuelves SIEMPRE un JSON válido con esta estructura exacta:
{
  "aesthetic_score": number (0-10, una sola decimal permitida),
  "marketing_feedback": string (2 o 3 párrafos en español, tono profesional y cercano; evalúa composición, color, iluminación, encuadre, potencial narrativo, encaje con redes),
  "tags": string[] (entre 5 y 10 tags descriptivos breves en español, minúsculas),
  "suggestions": string[] (3 a 5 recomendaciones accionables en español para mejorar el asset o su uso en campañas),
  "detected_elements": string[] (lista breve de elementos concretos visibles: objetos, personas, escena, texto, etc.)
}
No añadas texto fuera del JSON.`;

async function callVision(imageUrl: string): Promise<ContentEvaluationResult> {
  const provider = preferredChatProvider();
  const endpoint = provider === 'openrouter' 
    ? PROVIDER_URLS.openrouter.chatCompletions 
    : PROVIDER_URLS.openai.chatCompletions;
  
  const model = provider === 'openrouter' ? 'openai/gpt-4o' : 'gpt-4o';

  const apiKey = provider === 'openrouter' ? env.OPENROUTER_API_KEY : env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(`${provider.toUpperCase()} API Key not configured`);
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(provider === 'openrouter' ? {
        'HTTP-Referer': env.WEB_URL ?? 'https://radikal.ai',
        'X-Title': 'Radikal',
      } : {}),
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      temperature: 0.4,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Evalúa esta imagen como asset de marketing. Devuelve solo el JSON solicitado.',
            },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${provider} Vision ${res.status}: ${text.slice(0, 300)}`);
  }

  const body = await res.json();
  const content = body.choices?.[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(content);

  const score = Number(parsed.aesthetic_score);
  return {
    aesthetic_score: Number.isFinite(score) ? Math.max(0, Math.min(10, score)) : 0,
    marketing_feedback: typeof parsed.marketing_feedback === 'string' ? parsed.marketing_feedback : '',
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 10) : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String).slice(0, 5) : [],
    detected_elements: Array.isArray(parsed.detected_elements)
      ? parsed.detected_elements.map(String)
      : [],
  };
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
    const [marketing, art] = await Promise.all([
      callVision(imageUrl),
      imageAnalyzer.analyze(imageUrl).catch(() => null)
    ]);
    return { marketing, art };
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
          marketingFeedback: result.marketing_feedback,
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
