import { z } from 'zod';

export const AnalyzeWebsiteRequestSchema = z.object({
  url: z.string().url(),
  project_id: z.string().uuid().optional(),
});

export const AnalyzeWebsiteResponseSchema = z.object({
  business_summary: z.string(),
  ideal_customer: z.string(),
  unique_value: z.string(),
  main_products: z.string(),
  industry_suggestion: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});

export const AnalyzeCompetitorRequestSchema = z.object({
  url: z.string().url(),
  project_id: z.string().uuid().optional(),
  platform: z.string().optional(),
});

export const AnalyzeCompetitorResponseSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  positioning: z.string().optional(),
  content_themes: z.array(z.string()).optional(),
});

export const GenerateBrandRequestSchema = z.object({
  project_id: z.string().uuid(),
  context: z.string().optional(),
});

export type AnalyzeWebsiteRequest = z.infer<typeof AnalyzeWebsiteRequestSchema>;
export type AnalyzeWebsiteResponse = z.infer<typeof AnalyzeWebsiteResponseSchema>;
export type AnalyzeCompetitorRequest = z.infer<typeof AnalyzeCompetitorRequestSchema>;
export type AnalyzeCompetitorResponse = z.infer<typeof AnalyzeCompetitorResponseSchema>;
export type GenerateBrandRequest = z.infer<typeof GenerateBrandRequestSchema>;
