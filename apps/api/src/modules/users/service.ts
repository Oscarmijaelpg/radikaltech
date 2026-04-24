import { prisma } from '@radikal/db';
import type { Profile } from '@radikal/db';
import { NotFound } from '../../lib/errors.js';
import { supabaseAdmin, type AuthUser } from '../../lib/supabase.js';

export interface UpdateProfileInput {
  full_name?: string;
  avatar_url?: string;
  locale?: string;
  timezone?: string;
}

function mapProfileInput(input: UpdateProfileInput) {
  const data: Record<string, unknown> = {};
  if (input.full_name !== undefined) data.fullName = input.full_name;
  if (input.avatar_url !== undefined) data.avatarUrl = input.avatar_url;
  if (input.locale !== undefined) data.language = input.locale;
  return data;
}

// Serializa Profile de Prisma (camelCase) al shape snake_case que consume el frontend
function serializeProfile(p: Profile) {
  return {
    id: p.id,
    email: p.email,
    full_name: p.fullName,
    phone: p.phone,
    language: p.language,
    role: p.role,
    avatar_url: p.avatarUrl,
    onboarding_completed: p.onboardingCompleted,
    onboarding_step: p.onboardingStep,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

export const usersService = {
  async getById(id: string) {
    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) throw new NotFound('Profile not found');
    return serializeProfile(profile);
  },

  async getMe(user: AuthUser) {
    let profile = await prisma.profile.findUnique({ where: { id: user.id } });
    
    if (!profile) {
      // Auto-create profile if missing (helps with local dev or failed triggers)
      // Note: we use email! because Supabase Auth users always have an email in this flow.
      profile = await prisma.profile.create({
        data: {
          id: user.id,
          email: user.email!,
          fullName: user.fullName || null,
          role: user.role === 'admin' ? 'admin' : 'user',
        },
      });
    }
    
    return serializeProfile(profile);
  },

  async updateMe(userId: string, input: UpdateProfileInput) {
    const profile = await prisma.profile.update({
      where: { id: userId },
      data: mapProfileInput(input),
    });
    return serializeProfile(profile);
  },

  async exportAll(userId: string) {
    const profile = await prisma.profile.findUnique({ where: { id: userId } });
    if (!profile) throw new NotFound('Profile not found');

    const [
      projects,
      socialAccounts,
      brandProfiles,
      brandHistory,
      objectives,
      competitors,
      contentAssets,
      reports,
      memories,
      chats,
      messages,
      projectFolders,
      aiJobs,
      recommendations,
      scheduledReports,
      notifications,
    ] = await Promise.all([
      prisma.project.findMany({ where: { userId } }),
      prisma.socialAccount.findMany({ where: { userId } }),
      prisma.brandProfile.findMany({ where: { userId } }),
      prisma.brandHistory.findMany({ where: { userId } }),
      prisma.objective.findMany({ where: { userId } }),
      prisma.competitor.findMany({ where: { userId } }),
      prisma.contentAsset.findMany({ where: { userId } }),
      prisma.report.findMany({ where: { userId } }),
      prisma.memory.findMany({ where: { userId } }),
      prisma.chat.findMany({ where: { userId } }),
      prisma.message.findMany({ where: { userId } }),
      prisma.projectFolder.findMany({ where: { userId } }),
      prisma.aiJob.findMany({ where: { userId } }),
      prisma.recommendation.findMany({ where: { userId } }),
      prisma.scheduledReport.findMany({ where: { userId } }),
      prisma.notification.findMany({ where: { userId } }),
    ]);

    return {
      exported_at: new Date().toISOString(),
      profile: serializeProfile(profile),
      projects,
      social_accounts: socialAccounts,
      brand_profiles: brandProfiles,
      brand_history: brandHistory,
      objectives,
      competitors,
      content_assets: contentAssets,
      reports,
      memories,
      chats,
      messages,
      project_folders: projectFolders,
      ai_jobs: aiJobs,
      recommendations,
      scheduled_reports: scheduledReports,
      notifications,
    };
  },

  async deleteSelf(userId: string) {
    // Elimina el usuario en Supabase Auth; el FK cascade borra Profile y todas sus relaciones
    // (todos los modelos tienen onDelete: Cascade apuntando a Profile).
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    // Defensa adicional: si el profile sigue ahí (por cualquier motivo), lo borramos
    await prisma.profile.deleteMany({ where: { id: userId } });
  },
};
