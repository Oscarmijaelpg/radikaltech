
import { AgentRepository } from '../../core/domain/repositories/AgentRepository';
import { Agent, Objective } from '../../core/domain/entities';
import { supabase } from '../supabase/client';

export class SupabaseAgentRepository implements AgentRepository {
  
  async getObjectives(): Promise<Objective[]> {
    const { data, error } = await supabase
      .from('objectives')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data as Objective[];
  }

  async getAgentsForObjective(objectiveId: string): Promise<Agent[]> {
    const { data, error } = await supabase
      .from('objective_agents')
      .select(`
        execution_order,
        agents (*)
      `)
      .eq('objective_id', objectiveId)
      .eq('is_active', true)
      .order('execution_order', { ascending: true });

    if (error) throw error;

    // Map the result to return just the agents, potentially adding execution order if needed in the entity
    // The Agent entity doesn't have execution_order, but it's fine for now.
    // We cast the data to extract the nested agent.
    return data.map((item: any) => item.agents) as Agent[];
  }
}
