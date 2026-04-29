import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseChatRepository } from '../../infrastructure/repositories/SupabaseChatRepository';
import { SupabaseAgentRepository } from '../../infrastructure/repositories/SupabaseAgentRepository';
import { SupabaseMemoryRepository } from '../../infrastructure/repositories/SupabaseMemoryRepository';
import { CreateChatUseCase } from '../../core/application/use-cases/CreateChatUseCase';
import { GetChatHistoryUseCase } from '../../core/application/use-cases/GetChatHistoryUseCase';
import { SendMessageUseCase } from '../../core/application/use-cases/SendMessageUseCase';
import { AgentOrchestrator } from '../../core/application/services/AgentOrchestrator';
import { Chat, Message } from '../../core/domain/entities';
import { supabase } from '../../infrastructure/supabase/client';
import { SupabaseTokenRepository } from '../../infrastructure/repositories/SupabaseTokenRepository';
import { useAuth } from '../context/AuthContext';
import { PRICING_TR } from '../../core/domain/constants/pricing';

// Dependencies
const chatRepository = new SupabaseChatRepository();
const agentRepository = new SupabaseAgentRepository();
const memoryRepository = new SupabaseMemoryRepository();
const createChatUseCase = new CreateChatUseCase(chatRepository);
const getChatHistoryUseCase = new GetChatHistoryUseCase(chatRepository);
const sendMessageUseCase = new SendMessageUseCase(chatRepository);
const agentOrchestrator = new AgentOrchestrator(chatRepository, agentRepository, memoryRepository);
const tokenRepository = new SupabaseTokenRepository(supabase);

const AUTO_TRIGGER_PREFIX = '[REAJUSTE_SISTEMA]';

