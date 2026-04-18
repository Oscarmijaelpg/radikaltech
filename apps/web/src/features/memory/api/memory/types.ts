// ---------- Brand ----------

export interface BrandProfile {
  id: string;
  project_id: string;
  user_id: string;
  essence: string | null;
  mission: string | null;
  vision: string | null;
  brand_values: string[];
  keywords: string[];
  target_audience: string | null;
  competitive_advantage: string | null;
  portfolio: string | null;
  voice_tone: string | null;
  visual_direction: string | null;
  color_palette: unknown;
  color_palette_suggested?: unknown;
  visual_analysis_summary?: string | null;
  moodboard_data?: {
    generated_at?: string;
    asset_ids?: string[];
    dominant_palette?: string[];
  } | null;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrandAnalysisResultLite {
  jobId: string;
  summary: {
    pagesScraped: number;
    imagesAnalyzed: number;
    instagramPosts: number;
    tiktokPosts: number;
    logoFound: boolean;
  };
  palette_suggested: string[];
  moodboard_assets: Array<{ id: string; asset_url: string; visual_analysis: unknown }>;
  logo_asset: { id: string; url: string } | null;
}

// ---------- Memory items ----------

export interface MemoryItem {
  id: string;
  project_id: string | null;
  user_id: string;
  category: string;
  key: string;
  value: string;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

// ---------- Competitors / social analytics ----------

export interface EngagementStatsPayload {
  total_posts: number;
  total_likes: number;
  total_comments: number;
  total_views: number;
  total_shares: number;
  avg_likes: number;
  avg_comments: number;
  avg_views: number;
  avg_engagement: number;
  posts_per_week: number;
  top_post_ids: string[];
  best_hour: number | null;
  best_day: string | null;
  by_platform: Record<string, { count: number; likes: number; comments: number; views: number; shares: number }>;
  updated_at: string;
}

export interface VisualAnalysisPayload {
  dominant_colors: string[];
  lighting: string;
  mood: string;
  composition: string;
  style_tags: string[];
  description: string;
  auto_generated?: boolean;
  analyzed_at?: string;
}

export interface Competitor {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  website: string | null;
  social_links: Record<string, string> | null;
  notes: string | null;
  last_analyzed_at: string | null;
  analysis_data: CompetitorAnalysisResult | null;
  sync_status?: Record<string, { synced_at: string; post_count: number; handle?: string }> | null;
  engagement_stats?: EngagementStatsPayload | null;
  status?: 'confirmed' | 'suggested' | 'rejected';
  source?: string;
  detected_at?: string | null;
  created_at: string;
}

export interface SocialPostItem {
  id: string;
  competitor_id: string | null;
  platform: string;
  post_url: string;
  post_id: string | null;
  caption: string | null;
  image_url: string | null;
  post_type: string | null;
  likes: number;
  comments: number;
  views: number;
  shares: number;
  posted_at: string | null;
  scraped_at: string;
  visual_analysis?: VisualAnalysisPayload | null;
}

export interface CompetitorStats {
  competitor_id: string;
  competitor_name: string;
  total_posts: number;
  total_likes: number;
  total_comments: number;
  avg_engagement: number;
  by_platform: Record<string, { count: number; likes: number; comments: number; views: number; engagement: number }>;
  format_mix: Record<string, number>;
  top_posts: Array<{
    id: string;
    post_url: string;
    caption: string | null;
    likes: number;
    comments: number;
    views: number;
    platform: string;
    image_url: string | null;
    posted_at: string | null;
  }>;
  posts_by_week: Array<{ week: string; count: number }>;
  engagement_stats?: EngagementStatsPayload | null;
}

export interface CompetitorAnalysisResult {
  query: string;
  competitors: Array<{
    name: string;
    url?: string;
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
  }>;
  insights: string[];
}

export type AnalysisMode = 'web' | 'social' | 'combined';
export type ScrapeNetwork = 'instagram' | 'tiktok';

// ---------- Social accounts ----------

export interface SocialAccount {
  id: string;
  projectId: string;
  userId: string;
  platform: string;
  platformCustom?: string | null;
  source: 'url' | 'manual';
  url: string | null;
  handle: string | null;
  manualDescription: string | null;
  followers?: number | null;
  isActive?: boolean | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- Active jobs ----------

export interface ActiveJob {
  id: string;
  kind: string;
  status: 'queued' | 'running';
  project_id: string | null;
  created_at: string;
  started_at: string | null;
}
