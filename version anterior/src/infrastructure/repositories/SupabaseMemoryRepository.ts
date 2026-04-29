
import { MemoryRepository } from '../../core/domain/repositories/MemoryRepository';
import { MemoryResource } from '../../core/domain/entities';
import { supabase } from '../supabase/client';

export class SupabaseMemoryRepository implements MemoryRepository {
  async getMemories(userId: string, projectId?: string | null): Promise<MemoryResource[]> {
    let query = supabase
      .from('memory_resources')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as MemoryResource[];
  }

  async saveMemory(memory: Partial<MemoryResource>): Promise<MemoryResource> {
    const { data, error } = await supabase
      .from('memory_resources')
      .upsert(memory)
      .select()
      .single();

    if (error) throw error;
    return data as MemoryResource;
  }

  async deleteMemory(memoryId: string): Promise<void> {
    const { error } = await supabase
      .from('memory_resources')
      .delete()
      .eq('id', memoryId);

    if (error) throw error;
  }

  async searchMemories(userId: string, query: string, projectId?: string | null): Promise<MemoryResource[]> {
    let q = supabase
      .from('memory_resources')
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (projectId) {
      q = q.eq('project_id', projectId);
    }

    const { data, error } = await q;

    if (error) throw error;
    return data as MemoryResource[];
  }

  async getMemoriesByCategory(userId: string, category: string, projectId?: string | null): Promise<MemoryResource[]> {
    let q = supabase
      .from('memory_resources')
      .select('*')
      .eq('user_id', userId)
      .eq('memory_category', category)
      .order('created_at', { ascending: false });

    if (projectId) {
      q = q.eq('project_id', projectId);
    }

    const { data, error } = await q;

    if (error) throw error;
    return data as MemoryResource[];
  }

  async deleteMemoriesByCategory(userId: string, category: string, projectId?: string | null): Promise<void> {
    let q = supabase
      .from('memory_resources')
      .delete()
      .eq('user_id', userId)
      .eq('memory_category', category);

    if (projectId) {
      q = q.eq('project_id', projectId);
    }

    const { error } = await q;

    if (error) throw error;
  }

  async deleteMemoriesByIds(ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('memory_resources')
      .delete()
      .in('id', ids);

    if (error) throw error;
  }

  async findRelatedMemories(embedding: number[], match_threshold: number, match_count: number, userId: string, projectId?: string | null): Promise<MemoryResource[]> {

    const { data, error } = await supabase.rpc('match_memory_resources', {
      query_embedding: embedding,
      match_threshold: match_threshold,
      match_count: match_count,
      p_user_id: userId,
      p_project_id: projectId || null
    });

    if (error) {
      console.error('[SupabaseMemoryRepository] Error finding related memories:', error);
      return [];
    }

    const results = (data || []) as MemoryResource[];
    return results;
  }

  async assignProjectToNullMemories(userId: string, projectId: string): Promise<void> {
    const { error } = await supabase
      .from('memory_resources')
      .update({ project_id: projectId })
      .eq('user_id', userId)
      .is('project_id', null);

    if (error) {
      console.error('[SupabaseMemoryRepository] Error backfilling project_id:', error);
      throw error;
    }
  }
}
