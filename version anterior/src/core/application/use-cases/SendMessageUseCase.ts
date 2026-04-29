
import { ChatRepository } from '../../domain/repositories/ChatRepository';
import { Message } from '../../domain/entities';

export class SendMessageUseCase {
  constructor(private chatRepository: ChatRepository) { }

  async execute(chatId: string, content: string, role: 'user' | 'assistant', agentId?: string, imageUrl?: string): Promise<Message> {
    if (!content.trim() && !imageUrl) throw new Error('Message content or image required');
    return await this.chatRepository.saveMessage(chatId, content, role, agentId, imageUrl);
  }
}
