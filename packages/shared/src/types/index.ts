import type { z } from 'zod';
import type {
  ProfileSchema,
  UpdateProfileSchema,
  ProjectSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  SocialAccountSchema,
  CreateSocialAccountSchema,
  BrandProfileSchema,
  UpsertBrandProfileSchema,
  ObjectiveSchema,
  CreateObjectiveSchema,
  MemorySchema,
  CreateMemorySchema,
  ChatSchema,
  MessageSchema,
  ChatFolderSchema,
  CreateChatSchema,
  SendMessageSchema,
  AnalyzeWebsiteRequestSchema,
  AnalyzeWebsiteResponseSchema,
  AnalyzeCompetitorRequestSchema,
  AnalyzeCompetitorResponseSchema,
  GenerateBrandRequestSchema,
  OnboardingDataSchema,
  Step1CompanySchema,
  Step2SocialsSchema,
  Step3BrandSchema,
  Step4ObjectivesSchema,
  PaginationSchema,
} from '../schemas/index.js';

export type Profile = z.infer<typeof ProfileSchema>;
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;

export type Project = z.infer<typeof ProjectSchema>;
export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;

export type SocialAccount = z.infer<typeof SocialAccountSchema>;
export type CreateSocialAccount = z.infer<typeof CreateSocialAccountSchema>;

export type BrandProfile = z.infer<typeof BrandProfileSchema>;
export type UpsertBrandProfile = z.infer<typeof UpsertBrandProfileSchema>;

export type Objective = z.infer<typeof ObjectiveSchema>;
export type CreateObjective = z.infer<typeof CreateObjectiveSchema>;

export type Memory = z.infer<typeof MemorySchema>;
export type CreateMemory = z.infer<typeof CreateMemorySchema>;

export type Chat = z.infer<typeof ChatSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type ChatFolder = z.infer<typeof ChatFolderSchema>;
export type CreateChat = z.infer<typeof CreateChatSchema>;
export type SendMessage = z.infer<typeof SendMessageSchema>;

export type AnalyzeWebsiteRequest = z.infer<typeof AnalyzeWebsiteRequestSchema>;
export type AnalyzeWebsiteResponse = z.infer<typeof AnalyzeWebsiteResponseSchema>;
export type AnalyzeCompetitorRequest = z.infer<typeof AnalyzeCompetitorRequestSchema>;
export type AnalyzeCompetitorResponse = z.infer<typeof AnalyzeCompetitorResponseSchema>;
export type GenerateBrandRequest = z.infer<typeof GenerateBrandRequestSchema>;

export type OnboardingData = z.infer<typeof OnboardingDataSchema>;
export type Step1Company = z.infer<typeof Step1CompanySchema>;
export type Step2Socials = z.infer<typeof Step2SocialsSchema>;
export type Step3Brand = z.infer<typeof Step3BrandSchema>;
export type Step4Objectives = z.infer<typeof Step4ObjectivesSchema>;

export type Pagination = z.infer<typeof PaginationSchema>;
