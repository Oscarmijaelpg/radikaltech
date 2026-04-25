const DEFAULT_AUTHORITY = 55;
const MAX_AUTHORITY = 100;
const HEURISTIC_NEWS_BOOST = 5;
const TLD_EDU_BOOST = 15;
const TLD_GOV_BOOST = 15;

const AUTHORITY: Record<string, number> = {
  'reuters.com': 95,
  'bloomberg.com': 95,
  'nytimes.com': 90,
  'wsj.com': 90,
  'ft.com': 90,
  'economist.com': 88,
  'forbes.com': 80,
  'fortune.com': 85,
  'cnbc.com': 82,
  'bbc.com': 90,
  'theguardian.com': 85,
  'techcrunch.com': 75,
  'wired.com': 75,
  'theverge.com': 75,
  'wikipedia.org': 70,
  'medium.com': 55,
  'substack.com': 55,
  'linkedin.com': 50,
  'facebook.com': 40,
  'twitter.com': 40,
  'x.com': 40,
};

export function computeAuthority(host: string | undefined): number {
  if (!host) return DEFAULT_AUTHORITY;
  const h = host.toLowerCase();
  if (AUTHORITY[h] !== undefined) return AUTHORITY[h]!;
  for (const [dom, score] of Object.entries(AUTHORITY)) {
    if (h === dom || h.endsWith(`.${dom}`)) return score;
  }
  let score = DEFAULT_AUTHORITY;
  if (h.includes('news') || h.includes('press') || h.includes('times'))
    score += HEURISTIC_NEWS_BOOST;
  if (h.endsWith('.edu')) score += TLD_EDU_BOOST;
  if (h.endsWith('.gov')) score += TLD_GOV_BOOST;
  return Math.min(MAX_AUTHORITY, score);
}

export function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}
