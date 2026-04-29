
import { ChatRepository } from '../../domain/repositories/ChatRepository';
import { Chat } from '../../domain/entities';

export class CreateChatUseCase {
  constructor(private chatRepository: ChatRepository) {}

  async execute(userId: string, projectId: string, objectiveId: string, title?: string): Promise<Chat> {
    return await this.chatRepository.createChat(userId, projectId, objectiveId, title);
  }
}
