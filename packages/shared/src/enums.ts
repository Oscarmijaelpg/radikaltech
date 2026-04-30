// Enum values must match the SQL enums en packages/db/prisma/schema.prisma exactamente.
// Si cambias aquí, actualiza también el schema y corre pnpm db:generate.

export const UserRole = {
  USER: 'user',
  ADMIN: 'admin',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const OnboardingStep = {
  WELCOME: 'welcome',
  COMPANY: 'company',
  SOCIALS: 'socials',
  BRAND: 'brand',
  OBJECTIVES: 'objectives',
  TEAM_INTRO: 'team_intro',
  CONTENT: 'content',
  COMPLETED: 'completed',
} as const;
export type OnboardingStep = (typeof OnboardingStep)[keyof typeof OnboardingStep];

export const SocialPlatform = {
  INSTAGRAM: 'instagram',
  TIKTOK: 'tiktok',
  LINKEDIN: 'linkedin',
  YOUTUBE: 'youtube',
  FACEBOOK: 'facebook',
  X: 'x',
  THREADS: 'threads',
  PINTEREST: 'pinterest',
  OTHER: 'other',
} as const;
export type SocialPlatform = (typeof SocialPlatform)[keyof typeof SocialPlatform];

export const SocialSource = {
  URL: 'url',
  MANUAL: 'manual',
  NONE: 'none',
} as const;
export type SocialSource = (typeof SocialSource)[keyof typeof SocialSource];

export const WebsiteSource = {
  URL: 'url',
  MANUAL: 'manual',
  NONE: 'none',
} as const;
export type WebsiteSource = (typeof WebsiteSource)[keyof typeof WebsiteSource];

export const ObjectiveStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
export type ObjectiveStatus = (typeof ObjectiveStatus)[keyof typeof ObjectiveStatus];

export const AssetType = {
  IMAGE: 'image',
  VIDEO: 'video',
  DOCUMENT: 'document',
  AUDIO: 'audio',
} as const;
export type AssetType = (typeof AssetType)[keyof typeof AssetType];

export const MessageRole = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
} as const;
export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

// Alineado con Prisma AiJobStatus.
export const JobStatus = {
  QUEUED: 'queued',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];
