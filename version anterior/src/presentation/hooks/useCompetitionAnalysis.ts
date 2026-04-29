import { useMutation, useQueryClient } from '@tanstack/react-query';
import { competitionAnalysisService, CompetitorInput } from '../../core/application/services/CompetitionAnalysisService';

export const useCompetitionAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      userId: string,
      projectId: string,
      myBrand: CompetitorInput,
      competitors: CompetitorInput[],
      mode: 'combine' | 'social_only',
      companyContext: string
    }) =>
      competitionAnalysisService.analyzeCompetitors(args.userId, args.projectId, args.myBrand, args.competitors, args.mode, args.companyContext),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['memories', variables.userId, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['memories', variables.userId] });
    },
    onError: (error: any) => {
      console.error('Error analyzing competitors:', error);
    }
  });
};

export const useRefreshMarketAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      userId: string,
      projectId: string,
      companyContext: string,
      companyName: string
    }) =>
      competitionAnalysisService.refreshMarketAnalysis(args.userId, args.projectId, args.companyContext, args.companyName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['memories', variables.userId, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['memories', variables.userId] });
    },
    onError: (error: any) => {
      console.error('Error refreshing market analysis:', error);
    }
  });
};
