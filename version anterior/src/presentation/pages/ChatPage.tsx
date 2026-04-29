
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
import { useAgents } from '../hooks/useAgents';
import { useAuth } from '../context/AuthContext';
import { Message, Agent } from '../../core/domain/entities';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { useSaveMemory } from '../hooks/useMemory';
import { generateEmbedding } from '../../infrastructure/services/OpenAIService';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { ReportPanel } from '../components/chat/ReportPanel';
import { Button } from '../components/ui/Button';
import clsx from 'clsx';
import KronosProfile from '../../media/kronos_profile.webp';
import { useWallet, useSpendTokens } from '../hooks/useTokens';
import { InsufficientTokensModal } from '../components/ui/InsufficientTokensModal';
import { NavLink } from 'react-router-dom';

const AGENT_AVATAR_MAP: Record<string, { speaking: string; silent: string }> = {
  ankor: { speaking: 'https://i.ibb.co/pB481Kd6/Ankor-hablando.png', silent: 'https://i.ibb.co/Q5vQC8N/Ankor-callado.png' },
  nexo: { speaking: 'https://i.ibb.co/0RHH3JLc/Nexo-hablando.png', silent: 'https://i.ibb.co/G3QfWP75/Nexo-callado.png' },
  sira: { speaking: 'https://i.ibb.co/PZH5Hmz8/Sira-hablando.png', silent: 'https://i.ibb.co/C3m2WVmF/Sira-callada.png' },
  indexa: { speaking: 'https://i.ibb.co/CKF84Sw2/Indexa-hablando.png', silent: 'https://i.ibb.co/nq50dKx7/Indexa-Callada.png' },
  kronos: { speaking: '/src/media/kronos_profile.webp', silent: '/src/media/kronos_profile.webp' },
};

