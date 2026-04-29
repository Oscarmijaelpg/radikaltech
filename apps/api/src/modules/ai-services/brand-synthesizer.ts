import { prisma, Prisma } from '@radikal/db';
import { env } from '../../config/env.js';
import { LLM_MODELS, PROVIDER_URLS } from '../../config/providers.js';
import { logger } from '../../lib/logger.js';
import { notificationService } from '../notifications/service.js';

export interface BrandSynthesisResult {
  tone: string;
  voice: string;
  values: string[];
  audience: { segments: string[]; demographics?: Record<string, unknown> };
  visual: { palette: string[]; typography?: string[]; direction?: string };
  summary: string;
  mission?: string;
  vision?: string;
  competitive_advantage?: string;
  keywords?: string[];
}

export interface SynthesizeBrandInput {
  project: {
    id: string;
    name: string;
    description?: string | null;
    industry?: string | null;
    website?: string | null;
    businessSummary?: string | null;
    idealCustomer?: string | null;
    uniqueValue?: string | null;
    mainProducts?: string | null;
  };
  socialAccounts?: Array<{
    platform: string;
    source: string;
    url?: string | null;
    manual_description?: string | null;
  }>;
  manualContext?: string;
  userId: string;
}

async function callOpenRouter(payload: SynthesizeBrandInput): Promise<BrandSynthesisResult | null> {
  if (!env.OPENROUTER_API_KEY) return null;

  const context = [
    `Nombre: ${payload.project.name}`,
    payload.project.industry && `Industria: ${payload.project.industry}`,
    payload.project.website && `Sitio: ${payload.project.website}`,
    payload.project.businessSummary && `Negocio: ${payload.project.businessSummary}`,
    payload.project.mainProducts && `Productos: ${payload.project.mainProducts}`,
    payload.project.idealCustomer && `Cliente ideal: ${payload.project.idealCustomer}`,
    payload.project.uniqueValue && `Valor único: ${payload.project.uniqueValue}`,
    payload.socialAccounts?.length &&
      `Redes: ${payload.socialAccounts.map((s) => s.platform + (s.manual_description ? `(${s.manual_description.slice(0, 80)})` : '')).join(', ')}`,
    payload.manualContext && `Contexto adicional: ${payload.manualContext}`,
  ]
    .filter(Boolean)
    .join('\n');

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
      response_format: { type: 'json_object' },
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content:
            'Eres un brand strategist senior. Devuelves SOLO JSON con TODOS estos campos: tone (string corto, 2-4 palabras), voice (string corto, 2-4 palabras), values (array 3-5), audience { segments: string[], demographics: object }, visual { palette: array 4-6 hex colors #RRGGBB coherentes con la marca, typography: array 2 fuentes, direction: string descriptivo 1-2 frases sobre estética visual }, summary (80-150 palabras), mission (1-2 frases), vision (1-2 frases), competitive_advantage (1-2 frases), keywords (array 5-8 palabras clave). No incluyas explicaciones, solo JSON válido.',
        },
        {
          role: 'user',
          content: `Con base en esta información de la marca, sintetiza un perfil de marca en JSON:\n\n${context}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(40_000),
  });

  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text().catch(() => '')}`);
  const body = await res.json();
  const content = body.choices?.[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(content);
    return {
      tone: parsed.tone ?? 'professional',
      voice: parsed.voice ?? 'clear and confident',
      values: Array.isArray(parsed.values) ? parsed.values : [],
      mission: parsed.mission ?? undefined,
      vision: parsed.vision ?? undefined,
      competitive_advantage: parsed.competitive_advantage ?? undefined,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      audience: {
        segments: Array.isArray(parsed.audience?.segments) ? parsed.audience.segments : [],
        demographics: parsed.audience?.demographics ?? {},
      },
      visual: {
        palette: Array.isArray(parsed.visual?.palette) ? parsed.visual.palette : [],
        typography: Array.isArray(parsed.visual?.typography) ? parsed.visual.typography : [],
        direction: parsed.visual?.direction ?? undefined,
      },
      summary: parsed.summary ?? '',
    };
  } catch {
    return null;
  }
}

export class BrandSynthesizer {
  /**
   * Ejecuta una completación de chat genérica usando el modelo de marca configurado.
   * Útil para análisis incrementales de contenido web.
   */
  async getLLMCompletion(prompt: string): Promise<string | null> {
    if (!env.OPENROUTER_API_KEY) return null;

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
          messages: [
            {
              role: 'system',
              content: 'Eres un experto en estrategia de marca y análisis de mercado. Analizas contenido web para extraer identidades corporativas de forma precisa y estructurada.',
            },
            { role: 'user', content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(120_000),
      });

      if (!res.ok) return null;
      const body = await res.json();
      return body.choices?.[0]?.message?.content ?? null;
    } catch (err) {
      logger.error({ err }, 'BrandSynthesizer.getLLMCompletion failed');
      return null;
    }
  }

  async synthesize(input: SynthesizeBrandInput): Promise<BrandSynthesisResult> {
    const job = await prisma.aiJob.create({
      data: {
        kind: 'brand_synthesize',
        status: 'running',
        input: {
          project_id: input.project.id,
          has_website: Boolean(input.project.website),
          socials: input.socialAccounts?.length ?? 0,
        },
        projectId: input.project.id,
        userId: input.userId,
      },
    });

    try {
      let result = await callOpenRouter(input);
      if (!result) {
        logger.warn('brand synthesis falling back to placeholder');
        result = {
          tone: 'professional',
          voice: 'clear and confident',
          values: ['innovation', 'trust', 'clarity'],
          audience: { segments: [], demographics: {} },
          visual: { palette: ['#EC4899', '#06B6D4', '#0F172A'], typography: ['Inter', 'Plus Jakarta Sans'] },
          summary: `Perfil base para ${input.project.name}`,
        };
      }

      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'succeeded', output: result as unknown as Prisma.InputJsonValue, finishedAt: new Date() },
      });

      return result;
    } catch (err) {
      logger.error({ err }, 'brand synthesizer failed');
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: String(err), finishedAt: new Date() },
      });
      await notificationService
        .jobFailed({
          userId: input.userId,
          projectId: input.project.id,
          jobKind: 'brand_synthesize',
          error: String(err),
        })
        .catch(() => null);
      throw err;
    }
  }
}
