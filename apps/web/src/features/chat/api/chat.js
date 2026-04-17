import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
const API_URL = import.meta.env.VITE_API_URL || '/api';
export function useChats(projectId, archived = false) {
    return useQuery({
        queryKey: ['chats', { projectId: projectId ?? null, archived }],
        queryFn: async () => {
            const qs = new URLSearchParams();
            if (projectId)
                qs.set('project_id', projectId);
            qs.set('archived', archived ? 'true' : 'false');
            const r = await api.get(`/chats?${qs.toString()}`);
            return r.data;
        },
    });
}
export function useChat(id) {
    return useQuery({
        queryKey: ['chat', id],
        queryFn: async () => {
            const r = await api.get(`/chats/${id}`);
            return r.data;
        },
        enabled: !!id,
    });
}
export function useMessages(chatId) {
    return useQuery({
        queryKey: ['chat-messages', chatId],
        queryFn: async () => {
            const r = await api.get(`/chats/${chatId}/messages`);
            return r.data;
        },
        enabled: !!chatId,
    });
}
export function useCreateChat() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/chats', input);
            return r.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['chats'] });
        },
    });
}
export async function previewRouter(input) {
    const r = await api.post('/chats/route-preview', input);
    return r.data;
}
export function useArchiveChat() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.patch(`/chats/${input.id}`, {
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
        mutationFn: async (input) => {
            const r = await api.patch(`/chats/${input.id}`, { title: input.title });
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
        mutationFn: async (id) => {
            await api.delete(`/chats/${id}`);
            return id;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['chats'] });
        },
    });
}
export function useChatFolders(projectId) {
    return useQuery({
        queryKey: ['chat-folders', projectId ?? null],
        queryFn: async () => {
            const qs = new URLSearchParams();
            if (projectId)
                qs.set('project_id', projectId);
            const q = qs.toString();
            const r = await api.get(`/chats/folders${q ? `?${q}` : ''}`);
            return r.data;
        },
    });
}
export function useCreateFolder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            const r = await api.post('/chats/folders', input);
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
        mutationFn: async (input) => {
            const { id, ...rest } = input;
            const r = await api.patch(`/chats/folders/${id}`, rest);
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
        mutationFn: async (id) => {
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
        mutationFn: async (input) => {
            const r = await api.patch(`/chats/${input.id}/folder`, {
                folder_id: input.folder_id,
            });
            return r.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['chats'] });
        },
    });
}
export async function streamMessage(chatId, content, handlers) {
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
        }
        catch { }
        handlers.onError(msg);
        return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split('\n\n');
            buffer = chunks.pop() ?? '';
            for (const chunk of chunks) {
                const lines = chunk.split('\n');
                let eventName = 'message';
                const dataLines = [];
                for (const line of lines) {
                    if (line.startsWith('event:'))
                        eventName = line.slice(6).trim();
                    else if (line.startsWith('data:'))
                        dataLines.push(line.slice(5).trim());
                }
                const dataStr = dataLines.join('\n');
                if (!dataStr && eventName === 'message')
                    continue;
                if (eventName === 'token') {
                    handlers.onToken(dataStr);
                }
                else if (eventName === 'tool_call') {
                    if (handlers.onToolCall) {
                        try {
                            handlers.onToolCall(JSON.parse(dataStr));
                        }
                        catch { }
                    }
                }
                else if (eventName === 'tool_result') {
                    if (handlers.onToolResult) {
                        try {
                            handlers.onToolResult(JSON.parse(dataStr));
                        }
                        catch { }
                    }
                }
                else if (eventName === 'agent_turn') {
                    if (handlers.onAgentTurn) {
                        try {
                            handlers.onAgentTurn(JSON.parse(dataStr));
                        }
                        catch { }
                    }
                }
                else if (eventName === 'done') {
                    try {
                        const parsed = JSON.parse(dataStr);
                        handlers.onDone(parsed);
                    }
                    catch {
                        handlers.onDone({ messageId: '', tokensUsed: 0 });
                    }
                }
                else if (eventName === 'error') {
                    let errMsg = dataStr;
                    try {
                        const parsed = JSON.parse(dataStr);
                        errMsg = parsed.message ?? errMsg;
                    }
                    catch { }
                    handlers.onError(errMsg);
                }
            }
        }
    }
    catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError')
            return;
        handlers.onError(err instanceof Error ? err.message : 'Stream error');
    }
}
