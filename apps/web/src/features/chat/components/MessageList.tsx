import { forwardRef } from 'react';
import { Spinner } from '@radikal/ui';
import { getAgent, type AgentMeta } from '../agents';
import type { LocalMessage } from '../hooks/useChatStream';
import { MessageBubble } from './MessageBubble';
import { QuickPrompts } from './QuickPrompts';

interface Props {
  messages: LocalMessage[];
  isLoading: boolean;
  agent: AgentMeta | undefined;
  userInitials: string;
  chatId: string | undefined;
  onOpenReport: (content: string) => void;
  onQuickPrompt: (text: string) => Promise<void> | void;
}

export const MessageList = forwardRef<HTMLDivElement, Props>(function MessageList(
  { messages, isLoading, agent, userInitials, chatId, onOpenReport, onQuickPrompt },
  ref,
) {
  return (
    <div ref={ref} className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 sm:py-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-3 sm:gap-4">
        {messages.length === 0 && !isLoading && (
          <div className="py-6 space-y-4">
            <p className="text-sm text-slate-400 text-center">
              Empieza a conversar con {agent?.name ?? 'el agente'} o elige una opción rápida:
            </p>
            <QuickPrompts onSelect={onQuickPrompt} compact />
          </div>
        )}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          messages.map((m) => {
            const msgAgent = m.agentId ? getAgent(m.agentId) : agent;
            return (
              <MessageBubble
                key={m.id}
                role={m.role}
                content={m.content}
                agent={msgAgent}
                streaming={m.streaming}
                userInitials={userInitials}
                messageId={m.id}
                chatId={chatId}
                tools={m.tools}
                routerReason={m.routerReason ?? null}
                routerAgentName={m.routerAgentName ?? null}
                onOpenReport={onOpenReport}
              />
            );
          })
        )}
      </div>
    </div>
  );
});
