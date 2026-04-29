
import { ProjectFolder } from '../entities';

export interface ProjectFolderRepository {
  getFolders(userId: string, projectId: string): Promise<ProjectFolder[]>;
  getFolderById(folderId: string): Promise<ProjectFolder | null>;
  createFolder(userId: string, projectId: string, name: string, color: string, icon: string, description?: string): Promise<ProjectFolder>;
  updateFolder(folderId: string, updates: Partial<Pick<ProjectFolder, 'name' | 'description' | 'color' | 'icon'>>): Promise<ProjectFolder>;
  deleteFolder(folderId: string): Promise<void>;
  moveChatToFolder(chatId: string, folderId: string | null): Promise<void>;
}
