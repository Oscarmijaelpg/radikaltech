
export class ApifyService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || import.meta.env.VITE_APIFY_API_KEY || '';
    if (!this.apiKey) {
      console.warn('VITE_APIFY_API_KEY is not defined in environment variables');
    }
  }

  private async runActor(actorId: string, input: any, timeoutSecs: number = 120): Promise<any[]> {
    try {
      
      // 1. Launch the run asynchronously
      const runUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${this.apiKey}&timeout=${timeoutSecs}&waitForFinish=${timeoutSecs}`;
      const runResponse = await fetch(runUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      if (!runResponse.ok) {
        const errorText = await runResponse.text();
        throw new Error(`Failed to run Apify actor ${actorId}: ${runResponse.statusText}. Details: ${errorText}`);
      }

      const runData = await runResponse.json();
      const run = runData.data;
      const runId = run?.id;

      if (run?.status === 'FAILED' || run?.status === 'ABORTED') {
        const logsUrl = `https://api.apify.com/v2/logs/${runId}?token=${this.apiKey}`;
        console.error(`[ApifyService] Actor ${actorId} run FAILED. Check logs: ${logsUrl}`);
        // Try to fetch a snippet of the logs for debugging
        try {
          const logsResp = await fetch(logsUrl);
          const logsText = await logsResp.text();
          console.error(`[ApifyService] Last 500 chars of logs: ${logsText.slice(-500)}`);
        } catch {}
        throw new Error(`Failed to run Apify actor ${actorId}: Actor run did not succeed (run ID: ${runId}, status: ${run?.status}).`);
      }

      if (!runId) throw new Error(`Failed to get run ID for actor ${actorId}`);

      // 2. Fetch dataset items
      const datasetId = run?.defaultDatasetId;
      const dataUrl = datasetId
        ? `https://api.apify.com/v2/datasets/${datasetId}/items?token=${this.apiKey}&clean=true&format=json`
        : `https://api.apify.com/v2/acts/${actorId}/runs/${runId}/dataset/items?token=${this.apiKey}&clean=true&format=json`;

      const dataResponse = await fetch(dataUrl);
      if (!dataResponse.ok) {
        const errText = await dataResponse.text();
        throw new Error(`Failed to fetch dataset for run ${runId}: ${errText}`);
      }

      const data = await dataResponse.json();
      const items = Array.isArray(data) ? data : (data?.items || []);
      return items;
    } catch (error) {
      console.error(`Error in ApifyService for actor ${actorId}:`, error);
      throw error;
    }
  }

  private cleanSocialUrl(url: string, baseUrl: string): string {
    let clean = url.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    if (clean.startsWith('@')) clean = clean.substring(1);
    if (clean.startsWith('#')) return clean; // Keep hashtags clean
    return `https://www.${baseUrl}/${clean}/`;
  }

  async scrapeInstagram(urls: string[]): Promise<any[]> {
    const isHashtag = urls.some(u => u.includes('/explore/tags/') || (!u.startsWith('http') && u.startsWith('#')));
    
    // Clean URLs mapping
    const directUrls = urls.map(u => isHashtag ? (u.startsWith('http') ? u : `https://www.instagram.com/explore/tags/${u.replace('#', '')}/`) : this.cleanSocialUrl(u, 'instagram.com'));

    const input: any = {
      "addParentData": true, // Enable parent data to get follower counts
      "directUrls": directUrls,
      "onlyPostsNewerThan": "4 weeks",
      "resultsLimit": 30,
      "resultsType": "posts"
    };

    if (isHashtag) {
      input.searchType = "hashtag";
      input.searchLimit = 1;
    }

    return this.runActor("apify~instagram-scraper", input);
  }

  async scrapeTikTok(urls: string[]): Promise<any[]> {
    const profiles = urls.map(u => {
      let val = u.trim();
      // Extract username from URL like https://www.tiktok.com/@username
      if (val.includes('tiktok.com/')) {
        const match = val.match(/@([^\/\?#]+)/);
        if (match) return match[1];
        const parts = val.split('/');
        const lastPart = parts[parts.length - 1];
        if (lastPart) return lastPart;
      }
      if (val.startsWith('@')) return val.substring(1);
      return val;
    }).filter(p => p.length > 0);

    if (profiles.length === 0) return [];

    const input = {
      "profiles": profiles,
      "resultsPerPage": 20,
      "shouldScrapeVideos": true,
      "shouldScrapeUserStats": true,
      "proxyConfiguration": {
        "useApifyProxy": true,
        "apifyProxyGroups": ["RESIDENTIAL"]
      }
    };
    
    return this.runActor("clockworks~tiktok-scraper", input, 180);
  }

  async scrapeTwitter(urls: string[]): Promise<any[]> {
    const input = {
      "startUrls": urls.map(u => ({ "url": this.cleanSocialUrl(u, 'x.com') })),
      "maxTweets": 20
    };
    return this.runActor("apify~twitter-scraper-lite", input);
  }

  async scrapeYoutube(urls: string[]): Promise<any[]> {
    const input = {
      "startUrls": urls.map(u => ({ "url": this.cleanSocialUrl(u, 'youtube.com/@') })),
      "maxResults": 20
    };
    return this.runActor("apify~youtube-scraper", input);
  }

  async scrapeFacebook(urls: string[]): Promise<any[]> {
    const input = {
      "startUrls": urls.map(u => ({ "url": this.cleanSocialUrl(u, 'facebook.com') })),
      "resultsLimit": 20
    };
    return this.runActor("apify~facebook-post-scraper", input);
  }

  async scrapeLinkedIn(urls: string[]): Promise<any[]> {
    const input = {
      "urls": urls.map(u => this.cleanSocialUrl(u, 'linkedin.com/company')),
      "minDelay": 2,
      "maxDelay": 5
    };
    return this.runActor("apify~linkedin-scraper", input);
  }
}

export const apifyService = new ApifyService();
