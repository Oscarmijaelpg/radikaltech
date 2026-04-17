import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { prisma, type MessageRole } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';
import { BadRequest, Forbidden, NotFound } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import { AGENTS, getAgent } from './agents.js';
import { ChatContextBuilder } from './context-builder.js';
import { ChatSummarizer } from './summarizer.js';
import { CHAT_TOOLS, executeTool, toolLabel } from './tools.js';
import { agentRouter } from './agent-router.js';
import {
  appendMessage,
  createChat,
  createFolder,
  deleteChat,
  deleteFolder,
  getChat,
  listChats,
  listFolders,
  listMessages,
  moveChatToFolder,
  renameFolder,
  updateChat,
} from './service.js';

const createChatSchema = z
  .object({
    agent_id: z.string().min(1).optional(),
    agent_ids: z.array(z.string().min(1)).min(1).max(5).optional(),
    project_id: z.string().uuid().optional(),
    title: z.string().max(200).optional(),
  })
  .refine((v) => !!v.agent_id || (v.agent_ids && v.agent_ids.length > 0), {
    message: 'agent_id or agent_ids required',
  });

const patchChatSchema = z.object({
  title: z.string().max(200).nullish(),
  is_archived: z.boolean().optional(),
});

const streamMessageSchema = z.object({
  content: z.string().min(1),
  target_agent_id: z.string().min(1).optional(),
});

const listQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
  archived: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

const createFolderSchema = z.object({
  project_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(100),
  color: z.string().max(20).optional().nullable(),
});

const patchFolderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(20).nullish(),
});

const moveChatSchema = z.object({
  folder_id: z.string().uuid().nullable(),
});

const foldersQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
});

const routePreviewSchema = z.object({
  message: z.string().min(1),
  agent_ids: z.array(z.string().min(1)).min(1).max(5),
});

export const chatsRouter = new Hono<{ Variables: AuthVariables }>();

// ---------- Folders (must register BEFORE /:id routes) ----------

chatsRouter.get('/folders', zValidator('query', foldersQuerySchema), async (c) => {
  const user = c.get('user');
  const { project_id } = c.req.valid('query');
  const folders = await listFolders(user.id, project_id ?? null);
  return c.json(ok(folders));
});

chatsRouter.post('/folders', zValidator('json', createFolderSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const folder = await createFolder({
    userId: user.id,
    projectId: body.project_id ?? null,
    name: body.name,
    color: body.color ?? null,
  });
  return c.json(ok(folder), 201);
});

chatsRouter.patch('/folders/:id', zValidator('json', patchFolderSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const folder = await renameFolder(c.req.param('id'), user.id, {
    name: body.name,
    color: body.color ?? undefined,
  });
  return c.json(ok(folder));
});

chatsRouter.delete('/folders/:id', async (c) => {
  const user = c.get('user');
  await deleteFolder(c.req.param('id'), user.id);
  return c.json(ok({ deleted: true }));
});

chatsRouter.get('/', zValidator('query', listQuerySchema), async (c) => {
  const user = c.get('user');
  const { project_id, archived } = c.req.valid('query');
  const chats = await listChats(user.id, { projectId: project_id, archived });
  return c.json(ok(chats));
});

chatsRouter.post('/', zValidator('json', createChatSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');

  const idsInput = body.agent_ids && body.agent_ids.length > 0
    ? body.agent_ids
    : body.agent_id
      ? [body.agent_id]
      : [];
  const validIds: string[] = [];
  for (const id of idsInput) {
    const a = getAgent(id);
    if (a && !validIds.includes(a.id)) validIds.push(a.id);
  }
  if (validIds.length === 0) throw new BadRequest('Invalid agent_id/agent_ids');

  const primary = getAgent(validIds[0])!;
  const title =
    body.title ??
    (validIds.length === 1
      ? `Conversación con ${primary.name}`
      : `Conversación multi-agente (${validIds.length})`);

  const chat = await createChat({
    userId: user.id,
    projectId: body.project_id ?? null,
    agentId: primary.id,
    agentIds: validIds,
    title,
  });
  return c.json(ok(chat), 201);
});

chatsRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const chat = await getChat(c.req.param('id'), user.id);
  const messages = await prisma.message.findMany({
    where: { chatId: chat.id },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });
  return c.json(ok({ ...chat, messages }));
});

chatsRouter.patch('/:id', zValidator('json', patchChatSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const chat = await updateChat(c.req.param('id'), user.id, {
    title: body.title ?? undefined,
    isArchived: body.is_archived,
  });
  return c.json(ok(chat));
});

chatsRouter.patch('/:id/folder', zValidator('json', moveChatSchema), async (c) => {
  const user = c.get('user');
  const { folder_id } = c.req.valid('json');
  const chat = await moveChatToFolder(c.req.param('id'), user.id, folder_id);
  return c.json(ok(chat));
});

chatsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  await deleteChat(c.req.param('id'), user.id);
  return c.json(ok({ deleted: true }));
});

chatsRouter.get('/:id/messages', async (c) => {
  const user = c.get('user');
  const messages = await listMessages(c.req.param('id'), user.id);
  return c.json(ok(messages));
});

// ---------- Router preview (no chat yet) ----------

chatsRouter.post('/route-preview', zValidator('json', routePreviewSchema), async (c) => {
  const body = c.req.valid('json');
  const decision = await agentRouter.route({
    message: body.message,
    availableAgents: body.agent_ids,
  });
  return c.json(ok(decision));
});

// ---------- Streaming ----------

type ChatMsg = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
};

interface ToolCallAccum {
  id: string;
  name: string;
  argsBuffer: string;
}

function sseEncode(event: string, data: string) {
  const lines = data.split('\n').map((l) => `data: ${l}`).join('\n');
  return `event: ${event}\n${lines}\n\n`;
}

type StreamEvent =
  | { kind: 'token'; value: string }
  | { kind: 'tool_calls'; calls: Array<{ id: string; name: string; args: string }> };

