
import React, { memo, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import { Message, Agent } from '../../core/domain/entities';
import { useAuth } from '../context/AuthContext';
import { useProjectContext } from '../context/ProjectContext';
import { useChat } from '../hooks/useChat';
import { useNavigate } from 'react-router-dom';
import { generateImageContextSummary } from '../../infrastructure/services/OpenAIService';

const RedirectButton = ({ objectiveId, objectiveName, chatId }: { objectiveId: string, objectiveName: string, chatId?: string }) => {
    const { user } = useAuth();
    const { activeProject } = useProjectContext();
    const { createChat, linkChats, messages } = useChat(chatId);
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);

    const handleRedirect = async () => {
        if (!user || !activeProject) return;
        setIsCreating(true);
        try {
            // 1. Generate summary of the conversation if it's for Nexo
            let summary = "";
            if (objectiveName.toLowerCase().includes('nexo') || objectiveName.toLowerCase().includes('contenido')) {
                summary = await generateImageContextSummary(messages) || "";
            }

            // 2. Create the new chat
            const newChat = await createChat({
                userId: user.id,
                projectId: activeProject.id,
                objectiveId,
                title: objectiveName
            });

            // 3. Link chats if we are in an existing chat
            if (chatId) {
                await linkChats(chatId, newChat.id);
            }

            // 4. If we have a summary, navigate with it as an initial message
            if (summary) {
                const initialMsg = `[TRANSFERENCIA_CONTEXTO] Vengo del otro chat con esta visión: ${summary}\n\nAyúdame a materializarla.`;
                navigate(`/chat/${newChat.id}?initialMessage=${encodeURIComponent(initialMsg)}`);
            } else {
                navigate(`/chat/${newChat.id}`);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <button
            onClick={handleRedirect}
            disabled={isCreating}
            className="w-full sm:w-auto px-5 py-3 bg-[hsl(var(--color-primary))] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 mt-2"
        >
            <span className="material-symbols-outlined text-base">{isCreating ? 'hourglass_empty' : 'rocket_launch'}</span>
            {isCreating ? 'Creando Entorno...' : `Ir a ${objectiveName}`}
        </button>
    );
};

interface ChatMessageProps {
    msg: Message;
    agents: Agent[];
    activeAgentId: string | null;
    lastGeneratedImage: string | null;
    isPlaying: string | null;
    onOpenSidePanel: (url: string) => void;
    onToggleSpeak: (msg: Message) => void;
    onOpenReport?: (messageId: string) => void;
    onSaveMemory?: (msg: Message, customData?: any) => Promise<void>;
    onSendMessage?: (content: string) => void;
    showReport?: boolean;
    isReport?: boolean;
    selectedAssets?: Set<string>;
    onToggleAsset?: (url: string) => void;
}


export const ChatMessage = memo(({
    msg,
    agents,
    activeAgentId,
    lastGeneratedImage,
    isPlaying,
    onOpenSidePanel,
    onToggleSpeak,
    onOpenReport,
    onSaveMemory,
    onSendMessage,
    showReport,
    isReport,
    selectedAssets,
    onToggleAsset
}: ChatMessageProps) => {
    const [isSaved, setIsSaved] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const isAssistant = msg.role === 'assistant';
    const agent = isAssistant ? agents.find(a => a.id === msg.agent_id) : null;
    
    const markdownOptions = useMemo(() => ({
        img: ({ className, node, ...props }: any) => {
            if (!props.src) return null;
            const isNexo = agent?.name.toLowerCase() === 'nexo';

            // If NOT nexo, render a standard image without selection or brand reference labels
            if (!isNexo) {
                return (
                    <div className="my-4">
                        <img
                            {...props}
                            className={clsx("w-full h-auto rounded-xl border border-slate-200 shadow-sm transition-all", className)}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://placehold.co/600x400?text=Error+al+cargar+imagen`;
                            }}
                        />
                    </div>
                );
            }

            const isSelected = selectedAssets?.has(props.src);
            
            return (
                <div className="flex flex-col gap-2 mt-4 mb-4 items-center sm:items-start group/img">
                    <div 
                        onClick={() => onToggleAsset?.(props.src)}
                        className={clsx(
                            "relative overflow-hidden rounded-xl border-2 transition-all duration-300 shadow-sm bg-slate-50 cursor-pointer max-w-[150px] md:max-w-[200px]",
                            isSelected 
                                ? "border-[hsl(var(--color-primary))] ring-4 ring-[hsl(var(--color-primary)/0.1)] scale-105 z-10" 
                                : "border-slate-200 grayscale-[0.3] opacity-80 hover:opacity-100 hover:grayscale-0 hover:border-[hsl(var(--color-primary)/0.3)]"
                        )}
                    >
                        <img
                            {...props}
                            className={clsx("w-full h-auto block mx-auto", className)}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://placehold.co/600x400?text=Error+al+cargar+imagen`;
                            }}
                        />
                        {isSelected && (
                            <div className="absolute top-1 right-1 bg-[hsl(var(--color-primary))] text-white p-0.5 rounded-full shadow-lg scale-75">
                                <span className="material-symbols-outlined text-xs font-black">check</span>
                            </div>
                        )}
                        
                        {!isSelected && (
                           <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/5 flex items-center justify-center transition-all">
                               <span className="material-symbols-outlined text-white opacity-0 group-hover/img:opacity-100 drop-shadow-md">add_circle</span>
                           </div>
                        )}
                    </div>
                    <span className={clsx(
                        "text-[9px] font-bold uppercase tracking-widest ml-1 transition-colors",
                        isSelected ? "text-[hsl(var(--color-primary))]" : "text-slate-400"
                    )}>
                        {isSelected ? 'Seleccionado para Nexo' : 'Referencia de Marca'}
                    </span>
                </div>
            );
        },
        p: ({ children, className, node, ...props }: any) => {
            const hasImage = React.Children.toArray(children).some(
                (child: any) => child?.type === 'div' || (child?.props && child.props.node?.tagName === 'img')
            );
            if (hasImage) return <div className={clsx("mb-2 last:mb-0", className)}>{children}</div>;
            return <p className={clsx("mb-2 last:mb-0", className)} {...props}>{children}</p>;
        },
        a: ({ children, href, className, node, ...props }: any) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className={clsx("text-[hsl(var(--color-primary))] hover:underline font-bold", className)} {...props}>
                {children}
            </a>
        )
    }), [selectedAssets, onToggleAsset]);

    return (
        <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 fade-in duration-500 w-full`}>
            {isAssistant && msg.agent_id && (
                <div className="mb-1.5 ml-1 flex items-center gap-2">
                    <div className={clsx(
                        "w-8 h-8 rounded-full overflow-hidden border-2 transition-all duration-300 shadow-sm bg-slate-100 ",
                        activeAgentId === msg.agent_id
                            ? "border-[hsl(var(--color-primary))] ring-2 ring-[hsl(var(--color-primary)/0.15)]"
                            : "border-white "
                    )}>
                        {agent?.avatar_url ? (
                            <img
                                src={agent.avatar_url}
                                alt={agent?.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-[16px] text-slate-400">person</span>
                            </div>
                        )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        {agent?.name || 'Agente'}
                    </span>
                </div>
            )}
            <div className={`px-4 py-2.5 md:px-5 md:py-3 rounded-2xl max-w-[90%] md:max-w-[85%] shadow-sm relative group transition-all break-words [overflow-wrap:anywhere] ${msg.role === 'user'
                ? 'bg-[hsl(var(--color-primary)/0.1)] text-slate-800 rounded-tr-none border border-[hsl(var(--color-primary)/0.2)]'
                : 'bg-slate-50 text-slate-700 rounded-tl-none border border-slate-200'
                }`}>
                {msg.image_url && (
                    <div className="mb-3 flex flex-col gap-3">
                        <div className="rounded-xl overflow-hidden border border-white/20 shadow-md w-fit bg-black/5 ">
                            <img
                                src={msg.image_url}
                                alt="Adjunto"
                                className="max-w-full max-h-[300px] object-contain cursor-zoom-in block"
                                onClick={() => onOpenSidePanel(msg.image_url!)}
                            />
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onOpenSidePanel(msg.image_url!);
                            }}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 border rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all w-fit shadow-sm",
                                lastGeneratedImage === msg.image_url
                                    ? "bg-[hsl(var(--color-primary))] border-[hsl(var(--color-primary))] text-white shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.3)]"
                                    : "bg-white border-slate-200 text-slate-600 hover:border-[hsl(var(--color-primary))] hover:text-[hsl(var(--color-primary))]"
                            )}
                        >
                            <span className="material-symbols-outlined text-sm">
                                {lastGeneratedImage === msg.image_url ? 'visibility' : 'splitscreen'}
                            </span>
                            {lastGeneratedImage === msg.image_url ? 'Visualizando' : 'Abrir en panel lateral'}
                        </button>
                    </div>
                )}
                <div className="text-sm markdown-content">
                    {(() => {
                        const content = msg.content.trim();
                        const isMessageReportLocal = isReport || content.includes('<report_data>') || content.includes('```json') ||
                            (content.startsWith('# ') && content.includes('\n---') && content.includes('## '));

                        if (isMessageReportLocal) {
                            // Extract title if possible
                            const firstLine = content.split('\n')[0];
                            const reportTitle = firstLine.startsWith('# ') ? firstLine.replace('# ', '').trim() : 'Informe Estratégico';

                            // Extract a summary (approx first two lines of non-markdown text)
                            const cleanLines = content.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('-') && !l.startsWith('`') && !l.startsWith('{'));
                            const summary = cleanLines.slice(0, 2).join(' ') || 'Análisis detallado de mercado y estrategia generado por Radikal IA.';

                            return (
                                <div className="flex flex-col gap-4 py-2">
                                    <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-[hsl(var(--color-primary)/0.1)] shadow-sm">
                                        <div className="w-12 h-12 rounded-xl bg-[hsl(var(--color-primary)/0.1)] flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-[hsl(var(--color-primary))] text-2xl">description</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 mb-1">{reportTitle}</h4>
                                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                                {summary}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onOpenReport?.(msg.id)}
                                        className={clsx(
                                            "flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                                            showReport
                                                ? "bg-[hsl(var(--color-primary))] text-white shadow-lg"
                                                : "bg-white text-[hsl(var(--color-primary))] border border-[hsl(var(--color-primary)/0.2)] hover:bg-[hsl(var(--color-primary)/0.05)]"
                                        )}
                                    >
                                        <span className="material-symbols-outlined text-lg">visibility</span>
                                        Ver Informe Completo
                                    </button>
                                </div>
                            );
                        }

                        const processContent = (text: string) => {
                            return text
                                .replace(/<image_proposal\s*\/?>/gi, '')
                                .replace(/\[USER_SELECTED_ASSETS:\s*.*?\]/gs, '')
                                .replace(/<redirect\s+objective="[^"]+"\s+name="[^"]+"\s*\/?>/gi, '')
                                .replace(/<redirect\s+objective="[^"]+"\s+name="[^"]+">[\s\S]*?<\/redirect>/gi, '')
                                .replace(/<\/redirect>/gi, '')
                                .trim();
                        };

                        const hasImageProposal = content.includes('<image_proposal');
                        if (hasImageProposal) {
                            const isNexo = agent?.name.toLowerCase() === 'nexo';

                            if (!isNexo) {
                                return (
                                    <div className="flex flex-col gap-4 py-2">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={markdownOptions}
                                        >
                                            {processContent(content)}
                                        </ReactMarkdown>
                                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm flex items-start gap-4">
                                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm border border-amber-100 shrink-0">
                                                <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 mb-1">Capacidad exclusiva de Nexo</h4>
                                                <p className="text-xs text-slate-500 leading-relaxed italic">
                                                    "Sira y otros agentes analizan tu marca, pero solo Nexo puede materializar tus visiones apegándose a tus referentes o en modo creativo."
                                                </p>
                                            </div>
                                        </div>
                                        <RedirectButton 
                                            objectiveId="c96bb25d-9519-42f7-bb83-160be8f48b5b" 
                                            objectiveName="Creación de Contenido" 
                                            chatId={msg.chat_id}
                                        />
                                    </div>
                                );
                            }

                            return (
                                <>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={markdownOptions}
                                    >
                                        {processContent(content)}
                                    </ReactMarkdown>
                                    <div className="flex flex-col sm:flex-row gap-3 mt-4 animate-in fade-in slide-in-from-top-2">
                                        <button
                                            onClick={() => onSendMessage?.("Genérala en Modo Apegado al Referente")}
                                            className="flex-1 px-4 py-3 bg-[hsl(var(--color-primary))] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-sm">filter_center_focus</span>
                                            Apegado al Referente
                                        </button>
                                        <button
                                            onClick={() => onSendMessage?.("Genérala en Modo Creativo")}
                                            className="flex-1 px-4 py-3 bg-white border-2 border-[hsl(var(--color-primary))] text-[hsl(var(--color-primary))] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[hsl(var(--color-primary)/0.05)] transition-all flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                            Modo Creativo
                                        </button>
                                    </div>
                                </>
                            );
                        }

                        const redirectTagRegex = /<redirect\s+objective="([^"]+)"\s+name="([^"]+)"\s*\/?>/i;
                        const wrappedRedirectRegex = /<redirect\s+objective="([^"]+)"\s+name="([^"]+)">([\s\S]*?)<\/redirect>/i;
                        
                        const redirectMatch = content.match(wrappedRedirectRegex) || content.match(redirectTagRegex);
                        
                        if (redirectMatch) {
                            // Extract ID and Name (they are in positions 1 and 2 in both regexes)
                            const [fullTag, objId, objName] = redirectMatch;
                            const innerMsg = (redirectMatch.length > 3) ? redirectMatch[3] : null;

                            // Clean the content to show only the message part
                            const cleanDisplaymsg = innerMsg 
                                ? innerMsg.trim() 
                                : content.replace(redirectTagRegex, '').replace(/<\/redirect>/gi, '').trim();

                            return (
                                <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={markdownOptions}
                                    >
                                        {cleanDisplaymsg}
                                    </ReactMarkdown>
                                    <RedirectButton objectiveId={objId} objectiveName={objName} chatId={msg.chat_id} />
                                </div>
                            );
                        }

                        return (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={markdownOptions}
                            >
                                {processContent(content)}
                            </ReactMarkdown>
                        );
                    })()}
                </div>

                <button
                    onClick={() => onToggleSpeak(msg)}
                    className={`
                        absolute -bottom-3 right-2 md:-right-2 w-8 h-8 flex items-center justify-center rounded-full shadow-lg transition-all duration-300 transform z-10
                        ${isPlaying === msg.id
                            ? 'bg-[hsl(var(--color-primary))] text-white scale-110 rotate-0 opacity-100'
                            : 'bg-white text-slate-400 hover:text-[hsl(var(--color-primary))] opacity-100 md:opacity-0 md:group-hover:opacity-100 scale-90 md:hover:scale-100'}
                    `}
                    title={isPlaying === msg.id ? "Detener" : "Escuchar"}
                >
                    <span className="material-symbols-outlined text-[18px]">
                        {isPlaying === msg.id ? 'stop' : 'volume_up'}
                    </span>
                    {isPlaying === msg.id && (
                        <span className="absolute inset-0 rounded-full animate-ping bg-[hsl(var(--color-primary))] opacity-25"></span>
                    )}
                </button>

                {isAssistant && (
                    <button
                        onClick={async () => {
                            if (onSaveMemory && !isSaving && !isSaved) {
                                setIsSaving(true);
                                try {
                                    await onSaveMemory(msg);
                                    setIsSaved(true);
                                    setTimeout(() => setIsSaved(false), 3000);
                                } catch (error) {
                                    console.error("Error saving to memory:", error);
                                } finally {
                                    setIsSaving(false);
                                }
                            }
                        }}
                        className={`
                            absolute -bottom-3 right-12 md:-right-12 w-8 h-8 flex items-center justify-center rounded-full shadow-lg transition-all duration-300 transform z-10
                            ${isSaved
                                ? 'bg-emerald-500 text-white scale-110 opacity-100'
                                : isSaving
                                    ? 'bg-amber-400 text-white animate-pulse opacity-100'
                                    : 'bg-white text-slate-400 hover:text-[hsl(var(--color-primary))] opacity-100 md:opacity-0 md:group-hover:opacity-100 scale-90 md:hover:scale-100'}
                        `}
                        title={isSaved ? "Guardado" : "Guardar en memoria"}
                        disabled={isSaving || isSaved}
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            {isSaved ? 'check_circle' : isSaving ? 'hourglass_empty' : 'psychology'}
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Only re-render if content, status or generated image reference or selection changes
    return (
        prevProps.msg.content === nextProps.msg.content &&
        prevProps.msg.image_url === nextProps.msg.image_url &&
        prevProps.activeAgentId === nextProps.activeAgentId &&
        prevProps.isPlaying === nextProps.isPlaying &&
        prevProps.lastGeneratedImage === nextProps.lastGeneratedImage &&
        prevProps.selectedAssets === nextProps.selectedAssets
    );
});
