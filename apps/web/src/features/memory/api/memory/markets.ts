import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useDetectMarkets(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const r = await api.post<{
        data: { countries: string[]; regions: string[]; evidence: string };
      }>(`/projects/${projectId}/detect-markets`, {});
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateMarkets(projectId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (text: string | string[]) => {
      // Soporta tanto string (nuevo formato) como array (legacy)
      const payload = typeof text === 'string' 
        ? { text } 
        : { text: text.join('\n') };
      const r = await api.patch<{
        data: {
          id: string;
          operating_countries: string;
          operating_countries_suggested: string | null;
        };
      }>(`/projects/${projectId}/markets`, payload);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useConfirmMarkets(projectId: string | null | undefined) {
  return useUpdateMarkets(projectId);
}
