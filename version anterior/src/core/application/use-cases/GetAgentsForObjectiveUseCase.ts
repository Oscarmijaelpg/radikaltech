
import { AgentRepository } from '../../domain/repositories/AgentRepository';
import { Agent } from '../../domain/entities';

export class GetAgentsForObjectiveUseCase {
  constructor(private agentRepository: AgentRepository) {}

  async execute(objectiveId: string): Promise<Agent[]> {
    return await this.agentRepository.getAgentsForObjective(objectiveId);
  }
}