export const useChat = (chatId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isThinking, setIsThinking] = useState(false);
  const [showTokensModal, setShowTokensModal] = useState(false);
  const [tokensErrorMsg, setTokensErrorMsg] = useState('');
  const [error, setError] = useState<string | null>(null);

  const messagesQuery = useQuery({
    queryKey: ['messages', chatId],
    queryFn: () => getChatHistoryUseCase.execute(chatId!),
    enabled: !!chatId,
  });

  const chatQuery = useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => chatRepository.getChatById(chatId!),
    enabled: !!chatId,
  });

  // Check for persistent thinking state on mount/chatChange
  useEffect(() => {
    if (!chatId || messagesQuery.isLoading || !messagesQuery.data) return;
    
    const messages = messagesQuery.data;
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      const messageTime = new Date(lastMessage.created_at).getTime();
      const now = new Date().getTime();
      const diffMinutes = (now - messageTime) / (1000 * 60);

      // If last message is user and very recent (< 2 mins) and no assistant response yet
      if (diffMinutes < 2 && !isThinking) {
        setIsThinking(true);
        
        // Re-trigger orchestration
        agentOrchestrator.run(
          chatId,
          lastMessage.content,
          {
            onAgentStream: (streamAgentId, streamContent, messageId, streamImageUrl) => {
              queryClient.setQueryData<Message[]>(['messages', chatId], (oldData) => {
                const currentData = oldData || [];
                const exists = currentData.some(msg => msg.id === messageId);
                if (exists) {
                  return currentData.map(msg =>
                    msg.id === messageId ? { ...msg, content: streamContent, image_url: streamImageUrl || msg.image_url } : msg
                  );
                } else {
                  return [...currentData, {
                    id: messageId,
                    chat_id: chatId,
                    role: 'assistant',
                    content: streamContent,
                    created_at: new Date().toISOString(),
                    agent_id: streamAgentId,
                    image_url: streamImageUrl
                  } as Message];
                }
              });
            }
          },
          lastMessage.image_url
        ).finally(() => setIsThinking(false));
      }
    }
  }, [chatId, messagesQuery.isLoading, messagesQuery.data, queryClient]);

  // Realtime Subscription
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, etc.
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          queryClient.setQueryData(['messages', chatId], (oldData: Message[] | undefined) => {
            const currentData = oldData || [];
            if (payload.eventType === 'INSERT') {
              if (currentData.some(msg => msg.id === newMessage.id)) return currentData;
              return [...currentData, newMessage];
            } else if (payload.eventType === 'UPDATE') {
              return currentData.map(msg => msg.id === newMessage.id ? newMessage : msg);
            }
            return currentData;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, queryClient]);

  const createChatMutation = useMutation({
    mutationFn: ({ userId, projectId, objectiveId, title }: { userId: string; projectId: string; objectiveId: string; title?: string }) =>
      createChatUseCase.execute(userId, projectId, objectiveId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      content,
      role,
      agentId,
      imageUrl,
      onIntentDetected
    }: {
      content: string;
      role: 'user' | 'assistant';
      agentId?: string;
      imageUrl?: string;
      onIntentDetected?: (intent: 'chat' | 'report', title?: string) => void;
    }) => {
      let currentUserData: any = null;
      if (role === 'user') {
        // Validar saldo antes de proceder (pre-flight)
        try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          currentUserData = currentUser;
          if (currentUser) {
            const canUse = await tokenRepository.canUseService(currentUser.id, 'chat_message');
            // Allow if canUse or if it's just a fallback error
            if (canUse && canUse.can_use === false) {
                throw new Error(canUse.reason || 'Saldo insuficiente para enviar el mensaje.');
            }
          }
        } catch (e: any) {
            setTokensErrorMsg(e.message || 'Error al validar tokens.');
            setShowTokensModal(true);
            throw e;
        }
      }

      // 1. Send user message and get the saved message object
      const newMessage = await sendMessageUseCase.execute(chatId!, content, role, agentId, imageUrl);

      // Manually update cache with user message immediately
      queryClient.setQueryData(['messages', chatId], (oldData: Message[] | undefined) => {
        if (!oldData) return [newMessage];
        if (oldData.some(msg => msg.id === newMessage.id)) return oldData;
        return [...oldData, newMessage];
      });

      // 2. Trigger orchestration if user message
      if (role === 'user') {
        setIsThinking(true);
        agentOrchestrator.run(
          chatId!,
          content,
          {
            onIntentDetected,
            onAgentResponse: () => { },
            onAgentStream: (streamAgentId: string, streamContent: string, messageId: string, streamImageUrl?: string) => {
              // Optimistically update the SPECIFIC message being streamed
              queryClient.setQueryData<Message[]>(['messages', chatId], (oldData) => {
                const currentData = oldData || [];
                const exists = currentData.some(msg => msg.id === messageId);

                if (exists) {
                  return currentData.map(msg =>
                    msg.id === messageId ? { ...msg, content: streamContent, image_url: streamImageUrl || msg.image_url } : msg
                  );
                } else {
                  return [...currentData, {
                    id: messageId,
                    chat_id: chatId!,
                    role: 'assistant',
                    content: streamContent,
                    created_at: new Date().toISOString(),
                    agent_id: streamAgentId,
                    image_url: streamImageUrl
                  } as Message];
                }
              });
            }
          },
          imageUrl
        )
        .then(async (metrics) => {
          setIsThinking(false);
          // Cobro dinámico exacto al finalizar
          if (currentUserData && metrics) {
             const inputCost = (metrics.inputTokens / 1000) * PRICING_TR.LLM_INPUT_1K;
             const outputCost = (metrics.outputTokens / 1000) * PRICING_TR.LLM_OUTPUT_1K;
             const imageCost = metrics.images1k * PRICING_TR.IMAGE_1K + (metrics.images2k || 0) * PRICING_TR.IMAGE_2K + (metrics.images4k || 0) * PRICING_TR.IMAGE_4K;
             const searchCost = (metrics.serpapiSearches || 0) * PRICING_TR.SERPAPI_SEARCH + ((metrics.tavilySearches || 0) + (metrics.tavilyExtractions || 0)) * PRICING_TR.TAVILY_CREDIT;
             const totalTokens = PRICING_TR.BASE_FEE_JOB + inputCost + outputCost + imageCost + searchCost;
             
             const roundedTokens = Math.ceil(totalTokens);
             
             if (roundedTokens > 0) {
                 try {
                     await tokenRepository.spendTokensExact(
                        currentUserData.id, 
                        roundedTokens, 
                        // Note: Using a short string for description
                        `Job Completado: ${metrics.inputTokens}T In / ${metrics.outputTokens}T Out`,
                        metrics
                     );
                     // Invalidate queries directly
                     queryClient.invalidateQueries({ queryKey: ['wallet'] });
                     queryClient.invalidateQueries({ queryKey: ['transactions'] });
                 } catch(e) { console.error("Error deduciendo saldo", e) }
             }
          }
        })
        .catch(err => {
          console.error('Orchestration failed', err);
          setError(err.message || 'Error en la orquestación del chat');
          setIsThinking(false);
        });
      }
    },
    onMutate: () => {
      setError(null);
    },
    onError: (err: any) => {
      setError(err.message || 'Error al enviar el mensaje');
    }
  });

  // Auto-trigger for system re-adjustment messages
  useEffect(() => {
    if (!chatId || isThinking || messagesQuery.isLoading || messagesQuery.data?.length === 0) return;

    const lastMessage = messagesQuery.data![messagesQuery.data!.length - 1];
    
    // If last message is a user system-trigger AND there's no reply from agents yet
    if (lastMessage.role === 'user' && 
        lastMessage.content.startsWith(AUTO_TRIGGER_PREFIX) && 
        !messagesQuery.data!.some(m => m.role === 'assistant' && new Date(m.created_at) > new Date(lastMessage.created_at))
    ) {
        setIsThinking(true);
        agentOrchestrator.run(
            chatId,
            lastMessage.content,
            {
                onIntentDetected: () => {},
                onAgentResponse: () => {},
                onAgentStream: (streamAgentId, streamContent, messageId, streamImageUrl) => {
                    queryClient.setQueryData<Message[]>(['messages', chatId], (oldData) => {
                        const currentData = oldData || [];
                        const exists = currentData.some(msg => msg.id === messageId);
                        if (exists) {
                            return currentData.map(msg =>
                                msg.id === messageId ? { ...msg, content: streamContent, image_url: streamImageUrl || msg.image_url } : msg
                            );
                        } else {
                            return [...currentData, {
                                id: messageId,
                                chat_id: chatId,
                                role: 'assistant',
                                content: streamContent,
                                created_at: new Date().toISOString(),
                                agent_id: streamAgentId,
                                image_url: streamImageUrl
                            } as Message];
                        }
                    });
                }
            },
            lastMessage.image_url
        ).finally(() => setIsThinking(false));
    }
  }, [chatId, messagesQuery.data, messagesQuery.isLoading, isThinking, queryClient]);

  return {
    chat: chatQuery.data,
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading || chatQuery.isLoading,
    isLoadingMessages: messagesQuery.isLoading,
    createChat: createChatMutation.mutateAsync,
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
    isThinking,
    showTokensModal,
    setShowTokensModal,
    tokensErrorMsg,
    error,
    clearError: () => setError(null),
    linkChats: (id1: string, id2: string) => chatRepository.linkChats(id1, id2)
  };
};

export const useUserChats = (userId: string | undefined, projectId: string | null | undefined) => {
  const chatRepository = new SupabaseChatRepository();
  return useQuery({
    queryKey: ['chats', userId, projectId],
    queryFn: () => (!userId || !projectId) ? Promise.resolve([]) : chatRepository.getChats(userId, projectId),
    enabled: !!userId && !!projectId
  });
};

export const useDeleteChat = () => {
  const queryClient = useQueryClient();
  const chatRepository = new SupabaseChatRepository();

  return useMutation({
    mutationFn: async (chatId: string) => {
      await chatRepository.deleteChat(chatId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    }
  });
};
