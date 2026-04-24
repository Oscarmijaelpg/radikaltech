import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { MemoryItem } from './types';

export function useMemories(projectId: string | null | undefined, category?: string) {
  return useQuery({
    queryKey: ['memory', 'list', projectId, category ?? null],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set('project_id', projectId as string);
      if (category) qs.set('category', category);
      const r = await api.get<{ data: MemoryItem[] }>(`/memory?${qs.toString()}`);
      return r.data;
    },
    enabled: !!projectId,
  });
}

export interface CreateMemoryInput {
  project_id: string;
  category: string;
  key?: string;
  value: string;
  metadata?: Record<string, unknown>;
}

export function useCreateMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMemoryInput) => {
      const r = await api.post<{ data: MemoryItem }>('/memory', input);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['memory', 'list', vars.project_id] });
    },
  });
}

export interface UpdateMemoryInput {
  id: string;
  project_id: string;
  category?: string;
  key?: string;
  value?: string;
  metadata?: Record<string, unknown>;
}

export function useUpdateMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateMemoryInput) => {
      const r = await api.patch<{ data: MemoryItem }>(`/memory/${id}`, input);
      return r.data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['memory', 'list', vars.project_id] });
    },
  });
}

export function useDeleteMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; project_id: string }) => {
      await api.delete(`/memory/${id}`);
      return id;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['memory', 'list', vars.project_id] });
    },
  });
}
