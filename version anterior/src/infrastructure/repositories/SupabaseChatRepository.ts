
import { ChatRepository } from '../../core/domain/repositories/ChatRepository';
import { Chat, Message } from '../../core/domain/entities';
import { supabase } from '../supabase/client';

export class SupabaseChatRepository implements ChatRepository {

  async getChats(userId: string, projectId: string): Promise<Chat[]> {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data as Chat[];
  }

  async getChatById(chatId: string): Promise<Chat | null> {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single();

    if (error) return null;
    return data as Chat;
  }

  async createChat(userId: string, projectId: string, objectiveId: string, title?: string): Promise<Chat> {
    const insertData: any = {
      user_id: userId,
      project_id: projectId,
      objective_id: objectiveId
    };
    if (title) insertData.title = title;

    const { data, error } = await supabase
      .from('chats')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data as Chat;
  }

  async getMessages(chatId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as Message[];
  }

  async saveMessage(chatId: string, content: string, role: 'user' | 'assistant', agentId?: string, imageUrl?: string): Promise<Message> {
    const messageData: any = {
      chat_id: chatId,
      content,
      role,
      agent_id: agentId,
    };

    if (imageUrl) messageData.image_url = imageUrl;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        // Fallback robustness for missing column (mostly for dev transition)
        if (error.code === 'PGRST204' || (error.message && error.message.includes('image_url'))) {
          console.warn("[SupabaseChatRepository] image_url column missing, embedding in content...");
          if (imageUrl) {
            messageData.content += `\n\n![Generación](${imageUrl})`;
          }
          const { image_url, ...legacyData } = messageData;
          const { data: retryData, error: retryError } = await supabase
            .from('messages')
            .insert(legacyData)
            .select()
            .single();
          if (retryError) throw retryError;
          return retryData as Message;
        }
        throw error;
      }

      // Update chat updated_at
      await supabase.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', chatId);

      return data as Message;
    } catch (err: any) {
      if (err.code === 'PGRST204' || (err.message && err.message.includes('image_url'))) {
        console.warn("[SupabaseChatRepository] image_url missing (catch), embedding in content...");
        let fallbackMsg = content;
        if (imageUrl) fallbackMsg += `\n\n![Generación](${imageUrl})`;

        const { data, error } = await supabase
          .from('messages')
          .insert({ chat_id: chatId, content: fallbackMsg, role, agent_id: agentId })
          .select()
          .single();
        if (error) throw error;
        return data as Message;
      }
      throw err;
    }
  }

  async updateMessage(messageId: string, content: string, imageUrl?: string): Promise<void> {
    const updateData: any = { content };
    if (imageUrl) updateData.image_url = imageUrl;

    try {
      const { data, error } = await supabase
        .from('messages')
        .update(updateData)
        .eq('id', messageId)
        .select();

      if (error) {
        if (error.code === 'PGRST204' || (error.message && error.message.includes('image_url'))) {
          console.warn("[SupabaseChatRepository] image_url missing in update, embedding in content...");
          let newContent = content;
          if (imageUrl) newContent += `\n\n![Generación](${imageUrl})`;
          await supabase.from('messages').update({ content: newContent }).eq('id', messageId);
          return;
        }
        console.error("Failed to update message in DB", error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn(`Update message ${messageId} succeeded but no rows returned. Check RLS policies.`);
      }
    } catch (err: any) {
      if (err.code === 'PGRST204' || (err.message && err.message.includes('image_url'))) {
        console.warn("[SupabaseChatRepository] image_url missing in update (catch), embedding in content...");
        let newContent = content;
        if (imageUrl) newContent += `\n\n![Generación](${imageUrl})`;
        await supabase.from('messages').update({ content: newContent }).eq('id', messageId);
      } else {
        throw err;
      }
    }
  }

  async deleteChat(chatId: string): Promise<void> {
    const { error } = await supabase
      .from('chats')
      .update({ is_archived: true })
      .eq('id', chatId);

    if (error) throw error;
  }
  async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) throw error;
  }

  async getMessagesWithImages(userId: string, projectId?: string | null): Promise<(Message & { chat_title?: string })[]> {
    let q = supabase
      .from('messages')
      .select(`
        *,
        chats!inner(title, user_id, project_id)
      `)
      .not('image_url', 'is', null)
      .eq('chats.user_id', userId)
      .order('created_at', { ascending: false });

    if (projectId) {
      q = q.eq('chats.project_id', projectId);
    }

    const { data, error } = await q;

    if (error) throw error;

    return data.map((m: any) => ({
      ...m,
      chat_title: m.chats?.title
    }));
  }

  async linkChats(chatId1: string, chatId2: string): Promise<void> {
    const { error: error1 } = await supabase
      .from('chats')
      .update({ linked_chat_id: chatId2 })
      .eq('id', chatId1);

    if (error1) throw error1;

    const { error: error2 } = await supabase
      .from('chats')
      .update({ linked_chat_id: chatId1 })
      .eq('id', chatId2);

    if (error2) throw error2;
  }
}
