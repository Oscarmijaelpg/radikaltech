import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@radikal/ui';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/shared/ui/Toaster';
import { getInitials } from './utils';
import { useLogoBrightness } from '@/shared/hooks/useProjectLogo';
export function LogoBlock({ logo, companyName, projectId, }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const inputRef = useRef(null);
    const logoBrightness = useLogoBrightness(logo?.asset_url);
    const [uploading, setUploading] = useState(false);
    const onFile = async (file) => {
        if (!user)
            return;
        setUploading(true);
        try {
            const ext = file.name.split('.').pop() || 'png';
            const path = `${user.id}/brand/logo-${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('assets').upload(path, file, {
                cacheControl: '3600',
                upsert: false,
            });
            if (error)
                throw error;
            const { data: pub } = supabase.storage.from('assets').getPublicUrl(path);
            await api.post('/content', {
                project_id: projectId,
                asset_url: pub.publicUrl,
                asset_type: 'image',
                metadata: { source: 'manual_logo_upload', original_name: file.name, size: file.size },
            });
            // Tag manualmente como 'logo' (el endpoint acepta tags via PATCH)
            const list = await api.get(`/content?project_id=${projectId}&type=image&limit=5`);
            const latest = list.data.find((a) => a.asset_url === pub.publicUrl);
            if (latest) {
                await api.patch(`/content/${latest.id}`, {
                    tags: ['logo', 'manual_upload'],
                    ai_description: 'Logo subido manualmente',
                });
            }
            await queryClient.invalidateQueries({ queryKey: ['content', 'list', projectId] });
            toast({
                variant: 'success',
                title: 'Logo actualizado',
                description: 'El logo se subió correctamente.',
            });
        }
        catch {
            toast({
                variant: 'error',
                title: 'Error',
                description: 'No pudimos subir el logo. Intenta de nuevo.',
            });
        }
        finally {
            setUploading(false);
        }
    };
    return (_jsxs("div", { className: "shrink-0 flex flex-col items-center gap-2", children: [_jsxs("button", { type: "button", onClick: () => inputRef.current?.click(), disabled: uploading, className: "group relative w-24 h-24 sm:w-32 sm:h-32 rounded-3xl overflow-hidden shadow-2xl transition-transform hover:scale-[1.02] disabled:opacity-60", "aria-label": logo ? 'Reemplazar logo' : 'Subir logo', children: [logo ? (_jsx("div", { className: "w-full h-full grid place-items-center border-2 border-slate-200 rounded-3xl transition-colors", style: {
                            backgroundColor: logoBrightness === 'light' ? '#1e293b' : logoBrightness === 'dark' ? '#ffffff' : '#f1f5f9',
                        }, children: _jsx("img", { src: logo.asset_url, alt: "Logo", className: "max-w-full max-h-full object-contain p-3", style: { filter: logoBrightness === 'light' ? 'drop-shadow(0 1px 4px rgba(255,255,255,0.3))' : 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))' } }) })) : (_jsx("div", { className: "w-full h-full bg-gradient-to-br from-pink-500 to-cyan-500 grid place-items-center text-white font-display font-black text-2xl sm:text-4xl", children: getInitials(companyName) })), _jsx("div", { className: "absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center text-white", children: uploading ? (_jsx(Spinner, {})) : (_jsxs("div", { className: "flex flex-col items-center gap-1", children: [_jsx("span", { className: "material-symbols-outlined text-[24px]", children: "upload" }), _jsx("span", { className: "text-xs font-bold", children: logo ? 'Reemplazar' : 'Subir logo' })] })) })] }), _jsx("input", { ref: inputRef, type: "file", accept: "image/*", className: "hidden", onChange: (e) => {
                    const f = e.target.files?.[0];
                    if (f)
                        void onFile(f);
                    e.target.value = '';
                } }), !logo && (_jsx("p", { className: "text-[10px] text-slate-500 font-medium", children: "Haz click para subirlo" }))] }));
}
