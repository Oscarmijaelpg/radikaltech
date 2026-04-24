import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface NewsItem {
  title: string;
  url: string;
  source?: string;
  published_at?: string;
  summary?: string;
}

export interface NewsAnalysis {
  narrative?: string;
  executive_summary?: string;
  key_insights?: string[];
  trending_keywords?: string[];
  overall_sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface NewsResult {
  topic: string;
  items: NewsItem[];
  analysis?: NewsAnalysis;
}

export interface AggregateNewsResponse {
  jobId: string;
  result: NewsResult;
  report?: {
    id: string;
    title: string;
    summary: string | null;
    createdAt: string;
  };
}

export interface SavedReport {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  reportType: string;
  content: string | null;
  summary: string | null;
  sourceData: unknown;
  createdAt: string;
}

export function useAggregateNews() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { topic: string; project_id?: string }) => {
      const res = await api.post<{ data: AggregateNewsResponse }>(
        '/ai-services/aggregate-news',
        vars,
      );
      return res.data;
    },
    onSuccess: (_data, vars) => {
      if (vars.project_id) {
        qc.invalidateQueries({ queryKey: ['reports', 'news', vars.project_id] });
      }
    },
  });
}

export function useSavedNewsReports(projectId: string | undefined) {
  return useQuery({
    queryKey: ['reports', 'news', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const res = await api.get<{ data: SavedReport[] }>(
        `/reports?project_id=${projectId}&type=news`,
      );
      return res.data;
    },
  });
}
