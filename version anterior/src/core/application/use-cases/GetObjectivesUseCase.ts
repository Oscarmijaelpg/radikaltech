
import { AgentRepository } from '../../domain/repositories/AgentRepository';
import { Objective } from '../../domain/entities';

export class GetObjectivesUseCase {
  constructor(private agentRepository: AgentRepository) {}

  async execute(): Promise<Objective[]> {
    return await this.agentRepository.getObjectives();
  }
}
