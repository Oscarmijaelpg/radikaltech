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

export interface FirecrawlScrapeResponse {
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

