import { randomUUID } from 'node:crypto';
import { prisma, Prisma } from '@radikal/db';
import { env } from '../../config/env.js';
import { PROVIDER_URLS } from '../../config/providers.js';
import { logger } from '../../lib/logger.js';
import { supabaseAdmin } from '../../lib/supabase.js';
import { NotFound, Forbidden } from '../../lib/errors.js';
import { WebsiteAnalyzer } from './website-analyzer/index.js';
import { BrandSynthesizer } from './brand-synthesizer.js';
import { ImageAnalyzer, type ImageVisualAnalysis } from './image-analyzer.js';
import { InstagramScraper, parseInstagramHandle } from './instagram-scraper.js';
import { TikTokScraper, parseTikTokHandle } from './tiktok-scraper.js';
import { MarketDetector } from './market-detector.js';
import { notificationService } from '../notifications/service.js';

const STORAGE_BUCKET = 'assets';

function extFromContentType(ct: string | null): string {
  if (!ct) return 'jpg';
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('gif')) return 'gif';
  if (ct.includes('svg')) return 'svg';
  return 'jpg';
}

// Descarga una imagen externa y la sube a Supabase Storage. Devuelve la URL pública.
async function downloadAndStoreImage(
  externalUrl: string,
  userId: string,
): Promise<{ publicUrl: string; storagePath: string } | null> {
  try {
    const res = await fetch(externalUrl, {
      signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RadikalBot/1.0)' },
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type');
    if (ct && !ct.startsWith('image/') && !ct.includes('octet-stream')) return null;
    const arr = new Uint8Array(await res.arrayBuffer());
    if (arr.byteLength < 1000) return null; // ignorar pixels/sprites
    const ext = extFromContentType(ct);
    const storagePath = `${userId}/moodboard/${randomUUID()}.${ext}`;
    const up = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, arr, { contentType: ct ?? 'image/jpeg', upsert: false });
    if (up.error) return null;
    const pub = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    return { publicUrl: pub.data.publicUrl, storagePath };
  } catch {
    return null;
  }
}

const KEY_PATHS = ['/about', '/nosotros', '/quienes-somos', '/productos', '/contacto', '/contact', '/services', '/servicios'];

export interface BrandAnalysisResult {
  jobId: string;
  summary: {
    pagesScraped: number;
    imagesAnalyzed: number;
    instagramPosts: number;
    tiktokPosts: number;
    logoFound: boolean;
  };
  brand_profile: unknown;
  palette_suggested: string[];
  moodboard_assets: Array<{ id: string; asset_url: string; visual_analysis: ImageVisualAnalysis | null }>;
  logo_asset: { id: string; url: string } | null;
}

interface FirecrawlScrape {
  success?: boolean;
  data?: { markdown?: string; html?: string; metadata?: Record<string, unknown> };
}

async function firecrawlScrape(url: string): Promise<FirecrawlScrape | null> {
  if (!env.FIRECRAWL_API_KEY) return null;
  try {
    const res = await fetch(PROVIDER_URLS.firecrawl.scrape, {
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
    if (!res.ok) return null;
    return (await res.json()) as FirecrawlScrape;
  } catch (err) {
    logger.warn({ err, url }, 'firecrawl scrape failed in orchestrator');
    return null;
  }
}

function absolutize(raw: string, base: string): string | null {
  try {
    return new URL(raw, base).toString();
  } catch {
    return null;
  }
}

function extractImagesFromHtml(html: string, baseUrl: string): string[] {
  if (!html) return [];
  const urls: string[] = [];
  const re = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1];
    if (!raw) continue;
    const low = raw.toLowerCase();
    if (low.includes('pixel') || low.includes('analytics') || low.includes('sprite') || low.includes('tracking') || low.includes('beacon')) continue;
    if (low.endsWith('.svg') || low.includes('data:image')) continue;
    const abs = absolutize(raw, baseUrl);
    if (!abs) continue;
    if (!urls.includes(abs)) urls.push(abs);
  }
  return urls.slice(0, 25);
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  const workers: Promise<void>[] = [];
  const runOne = async () => {
    while (true) {
      const current = idx++;
      if (current >= items.length) return;
      try {
        results[current] = await fn(items[current]!);
      } catch (err) {
        logger.warn({ err }, 'mapLimit worker errored');
        results[current] = null as unknown as R;
      }
    }
  };
  for (let i = 0; i < Math.min(limit, items.length); i++) workers.push(runOne());
  await Promise.all(workers);
  return results;
}

