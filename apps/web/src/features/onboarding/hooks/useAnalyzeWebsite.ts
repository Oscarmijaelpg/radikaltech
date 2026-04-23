import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AnalyzeWebsiteResult {
  business_summary?: string;
  main_products?: string;
  ideal_customer?: string;
  unique_value?: string;
  industry_suggestion?: string;
  brand_name?: string;
  value_propositions?: string[];
}

interface AnalyzerBackendResponse {
  data: {
    jobId: string;
    result: {
      url: string;
      metadata?: { title?: string; description?: string };
      detected_info?: {
        brand_name?: string;
        industry?: string;
        business_summary?: string;
        main_products?: string;
        ideal_customer?: string;
        unique_value?: string;
        value_propositions?: string[];
      };
    };
  };
}

function cleanStringArray(arr: unknown): string[] | undefined {
  if (!Array.isArray(arr)) return undefined;
  const filtered = arr
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 80);
  return filtered.length > 0 ? Array.from(new Set(filtered)) : undefined;
}

export function useAnalyzeWebsite() {
  return useMutation<AnalyzeWebsiteResult, Error, string>({
    mutationFn: async (url: string) => {
      const res = await api.post<AnalyzerBackendResponse>('/ai-services/analyze-website', { url });
      const r = res.data?.result;
      const d = r?.detected_info ?? {};
      const valueProps = cleanStringArray(d.value_propositions);
      return {
        brand_name: d.brand_name,
        industry_suggestion: d.industry,
        business_summary: d.business_summary ?? r?.metadata?.description,
        main_products: d.main_products,
        ideal_customer: d.ideal_customer,
        unique_value: d.unique_value ?? valueProps?.[0],
        value_propositions: valueProps,
      };
    },
  });
}
