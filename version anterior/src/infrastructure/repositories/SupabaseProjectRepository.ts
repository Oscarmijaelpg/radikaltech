import { supabase } from '../supabase/client';
import { Project } from '../../core/domain/entities';
import { ProjectRepository } from '../../core/domain/repositories/ProjectRepository';

export class SupabaseProjectRepository implements ProjectRepository {
  async getProjectsByUserId(userId: string): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async createProject(
    userId: string,
    data: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<Project> {
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: data.name,
        company_name: data.company_name,
        industry: data.industry,
        website: data.website,
        business_summary: data.business_summary,
        ideal_customer: data.ideal_customer,
        unique_value: data.unique_value,
        social_links: data.social_links || {},
      })
      .select()
      .single();

    if (error) throw error;
    return project;
  }

  async updateProject(
    projectId: string,
    userId: string,
    updates: Partial<Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<Project> {
    // Only the owner can update, RLS protects it, but we add userId just in case
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteProject(projectId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId);

    if (error) throw error;
  }
}