interface ChatPageProps {
  onOpenNewChat: () => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ onOpenNewChat }) => {
  const { chatId } = useParams<{ chatId: string }>();
  const [searchParams] = useSearchParams();
  const initialMessage = searchParams.get('initialMessage');
  
  const { user } = useAuth();
  const { 
    chat, messages, sendMessage, isSending, isLoading, isThinking, 
    showTokensModal, setShowTokensModal, tokensErrorMsg, error, clearError 
  } = useChat(chatId);
  const { data: agents = [] } = useAgents(chat?.objective_id);
  const { data: wallet } = useWallet();

  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Flag to avoid multiple initial sends
  const hasSentInitialRef = useRef(false);

  // Auto-send initial message if provided and chat is empty
  useEffect(() => {
    if (chatId && initialMessage && messages.length === 0 && !isLoading && !isSending && !hasSentInitialRef.current) {
      hasSentInitialRef.current = true;
      handleSendMessage(initialMessage);
      
      // Clean up URL to avoid re-sending on refresh
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [chatId, initialMessage, messages.length, isLoading, isSending]);

  // Report States
  const [showReport, setShowReport] = useState(false);
  const [reportMessageIds, setReportMessageIds] = useState<Set<string>>(new Set());
  const [reportTitles, setReportTitles] = useState<Record<string, string>>({});
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [pendingReportTitle, setPendingReportTitle] = useState<string | null>(null);
  const [isExpectingNewReport, setIsExpectingNewReport] = useState(false);
  const [lastProcessedMessageId, setLastProcessedMessageId] = useState<string | null>(null);

  // Image States
  const [lastGeneratedImage, setLastGeneratedImage] = useState<string | null>(null);
  const lastAutoOpenedImageRef = useRef<string | null>(null);

  // Asset Selection States
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());

  const handleToggleAsset = useCallback((url: string) => {
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }, []);

  const { isListening, startListening, stopListening } = useSpeechToText((text) => {
    // We handle this via a bus or by updating a ref that ChatInput can pick up
    // For now, we'll just log it or we could use an event emitter pattern
  });

  const { speak, stop, isPlaying } = useTextToSpeech();
  const { mutateAsync: saveMemory } = useSaveMemory();

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Sync scroll on messages/thinking change
  useEffect(() => {
    scrollToBottom(isThinking ? 'auto' : 'smooth');
  }, [messages.length, isThinking, scrollToBottom]);

  // Handle side panel image detection (Only for GENERATED images)
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant') {
      // Prioritize image_url which is only set when Nexo materializes a real image
      // We explicitly avoid auto-opening markdown references (![...]) requested by user
      const generatedUrl = lastMessage.image_url;
      if (generatedUrl && generatedUrl !== lastAutoOpenedImageRef.current) {
        setLastGeneratedImage(generatedUrl);
        lastAutoOpenedImageRef.current = generatedUrl;
        // If we show an image, hide the report to avoid clutter
        setShowReport(false);
      }
    }
  }, [messages]);

  // Reset states on chat change
  useEffect(() => {
    setLastGeneratedImage(null);
    lastAutoOpenedImageRef.current = null;
    setShowReport(false);
    setActiveReportId(null);
    setReportMessageIds(new Set());
    setReportTitles({});
  }, [chatId]);

  // Track active agent
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.agent_id) {
      setActiveAgentId(lastMessage.agent_id);
    } else if (lastMessage?.role === 'user') {
      setActiveAgentId(null);
    }
  }, [messages]);

  // Nexo Proactive Suggestion
  const [showNexoSuggestion, setShowNexoSuggestion] = useState(false);
  const [suggestionRef, setSuggestionRef] = useState<string>("");

  useEffect(() => {
    const isContentCreationChat = chat?.objective_id === 'c96bb25d-9519-42f7-bb83-160be8f48b5b' || agents.some((a: Agent) => a.name.toLowerCase().includes('nexo'));

    if (!chat?.linked_chat_id || messages.length < 2 || isContentCreationChat) {
        if (showNexoSuggestion) setShowNexoSuggestion(false);
        return;
    }
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && !lastMessage.content.includes('<redirect')) {
      const keywords = ['imagen', 'diseño', 'visual', 'póster', 'branding', 'logo', 'publicación', 'post', 'creativo'];
      const content = lastMessage.content.toLowerCase();
      
      if (keywords.some(k => content.includes(k))) {
        if (suggestionRef !== lastMessage.id) {
            setSuggestionRef(lastMessage.id);
            setShowNexoSuggestion(true);
        }
      } else {
        if (showNexoSuggestion) setShowNexoSuggestion(false);
      }
    } else {
        if (showNexoSuggestion) setShowNexoSuggestion(false);
    }
  }, [messages, chat?.linked_chat_id, suggestionRef, showNexoSuggestion]);

  // Helper to identify reports
  const isMessageReport = useCallback((msg: Message) => {
    if (reportMessageIds.has(msg.id)) return true;
    if (msg.role !== 'assistant') return false;

    const content = msg.content.trim();
    const hasStructuredData = content.includes('<report_data>') || content.includes('```json');
    const hasMarkdownReport = content.startsWith('# ') || (content.includes('\n---') && content.includes('## '));

    return hasStructuredData || hasMarkdownReport;
  }, [reportMessageIds]);

  // Effect to bind incoming streaming report
  useEffect(() => {
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length === 0) return;

    const lastMsg = assistantMessages[assistantMessages.length - 1];

    if (isExpectingNewReport && lastMsg.id !== lastProcessedMessageId) {
      setReportMessageIds(prev => new Set(prev).add(lastMsg.id));
      setActiveReportId(lastMsg.id);
      setIsExpectingNewReport(false);

      if (pendingReportTitle) {
        setReportTitles(prev => ({ ...prev, [lastMsg.id]: pendingReportTitle }));
        setPendingReportTitle(null);
      }
    }

    if (isMessageReport(lastMsg)) {
      if (!reportMessageIds.has(lastMsg.id)) {
        setReportMessageIds(prev => new Set(prev).add(lastMsg.id));
      }

      if (!reportTitles[lastMsg.id]) {
        const firstLine = lastMsg.content.trim().split('\n')[0];
        if (firstLine.startsWith('# ')) {
          const extractedTitle = firstLine.replace('# ', '').trim();
          if (extractedTitle) {
            setReportTitles(prev => ({ ...prev, [lastMsg.id]: extractedTitle }));
          }
        }
      }
    }
  }, [messages, isExpectingNewReport, pendingReportTitle, lastProcessedMessageId, reportMessageIds, reportTitles, isMessageReport]);

  const currentReportContent = useMemo(() => {
    if (!activeReportId) return '';
    return messages.find(m => m.id === activeReportId)?.content || '';
  }, [messages, activeReportId]);

  const handleSendMessage = async (content: string, imageUrl?: string) => {
    try {
      // If sending a generation command, include selected assets as context
      let enrichedContent = content;
      if (selectedAssets.size > 0) {
        const assetsList = Array.from(selectedAssets).join(', ');
        enrichedContent = `${content}\n\n[USER_SELECTED_ASSETS: ${assetsList}]`;
        // Clear selection after sending
        setSelectedAssets(new Set());
      }

      await sendMessage({
        content: enrichedContent,
        role: 'user',
        imageUrl,
        onIntentDetected: (intent, title) => {
          if (intent === 'report') {
            setIsExpectingNewReport(true);
            setActiveReportId(null);
            setShowReport(true);
            setPendingReportTitle(title || 'Informe Detallado');
            setLastGeneratedImage(null); // Clear image if report is coming

            const lastMsg = [...messages].reverse().find(m => m.role === 'assistant');
            if (lastMsg) setLastProcessedMessageId(lastMsg.id);
          } else {
            setIsExpectingNewReport(false);
          }
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const toggleRecording = () => {
    isListening ? stopListening() : startListening();
  };

  const handleToggleSpeak = useCallback((msg: Message) => {
    if (!msg.id) return;
    speak(msg.content, msg.id);
  }, [speak]);

  const handleSaveMemory = useCallback(async (msg: Message, customData?: { title: string, content: string, memory_category?: string, resource_type?: string }) => {
    if (!user?.id) return;

    // 1. Prepare data
    const title = customData?.title || (agents.find(a => a.id === msg.agent_id)?.name ? `Recuerdo de ${agents.find(a => a.id === msg.agent_id)?.name}` : 'Recuerdo de chat');
    const content = customData?.content || msg.content;
    const category = customData?.memory_category || 'Chat';
    const resourceType = customData?.resource_type || 'markdown';

    // 2. Generate embedding
    const embedding = await generateEmbedding(content + " " + title);

    // 3. Save
    await saveMemory({
      user_id: user.id,
      project_id: chat?.project_id || undefined,
      chat_id: chatId,
      title: title,
      content: content,
      resource_type: resourceType as any,
      memory_category: category,
      embedding: embedding || undefined,
      is_pinned: false,
      user_confirmed: true
    });
  }, [user?.id, chatId, chat?.project_id, agents, saveMemory]);

  const closeSidePanel = () => {
    setShowReport(false);
    setLastGeneratedImage(null);
  };

  const isSidePanelOpen = showReport || lastGeneratedImage;

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-white dark:bg-black md:m-2 md:rounded-2xl border-y md:border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative h-full min-h-0">

      {/* Main Chat Area */}
      <div className={clsx(
        "flex-1 flex flex-col min-h-0 min-w-0 transition-all duration-500",
        isSidePanelOpen ? "md:w-2/5 lg:w-1/2" : "w-full"
      )}>
        <header className="bg-black border-b border-slate-800 z-10 shrink-0">
          {/* Linked Chat Notification */}
          {chat?.linked_chat_id && (
            <div className="bg-[hsl(var(--color-primary)/0.15)] border-b border-[hsl(var(--color-primary)/0.3)] px-4 py-2 flex items-center justify-between animate-in slide-in-from-top duration-700">
               <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[hsl(var(--color-primary))] text-xs animate-pulse">link</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--color-primary))]">Vinculado con otro chat</span>
               </div>
               <NavLink to={`/chat/${chat.linked_chat_id}`} className="text-[9px] font-black uppercase tracking-widest text-white bg-[hsl(var(--color-primary))] px-3 py-1 rounded-full hover:scale-105 transition-transform flex items-center gap-1">
                  Ver chat vinculado
               </NavLink>
            </div>
          )}

          {/* Agent Images Bar */}
          <div className="flex items-center justify-start md:justify-center gap-4 md:gap-10 px-4 md:px-6 py-4 md:py-5 overflow-x-auto no-scrollbar">
            {agents.map((agent: Agent) => {
              const isActive = activeAgentId === agent.id;
              const isSpeaking = isActive && isThinking;
              const agentImages = AGENT_AVATAR_MAP[agent.name.toLowerCase()] || null;
              const imgSrc = agentImages
                ? (isActive ? agentImages.speaking : agentImages.silent)
                : agent.avatar_url;

              return (
                <div
                  key={agent.id}
                  className="flex flex-col items-center gap-2 transition-all duration-500 shrink-0"
                >
                  <div
                    className={clsx(
                      "relative w-12 h-12 md:w-20 md:h-20 rounded-full overflow-hidden transition-all duration-500 border-2 shrink-0",
                      isActive
                        ? "border-[hsl(var(--color-primary))] shadow-[0_0_20px_hsl(var(--color-primary)/0.4)] scale-110"
                        : "border-slate-700 grayscale opacity-50 hover:opacity-80 hover:grayscale-0"
                    )}
                    title={agent.name}
                  >
                    {imgSrc ? (
                      <img src={imgSrc} alt={agent.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-500 text-2xl">person</span>
                      </div>
                    )}
                    {isSpeaking && (
                      <div className="absolute inset-0 rounded-full border-2 border-[hsl(var(--color-primary))] animate-ping opacity-30"></div>
                    )}
                  </div>
                  <span className={clsx(
                    "text-[9px] md:text-[10px] font-bold uppercase tracking-widest transition-colors duration-500",
                    isActive ? "text-white" : "text-slate-600"
                  )}>
                    {agent.name}
                  </span>
                </div>
              );
            })}

            {/* Status indicator */}
            <div className="hidden md:flex flex-col items-center gap-1 ml-4 pl-6 border-l border-slate-800">
              <div className={clsx(
                "w-3 h-3 rounded-full transition-all",
                isThinking ? "bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.5)]" : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
              )}></div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                {isThinking ? 'Activo' : 'Listo'}
              </span>
            </div>
          </div>
        </header>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto w-full max-w-5xl mx-auto px-4 lg:px-6 py-6 lg:py-10 no-scrollbar scroll-smooth space-y-8 pb-32">
          
          {/* Low Balance Alert */}
          {wallet && wallet.balance < 100 && wallet.balance > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm mb-6">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-xs border border-amber-100">
                     <span className="material-symbols-outlined">warning</span>
                  </div>
                  <div>
                      <div className="text-sm font-bold text-amber-900 leading-none">Tu saldo es bajo ({wallet.balance} TR)</div>
                      <div className="text-xs text-amber-700 mt-1">Recarga ahora para seguir usando Radikal sin interrupciones.</div>
                  </div>
               </div>
               <NavLink to="/tokens">
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 border-none !text-white font-bold h-9">
                     Recargar
                  </Button>
               </NavLink>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-500">
                        <span className="material-symbols-outlined">error</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-red-900">Hubo un problema</p>
                        <p className="text-xs text-red-600">{error}</p>
                    </div>
                </div>
                <button 
                    onClick={clearError}
                    className="p-2 hover:bg-red-100 rounded-full text-red-400 transition-colors"
                >
                    <span className="material-symbols-outlined text-sm">close</span>
                </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <span className="material-symbols-outlined animate-spin text-[hsl(var(--color-primary))]">progress_activity</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
              <span className="material-symbols-outlined text-4xl">chat_bubble_outline</span>
              <p>Comienza una conversación estratégica...</p>
            </div>
          ) : (
            messages.map((msg: Message) => {
              const isReport = isMessageReport(msg);
              return (
                <ChatMessage
                  key={msg.id}
                  msg={msg}
                  isReport={isReport}
                  agents={agents}
                  activeAgentId={activeAgentId}
                  lastGeneratedImage={lastGeneratedImage}
                  isPlaying={isPlaying}
                  onOpenSidePanel={(url) => {
                    setLastGeneratedImage(url);
                    setShowReport(false);
                  }}
                  onToggleSpeak={handleToggleSpeak}
                  onSaveMemory={handleSaveMemory}
                  onSendMessage={handleSendMessage}
                  onOpenReport={(id) => {
                    setActiveReportId(id);
                    setShowReport(true);
                  }}
                  showReport={showReport && activeReportId === msg.id}
                  selectedAssets={selectedAssets}
                  onToggleAsset={handleToggleAsset}
                />
              );
            })
          )}

          {isThinking && (
            <div className="flex flex-col items-start animate-in slide-in-from-bottom-2 fade-in duration-500">
              {isExpectingNewReport ? (
                <div className="flex items-center gap-4 bg-white dark:bg-slate-900 px-5 py-4 rounded-2xl border-2 border-[hsl(var(--color-primary)/0.2)] shadow-xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[hsl(var(--color-primary)/0.02)] animate-pulse"></div>
                  <div className="relative z-10 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-[hsl(var(--color-primary))] bg-white shadow-lg animate-bounce">
                      <img src={KronosProfile} alt="Kronos" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--color-primary))]">Ejecutando Tarea</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Kronos está creando el informe...</span>
                    </div>
                    <div className="flex gap-1 ml-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--color-primary))] animate-bounce"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--color-primary))] animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--color-primary))] animate-bounce [animation-delay:-0.3s]"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-800 flex gap-2 items-center">
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]"></div>
                </div>
              )}
            </div>
          )}
          {showNexoSuggestion && (
            <div className="flex justify-center animate-in slide-in-from-bottom-4 fade-in duration-700 mt-4 mb-8">
              <div className="bg-white dark:bg-slate-900 border-2 border-[hsl(var(--color-primary)/0.3)] p-4 rounded-2xl shadow-xl flex flex-col items-center gap-3 max-w-sm text-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[hsl(var(--color-primary))] to-transparent"></div>
                <div className="w-12 h-12 bg-[hsl(var(--color-primary)/0.1)] rounded-full flex items-center justify-center text-[hsl(var(--color-primary))] group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl animate-pulse">auto_awesome</span>
                </div>
                <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white mb-1">¿Llevamos esto a Nexo?</h4>
                    <p className="text-[10px] text-slate-500 leading-tight">He detectado una idea visual. ¿Quieres enviársela a Nexo para que la materialice ahora mismo?</p>
                </div>
                <div className="flex gap-2 w-full">
                    <button 
                        onClick={() => setShowNexoSuggestion(false)}
                        className="flex-1 py-2 text-[9px] font-bold uppercase tracking-tight text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        Ahora no
                    </button>
                    <NavLink 
                        to={`/chat/${chat?.linked_chat_id}?initialMessage=${encodeURIComponent(`[TRANSFERENCIA_ESTRATEGICA] Hola Nexo, en mi otro chat de estrategia estamos hablando de esto: ${messages[messages.length-1].content.substring(0, 300)}... ¿Qué podemos crear?`)}`}
                        className="flex-1 py-2 bg-[hsl(var(--color-primary))] text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:shadow-md transition-all text-center"
                    >
                        Enviar a Nexo
                    </NavLink>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput
          onSendMessage={handleSendMessage}
          isSending={isSending}
          isThinking={isThinking}
          isListening={isListening}
          onToggleRecording={toggleRecording}
        />
      </div>

      {/* Unified Side Panel */}
      {isSidePanelOpen && (
        <div className="fixed inset-0 z-[60] md:relative md:inset-auto md:z-auto md:w-3/5 lg:w-1/2 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-black md:bg-slate-50/50 md:dark:bg-slate-900/50 flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden">
          {showReport ? (
            <ReportPanel
              content={currentReportContent}
              isThinking={isThinking && activeReportId === messages[messages.length - 1]?.id}
              onClose={() => setShowReport(false)}
            />
          ) : lastGeneratedImage ? (
            <div className="h-full flex flex-col">
              <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-black/80 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[hsl(var(--color-primary))]">auto_awesome</span>
                  <h2 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-widest">Visualización</h2>
                </div>
                <button
                  onClick={() => setLastGeneratedImage(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </header>
              <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col items-center gap-6">
                <div className="relative group w-full">
                  <img
                    src={lastGeneratedImage}
                    alt="Generado"
                    className="w-full rounded-2xl md:rounded-3xl shadow-2xl border-2 md:border-4 border-white dark:border-slate-800 hover:scale-[1.01] transition-transform duration-500 bg-black/5"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/600x400?text=Recurso+no+disponible";
                    }}
                  />
                </div>
                <div className="w-full bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">info</span>
                    Detalles del Recurso
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                    Este activo visual ha sido generado o identificado como relevante para tu estrategia de marca actual.
                  </p>
                  <div className="flex gap-2 md:gap-3">
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => window.open(lastGeneratedImage!, '_blank')}>Original</Button>
                    <a href={lastGeneratedImage!} download target="_blank" className="flex-1">
                      <Button size="sm" className="w-full text-xs">Descargar</Button>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
      
      <InsufficientTokensModal 
        isOpen={showTokensModal || false} 
        onClose={() => setShowTokensModal && setShowTokensModal(false)} 
        message={tokensErrorMsg} 
      />
    </div>
  );
};
