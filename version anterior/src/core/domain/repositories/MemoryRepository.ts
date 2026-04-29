
import { MemoryResource } from '../entities';

export interface MemoryRepository {
  getMemories(userId: string, projectId?: string | null): Promise<MemoryResource[]>;
  saveMemory(memory: Partial<MemoryResource>): Promise<MemoryResource>;
  deleteMemory(memoryId: string): Promise<void>;
  searchMemories(userId: string, query: string, projectId?: string | null): Promise<MemoryResource[]>;
  getMemoriesByCategory(userId: string, category: string, projectId?: string | null): Promise<MemoryResource[]>;
  deleteMemoriesByCategory(userId: string, category: string, projectId?: string | null): Promise<void>;
  deleteMemoriesByIds(ids: string[]): Promise<void>;
  findRelatedMemories(embedding: number[], match_threshold: number, match_count: number, userId: string, projectId?: string | null): Promise<MemoryResource[]>;
  assignProjectToNullMemories(userId: string, projectId: string): Promise<void>;
}

