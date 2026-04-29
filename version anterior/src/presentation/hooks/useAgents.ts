
import { useQuery } from '@tanstack/react-query';
import { SupabaseAgentRepository } from '../../infrastructure/repositories/SupabaseAgentRepository';

const agentRepository = new SupabaseAgentRepository();

export const useAgents = (objectiveId?: string) => {
    return useQuery({
        queryKey: ['agents', objectiveId],
        queryFn: () => objectiveId ? agentRepository.getAgentsForObjective(objectiveId) : Promise.resolve([]),
        enabled: !!objectiveId
    });
};
