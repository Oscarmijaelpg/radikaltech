import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseProjectRepository } from '../../infrastructure/repositories/SupabaseProjectRepository';
import { Project } from '../../core/domain/entities';

const projectRepository = new SupabaseProjectRepository();

export const useProjects = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['projects', userId],
    queryFn: () => Number(userId) ? Promise.resolve([]) : projectRepository.getProjectsByUserId(userId!),
    enabled: !!userId,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'> }) =>
      projectRepository.createProject(userId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', variables.userId] });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      userId,
      updates,
    }: {
      projectId: string;
      userId: string;
      updates: Partial<Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
    }) => projectRepository.updateProject(projectId, userId, updates),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', variables.userId] });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) =>
      projectRepository.deleteProject(projectId, userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', variables.userId] });
      // Invalidate dependencies
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['project_folders'] });
    },
  });
};
