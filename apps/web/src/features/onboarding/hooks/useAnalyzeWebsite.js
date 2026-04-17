import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
export function useAnalyzeWebsite() {
    return useMutation({
        mutationFn: async (url) => {
            const res = await api.post('/ai-services/analyze-website', { url });
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
