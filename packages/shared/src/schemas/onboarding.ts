import { z } from 'zod';
import { SocialPlatform, SocialSource, WebsiteSource } from '../enums.js';

// --- Step 1: Company info ---
const step1Base = z.object({
  company_name: z.string().trim().min(1, 'company_name is required'),
  industry: z.string().trim().min(1, 'industry is required'),
  industry_custom: z.string().trim().optional().nullable(),
  website_source: z.nativeEnum(WebsiteSource).default(WebsiteSource.NONE),
  website_url: z.string().url().optional().nullable(),
  website_manual_description: z.string().optional().nullable(),
  business_summary: z.string().optional().nullable(),
  ideal_customer: z.string().optional().nullable(),
  unique_value: z.string().optional().nullable(),
  main_products: z.string().optional().nullable(),
  additional_context: z.string().optional().nullable(),
});

// Semántica:
// - URL    → el usuario tiene sitio web (requiere website_url)
// - MANUAL → no tiene sitio pero describe su negocio (requiere business_summary + main_products)
// - NONE   → prefiere omitir (todo opcional, puede completarlo después)
export const Step1CompanySchema = step1Base.superRefine((data, ctx) => {
  if (data.website_source === 'url') {
    if (!data.website_url || data.website_url.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['website_url'],
        message: 'website_url is required when website_source is "url"',
      });
    }
  } else if (data.website_source === 'manual') {
    if (!data.business_summary || data.business_summary.trim().length < 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['business_summary'],
        message: 'business_summary must be at least 20 characters when source is "manual"',
      });
    }
    if (!data.main_products || data.main_products.trim().length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['main_products'],
        message: 'main_products must be at least 10 characters when source is "manual"',
      });
    }
  }
  // NONE: nada obligatorio — el usuario puede completar después
});

// --- Step 2: Social accounts ---
export const OnboardingSocialAccountSchema = z
  .object({
    platform: z.nativeEnum(SocialPlatform),
    source: z.nativeEnum(SocialSource).default(SocialSource.NONE),
    url: z.string().url().optional().nullable(),
    manual_description: z.string().optional().nullable(),
    handle: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.source === 'url') {
      if (!data.url || data.url.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['url'],
          message: 'url is required when source is "url"',
        });
      }
    } else if (data.source === 'manual') {
      if (!data.manual_description || data.manual_description.trim().length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['manual_description'],
          message: 'manual_description must be at least 10 characters when source is "manual"',
        });
      }
    }
  });

// No social account is required (including instagram).
export const Step2SocialsSchema = z.object({
  accounts: z.array(OnboardingSocialAccountSchema).default([]),
});

// --- Step 3: Brand ---
export const Step3BrandSchema = z.object({
  tone_of_voice: z.string().optional().nullable(),
  personality: z.array(z.string()).optional(),
  values: z.array(z.string()).optional(),
  target_audience: z.string().optional().nullable(),
  brand_story: z.string().optional().nullable(),
  keywords: z.array(z.string()).optional(),
  forbidden_words: z.array(z.string()).optional(),
  color_palette: z.array(z.string()).optional(),
  fonts: z.array(z.string()).optional(),
  logo_url: z.string().url().optional().nullable(),
});

// --- Step 4: Objectives ---
export const Step4ObjectivesSchema = z.object({
  objectives: z
    .array(
      z.object({
        title: z.string().trim().min(1, 'title is required'),
        description: z.string().optional().nullable(),
        priority: z.number().int().min(0).optional(),
        target_date: z.string().datetime({ offset: true }).optional().nullable(),
      }),
    )
    .default([]),
});

// --- Aggregate schema ---
export const OnboardingDataSchema = z.object({
  company: Step1CompanySchema,
  socials: Step2SocialsSchema,
  brand: Step3BrandSchema,
  objectives: Step4ObjectivesSchema,
});

export type Step1Company = z.infer<typeof Step1CompanySchema>;
export type Step2Socials = z.infer<typeof Step2SocialsSchema>;
export type Step3Brand = z.infer<typeof Step3BrandSchema>;
export type Step4Objectives = z.infer<typeof Step4ObjectivesSchema>;
export type OnboardingData = z.infer<typeof OnboardingDataSchema>;
export type OnboardingSocialAccount = z.infer<typeof OnboardingSocialAccountSchema>;
