import { z } from 'zod';
import { IdSchema, DateSchema } from './common.js';
import { WebsiteSource } from '../enums.js';

export const ProjectSchema = z.object({
  id: IdSchema,
  owner_id: IdSchema,
  company_name: z.string().min(1),
  industry: z.string().min(1),
  industry_custom: z.string().nullable().optional(),
  website_source: z.nativeEnum(WebsiteSource).default(WebsiteSource.NONE),
  website_url: z.string().url().nullable().optional(),
  website_manual_description: z.string().nullable().optional(),
  business_summary: z.string().nullable().optional(),
  ideal_customer: z.string().nullable().optional(),
  unique_value: z.string().nullable().optional(),
  main_products: z.string().nullable().optional(),
  additional_context: z.string().nullable().optional(),
  created_at: DateSchema,
  updated_at: DateSchema,
});

const projectBase = z.object({
  company_name: z.string().min(1, 'company_name is required'),
  industry: z.string().min(1, 'industry is required'),
  industry_custom: z.string().trim().min(1).optional().nullable(),
  website_source: z.nativeEnum(WebsiteSource).default(WebsiteSource.NONE),
  website_url: z.string().url().optional().nullable(),
  website_manual_description: z.string().optional().nullable(),
  business_summary: z.string().optional().nullable(),
  ideal_customer: z.string().optional().nullable(),
  unique_value: z.string().optional().nullable(),
  main_products: z.string().optional().nullable(),
  additional_context: z.string().optional().nullable(),
});

function refineProject<T extends z.ZodTypeAny>(schema: T): z.ZodEffects<T> {
  return schema.superRefine((data: z.infer<T>, ctx) => {
    const d = data as z.infer<typeof projectBase>;
    if (d.website_source === 'url') {
      if (!d.website_url || d.website_url.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['website_url'],
          message: 'website_url is required when website_source is "url"',
        });
      }
    } else if (d.website_source === 'manual') {
      if (!d.website_manual_description || d.website_manual_description.trim().length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['website_manual_description'],
          message: 'website_manual_description must be at least 10 characters when source is "manual"',
        });
      }
    } else if (d.website_source === 'none') {
      if (!d.business_summary || d.business_summary.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['business_summary'],
          message: 'business_summary is required when website_source is "none"',
        });
      }
      if (!d.main_products || d.main_products.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['main_products'],
          message: 'main_products is required when website_source is "none"',
        });
      }
    }
  }) as unknown as z.ZodEffects<T>;
}

export const CreateProjectSchema = refineProject(projectBase);
export const UpdateProjectSchema = refineProject(projectBase.partial());

export type Project = z.infer<typeof ProjectSchema>;
export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;
