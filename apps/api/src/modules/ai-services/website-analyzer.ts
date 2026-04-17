import { randomUUID } from 'node:crypto';
import { prisma, Prisma } from '@radikal/db';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { supabaseAdmin } from '../../lib/supabase.js';
import { notificationService } from '../notifications/service.js';
import { BadRequest } from '../../lib/errors.js';

export interface WebsiteAnalysisResult {
  url: string;
  pages: Array<{ url: string; title?: string; excerpt?: string }>;
  metadata: { title?: string; description?: string; language?: string };
  detected_info: {
    brand_name?: string;
    industry?: string;
    value_propositions?: string[];
    business_summary?: string;
    main_products?: string;
    ideal_customer?: string;
    unique_value?: string;
    contact?: { email?: string; phone?: string };
  };
  logo_url?: string;
  logo_asset_id?: string;
}

export interface AnalyzeWebsiteInput {
  url: string;
  userId: string;
  projectId?: string;
}

interface FirecrawlScrapeResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
      ogTitle?: string;
      ogDescription?: string;
      ogImage?: string;
      'og:image'?: string;
      twitterImage?: string;
      'twitter:image'?: string;
      favicon?: string;
      [k: string]: unknown;
    };
  };
}

const STORAGE_BUCKET = 'assets';

async function firecrawlScrape(url: string): Promise<FirecrawlScrapeResponse> {
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'html'],
      onlyMainContent: false,
      timeout: 25_000,
    }),
    signal: AbortSignal.timeout(28_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Firecrawl ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function callChatCompletion(prompt: string): Promise<string> {
  const payload = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Eres un analista de marcas experto. Respondes siempre con JSON válido.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  };

  if (env.OPENAI_API_KEY) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
    if (res.ok) {
      const body = await res.json();
      return body.choices?.[0]?.message?.content ?? '{}';
    }
    const txt = await res.text().catch(() => '');
    logger.warn({ status: res.status, body: txt.slice(0, 200) }, 'OpenAI failed, trying OpenRouter');
  }

  if (env.OPENROUTER_API_KEY) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': env.WEB_URL,
        'X-Title': 'Radikal',
      },
      body: JSON.stringify({ ...payload, model: 'openai/gpt-4o-mini' }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text().catch(() => '')}`);
    const body = await res.json();
    return body.choices?.[0]?.message?.content ?? '{}';
  }

  throw new Error('No hay proveedor de IA configurado (OPENAI_API_KEY u OPENROUTER_API_KEY)');
}

async function extractInfoWithAI(
  markdown: string,
  url: string,
): Promise<WebsiteAnalysisResult['detected_info']> {
  const trimmed = markdown.slice(0, 8000);
  const prompt = `Analiza el siguiente contenido de un sitio web y devuelve un JSON con los campos: brand_name, industry, business_summary (50-150 palabras), main_products (una cadena con una línea por producto/servicio), ideal_customer (1-2 frases), unique_value (1 frase), value_propositions (array de 3-5 strings). Si un campo no se puede deducir, usa null o array vacío. Devuelve SOLO el JSON.

URL: ${url}