function aggregatePalette(analyses: ImageVisualAnalysis[]): string[] {
  const counts = new Map<string, number>();
  for (const a of analyses) {
    for (const c of a.dominant_colors ?? []) {
      if (typeof c !== 'string') continue;
      const norm = c.trim().toUpperCase();
      if (!/^#([0-9A-F]{3}|[0-9A-F]{6})$/.test(norm)) continue;
      counts.set(norm, (counts.get(norm) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([c]) => c);
}

export class BrandOrchestrator {
  private imageAnalyzer = new ImageAnalyzer();
  private brandSynthesizer = new BrandSynthesizer();
  private instagramScraper = new InstagramScraper();
  private tiktokScraper = new TikTokScraper();
  private websiteAnalyzer = new WebsiteAnalyzer();
  private marketDetector = new MarketDetector();

  async analyze(input: { projectId: string; userId: string }): Promise<BrandAnalysisResult> {
    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) throw new NotFound('Project not found');
    if (project.userId !== input.userId) throw new Forbidden();

    const job = await prisma.aiJob.create({
      data: {
        kind: 'brand_analyze',
        status: 'running',
        input: { project_id: input.projectId },
        projectId: input.projectId,
        userId: input.userId,
        startedAt: new Date(),
      },
    });

    try {
      // 1. Firecrawl scrape website + key pages
      let logoAsset: { id: string; url: string } | null = null;
      const pagesData: Array<{ url: string; html: string; markdown: string }> = [];

      if (project.websiteUrl) {
        // Use WebsiteAnalyzer for home (brings logo detection + info extraction)
        try {
          const wa = await this.websiteAnalyzer.analyze({
            url: project.websiteUrl,
            userId: input.userId,
            projectId: input.projectId,
          });
          if (wa.result.logo_url && wa.result.logo_asset_id) {
            logoAsset = { id: wa.result.logo_asset_id, url: wa.result.logo_url };
          }
        } catch (err) {
          logger.warn({ err }, 'websiteAnalyzer failed in orchestrator (continuing)');
        }

        // Scrape home + key paths for images
        const base = project.websiteUrl;
        const urlsToScrape = [base];
        try {
          const u = new URL(base);
          for (const p of KEY_PATHS) {
            urlsToScrape.push(`${u.protocol}//${u.host}${p}`);
          }
        } catch {}

        // Dedupe
        const uniq = Array.from(new Set(urlsToScrape)).slice(0, 5);
        for (const u of uniq) {
          const scrape = await firecrawlScrape(u);
          const html = scrape?.data?.html ?? '';
          const md = scrape?.data?.markdown ?? '';
          if (html || md) pagesData.push({ url: u, html, markdown: md });
        }
      }

      // 2.5 Detect markets from aggregated website markdown (suggested)
      try {
        const aggregatedMd = pagesData.map((p) => p.markdown).join('\n\n').slice(0, 12000);
        if (aggregatedMd.length > 100) {
          const markets = await this.marketDetector.detect({
            projectId: input.projectId,
            userId: input.userId,
            websiteMarkdown: aggregatedMd,
          });
          if (markets.countries.length > 0) {
            await prisma.project.update({
              where: { id: input.projectId },
              data: { operatingCountriesSuggested: markets.countries },
            });
          }
        }
      } catch (err) {
        logger.warn({ err }, 'market detection failed in orchestrator');
      }

      // 3. Extract images
      const allImages: string[] = [];
      for (const p of pagesData) {
        for (const img of extractImagesFromHtml(p.html, p.url)) {
          if (!allImages.includes(img)) allImages.push(img);
        }
      }
      const targetImages = allImages.slice(0, 15);

      // 4. Analyze images with ImageAnalyzer (parallel, max 5)
      const analyses = await mapLimit(targetImages, 5, async (url) => {
        const res = await this.imageAnalyzer.analyze(url);
        return { url, analysis: res };
      });

      // Persist moodboard: descarga cada imagen a Storage y crea ContentAsset
      // (incluso si Vision falló — al menos guardamos la imagen como referencia visual).
      const moodboardAssets: BrandAnalysisResult['moodboard_assets'] = [];
      for (const a of analyses) {
        if (!a) continue;
        try {
          // Buscar asset previo por origin_url para no duplicar
          const existingByOrigin = await prisma.contentAsset.findFirst({
            where: {
              projectId: input.projectId,
              metadata: { path: ['origin_url'], equals: a.url },
            },
          });
          if (existingByOrigin) {
            // Actualizar análisis si lo tenemos
            if (a.analysis) {
              const prev = (existingByOrigin.metadata as Record<string, unknown> | null) ?? {};
              const nextTags = Array.from(new Set([...(existingByOrigin.tags ?? []), 'moodboard', 'brand_analysis']));
              const upd = await prisma.contentAsset.update({
                where: { id: existingByOrigin.id },
                data: {
                  tags: nextTags,
                  aiDescription: a.analysis.description.slice(0, 500),
                  metadata: { ...prev, visual_analysis: a.analysis } as unknown as Prisma.InputJsonValue,
                },
              });
              moodboardAssets.push({ id: upd.id, asset_url: upd.assetUrl, visual_analysis: a.analysis });
            } else {
              moodboardAssets.push({
                id: existingByOrigin.id,
                asset_url: existingByOrigin.assetUrl,
                visual_analysis: null,
              });
            }
            continue;
          }

          // Descargar y subir a Storage
          const stored = await downloadAndStoreImage(a.url, input.userId);
          if (!stored) {
            logger.warn({ url: a.url.slice(0, 80) }, 'moodboard image download failed, skipping');
            continue;
          }

          const created = await prisma.contentAsset.create({
            data: {
              projectId: input.projectId,
              userId: input.userId,
              assetType: 'image',
              assetUrl: stored.publicUrl,
              aiDescription: a.analysis?.description?.slice(0, 500) ?? null,
              tags: ['moodboard', 'brand_analysis', 'website_auto'],
              metadata: {
                source: 'brand_analysis',
                origin_url: a.url,
                storage_path: stored.storagePath,
                visual_analysis: a.analysis ?? null,
                analyzed_at: new Date().toISOString(),
              } as unknown as Prisma.InputJsonValue,
            },
          });
          moodboardAssets.push({
            id: created.id,
            asset_url: created.assetUrl,
            visual_analysis: a.analysis,
          });
        } catch (err) {
          logger.warn({ err }, 'failed to persist moodboard asset');
        }
      }
      logger.info(
        { saved: moodboardAssets.length, attempted: analyses.length },
        'moodboard persistence complete',
      );

      const validAnalyses = analyses
        .filter((x): x is { url: string; analysis: ImageVisualAnalysis } => !!x && !!x.analysis)
        .map((x) => x.analysis);

      // 5. Social scraping
      const socials = await prisma.socialAccount.findMany({ where: { projectId: input.projectId } });
      let instagramPosts = 0;
      let tiktokPosts = 0;

      for (const s of socials) {
        try {
          if (s.platform === 'instagram') {
            const raw = s.handle ?? s.url ?? '';
            const parsed = parseInstagramHandle(raw);
            if (parsed && env.APIFY_API_KEY) {
              const r = await this.instagramScraper.scrape({
                handle: parsed,
                userId: input.userId,
                projectId: input.projectId,
              });
              instagramPosts += r.posts.length;
            }
          } else if (s.platform === 'tiktok') {
            const raw = s.handle ?? s.url ?? '';
            const parsed = parseTikTokHandle(raw);
            if (parsed && env.APIFY_API_KEY) {
              const r = await this.tiktokScraper.scrape({
                handle: parsed,
                userId: input.userId,
                projectId: input.projectId,
              });
              tiktokPosts += r.posts.length;
            }
          }
        } catch (err) {
          logger.warn({ err, platform: s.platform }, 'social scrape failed in orchestrator');
        }
      }

      // 6. Synthesize brand with enriched context
      const imageDescriptions = validAnalyses
        .slice(0, 10)
        .map((a, i) => `Imagen ${i + 1}: mood=${a.mood}; lighting=${a.lighting}; composition=${a.composition}; tags=${a.style_tags.join(',')}; desc=${a.description}`)
        .join('\n');
      const suggestedPalette = aggregatePalette(validAnalyses);
      const manualContext = [
        imageDescriptions && `Dirección visual detectada en imágenes del sitio:\n${imageDescriptions}`,
        suggestedPalette.length > 0 && `Colores dominantes detectados: ${suggestedPalette.join(', ')}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      let synth: Awaited<ReturnType<BrandSynthesizer['synthesize']>> | null = null;
      try {
        synth = await this.brandSynthesizer.synthesize({
          project,
          socialAccounts: socials.map((s) => ({
            platform: s.platform,
            source: s.source ?? 'none',
            url: s.url,
            manual_description: s.manualDescription,
          })),
          manualContext,
          userId: input.userId,
        });
      } catch (err) {
        logger.warn({ err }, 'synthesis failed in orchestrator');
      }

      // 7. Save brand profile with "suggested" palette (distinct from confirmed color_palette)
      const visualSummary = validAnalyses.length
        ? validAnalyses
            .slice(0, 5)
            .map((a) => a.description)
            .join('\n\n')
            .slice(0, 4000)
        : null;

      const moodboardData = {
        generated_at: new Date().toISOString(),
        asset_ids: moodboardAssets.map((m) => m.id),
        dominant_palette: suggestedPalette,
      };

      const mapped: Record<string, unknown> = {
        aiGenerated: true,
        colorPaletteSuggested: suggestedPalette.length > 0 ? suggestedPalette : null,
        visualAnalysisSummary: visualSummary,
        moodboardData: moodboardData as unknown as Prisma.InputJsonValue,
      };

      if (synth) {
        mapped.voiceTone = `${synth.tone} / ${synth.voice}`;
        mapped.brandValues = synth.values;
        mapped.keywords = synth.keywords ?? [];
        mapped.targetAudience = synth.audience.segments.join(', ');
        mapped.essence = synth.summary;
        mapped.mission = synth.mission ?? null;
        mapped.vision = synth.vision ?? null;
        mapped.competitiveAdvantage = synth.competitive_advantage ?? null;
        mapped.visualDirection = synth.visual.direction ?? null;
        // Do NOT overwrite color_palette here; suggestions go to color_palette_suggested.
      }

      const brandProfile = await prisma.brandProfile.upsert({
        where: { projectId: input.projectId },
        create: { projectId: input.projectId, userId: input.userId, ...mapped },
        update: mapped,
      });

      const result: BrandAnalysisResult = {
        jobId: job.id,
        summary: {
          pagesScraped: pagesData.length,
          imagesAnalyzed: validAnalyses.length,
          instagramPosts,
          tiktokPosts,
          logoFound: !!logoAsset,
        },
        brand_profile: brandProfile,
        palette_suggested: suggestedPalette,
        moodboard_assets: moodboardAssets,
        logo_asset: logoAsset,
      };

      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'succeeded', output: result as unknown as Prisma.InputJsonValue, finishedAt: new Date() },
      });

      return result;
    } catch (err) {
      logger.error({ err }, 'brand orchestrator failed');
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'failed', error: String(err), finishedAt: new Date() },
      });
      await notificationService
        .jobFailed({
          userId: input.userId,
          projectId: input.projectId,
          jobKind: 'brand_analyze',
          error: String(err),
        })
        .catch(() => null);
      throw err;
    }
  }
}
