// Enum values must match the SQL enums exactly.

export const UserRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const OnboardingStep = {
  COMPANY: 'company',
  SOCIALS: 'socials',
  BRAND: 'brand',
  OBJECTIVES: 'objectives',
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
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;
export type ObjectiveStatus = (typeof ObjectiveStatus)[keyof typeof ObjectiveStatus];

export const AssetType = {
  IMAGE: 'image',
  VIDEO: 'video',
  DOCUMENT: 'document',
  AUDIO: 'audio',
  OTHER: 'other',
} as const;
export type AssetType = (typeof AssetType)[keyof typeof AssetType];

export const ReportType = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  CUSTOM: 'custom',
} as const;
export type ReportType = (typeof ReportType)[keyof typeof ReportType];

export const MessageRole = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
} as const;
export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

export const JobStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];
