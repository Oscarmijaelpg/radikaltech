import { Project } from '../entities';

export interface ProjectRepository {
  getProjectsByUserId(userId: string): Promise<Project[]>;
  createProject(
    userId: string,
    data: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<Project>;
  updateProject(
    projectId: string,
    userId: string,
    updates: Partial<Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<Project>;
  deleteProject(projectId: string, userId: string): Promise<void>;
}
