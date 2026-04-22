import { prisma, Prisma } from '@radikal/db';
import { logger } from '../../../lib/logger.js';
import { supabaseAdmin } from '../../../lib/supabase.js';
import type { FirecrawlScrapeResponse } from './types.js';
import { JobLogger } from '../../jobs/job-logger.js';

const STORAGE_BUCKET = 'assets';
const LOGO_DOWNLOAD_TIMEOUT_MS = 15_000;
const MIN_LOGO_SIZE_BYTES = 100;

// Scoring weights (más alto = más prioritario)
const SCORE_IMG_LOGO_CLASS = 100;
const SCORE_OG_IMAGE_HTML = 70;
const SCORE_APPLE_TOUCH_ICON = 60;
const SCORE_OG_IMAGE_META = 55;
const SCORE_TWITTER_IMAGE = 50;
const SCORE_MASK_ICON = 40;
const SCORE_FALLBACK_LOGO_SVG = 40;
const SCORE_FALLBACK_LOGO_PNG = 35;
const SCORE_FALLBACK_APPLE_PNG = 30;
const SCORE_FALLBACK_FAVICON_PNG = 20;
const SCORE_FALLBACK_GOOGLE_S2 = 10;

const BONUS_EXT_SVG = 30;
const BONUS_EXT_PNG = 15;
const PENALTY_EXT_ICO = -20;
const BONUS_URL_CONTAINS_LOGO = 25;
const PENALTY_URL_CONTAINS_FAVICON = -15;

function absolutize(maybeUrl: string | undefined, baseUrl: string): string | undefined {
  if (!maybeUrl) return undefined;
  try {
    return new URL(maybeUrl, baseUrl).toString();
  } catch {
    return undefined;
  }
}

// Detecta candidatos de logo con scoring: logos reales > og:image > apple-touch-icon > favicon.
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
    let s = score;
    if (abs.toLowerCase().endsWith('.svg')) s += BONUS_EXT_SVG;
    else if (abs.toLowerCase().endsWith('.png')) s += BONUS_EXT_PNG;
    else if (abs.toLowerCase().endsWith('.ico')) s += PENALTY_EXT_ICO;
    if (/logo/i.test(abs)) s += BONUS_URL_CONTAINS_LOGO;
    if (/favicon/i.test(abs)) s += PENALTY_URL_CONTAINS_FAVICON;
    scored.push({ url: abs, score: s });
  }

  if (html) {
    // 1) <img> con clase/id/alt/src que contenga "logo" — logos reales.
    const logoImgMatches = html.matchAll(
      /<img[^>]+(?:class|id|alt|src)=["'][^"']*logo[^"']*["'][^>]*>/gi,
    );
    for (const m of logoImgMatches) {
      const srcMatch = m[0].match(/\bsrc=["']([^"']+)["']/i);
      if (srcMatch?.[1]) push(srcMatch[1], SCORE_IMG_LOGO_CLASS);
    }

    // 2) og:image:secure_url y og:image (de HTML, pueden repetirse varios).
    const ogMatches = html.matchAll(
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/gi,
    );
    for (const m of ogMatches) push(m[1], SCORE_OG_IMAGE_HTML);

    // 3) apple-touch-icon.
    const appleIconMatches = html.matchAll(
      /<link[^>]+rel=["']apple-touch-icon(?:-precomposed)?["'][^>]*href=["']([^"']+)["']/gi,
    );
    for (const m of appleIconMatches) push(m[1], SCORE_APPLE_TOUCH_ICON);

    // 4) mask-icon / icon (svg).
    const maskMatches = html.matchAll(
      /<link[^>]+rel=["'](?:mask-icon|icon)["'][^>]*href=["']([^"']+)["']/gi,
    );
    for (const m of maskMatches) push(m[1], SCORE_MASK_ICON);
  }

  // 5) Metadata Firecrawl (menor prioridad).
  push(ogImage, SCORE_OG_IMAGE_META);
  push(twitterImage, SCORE_TWITTER_IMAGE);

  // 6) Fallbacks al final.
  try {
    const u = new URL(pageUrl);
    push(`${u.protocol}//${u.host}/apple-touch-icon.png`, SCORE_FALLBACK_APPLE_PNG);
    push(`${u.protocol}//${u.host}/logo.png`, SCORE_FALLBACK_LOGO_PNG);
    push(`${u.protocol}//${u.host}/logo.svg`, SCORE_FALLBACK_LOGO_SVG);
    push(`${u.protocol}//${u.host}/favicon.png`, SCORE_FALLBACK_FAVICON_PNG);
    push(
      `https://www.google.com/s2/favicons?domain=${u.host}&sz=256`,
      SCORE_FALLBACK_GOOGLE_S2,
    );
  } catch {
    /* ignore URL parsing failure */
  }

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
  jl?: JobLogger,
): Promise<{ publicUrl: string; assetId?: string } | undefined> {
  try {
    const res = await fetch(logoUrl, {
      signal: AbortSignal.timeout(LOGO_DOWNLOAD_TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RadikalBot/1.0)' },
    });
    if (!res.ok) {
      if (jl) await jl.warn(`Fallo descarga de logo (${res.status}): ${logoUrl.split('/').pop()}`);
      return undefined;
    }
    const ct = res.headers.get('content-type');
    if (ct && !ct.startsWith('image/') && !ct.includes('octet-stream')) {
      if (jl) await jl.warn(`El recurso no es una imagen (${ct}): ${logoUrl.split('/').pop()}`);
      return undefined;
    }
    const ext = extFromContentType(ct);
    const arr = new Uint8Array(await res.arrayBuffer());
    if (arr.byteLength < MIN_LOGO_SIZE_BYTES) {
      if (jl) await jl.warn(`Logo demasiado pequeño (${arr.byteLength} bytes): ${logoUrl.split('/').pop()}`);
      return undefined;
    }
    const path = `${userId}/brand/logo-${Date.now()}.${ext}`;
    const up = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(path, arr, { contentType: ct ?? 'image/png', upsert: false });
    if (up.error) {
      if (jl) await jl.error(`Error al subir a storage: ${up.error.message}`);
      return undefined;
    }
    const pub = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    const publicUrl = pub.data?.publicUrl;
    if (!publicUrl) return undefined;

    let assetId: string | undefined;
    if (projectId) {
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
    }
    return { publicUrl, assetId };
  } catch (err) {
    if (jl) await jl.warn(`Error en descarga: ${err instanceof Error ? err.message : String(err)}`);
    return undefined;
  }
}

export async function downloadAndStoreLogo(
  candidates: string[],
  userId: string,
  projectId: string | undefined,
  jl?: JobLogger,
): Promise<{ publicUrl: string; assetId?: string } | undefined> {
  for (const c of candidates) {
    const result = await tryDownloadOne(c, userId, projectId, jl);
    if (result) return result;
  }
  return undefined;
}
