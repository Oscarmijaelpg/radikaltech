import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    WEB_URL: 'http://localhost:3000',
    SUPABASE_URL: 'http://localhost',
    SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'srv',
    DATABASE_URL: 'postgres://x',
    LOG_LEVEL: 'silent',
    FIRECRAWL_API_KEY: 'fc',
    OPENAI_API_KEY: 'oai',
  },
}));

vi.mock('@radikal/db', () => ({ prisma: {} }));

vi.mock('../../src/lib/supabase.js', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
      }),
    },
  },
}));

import { detectLogoCandidates } from '../../src/modules/ai-services/website-analyzer.js';

describe('detectLogoCandidates', () => {
  it('prioritizes <img alt=logo> over favicons', () => {
    const html = `
      <html><head>
        <link rel="icon" href="/favicon.ico">
      </head><body>
        <img alt="logo" src="/assets/logo.svg" />
      </body></html>
    `;
    const scrape = { success: true, data: { html, metadata: {} } };
    const out = detectLogoCandidates(scrape, 'https://example.com/');
    expect(out[0]).toContain('logo.svg');
    // favicon must appear later than the real logo
    const logoIdx = out.findIndex((u) => u.includes('logo.svg'));
    const favIdx = out.findIndex((u) => u.includes('favicon.ico'));
    if (favIdx !== -1) expect(logoIdx).toBeLessThan(favIdx);
  });

  it('deduplicates repeated URLs', () => {
    const html = `
      <img alt="logo" src="https://cdn.example.com/logo.png" />
      <img class="logo" src="https://cdn.example.com/logo.png" />
      <meta property="og:image" content="https://cdn.example.com/logo.png" />
    `;
    const scrape = { success: true, data: { html, metadata: {} } };
    const out = detectLogoCandidates(scrape, 'https://example.com/');
    const occurrences = out.filter((u) => u === 'https://cdn.example.com/logo.png').length;
    expect(occurrences).toBe(1);
  });

  it('places Google S2 fallback at the end', () => {
    const html = `<img alt="logo" src="/img/logo.svg" />`;
    const scrape = { success: true, data: { html, metadata: {} } };
    const out = detectLogoCandidates(scrape, 'https://acme.com/');
    const s2 = out.find((u) => u.includes('google.com/s2/favicons'));
    expect(s2).toBeDefined();
    // s2 must NOT be the first candidate when we have a real logo
    expect(out[0]).not.toContain('google.com/s2/favicons');
    // and must be last or near-last
    expect(out.indexOf(s2!)).toBe(out.length - 1);
  });

  it('returns S2 fallback when there is no html', () => {
    const scrape = { success: true, data: { html: '', metadata: {} } };
    const out = detectLogoCandidates(scrape, 'https://acme.com/');
    expect(out.some((u) => u.includes('google.com/s2/favicons'))).toBe(true);
  });
});
