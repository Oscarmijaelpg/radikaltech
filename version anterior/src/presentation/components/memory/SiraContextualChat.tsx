import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import SiraImage from '../../../media/Sira.webp';
import { useAuth } from '../../context/AuthContext';
import { callOpenRouterStreaming } from '../../../infrastructure/services/OpenRouterService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface SiraContextualChatProps {
    isOpen: boolean;
    isMinimized: boolean;
    onClose: () => void;
    onMinimize: () => void;
    onRestore: () => void;
    contextType: 'news' | 'competition';
    contextData: string;
    contextId?: string;
    onUpdateNews?: (topic?: string) => void;
    onCreateReport?: (userMessage: string) => void;
}

export const SiraContextualChat: React.FC<SiraContextualChatProps> = ({
    isOpen,
    isMinimized,
    onClose,
    onMinimize,
    onRestore,
    contextType,
    contextData,
    contextId = 'general',
    onUpdateNews,
    onCreateReport
}) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [lastContextId, setLastContextId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Reset chat ONLY if contextId changes (different report)
    useEffect(() => {
        if (isOpen && contextId !== lastContextId) {
            setMessages([]);
            setHasStarted(false);
            setInputValue('');
            setIsThinking(false);
            setLastContextId(contextId);
        }
    }, [contextId, isOpen, lastContextId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen && !hasStarted && !isMinimized) {
            const isSpecificAnalysis = contextData.includes('[ENFOQUE ESPECÍFICO');
            if (isSpecificAnalysis) {
                setMessages([{ role: 'assistant', content: "Analizando contenido... Dame un momento para darte mi opinión estratégica." }]);
                setTimeout(() => {
                    handleSendMessage("Dame tu opinión estratégica de este contenido.");
                }, 500);
            } else {
                const initialMessage = contextType === 'news'
                    ? "¡Hola! Soy Sira. He revisado las noticias de tu sector con mis protocolos avanzados. ¿Quieres profundizar en algún impacto estratégico?"
                    : "¡Hola! Soy Sira. He procesado el análisis competitivo con mi sistema de inteligencia superior. ¿Qué aspecto de tu competencia te gustaría desglosar?";
                setMessages([{ role: 'assistant', content: initialMessage }]);
            }
            setHasStarted(true);
        }
    }, [isOpen, hasStarted, contextType, contextData, contextId, isMinimized]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking]);

    const handleSendMessage = async (manualMsg?: string) => {
        const messageToSend = manualMsg || inputValue;
        if (!messageToSend.trim() || isThinking) return;

        const userMsg = messageToSend.trim();
        if (!manualMsg) setInputValue('');

        // NUEVO: Detección de intención para informes
        const userMsgLower = userMsg.toLowerCase();
        const isReportRequest = (userMsgLower.includes('informe') || 
                                userMsgLower.includes('reporte') || 
                                userMsgLower.includes('análisis a fondo') || 
                                (userMsgLower.includes('analiza') && userMsgLower.includes('profundidad')));

        if (isReportRequest && onCreateReport) {
            // Si es un informe, no lo procesamos aquí con Sira. Lo mandamos a la nueva tarea.
            setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
            setIsThinking(true);
            
            setTimeout(() => {
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: "¡Excelente! Entiendo que necesitas un análisis estratégico profundo. **Mis sistemas están configurando una nueva tarea especializada** para que **Kronos** genere este informe con el máximo rigor técnico. Nos vemos en el nuevo chat en un momento..." 
                }]);
                setIsThinking(false);
                
                // Ejecutamos la creación del reporte después de un pequeño delay para que el usuario lea el mensaje
                setTimeout(() => {
                    onCreateReport(userMsg);
                }, 2000);
            }, 500);
            return;
        }

        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsThinking(true);

        const systemPrompt = `
      Eres Sira, la experta en mercado de Radikal IA, operando bajo protocolos de máxima profundidad.
      Tu tono debe ser profesional y estratégico. Estás conversando sobre ${contextType === 'news' ? 'Noticias' : 'Competencia'}.
      
      INSTRUCCIONES CRÍTICAS:
      1. USAR DATOS REALES: Tienes acceso a métricas, informes y datos de redes sociales en la sección CONTEXTO abajo. ÚSALOS para responder de forma técnica y específica.
      2. PROHIBIDO PEDIR DATOS: No digas que necesitas acceso o que el usuario te proporcione datos si la información ya está en el CONTEXTO. 
      3. Solo activa la búsqueda de noticias nuevas si el usuario lo pide EXPLÍCITAMENTE (ej: "busca noticias sobre...", "actualiza noticias").
      4. Para activar búsqueda, añade ÚNICAMENTE al final de tu respuesta: <search_news query="tema solicitado" />.
      5. Mantén respuestas con gran profundidad técnica, McKinsey-style, y analítica.
      6. IDIOMA: SIEMPRE ESPAÑOL.
      
      CONTEXTO:
      ---
      ${contextData.substring(0, 15000)}
      ---
    `;

        try {
            const fullMessages = [
                { role: 'system' as const, content: systemPrompt },
                ...messages.map(m => ({ role: m.role, content: m.content })),
                { role: 'user' as const, content: userMsg }
            ];

            let accumulatedContent = '';

            await callOpenRouterStreaming('openai/gpt-4o-mini', fullMessages, (chunk) => {
                setIsThinking(false);
                accumulatedContent += chunk;
                
                if (accumulatedContent.includes('<search_news')) {
                  const match = accumulatedContent.match(/<search_news\s+query=["'](.*?)["']\s*\/>/);
                  if (match && onUpdateNews) {
                      const query = match[1];
                      const cleanContent = accumulatedContent.replace(/<search_news.*?\/>/g, '').trim();
                      onUpdateNews(query);
                      accumulatedContent = cleanContent + "\n\n¡Entendido! Mis sistemas han activado el rastreo de inteligencia en tiempo real para localizar novedades estratégicas de *" + query + "*. El informe de Kronos se actualizará automáticamente.";
                  }
                }

                setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last.role === 'assistant' && (prev.length > (messages.length + 1))) {
                        return [...prev.slice(0, -1), { role: 'assistant', content: accumulatedContent }];
                    } else {
                        return [...prev, { role: 'assistant', content: accumulatedContent }];
                    }
                });
            });
        } catch (error) {
            console.error('Error in Sira chat:', error);
            setIsThinking(false);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: "Lo siento, he tenido un inconveniente técnico temporal. Por favor, intenta de nuevo ahora o en unos segundos." 
            }]);
        }
    };

    if (!isOpen || isMinimized) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-end p-4 md:p-8 pointer-events-none">
            {/* Backdrop to allow interaction with background when minimized (not active here) */}
            {/* The side panel itself is pointer-events-auto */}
            <div className="w-full md:w-[450px] lg:w-[500px] h-[85vh] bg-white rounded-[2.5rem] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.3)] border border-slate-200 flex flex-col overflow-hidden pointer-events-auto animate-in slide-in-from-right-10 duration-500">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl border-2 border-[hsl(var(--color-primary))] overflow-hidden bg-white shadow-sm">
                            <img src={SiraImage} alt="Sira" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Sira Intelligence</h3>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">En línea</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={onMinimize}
                            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <span className="material-symbols-outlined text-xl">remove</span>
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>
                </div>

                {/* Chat content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-slate-50/30">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            <div className={`flex items-end gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                {msg.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-full border border-[hsl(var(--color-primary))] overflow-hidden flex-shrink-0 bg-white shadow-sm">
                                        <img src={SiraImage} alt="Sira" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <div className={`px-4 py-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-[hsl(var(--color-primary)/0.1)] text-slate-900 border border-[hsl(var(--color-primary)/0.2)] shadow-sm rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-bl-none'}`}>
                                    <div className="prose prose-sm max-w-none prose-slate">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex justify-start">
                            <div className="flex items-end gap-3">
                                <div className="w-8 h-8 rounded-full border border-[hsl(var(--color-primary))] overflow-hidden bg-white">
                                    <img src={SiraImage} alt="Sira" className="w-full h-full object-cover" />
                                </div>
                                <div className="bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex gap-1">
                                        <div className="w-1 h-1 rounded-full bg-[hsl(var(--color-primary))] animate-bounce"></div>
                                        <div className="w-1 h-1 rounded-full bg-[hsl(var(--color-primary))] animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1 h-1 rounded-full bg-[hsl(var(--color-primary))] animate-bounce [animation-delay:-0.3s]"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 bg-white border-t border-slate-100">
                    <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 focus-within:border-[hsl(var(--color-primary)/0.5)] focus-within:ring-4 focus-within:ring-[hsl(var(--color-primary)/0.05)] transition-all">
                        <input
                            type="text"
                            placeholder="Haz una pregunta estratégica..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
                        />
                        <button 
                            onClick={() => handleSendMessage()} 
                            disabled={!inputValue.trim() || isThinking}
                            className="w-10 h-10 rounded-xl bg-[hsl(var(--color-primary))] text-white flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all shadow-lg shadow-[hsl(var(--color-primary)/0.2)]"
                        >
                            <span className="material-symbols-outlined text-xl">send</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
