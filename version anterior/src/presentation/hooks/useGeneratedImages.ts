
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseChatRepository } from '../../infrastructure/repositories/SupabaseChatRepository';

const chatRepository = new SupabaseChatRepository();

export const useGeneratedImages = (userId: string, projectId?: string | null) => {
  return useQuery({
    queryKey: ['generated-images', userId, projectId || null],
    queryFn: () => chatRepository.getMessagesWithImages(userId, projectId || null),
    enabled: !!userId && !!projectId,
  });
};

export const useDeleteChatMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { messageId: string, userId: string, projectId?: string | null }) => chatRepository.deleteMessage(args.messageId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['generated-images', variables.userId, variables.projectId || null] });
      queryClient.invalidateQueries({ queryKey: ['generated-images', variables.userId] });
    },
  });
};
