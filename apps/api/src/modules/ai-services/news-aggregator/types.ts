export interface NewsItem {
  title: string;
  url: string;
  source?: string;
  published_at?: string;
  summary?: string;
}

export interface EnrichedNewsItem {
  original_index: number;
  title: string;
  url: string;
  source?: string;
  source_authority: number;
  relevance_score: number;
  relevance_reason: string;
  cluster_id?: string;
  cluster_size?: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface NewsAnalysis {
  narrative: string;
  executive_summary: string;
  top_themes: Array<{ name: string; count: number; description: string }>;
  overall_sentiment: 'positive' | 'neutral' | 'negative';
  sentiment_breakdown: { positive: number; neutral: number; negative: number };
  per_item_sentiment: Record<string, 'positive' | 'neutral' | 'negative'>;
  key_insights: string[];
  trending_keywords: string[];
  items_enriched?: EnrichedNewsItem[];
}

export interface ProjectContext {
  company_name?: string | null;
  industry?: string | null;
  business_summary?: string | null;
  unique_value?: string | null;
  main_products?: string | null;
  operating_countries?: string[];
}

export interface NewsResult {
  topic: string;
  items: NewsItem[];
  analysis?: NewsAnalysis;
}

export interface AggregateNewsInput {
  topic: string;
  userId: string;
  projectId?: string;
}

export interface AggregateNewsOutput {
  jobId: string;
  result: NewsResult;
  report?: {
    id: string;
    title: string;
    summary: string | null;
    createdAt: Date;
  };
}
