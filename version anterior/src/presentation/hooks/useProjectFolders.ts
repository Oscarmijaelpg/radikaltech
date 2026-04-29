
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseProjectFolderRepository } from '../../infrastructure/repositories/SupabaseProjectFolderRepository';
import { ProjectFolder } from '../../core/domain/entities';

const folderRepository = new SupabaseProjectFolderRepository();

export const useProjectFolders = (userId: string | undefined, projectId: string | null | undefined) => {
  return useQuery({
    queryKey: ['project_folders', userId, projectId],
    queryFn: () => (!userId || !projectId) ? Promise.resolve([]) : folderRepository.getFolders(userId, projectId),
    enabled: !!userId && !!projectId,
  });
};

export const useCreateFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      projectId,
      name,
      color,
      icon,
      description,
    }: {
      userId: string;
      projectId: string;
      name: string;
      color: string;
      icon: string;
      description?: string;
    }) => folderRepository.createFolder(userId, projectId, name, color, icon, description),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project_folders', variables.userId, variables.projectId] });
    },
  });
};

export const useUpdateFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      folderId,
      userId,
      projectId,
      updates,
    }: {
      folderId: string;
      userId: string;
      projectId: string;
      updates: Partial<Pick<ProjectFolder, 'name' | 'description' | 'color' | 'icon'>>;
    }) => folderRepository.updateFolder(folderId, updates),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project_folders', variables.userId, variables.projectId] });
    },
  });
};

export const useDeleteFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ folderId }: { folderId: string; userId: string; projectId: string }) =>
      folderRepository.deleteFolder(folderId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project_folders', variables.userId, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
};

export const useMoveChatToFolder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      chatId,
      folderId,
    }: {
      chatId: string;
      folderId: string | null;
      userId: string;
      projectId: string;
    }) => folderRepository.moveChatToFolder(chatId, folderId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['project_folders', variables.userId, variables.projectId] });
    },
  });
};
