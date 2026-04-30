import { z } from 'zod';
import { IdSchema, DateSchema } from './common.js';
import { OnboardingStep } from '../enums.js';

export const ProfileSchema = z.object({
  id: IdSchema,
  user_id: IdSchema,
  email: z.string().email(),
  full_name: z.string().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  onboarding_step: z.nativeEnum(OnboardingStep).default(OnboardingStep.WELCOME),
  onboarding_completed: z.boolean().default(false),
  language: z.string().default('es'),
  created_at: DateSchema,
  updated_at: DateSchema,
});

export const UpdateProfileSchema = ProfileSchema.partial().pick({
  full_name: true,
  avatar_url: true,
  onboarding_step: true,
  onboarding_completed: true,
  language: true,
});

export type Profile = z.infer<typeof ProfileSchema>;
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
