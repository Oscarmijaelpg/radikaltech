
import { ChatRepository } from '../../domain/repositories/ChatRepository';
import { Message } from '../../domain/entities';

export class GetChatHistoryUseCase {
  constructor(private chatRepository: ChatRepository) {}

  async execute(chatId: string): Promise<Message[]> {
    return await this.chatRepository.getMessages(chatId);
  }
}
