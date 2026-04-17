import { prisma } from '@radikal/db';
import { env } from '../../config/env.js';
import { getAgent } from './agents.js';

const SUMMARY_WINDOW_HOURS = 24;
const MIN_USER_TURNS = 4;

export class ChatSummarizer {
  async summarizeIfNeeded(chatId: string, userId: string): Promise<void> {
    try {
      const chat = await prisma.chat.findUnique({ where: { id: chatId } });
      if (!chat) return;
      if (chat.userId !== userId) return;
      if (!chat.projectId) return;

      const messages = await prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: 'asc' },
      });
      const userTurns = messages.filter((m) => m.role === 'user').length;
      if (userTurns < MIN_USER_TURNS) return;

      // Check for existing recent chat_summary for this chat
      const cutoff = new Date(Date.now() - SUMMARY_WINDOW_HOURS * 60 * 60 * 1000);
      const existing = await prisma.memory.findMany({
        where: {
          projectId: chat.projectId,
          userId,
          category: 'chat_summary',
          updatedAt: { gte: cutoff },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      });
      const hasRecent = existing.some((m) => {
        const meta = m.metadata as { chat_id?: string } | null;
        return meta?.chat_id === chatId;
      });
      if (hasRecent) return;

      const window = messages.slice(-20);
      if (window.length === 0) return;

      const agent = getAgent(chat.agentId);
      const agentName = agent?.name ?? chat.agentId;
      const transcript = window
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n');

      const prompt = `Resume esta conversación con el agente ${agentName} en 3-5 frases. Enfócate en decisiones tomadas, ideas generadas, y contexto relevante que ayudaría a retomar la conversación después. Responde en español, tono informal pero profesional.\n\n---\n${transcript}\n---`;

      const summary = await this.callLLM(prompt);
      if (!summary) return;

      await prisma.memory.create({
        data: {
          projectId: chat.projectId,
          userId,
          category: 'chat_summary',
          key: chat.title ?? `Chat con ${agentName}`,
          value: summary,
          metadata: {
            chat_id: chatId,
            agent_id: chat.agentId,
            turns: userTurns,
            summarized_at: new Date().toISOString(),
          },
        },
      });
    } catch (err) {
      console.error('[chat] summarizer failed', err);
    }
  }

  private async callLLM(prompt: string): Promise<string | null> {
    if (!env.OPENROUTER_API_KEY) return null;
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': env.WEB_URL,
        'X-Title': 'Radikal',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        stream: false,
        temperature: 0.4,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.error('[chat] summarizer LLM error', res.status, t.slice(0, 200));
      return null;
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content.trim() : null;
  }
}
