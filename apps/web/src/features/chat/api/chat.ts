import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Chat, ChatFolder, Message } from '@radikal/shared';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export type { Chat, ChatFolder, Message };

const API_URL = (import.meta.env.VITE_API_URL as string) || '/api';

export function useChats(projectId?: string | null, archived = false) {
  return useQuery({
    queryKey: ['chats', { projectId: projectId ?? null, archived }],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (projectId) qs.set('project_id', projectId);
      qs.set('archived', archived ? 'true' : 'false');
      const r = await api.get<{ data: Chat[] }>(`/chats?${qs.toString()}`);
      return r.data;
    },
  });
}

export function useChat(id: string | undefined) {
  return useQuery({
    queryKey: ['chat', id],
    queryFn: async () => {
      const r = await api.get<{ data: Chat & { messages: Message[] } }>(`/chats/${id}`);
      return r.data;
    },
    enabled: !!id,
  });
}

export function useMessages(chatId: string | undefined) {
  return useQuery({
    queryKey: ['chat-messages', chatId],
    queryFn: async () => {
      const r = await api.get<{ data: Message[] }>(`/chats/${chatId}/messages`);
      return r.data;
    },
    enabled: !!chatId,
  });
}

export function useCreateChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      agent_id?: string;
      agent_ids?: string[];
      project_id?: string | null;
      title?: string;
    }) => {
      const r = await api.post<{ data: Chat }>('/chats', input);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export async function previewRouter(input: {
  message: string;
  agent_ids: string[];
}): Promise<{ agentId: string; confidence: number; reason: string } | null> {
  const r = await api.post<{
    data: { agentId: string; confidence: number; reason: string } | null;
  }>('/chats/route-preview', input);
  return r.data;
}

export function useArchiveChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; archived: boolean }) => {
      const r = await api.patch<{ data: Chat }>(`/chats/${input.id}`, {
        is_archived: input.archived,
      });
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useRenameChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; title: string }) => {
      const r = await api.patch<{ data: Chat }>(`/chats/${input.id}`, { title: input.title });
      return r.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['chats'] });
      qc.invalidateQueries({ queryKey: ['chat', vars.id] });
    },
  });
}

export function useDeleteChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/chats/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

// ---------- Folders ----------

export function useChatFolders(projectId?: string | null) {
  return useQuery({
    queryKey: ['chat-folders', projectId ?? null],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (projectId) qs.set('project_id', projectId);
      const q = qs.toString();
      const r = await api.get<{ data: ChatFolder[] }>(`/chats/folders${q ? `?${q}` : ''}`);
      return r.data;
    },
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { project_id?: string | null; name: string; color?: string | null }) => {
      const r = await api.post<{ data: ChatFolder }>('/chats/folders', input);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-folders'] });
    },
  });
}

export function useUpdateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; color?: string | null }) => {
      const { id, ...rest } = input;
      const r = await api.patch<{ data: ChatFolder }>(`/chats/folders/${id}`, rest);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-folders'] });
    },
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/chats/folders/${id}`);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-folders'] });
      qc.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export function useMoveChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; folder_id: string | null }) => {
      const r = await api.patch<{ data: Chat }>(`/chats/${input.id}/folder`, {
        folder_id: input.folder_id,
      });
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chats'] });
    },
  });
}

export interface StreamDoneEvent {
  messageId: string;
  tokensUsed: number;
  agent_id?: string;
}

export interface StreamToolCallEvent {
  name: string;
  label: string;
  args: Record<string, unknown>;
  status: 'started';
}

export interface StreamToolResultEvent {
  name: string;
  label: string;
  result_summary: string;
  status: 'done' | 'error';
  data?: Record<string, unknown> | null;
}

export interface StreamAgentTurnEvent {
  agent_id: string;
  router: boolean;
  reason: string | null;
}

export async function streamMessage(
  chatId: string,
  content: string,
  handlers: {
    onToken: (chunk: string) => void;
    onDone: (info: StreamDoneEvent) => void;
    onError: (msg: string) => void;
    onToolCall?: (ev: StreamToolCallEvent) => void;
    onToolResult?: (ev: StreamToolResultEvent) => void;
    onAgentTurn?: (ev: StreamAgentTurnEvent) => void;
    signal?: AbortSignal;
    targetAgentId?: string;
  },
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`${API_URL}/chats/${chatId}/messages/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ content, target_agent_id: handlers.targetAgentId }),
    signal: handlers.signal,
  });

  if (!res.ok || !res.body) {
    let msg = `Error ${res.status}`;
    try {
      const body = await res.json();
      msg = body?.error?.message ?? body?.message ?? msg;
    } catch {}
    handlers.onError(msg);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';
      for (const chunk of chunks) {
        const lines = chunk.split('\n');
        let eventName = 'message';
        const dataLines: string[] = [];
        for (const line of lines) {
          if (line.startsWith('event:')) eventName = line.slice(6).trim();
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
        }
        const dataStr = dataLines.join('\n');
        if (!dataStr && eventName === 'message') continue;

        if (eventName === 'token') {
          handlers.onToken(dataStr);
        } else if (eventName === 'tool_call') {
          if (handlers.onToolCall) {
            try {
              handlers.onToolCall(JSON.parse(dataStr) as StreamToolCallEvent);
            } catch (err) {
              console.warn('[chat] tool_call parse failed', { err, dataStr });
            }
          }
        } else if (eventName === 'tool_result') {
          if (handlers.onToolResult) {
            try {
              handlers.onToolResult(JSON.parse(dataStr) as StreamToolResultEvent);
            } catch (err) {
              console.warn('[chat] tool_result parse failed', { err, dataStr });
            }
          }
        } else if (eventName === 'agent_turn') {
          if (handlers.onAgentTurn) {
            try {
              handlers.onAgentTurn(JSON.parse(dataStr) as StreamAgentTurnEvent);
            } catch (err) {
              console.warn('[chat] agent_turn parse failed', { err, dataStr });
            }
          }
        } else if (eventName === 'done') {
          try {
            const parsed = JSON.parse(dataStr) as StreamDoneEvent;
            handlers.onDone(parsed);
          } catch (err) {
            console.warn('[chat] done parse failed, usando fallback', { err, dataStr });
            handlers.onDone({ messageId: '', tokensUsed: 0 });
          }
        } else if (eventName === 'error') {
          let errMsg = dataStr;
          try {
            const parsed = JSON.parse(dataStr);
            errMsg = parsed.message ?? errMsg;
          } catch {
            // dataStr ya tiene el mensaje crudo, lo usamos sin warning
          }
          handlers.onError(errMsg);
        }
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    handlers.onError(err instanceof Error ? err.message : 'Stream error');
  }
}
