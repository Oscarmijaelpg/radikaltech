
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { newsService } from '../../core/application/services/NewsService';

export const useNewsSearch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { userId: string, projectId: string, companyContext: string, specificTopic?: string }) =>
      newsService.searchAndGenerateNews(args.userId, args.projectId, args.companyContext, args.specificTopic),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['memories', variables.userId, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['memories', variables.userId] });
    },
    onError: (error: any) => {
      console.error('Error searching news:', error);
    }
  });
};
