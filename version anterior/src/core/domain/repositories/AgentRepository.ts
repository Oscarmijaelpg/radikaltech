
import { Objective, Agent } from '../entities';

export interface AgentRepository {
  getObjectives(): Promise<Objective[]>;
  getAgentsForObjective(objectiveId: string): Promise<Agent[]>;
}
