
import { ProjectFolderRepository } from '../../core/domain/repositories/ProjectFolderRepository';
import { ProjectFolder } from '../../core/domain/entities';
import { supabase } from '../supabase/client';

export class SupabaseProjectFolderRepository implements ProjectFolderRepository {

  async getFolders(userId: string, projectId: string): Promise<ProjectFolder[]> {
    const { data, error } = await supabase
      .from('project_folders')
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as ProjectFolder[];
  }

  async getFolderById(folderId: string): Promise<ProjectFolder | null> {
    const { data, error } = await supabase
      .from('project_folders')
      .select('*')
      .eq('id', folderId)
      .single();

    if (error) return null;
    return data as ProjectFolder;
  }

  async createFolder(userId: string, projectId: string, name: string, color: string, icon: string, description?: string): Promise<ProjectFolder> {
    const { data, error } = await supabase
      .from('project_folders')
      .insert({ user_id: userId, project_id: projectId, name, color, icon, description: description || null })
      .select()
      .single();

    if (error) throw error;
    return data as ProjectFolder;
  }

  async updateFolder(folderId: string, updates: Partial<Pick<ProjectFolder, 'name' | 'description' | 'color' | 'icon'>>): Promise<ProjectFolder> {
    const { data, error } = await supabase
      .from('project_folders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', folderId)
      .select()
      .single();

    if (error) throw error;
    return data as ProjectFolder;
  }

  async deleteFolder(folderId: string): Promise<void> {
    // Move all chats in this folder back to "no folder"
    await supabase
      .from('chats')
      .update({ folder_id: null })
      .eq('folder_id', folderId);

    const { error } = await supabase
      .from('project_folders')
      .delete()
      .eq('id', folderId);

    if (error) throw error;
  }

  async moveChatToFolder(chatId: string, folderId: string | null): Promise<void> {
    const { error } = await supabase
      .from('chats')
      .update({ folder_id: folderId })
      .eq('id', chatId);

    if (error) throw error;
  }
}