async function* streamChatCompletions(
  url: string,
  apiKey: string,
  body: object,
  extraHeaders: Record<string, string> = {},
): AsyncGenerator<StreamEvent, void, unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const errTxt = await res.text().catch(() => '');
    throw new Error(`Upstream ${res.status}: ${errTxt.slice(0, 200)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const toolAccum = new Map<number, ToolCallAccum>();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      const line = part.trim();
      if (!line) continue;
      for (const raw of line.split('\n')) {
        const trimmed = raw.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') {
          if (toolAccum.size > 0) {
            const calls = Array.from(toolAccum.values()).map((c) => ({
              id: c.id,
              name: c.name,
              args: c.argsBuffer,
            }));
            yield { kind: 'tool_calls', calls };
          }
          return;
        }
        try {
          const json = JSON.parse(payload) as {
            choices?: Array<{
              delta?: {
                content?: string;
                tool_calls?: Array<{
                  index: number;
                  id?: string;
                  function?: { name?: string; arguments?: string };
                }>;
              };
              finish_reason?: string;
            }>;
          };
          const choice = json.choices?.[0];
          const delta = choice?.delta;
          if (delta?.content) {
            yield { kind: 'token', value: delta.content };
          }
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index;
              const cur = toolAccum.get(idx) ?? { id: '', name: '', argsBuffer: '' };
              if (tc.id) cur.id = tc.id;
              if (tc.function?.name) cur.name = tc.function.name;
              if (tc.function?.arguments) cur.argsBuffer += tc.function.arguments;
              toolAccum.set(idx, cur);
            }
          }
          if (choice?.finish_reason === 'tool_calls' && toolAccum.size > 0) {
            const calls = Array.from(toolAccum.values()).map((c) => ({
              id: c.id,
              name: c.name,
              args: c.argsBuffer,
            }));
            toolAccum.clear();
            yield { kind: 'tool_calls', calls };
          }
        } catch {
          // ignore malformed
        }
      }
    }
  }
  if (toolAccum.size > 0) {
    const calls = Array.from(toolAccum.values()).map((c) => ({
      id: c.id,
      name: c.name,
      args: c.argsBuffer,
    }));
    yield { kind: 'tool_calls', calls };
  }
}

function pickProvider(): { url: string; apiKey: string; model: string; extraHeaders: Record<string, string> } {
  if (env.OPENROUTER_API_KEY) {
    return {
      url: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: env.OPENROUTER_API_KEY,
      model: 'openai/gpt-4o-mini',
      extraHeaders: { 'HTTP-Referer': env.WEB_URL, 'X-Title': 'Radikal' },
    };
  }
  if (env.OPENAI_API_KEY) {
    return {
      url: 'https://api.openai.com/v1/chat/completions',
      apiKey: env.OPENAI_API_KEY,
      model: 'gpt-4o-mini',
      extraHeaders: {},
    };
  }
  throw new Error('No LLM provider configured');
}

function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

chatsRouter.post('/:id/messages/stream', zValidator('json', streamMessageSchema), async (c) => {
  const user = c.get('user');
  const chatId = c.req.param('id');
  const chat = await getChat(chatId, user.id);
  const { content, target_agent_id } = c.req.valid('json');

  // Resolve the agent list: multi if array non-empty, else fall back to agentId
  const agentIds = chat.agentIds && chat.agentIds.length > 0
    ? chat.agentIds
    : chat.agentId
      ? [chat.agentId]
      : [];
  if (agentIds.length === 0) throw new BadRequest('Chat has no valid agent');

  // Choose responder: explicit > router > first
  let responderId = target_agent_id && agentIds.includes(target_agent_id) ? target_agent_id : null;
  let routerDecisionMeta: { reason: string; router: boolean } | null = null;
  if (!responderId && agentIds.length > 1) {
    const decision = await agentRouter
      .route({ message: content, availableAgents: agentIds })
      .catch(() => null);
    if (decision && decision.confidence >= 0.6) {
      responderId = decision.agentId;
      routerDecisionMeta = { reason: decision.reason, router: true };
    }
  }
  if (!responderId) responderId = agentIds[0] ?? null;
  const agent = getAgent(responderId);
  if (!agent) throw new BadRequest('Chat has no valid agent');

  // Save user message BEFORE calling the LLM
  await appendMessage({
    chatId,
    userId: user.id,
    role: 'user' as MessageRole,
    content,
  });

  // Build context (brand, memories, summaries, competitors)
  const recent = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: 'desc' },
    take: 15,
  });
  const history: ChatMsg[] = recent
    .reverse()
    .map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }));

  const contextBuilder = new ChatContextBuilder();
  const contextBlock = await contextBuilder
    .build({
      chatId,
      userId: user.id,
      projectId: chat.projectId,
      agentId: agent.id,
      userMessage: content,
    })
    .catch((err) => {
      console.error('[chat] context builder failed', err);
      return '';
    });

  const systemMessages: ChatMsg[] = [{ role: 'system', content: agent.system }];
  if (contextBlock) systemMessages.push({ role: 'system', content: contextBlock });
  let llmMessages: ChatMsg[] = [...systemMessages, ...history];

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let full = '';
      const toolLog: Array<{ name: string; args: Record<string, unknown>; resultSummary: string }> = [];

      const send = (event: string, data: string) =>
        controller.enqueue(encoder.encode(sseEncode(event, data)));

      try {
        // Announce the responding agent
        send(
          'agent_turn',
          JSON.stringify({
            agent_id: agent.id,
            router: routerDecisionMeta?.router ?? false,
            reason: routerDecisionMeta?.reason ?? null,
          }),
        );

        const provider = pickProvider();
        const MAX_TOOL_ROUNDS = 3;

        for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
          const body = {
            model: provider.model,
            stream: true,
            messages: llmMessages,
            temperature: 0.7,
            ...(round < MAX_TOOL_ROUNDS
              ? { tools: CHAT_TOOLS, tool_choice: 'auto' as const }
              : {}),
          };

          let pendingToolCalls: Array<{ id: string; name: string; args: string }> = [];

          for await (const ev of streamChatCompletions(provider.url, provider.apiKey, body, provider.extraHeaders)) {
            if (ev.kind === 'token') {
              full += ev.value;
              send('token', ev.value);
            } else if (ev.kind === 'tool_calls') {
              pendingToolCalls = ev.calls;
            }
          }

          if (pendingToolCalls.length === 0) break;

          // Register assistant tool_calls turn in llmMessages
          llmMessages.push({
            role: 'assistant',
            content: null,
            tool_calls: pendingToolCalls.map((tc) => ({
              id: tc.id || `call_${Math.random().toString(36).slice(2, 10)}`,
              type: 'function' as const,
              function: { name: tc.name, arguments: tc.args || '{}' },
            })),
          });

          // Execute each and push tool results
          for (const tc of pendingToolCalls) {
            let parsedArgs: Record<string, unknown> = {};
            try {
              parsedArgs = tc.args ? (JSON.parse(tc.args) as Record<string, unknown>) : {};
            } catch {
              parsedArgs = {};
            }
            send(
              'tool_call',
              JSON.stringify({
                name: tc.name,
                label: toolLabel(tc.name),
                args: parsedArgs,
                status: 'started',
              }),
            );
            const result = await executeTool(tc.name, parsedArgs, {
              userId: user.id,
              projectId: chat.projectId,
              chatId,
            });
            toolLog.push({ name: tc.name, args: parsedArgs, resultSummary: result.summary });
            send(
              'tool_result',
              JSON.stringify({
                name: tc.name,
                label: toolLabel(tc.name),
                result_summary: result.summary,
                status: result.error ? 'error' : 'done',
                data: result.data ?? null,
              }),
            );

            const toolContent = JSON.stringify({
              summary: result.summary,
              data: result.data ?? null,
              error: result.error ?? null,
            });
            llmMessages.push({
              role: 'tool',
              tool_call_id: tc.id || `call_${Math.random().toString(36).slice(2, 10)}`,
              name: tc.name,
              content: toolContent,
            });
          }
          // Loop continues -> LLM continues generating, possibly with more tools.
        }

        const tokensUsed = approxTokens(full);
        const saved = await appendMessage({
          chatId,
          userId: user.id,
          role: 'assistant' as MessageRole,
          content: full,
          tokensUsed,
          metadata: {
            agent_id: agent.id,
            tools: toolLog,
            router: routerDecisionMeta,
          },
        });
        send('done', JSON.stringify({ messageId: saved.id, tokensUsed, agent_id: agent.id }));

        if (chat.projectId) {
          const userTurns = await prisma.message.count({
            where: { chatId, role: 'user' as MessageRole },
          });
          if (userTurns >= 4 && userTurns % 4 === 0) {
            const summarizer = new ChatSummarizer();
            void summarizer.summarizeIfNeeded(chatId, user.id);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stream error';
        console.error('[chat] stream error', err);
        if (full) {
          try {
            await appendMessage({
              chatId,
              userId: user.id,
              role: 'assistant' as MessageRole,
              content: full,
              tokensUsed: approxTokens(full),
              metadata: { partial: true, error: message, agent_id: agent.id },
            });
          } catch {}
        }
        controller.enqueue(encoder.encode(sseEncode('error', JSON.stringify({ message }))));
      } finally {
        controller.close();
      }
    },
  });

  c.header('Content-Type', 'text/event-stream; charset=utf-8');
  c.header('Cache-Control', 'no-cache, no-transform');
  c.header('Connection', 'keep-alive');
  c.header('X-Accel-Buffering', 'no');
  return c.body(stream);
});

chatsRouter.get('/meta/agents', (c) => {
  return c.json(ok(AGENTS));
});

// Silence unused-import lint
void Forbidden;
void NotFound;
