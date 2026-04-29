
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseMemoryRepository } from '../../infrastructure/repositories/SupabaseMemoryRepository';
import { MemoryResource } from '../../core/domain/entities';

const memoryRepository = new SupabaseMemoryRepository();

export const useMemories = (userId: string, projectId?: string | null, refetchInterval?: number) => {
  return useQuery({
    queryKey: ['memories', userId, projectId || null],
    queryFn: () => memoryRepository.getMemories(userId, projectId || null),
    enabled: !!userId && !!projectId,
    refetchInterval: refetchInterval || false,
  });
};

export const useSearchMemories = (userId: string, query: string, projectId?: string | null) => {
  return useQuery({
    queryKey: ['memories', userId, projectId || null, 'search', query],
    queryFn: () => memoryRepository.searchMemories(userId, query, projectId || null),
    enabled: !!userId && !!projectId && query.length > 2,
  });
};

export const useSaveMemory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memory: Partial<MemoryResource>) => memoryRepository.saveMemory(memory),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['memories', variables.user_id, variables.project_id || null] });
      // También invalidamos cualquier query basada en el user (por si hay vistas globales)
      queryClient.invalidateQueries({ queryKey: ['memories', variables.user_id] });
    },
  });
};

export const useDeleteMemory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { memoryId: string, userId: string, projectId?: string | null }) => memoryRepository.deleteMemory(args.memoryId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['memories', variables.userId, variables.projectId || null] });
      queryClient.invalidateQueries({ queryKey: ['memories', variables.userId] });
    },
  });
};

export const useDeleteMemories = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { memoryIds: string[], userId: string, projectId?: string | null }) => memoryRepository.deleteMemoriesByIds(args.memoryIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['memories', variables.userId, variables.projectId || null] });
      queryClient.invalidateQueries({ queryKey: ['memories', variables.userId] });
    },
  });
};
