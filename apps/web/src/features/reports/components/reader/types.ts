import type { ReportType } from '../../api/reports';

export interface Citation {
  id?: string;
  title?: string;
  url?: string;
}

export interface NewsItemSimple {
  title?: string;
  url?: string;
  source?: string;
  summary?: string;
  published_at?: string;
  sentiment?: string;
}

export interface EnrichedNewsItemUI {
  original_index: number;
  title: string;
  url: string;
  source?: string;
  source_authority: number;
  relevance_score: number;
  relevance_reason?: string;
  cluster_id?: string;
  cluster_size?: number;
  sentiment?: string;
}

export interface NewsAnalysis {
  narrative?: string;
  executive_summary?: string;
  top_themes?: Array<{ name: string; count: number; description?: string }>;
  overall_sentiment?: string;
  sentiment_breakdown?: { positive?: number; neutral?: number; negative?: number };
  per_item_sentiment?: Record<string, string>;
  key_insights?: string[];
  trending_keywords?: string[];
  items_enriched?: EnrichedNewsItemUI[];
}

export interface CompetitorBlock {
  name?: string;
  url?: string;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
}

export interface StructuredInsight {
  text?: string;
  impact?: string;
}

export const TYPE_LABELS: Record<ReportType, { label: string; classes: string; icon: string }> = {
  competition: {
    label: 'Competencia',
    classes: 'bg-rose-100 text-rose-700 border-rose-200',
    icon: 'radar',
  },
  monthly_audit: {
    label: 'Auditoría',
    classes: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: 'fact_check',
  },
  brand_strategy: {
    label: 'Estrategia',
    classes: 'bg-violet-100 text-violet-700 border-violet-200',
    icon: 'auto_awesome',
  },
  news: {
    label: 'Noticias',
    classes: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    icon: 'newspaper',
  },
  general: {
    label: 'General',
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: 'description',
  },
};

export const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'hsl(var(--color-sentiment-positive))',
  neutral: 'hsl(var(--color-sentiment-neutral))',
  negative: 'hsl(var(--color-sentiment-negative))',
};
