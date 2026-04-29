import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface UpdateProjectInput {
  id: string;
  name?: string;
  description?: string;
  industry?: string;
  website?: string;
  company_name?: string;
  industry_custom?: string;
  business_summary?: string;
  ideal_customer?: string;
  unique_value?: string;
  main_products?: string;
  additional_context?: string;
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateProjectInput) => {
      const r = await api.patch<{ data: unknown }>(`/projects/${id}`, input);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