Contenido:
${trimmed}`;

  const content = await callChatCompletion(prompt);
  try {
    const parsed = JSON.parse(content);
    return {
      brand_name: parsed.brand_name ?? undefined,
      industry: parsed.industry ?? undefined,
      business_summary: parsed.business_summary ?? undefined,
      main_products: Array.isArray(parsed.main_products)
        ? parsed.main_products.join('\n')
        : parsed.main_products ?? undefined,
      ideal_customer: parsed.ideal_customer ?? undefined,
      unique_value: parsed.unique_value ?? undefined,
      value_propositions: Array.isArray(parsed.value_propositions) ? parsed.value_propositions : [],
    };
  } catch (err) {
    logger.warn({ err, content: content.slice(0, 200) }, 'failed to parse OpenAI extraction');
    return {};
  }
}

function absolutize(maybeUrl: string | undefined, baseUrl: string): string | undefined {
  if (!maybeUrl) return undefined;
  try {
    return new URL(maybeUrl, baseUrl).toString();
  } catch {
    return undefined;
  }
}

// Detecta candidatos de logo CON scoring: logos reales > og:image > apple-touch-icon > favicon.
export function detectLogoCandidates(
  scrape: FirecrawlScrapeResponse,
  pageUrl: string,
): string[] {
  const meta = (scrape.data?.metadata ?? {}) as Record<string, unknown>;
  const ogImage =
    (meta['ogImage'] as string | undefined) ??
    (meta['og:image'] as string | undefined) ??
    (meta['og_image'] as string | undefined);
  const twitterImage =
    (meta['twitterImage'] as string | undefined) ??
    (meta['twitter:image'] as string | undefined);

  const html = scrape.data?.html ?? '';
  const scored: Array<{ url: string; score: number }> = [];

  function push(url: string | undefined, score: number) {
    if (!url) return;
    const abs = absolutize(url, pageUrl);
    if (!abs) return;
    // bonus si es SVG/PNG (mejor calidad)
    let s = score;
    if (abs.toLowerCase().endsWith('.svg')) s += 30;
    else if (abs.toLowerCase().endsWith('.png')) s += 15;
    else if (abs.toLowerCase().endsWith('.ico')) s -= 20;
    // bonus si la URL contiene "logo"
    if (/logo/i.test(abs)) s += 25;
    // penalizar si contiene "favicon" (suele ser 16x16)
    if (/favicon/i.test(abs)) s -= 15;
    scored.push({ url: abs, score: s });
  }

  if (html) {
    // 1) <img> con clase/id/alt/src que contenga "logo" — estos son los logos REALES
    const logoImgMatches = html.matchAll(
      /<img[^>]+(?:class|id|alt|src)=["'][^"']*logo[^"']*["'][^>]*>/gi,
    );
    for (const m of logoImgMatches) {
      const srcMatch = m[0].match(/\bsrc=["']([^"']+)["']/i);
      if (srcMatch?.[1]) push(srcMatch[1], 100);
    }

    // 2) og:image:secure_url y og:image (de HTML, porque pueden repetir varios)
    const ogMatches = html.matchAll(
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi,
    );
    for (const m of ogMatches) push(m[1], 70);

    // 3) apple-touch-icon
    const appleIconMatches = html.matchAll(
      /<link[^>]+rel=["']apple-touch-icon(?:-precomposed)?["'][^>]*href=["']([^"']+)["']/gi,
    );
    for (const m of appleIconMatches) push(m[1], 60);

    // 4) mask-icon / icon (svg)
    const maskMatches = html.matchAll(
      /<link[^>]+rel=["'](?:mask-icon|icon)["'][^>]*href=["']([^"']+)["']/gi,
    );
    for (const m of maskMatches) push(m[1], 40);
  }

  // 5) metadata Firecrawl (de menor prioridad)
  push(ogImage, 55);
  push(twitterImage, 50);

  // 6) Fallbacks al final
  try {
    const u = new URL(pageUrl);
    push(`${u.protocol}//${u.host}/apple-touch-icon.png`, 30);
    push(`${u.protocol}//${u.host}/logo.png`, 35);
    push(`${u.protocol}//${u.host}/logo.svg`, 40);
    push(`${u.protocol}//${u.host}/favicon.png`, 20);
    // Google S2 como último recurso — siempre da algo
    push(`https://www.google.com/s2/favicons?domain=${u.host}&sz=256`, 10);
  } catch {}

  // Ordenar por score DESC, dedupe
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const { url } of scored) {
    if (!seen.has(url)) {
      seen.add(url);
      ordered.push(url);
    }
  }
  return ordered;
}

function extFromContentType(ct: string | null): string {
  if (!ct) return 'png';
  if (ct.includes('svg')) return 'svg';
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('gif')) return 'gif';
  if (ct.includes('x-icon') || ct.includes('vnd.microsoft.icon')) return 'ico';
  return 'png';
}

