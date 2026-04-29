
import React, { useRef, useState } from 'react';
import { Button } from './ui/Button';

interface ChatInputProps {
    onSendMessage: (content: string, imageUrl?: string) => void;
    isSending: boolean;
    isThinking: boolean;
    isListening: boolean;
    onToggleRecording: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    onSendMessage,
    isSending,
    isThinking,
    isListening,
    onToggleRecording
}) => {
    const [inputValue, setInputValue] = useState('');
    const [attachedImage, setAttachedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSend = () => {
        if ((!inputValue.trim() && !attachedImage) || isSending || isThinking) return;
        onSendMessage(inputValue, attachedImage || undefined);
        setInputValue('');
        setAttachedImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("La imagen es demasiado grande. Máximo 5MB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto w-full">
            {attachedImage && (
                <div className="mb-3 flex animate-in slide-in-from-bottom-4 duration-300">
                    <div className="relative group">
                        <img src={attachedImage} className="w-24 h-24 object-cover rounded-xl border-2 border-[hsl(var(--color-primary))] shadow-lg" alt="Preview" />
                        <button
                            onClick={() => setAttachedImage(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[12px] font-bold">close</span>
                        </button>
                    </div>
                </div>
            )}

            <div className="relative bg-white border border-slate-200 rounded-2xl shadow-xl p-3 flex items-center gap-2 focus-within:ring-2 focus-within:ring-[hsl(var(--color-primary)/0.3)] transition-all">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                />
                <Button
                    variant="ghost"
                    size="sm"
                    icon={<span className="material-symbols-outlined">attach_file</span>}
                    onClick={() => fileInputRef.current?.click()}
                />
                <input
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-800 outline-none disabled:opacity-50"
                    placeholder={isThinking ? "Escribiendo..." : "Escribe un mensaje..."}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    onPaste={(e) => {
                        const items = e.clipboardData?.items;
                        if (!items) return;
                        for (let i = 0; i < items.length; i++) {
                            if (items[i].type.indexOf('image') !== -1) {
                                const file = items[i].getAsFile();
                                if (file) {
                                    if (file.size > 5 * 1024 * 1024) {
                                        alert("La imagen pegada es demasiado grande. Máximo 5MB.");
                                        return;
                                    }
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        setAttachedImage(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }
                        }
                    }}
                    disabled={isSending || isThinking}
                />
                {isListening && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-50 rounded-full border border-red-100 ">
                        <div className="flex gap-0.5">
                            <span className="w-1 h-3 bg-red-500 rounded-full animate-[bounce_1s_infinite]"></span>
                            <span className="w-1 h-4 bg-red-500 rounded-full animate-[bounce_1s_infinite_0.1s]"></span>
                            <span className="w-1 h-2 bg-red-500 rounded-full animate-[bounce_1s_infinite_0.2s]"></span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Escuchando</span>
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    className={`w-10 h-10 p-0 rounded-full transition-all duration-300 ${isListening ? 'bg-red-500 text-white shadow-lg shadow-red-200 scale-110' : 'text-slate-400 hover:bg-slate-100'}`}
                    icon={<span className="material-symbols-outlined text-xl">{isListening ? 'stop' : 'mic'}</span>}
                    onClick={onToggleRecording}
                    disabled={isSending || isThinking}
                />
                <Button
                    size="sm"
                    className="w-9 h-9 p-0 rounded-xl"
                    icon={<span className="material-symbols-outlined text-sm">{isSending || isThinking ? 'hourglass_empty' : 'arrow_upward'}</span>}
                    onClick={handleSend}
                    disabled={isSending || isThinking || (!inputValue.trim() && !attachedImage)}
                />
            </div>
        </div>
    );
};
