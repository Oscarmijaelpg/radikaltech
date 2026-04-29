
import { Chat, Message } from '../entities';

export interface ChatRepository {
  getChats(userId: string, projectId: string): Promise<Chat[]>;
  getChatById(chatId: string): Promise<Chat | null>;
  createChat(userId: string, projectId: string, objectiveId: string, title?: string): Promise<Chat>;
  getMessages(chatId: string): Promise<Message[]>;
  saveMessage(chatId: string, content: string, role: 'user' | 'assistant', agentId?: string, imageUrl?: string): Promise<Message>;
  updateMessage(messageId: string, content: string, imageUrl?: string): Promise<void>;
  deleteChat(chatId: string): Promise<void>;
  deleteMessage(messageId: string): Promise<void>;
  getMessagesWithImages(userId: string, projectId?: string | null): Promise<(Message & { chat_title?: string })[]>;
  linkChats(chatId1: string, chatId2: string): Promise<void>;
}
