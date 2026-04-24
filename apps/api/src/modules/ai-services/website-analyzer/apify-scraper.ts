import { env } from '../../../config/env.js';
import { apifyRunSyncUrl } from '../../../config/providers.js';
import { logger } from '../../../lib/logger.js';

const ACTOR_ID = 'apify/website-content-crawler';

export interface ApifyScrapeResult {
  success: boolean;
  markdown?: string;
  html?: string;
  metadata?: {
    title?: string;
    description?: string;
  };
  error?: string;
}

export async function apifyWebScrape(url: string): Promise<ApifyScrapeResult> {
  if (!env.APIFY_API_KEY) {
    return { success: false, error: 'APIFY_API_KEY not set' };
  }

  logger.info({ url }, 'apify web scrape start');
  
  try {
    const res = await fetch(
      apifyRunSyncUrl(ACTOR_ID, env.APIFY_API_KEY),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url }],
          maxPagesPerCrawl: 1,
          onlyMainContent: true,
        }),
        signal: AbortSignal.timeout(60_000),
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Apify ${res.status}: ${text.slice(0, 300)}`);
    }

    const items = (await res.json()) as any[];
    if (!items || items.length === 0) {
      throw new Error('Apify returned no results for this URL');
    }

    // El actor website-content-crawler devuelve un array de páginas encontradas.
    // Tomamos la primera (que debería ser la URL solicitada).
    const item = items[0];
    
    return {
      success: true,
      markdown: item.markdown || item.text || '',
      html: item.html || '',
      metadata: {
        title: item.metadata?.title || item.title,
        description: item.metadata?.description || item.description,
      }
    };
  } catch (error) {
    logger.error({ url, error }, 'apify web scrape failed');
    return { success: false, error: String(error) };
  }
}
