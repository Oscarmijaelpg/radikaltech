import { env } from '../../../config/env.js';
import { PROVIDER_URLS } from '../../../config/providers.js';
import type { FirecrawlScrapeResponse } from './types.js';

const FIRECRAWL_TIMEOUT_MS = 28_000;
const FIRECRAWL_INTERNAL_TIMEOUT_MS = 25_000;

export async function firecrawlScrape(url: string): Promise<FirecrawlScrapeResponse> {
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
      timeout: FIRECRAWL_INTERNAL_TIMEOUT_MS,
    }),
    signal: AbortSignal.timeout(FIRECRAWL_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Firecrawl ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}
