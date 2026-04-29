
import { useQuery } from '@tanstack/react-query';
import { SupabaseAgentRepository } from '../../infrastructure/repositories/SupabaseAgentRepository';
import { GetObjectivesUseCase } from '../../core/application/use-cases/GetObjectivesUseCase';

const agentRepository = new SupabaseAgentRepository();
const getObjectivesUseCase = new GetObjectivesUseCase(agentRepository);

export const useObjectives = () => {
  return useQuery({
    queryKey: ['objectives'],
    queryFn: () => getObjectivesUseCase.execute()
  });
};
