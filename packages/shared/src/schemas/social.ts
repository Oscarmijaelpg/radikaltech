import { z } from 'zod';
import { IdSchema, DateSchema } from './common.js';
import { SocialPlatform, SocialSource } from '../enums.js';

export const SocialAccountSchema = z.object({
  id: IdSchema,
  projectId: IdSchema,
  userId: IdSchema,
  platform: z.nativeEnum(SocialPlatform),
  platformCustom: z.string().nullable().optional(),
  source: z.nativeEnum(SocialSource).nullable(),
  url: z.string().nullable(),
  handle: z.string().nullable(),
  manualDescription: z.string().nullable(),
  followers: z.number().nullable().optional(),
  isActive: z.boolean().optional(),
  createdAt: DateSchema,
  updatedAt: DateSchema,
});

const socialBase = z.object({
  platform: z.nativeEnum(SocialPlatform),
  source: z.nativeEnum(SocialSource).default(SocialSource.NONE),
  url: z.string().url().optional().nullable(),
  manual_description: z.string().optional().nullable(),
  handle: z.string().optional().nullable(),
});

export const CreateSocialAccountSchema = socialBase.superRefine((data, ctx) => {
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

export type SocialAccount = z.infer<typeof SocialAccountSchema>;
export type CreateSocialAccount = z.infer<typeof CreateSocialAccountSchema>;
