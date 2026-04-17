import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AnalyzeWebsiteResult {
  business_summary?: string;
  main_products?: string;
  ideal_customer?: string;
  unique_value?: string;
  industry_suggestion?: string;
  brand_name?: string;
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

export function useAnalyzeWebsite() {
  return useMutation<AnalyzeWebsiteResult, Error, string>({
    mutationFn: async (url: string) => {
      const res = await api.post<AnalyzerBackendResponse>('/ai-services/analyze-website', { url });
      const r = res.data?.result;
      const d = r?.detected_info ?? {};
      return {
        brand_name: d.brand_name,
        industry_suggestion: d.industry,
        business_summary: d.business_summary ?? r?.metadata?.description,
        main_products: d.main_products,
        ideal_customer: d.ideal_customer,
        unique_value: d.unique_value ?? d.value_propositions?.[0],
      };
    },
  });
}
