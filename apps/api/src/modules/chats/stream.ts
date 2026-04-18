import type { Context } from 'hono';
import { prisma, type MessageRole } from '@radikal/db';
import type { AuthVariables } from '../../middleware/auth.js';
import { BadRequest } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import { LLM_MODELS, PROVIDER_URLS } from '../../config/providers.js';
import { getAgent } from './agents.js';
import { ChatContextBuilder } from './context-builder.js';
import { ChatSummarizer } from './summarizer.js';
import { CHAT_TOOLS, executeTool, toolLabel } from './tools/index.js';
import { agentRouter } from './agent-router.js';
import { appendMessage, getChat } from './service.js';

const ROUTER_CONFIDENCE_THRESHOLD = 0.6;
const MAX_TOOL_ROUNDS = 3;
const RECENT_MESSAGES_WINDOW = 15;
const SUMMARIZE_EVERY_N_TURNS = 4;

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

type StreamEvent =
  | { kind: 'token'; value: string }
  | { kind: 'tool_calls'; calls: Array<{ id: string; name: string; args: string }> };

function sseEncode(event: string, data: string) {
  const lines = data.split('\n').map((l) => `data: ${l}`).join('\n');
  return `event: ${event}\n${lines}\n\n`;
}

function pickProvider(): {
  url: string;
  apiKey: string;
  model: string;
  extraHeaders: Record<string, string>;
} {
  if (env.OPENROUTER_API_KEY) {
    return {
      url: PROVIDER_URLS.openrouter.chatCompletions,
      apiKey: env.OPENROUTER_API_KEY,
      model: LLM_MODELS.chat.openrouter,
      extraHeaders: { 'HTTP-Referer': env.WEB_URL, 'X-Title': 'Radikal' },
    };
  }
  if (env.OPENAI_API_KEY) {
    return {
      url: PROVIDER_URLS.openai.chatCompletions,
      apiKey: env.OPENAI_API_KEY,
      model: LLM_MODELS.chat.openai,
      extraHeaders: {},
    };
  }
  throw new Error('No LLM provider configured');
}

function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

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
          /* malformed chunk */
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

export async function handleStreamMessage(c: Context<{ Variables: AuthVariables }>) {
  const user = c.get('user');
  const chatId = c.req.param('id');
  if (!chatId) throw new BadRequest('chat id missing');
  const chat = await getChat(chatId, user.id);
  const { content, target_agent_id } = await c.req.json<{
    content: string;
    target_agent_id?: string;
  }>();

  const agentIds =
    chat.agentIds && chat.agentIds.length > 0
      ? chat.agentIds
      : chat.agentId
        ? [chat.agentId]
        : [];
  if (agentIds.length === 0) throw new BadRequest('Chat has no valid agent');

  let responderId = target_agent_id && agentIds.includes(target_agent_id) ? target_agent_id : null;
  let routerDecisionMeta: { reason: string; router: boolean } | null = null;
  if (!responderId && agentIds.length > 1) {
    const decision = await agentRouter
      .route({ message: content, availableAgents: agentIds })
      .catch(() => null);
    if (decision && decision.confidence >= ROUTER_CONFIDENCE_THRESHOLD) {
      responderId = decision.agentId;
      routerDecisionMeta = { reason: decision.reason, router: true };
    }
  }
  if (!responderId) responderId = agentIds[0] ?? null;
  const agent = getAgent(responderId);
  if (!agent) throw new BadRequest('Chat has no valid agent');

  await appendMessage({
    chatId,
    userId: user.id,
    role: 'user' as MessageRole,
    content,
  });

  const recent = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: 'desc' },
    take: RECENT_MESSAGES_WINDOW,
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
  const llmMessages: ChatMsg[] = [...systemMessages, ...history];

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let full = '';
      const toolLog: Array<{
        name: string;
        args: Record<string, unknown>;
        resultSummary: string;
      }> = [];

      const send = (event: string, data: string) =>
        controller.enqueue(encoder.encode(sseEncode(event, data)));

      try {
        send(
          'agent_turn',
          JSON.stringify({
            agent_id: agent.id,
            router: routerDecisionMeta?.router ?? false,
            reason: routerDecisionMeta?.reason ?? null,
          }),
        );

        const provider = pickProvider();

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

          for await (const ev of streamChatCompletions(
            provider.url,
            provider.apiKey,
            body,
            provider.extraHeaders,
          )) {
            if (ev.kind === 'token') {
              full += ev.value;
              send('token', ev.value);
            } else if (ev.kind === 'tool_calls') {
              pendingToolCalls = ev.calls;
            }
          }

          if (pendingToolCalls.length === 0) break;

          llmMessages.push({
            role: 'assistant',
            content: null,
            tool_calls: pendingToolCalls.map((tc) => ({
              id: tc.id || `call_${Math.random().toString(36).slice(2, 10)}`,
              type: 'function' as const,
              function: { name: tc.name, arguments: tc.args || '{}' },
            })),
          });

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
          if (userTurns >= SUMMARIZE_EVERY_N_TURNS && userTurns % SUMMARIZE_EVERY_N_TURNS === 0) {
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
          } catch {
            /* swallow */
          }
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
}
