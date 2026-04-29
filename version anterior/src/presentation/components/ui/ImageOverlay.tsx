import React from 'react';
import { Modal } from './Modal';
import clsx from 'clsx';

interface ImageOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrls: string[]; // Changed to array
    title: string;
    content: string;
    showNexo?: boolean;
    onDelete?: () => void;
    isModifying?: boolean;
    onContinueToChat?: (imageUrl: string) => void;
}

const NEXO_AVATAR = "https://i.ibb.co/0RHH3JLc/Nexo-hablando.png";

export const ImageOverlay: React.FC<ImageOverlayProps> = ({
    isOpen,
    onClose,
    imageUrls,
    title,
    content,
    showNexo = false,
    onDelete,
    onContinueToChat,
    isModifying = false,
}) => {
    const [currentIndex, setCurrentIndex] = React.useState(0);

    // Reset index when images change
    React.useEffect(() => {
        setCurrentIndex(0);
    }, [imageUrls]);

    const imageUrl = imageUrls[currentIndex] || imageUrls[0] || '';

    const handleDownload = async () => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${title.replace(/\s+/g, '_')}_${currentIndex + 1}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading image:', error);
        }
    };

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % imageUrls.length);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
    };


    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="6xl" className="bg-slate-50">
            <div className="flex flex-col gap-6">
                {showNexo && (
                    <div className="flex items-center gap-4 animate-in slide-in-from-left duration-500">
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[hsl(var(--color-primary))] shadow-lg bg-white shrink-0">
                            <img src={NEXO_AVATAR} alt="Nexo" className="w-full h-full object-cover" />
                        </div>
                        <div className="bg-white p-5 rounded-[2rem] rounded-tl-none border border-slate-200 shadow-sm relative max-w-sm">
                            <div className="absolute top-0 -left-2 w-0 h-0 border-t-[10px] border-t-transparent border-r-[15px] border-r-white border-b-[10px] border-b-transparent"></div>
                            <p className="text-base font-black text-slate-900 uppercase tracking-tight">
                                {isModifying ? '¡Ajustando la visión! 🎨' : '¡Aquí está tu imagen! ✨'}
                            </p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                {isModifying ? 'Nexo está aplicando los cambios...' : 'Nexo ha materializado tu idea'}
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="flex flex-col gap-4">
                        <div className="relative group bg-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white aspect-square flex items-center justify-center">
                            {isModifying ? (
                                <div className="absolute inset-0 bg-white/40 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-4">
                                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Refinando...</span>
                                </div>
                            ) : null}

                            <img
                                src={imageUrl}
                                alt={title}
                                className="w-full h-full object-contain"
                            />
                            
                            {imageUrls.length > 1 && (
                                <>
                                    <button 
                                        onClick={prevImage}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-primary hover:text-white text-slate-900 w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all z-10"
                                    >
                                        <span className="material-symbols-outlined">chevron_left</span>
                                    </button>
                                    <button 
                                        onClick={nextImage}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-primary hover:text-white text-slate-900 w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all z-10"
                                    >
                                        <span className="material-symbols-outlined">chevron_right</span>
                                    </button>
                                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full flex gap-2 z-10">
                                        {imageUrls.map((_, i) => (
                                            <div 
                                                key={i} 
                                                className={clsx(
                                                    "w-2 h-2 rounded-full transition-all",
                                                    i === currentIndex ? "bg-white w-4" : "bg-white/30"
                                                )}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}

                            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    onClick={handleDownload}
                                    className="bg-white text-black px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-[hsl(var(--color-primary))] hover:text-white transition-all shadow-xl flex items-center gap-2 active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-base">download</span>
                                    Descargar
                                </button>
                            </div>
                        </div>
                        
                        {/* Refinement Shortcut */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[hsl(var(--color-primary))] pl-2">¿Necesitas ajustes quirúrgicos?</h4>
                            <button
                                onClick={() => onContinueToChat?.(imageUrl)}
                                className="w-full flex items-center justify-between p-6 bg-[hsl(var(--color-primary)/0.05)] border-2 border-[hsl(var(--color-primary)/0.2)] rounded-[2rem] hover:bg-[hsl(var(--color-primary)/0.1)] hover:border-[hsl(var(--color-primary))] transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-[hsl(var(--color-primary))]">chat_paste_go</span>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Refinar con Nexo en Chat</p>
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Ajustes inteligentes y assets de marca</p>
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-[hsl(var(--color-primary))] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col h-full bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-y-auto max-h-[70vh] custom-scrollbar">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="px-3 py-1 bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary))] text-[9px] font-black uppercase tracking-widest rounded-full">Materializado con Nexo</span>
                                {imageUrls.length > 1 && (
                                    <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest rounded-full">Carrusel ({currentIndex + 1}/{imageUrls.length})</span>
                                )}
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-6 tracking-tighter uppercase leading-tight">
                                {title}
                            </h2>
                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-3">Idea Estratégica</p>
                                <p className="text-slate-700 leading-relaxed font-medium italic text-sm">
                                    "{content.replace(/Idea de Nexo:|Prompts:/g, '').trim()}"
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 flex flex-col gap-3">
                            <button
                                onClick={() => onContinueToChat?.(imageUrl)}
                                className="w-full bg-[hsl(var(--color-primary))] text-white py-5 rounded-xl font-black uppercase tracking-widest text-[11px] hover:brightness-110 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95"
                            >
                                <span className="material-symbols-outlined text-lg">edit_square</span>
                                Ajustar en Chat
                            </button>
                            <button
                                onClick={handleDownload}
                                className="w-full bg-slate-900 text-white py-5 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95"
                            >
                                <span className="material-symbols-outlined text-lg">download</span>
                                Descargar Activo Visual
                            </button>
                            {onDelete && (
                                <button
                                    onClick={() => {
                                        if (window.confirm('¿Estás seguro de que deseas eliminar esta imagen permanentemente del banco y de la base de datos?')) {
                                            onDelete();
                                        }
                                    }}
                                    className="w-full bg-rose-50 text-rose-600 py-5 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-rose-100 transition-all border border-rose-100 flex items-center justify-center gap-3 active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                    Eliminar Imagen
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="w-full bg-white text-slate-400 py-5 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-50 transition-all border border-slate-100 active:scale-95"
                            >
                                Volver al Banco
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
