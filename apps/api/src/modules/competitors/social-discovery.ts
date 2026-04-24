import { env } from '../../config/env.js';
import { PROVIDER_URLS } from '../../config/providers.js';
import { parseInstagramHandle, parseTikTokHandle } from '../ai-services/index.js';

export type ScrapeNetwork = 'instagram' | 'tiktok';

const SOCIAL_PATTERNS: Array<[string, RegExp]> = [
  ['instagram', /https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)(?:\/|\?|")/i],
  ['tiktok', /https?:\/\/(?:www\.)?tiktok\.com\/@([A-Za-z0-9._]+)(?:\/|\?|")/i],
  ['facebook', /https?:\/\/(?:www\.)?facebook\.com\/([A-Za-z0-9.\-_]+)(?:\/|\?|")/i],
  [
    'linkedin',
    /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/([A-Za-z0-9\-_]+)(?:\/|\?|")/i,
  ],
  ['x', /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([A-Za-z0-9_]+)(?:\/|\?|")/i],
  [
    'youtube',
    /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/)([A-Za-z0-9\-_]+)(?:\/|\?|")/i,
  ],
];

function canonicalUrl(platform: string, handle: string): string | null {
  switch (platform) {
    case 'instagram':
      return `https://instagram.com/${handle}`;
    case 'tiktok':
      return `https://tiktok.com/@${handle}`;
    case 'facebook':
      return `https://facebook.com/${handle}`;
    case 'linkedin':
      return `https://linkedin.com/company/${handle}`;
    case 'x':
      return `https://x.com/${handle}`;
    case 'youtube':
      return `https://youtube.com/@${handle}`;
    default:
      return null;
  }
}

export function extractHandle(
  network: ScrapeNetwork,
  socialLinks: Record<string, string> | null | undefined,
): string | null {
  if (!socialLinks) return null;
  const raw = socialLinks[network];
  if (!raw) return null;
  return network === 'instagram' ? parseInstagramHandle(raw) : parseTikTokHandle(raw);
}

/** Busca links a Instagram/TikTok/FB/LinkedIn/X/YouTube en el HTML del website. */
export async function discoverSocialLinksFromWebsite(
  websiteUrl: string,
): Promise<Record<string, string>> {
  if (!env.FIRECRAWL_API_KEY) return {};

  try {
    const res = await fetch(PROVIDER_URLS.firecrawl.scrape, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url: websiteUrl,
        formats: ['html'],
        onlyMainContent: false,
        timeout: 20_000,
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return {};
    const body = (await res.json()) as { data?: { html?: string } };
    const html = body.data?.html ?? '';
    if (!html) return {};

    const links: Record<string, string> = {};
    for (const [key, re] of SOCIAL_PATTERNS) {
      const m = html.match(re);
      if (m && m[1]) {
        const url = canonicalUrl(key, m[1]);
        if (url) links[key] = url;
      }
    }
    return links;
  } catch {
    return {};
  }
}
