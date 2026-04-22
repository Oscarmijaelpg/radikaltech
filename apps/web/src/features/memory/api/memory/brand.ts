import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BrandProfile } from './types';

export interface BrandHistoryEntry {
  id: string;
  projectId: string;
  userId: string;
  snapshotType: 'brand_profile' | 'logo' | 'palette' | 'identity_change' | string;
  previous: Record<string, unknown> | null;
  current: Record<string, unknown>;
  changeSummary: string | null;
  createdAt: string;
}

export function useBrandHistory(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['memory', 'brand', 'history', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const r = await api.get<{ data: BrandHistoryEntry[] }>(
        `/brand/history?project_id=${projectId}`,
      );
      return r.data;
    },
  });
}

export function useBrand(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['memory', 'brand', projectId],
    queryFn: async () => {
      const r = await api.get<{ data: BrandProfile | null }>(`/memory/brand/${projectId}`);
      return r.data;
    },
    enabled: !!projectId,
  });
}

export interface UpsertBrandInput {
  project_id: string;
  tone?: string;
  voice?: string;
  values?: string[];
  audience?: string;
  visual?: string;
  summary?: string;
}

export function useUpsertBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertBrandInput) => {
      const r = await api.put<{ data: unknown }>('/brand', input);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['memory', 'brand', vars.project_id] });
    },
  });
}

export function useAnalyzeBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { project_id: string }) => {
      const r = await api.post<{ data: { status: string; message: string } }>(
        '/ai-services/analyze-brand',
        input,
      );
      return r.data;
    },
    onSuccess: (_d, vars) => {
      // El job real corre en background. Forzamos refresh del polling de jobs activos
      // para que el banner aparezca de inmediato.
      qc.invalidateQueries({ queryKey: ['jobs', 'active', vars.project_id] });
    },
  });
}

export function useAcceptBrandSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { project_id: string; field: 'color_palette' }) => {
      const r = await api.post<{ data: unknown }>('/brand/accept-suggestion', input);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['memory', 'brand', vars.project_id] });
    },
  });
}

export function useSynthesizeBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { project_id: string }) => {
      const r = await api.post<{ data: unknown }>('/ai/synthesize-brand', input);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['memory', 'brand', vars.project_id] });
    },
  });
}