async function tryDownloadOne(
  logoUrl: string,
  userId: string,
  projectId: string | undefined,
): Promise<{ publicUrl: string; assetId?: string } | undefined> {
  const res = await fetch(logoUrl, {
    signal: AbortSignal.timeout(15_000),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RadikalBot/1.0)' },
  });
  if (!res.ok) {
    logger.warn({ logoUrl, status: res.status }, 'logo download failed');
    return undefined;
  }
  const ct = res.headers.get('content-type');
  // Si content-type no es imagen, saltamos (algunos servers devuelven HTML 200 para 404)
  if (ct && !ct.startsWith('image/') && !ct.includes('octet-stream')) {
    logger.warn({ logoUrl, ct }, 'logo url returned non-image content-type');
    return undefined;
  }
  const ext = extFromContentType(ct);
  const arr = new Uint8Array(await res.arrayBuffer());
  if (arr.byteLength < 100) {
    logger.warn({ logoUrl, size: arr.byteLength }, 'logo file too small, skipping');
    return undefined;
  }
  const path = `${userId}/brand/logo-${Date.now()}.${ext}`;
  const up = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(path, arr, { contentType: ct ?? 'image/png', upsert: false });
  if (up.error) {
    logger.warn({ err: up.error.message }, 'logo storage upload failed');
    return undefined;
  }
  const pub = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const publicUrl = pub.data?.publicUrl;
  if (!publicUrl) return undefined;

  let assetId: string | undefined;
  if (projectId) {
    try {
      const asset = await prisma.contentAsset.create({
        data: {
          projectId,
          userId,
          assetType: 'image',
          assetUrl: publicUrl,
          aiDescription: 'Logo detectado automáticamente',
          tags: ['logo', 'website_auto'],
          metadata: {
            source: 'website_auto',
            origin_url: logoUrl,
            storage_path: path,
          } as unknown as Prisma.InputJsonValue,
        },
      });
      assetId = asset.id;
    } catch (err) {
      logger.warn({ err }, 'failed to persist logo ContentAsset');
    }
  }
  return { publicUrl, assetId };
}

async function downloadAndStoreLogo(
  candidates: string[],
  userId: string,
  projectId: string | undefined,
): Promise<{ publicUrl: string; assetId?: string } | undefined> {
  for (const c of candidates) {
    try {
      const result = await tryDownloadOne(c, userId, projectId);
      if (result) {
        logger.info({ logoUrl: c }, 'logo stored successfully');
        return result;
      }
    } catch (err) {
      logger.warn({ err, logoUrl: c }, 'logo candidate errored, trying next');
    }
  }
  logger.warn({ tried: candidates.length }, 'no logo candidate succeeded');
  return undefined;
}

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
      // Umbral bajo (40) para tolerar landings simples.
      if (env.FIRECRAWL_API_KEY && markdown.trim().length < 40) {
        logger.warn(
          { url: input.url, mdLen: markdown.length, title: metadata.title },
          'firecrawl returned near-empty markdown',
        );
        throw new BadRequest(
          `El sitio respondió pero no devolvió contenido legible (puede ser una app JavaScript sin renderizado del servidor o un bloqueo anti-bot).`,
        );
      }

      let detected: WebsiteAnalysisResult['detected_info'] = {};
      if (markdown.length > 100) {
        logger.info('openai extraction start');
        detected = await extractInfoWithAI(markdown, input.url);
        logger.info({ fields: Object.keys(detected) }, 'openai extraction ok');
      }

      // Logo auto-detection (intenta múltiples candidatos)
      let logoAssetId: string | undefined;
      let logoFinalUrl: string | undefined;
      try {
        if (scrape) {
          const candidates = detectLogoCandidates(scrape, input.url);
          logger.info({ count: candidates.length, first: candidates.slice(0, 3) }, 'logo candidates');
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

      // Extraer paleta de colores del logo con Gemini Vision (sugerida)
      if (logoFinalUrl && input.projectId && env.GEMINI_API_KEY) {
        try {
          const { imageAnalyzer } = await import('./image-analyzer.js');
          const analysis = await imageAnalyzer.analyze(logoFinalUrl);
          if (analysis?.dominant_colors?.length) {
            const existing = await prisma.brandProfile.findUnique({
              where: { projectId: input.projectId },
            });
            // Solo guardar como sugerida (no pisa la confirmada)
            if (existing) {
              await prisma.brandProfile.update({
                where: { projectId: input.projectId },
                data: {
                  colorPaletteSuggested: analysis.dominant_colors as unknown as Prisma.InputJsonValue,
                },
              });
            } else {
              await prisma.brandProfile.create({
                data: {
                  projectId: input.projectId,
                  userId: input.userId,
                  colorPaletteSuggested: analysis.dominant_colors as unknown as Prisma.InputJsonValue,
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
        pages: [{ url: input.url, title: metadata.title, excerpt: markdown.slice(0, 280) }],
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

// randomUUID imported but retained in case future use; kept silent
void randomUUID;
