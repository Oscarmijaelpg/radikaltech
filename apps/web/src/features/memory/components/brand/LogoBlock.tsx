import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Icon,
  Spinner,
} from '@radikal/ui';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/shared/ui/Toaster';
import { getInitials, type ContentAssetLite } from './utils';
import { useLogoBrightness } from '@/shared/hooks/useProjectLogo';

export function LogoBlock({
  logo,
  candidates,
  companyName,
  projectId,
}: {
  logo: ContentAssetLite | null;
  candidates?: ContentAssetLite[];
  companyName: string;
  projectId: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const logoBrightness = useLogoBrightness(logo?.asset_url);
  const [uploading, setUploading] = useState(false);

  const onFile = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${user.id}/brand/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('assets').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from('assets').getPublicUrl(path);

      await api.post('/content', {
        project_id: projectId,
        asset_url: pub.publicUrl,
        asset_type: 'image',
        metadata: { source: 'manual_logo_upload', original_name: file.name, size: file.size },
      });

      // Tag manualmente como 'logo' (el endpoint acepta tags via PATCH)
      const list = await api.get<{ data: ContentAssetLite[] }>(
        `/content?project_id=${projectId}&type=image&limit=5`,
      );
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
    } catch {
      toast({
        variant: 'error',
        title: 'Error',
        description: 'No pudimos subir el logo. Intenta de nuevo.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="shrink-0 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative w-24 h-24 sm:w-32 sm:h-32 rounded-3xl overflow-hidden shadow-2xl transition-transform hover:scale-[1.02] disabled:opacity-60"
        aria-label={logo ? 'Reemplazar logo' : 'Subir logo'}
      >
        {logo ? (
          <div
            className="w-full h-full grid place-items-center border-2 border-slate-200 rounded-3xl transition-colors"
            style={{
              backgroundColor: logoBrightness === 'light' ? '#1e293b' : logoBrightness === 'dark' ? '#ffffff' : '#f1f5f9',
            }}
          >
            <img
              src={logo.asset_url}
              alt="Logo"
              className="max-w-full max-h-full object-contain p-3"
              style={{ filter: logoBrightness === 'light' ? 'drop-shadow(0 1px 4px rgba(255,255,255,0.3))' : 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))' }}
            />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-pink-500 to-cyan-500 grid place-items-center text-white font-display font-black text-2xl sm:text-4xl">
            {getInitials(companyName)}
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center text-white">
          {uploading ? (
            <Spinner />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Icon name="upload" className="text-[24px]" />
              <span className="text-xs font-bold">{logo ? 'Reemplazar' : 'Subir logo'}</span>
            </div>
          )}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = '';
        }}
      />
      {!logo && (
        <p className="text-[10px] text-slate-500 font-medium">Haz click para subirlo</p>
      )}

      {candidates && candidates.length > 0 && (
        <div className="mt-4 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <p className="text-xs font-semibold text-slate-500">¿Es alguno de estos tu logo?</p>
          <div className="flex flex-wrap justify-center gap-2">
            {candidates.map((c) => (
              <button
                key={c.id}
                onClick={async () => {
                  try {
                    // Remove 'logo' tag from current logo if exists
                    if (logo) {
                      await api.patch(`/content/${logo.id}`, { tags: logo.tags?.filter(t => t !== 'logo') });
                    }
                    // Add 'logo' tag to candidate
                    await api.patch(`/content/${c.id}`, { tags: [...(c.tags || []), 'logo'].filter(t => t !== 'logo_candidate') });
                    await queryClient.invalidateQueries({ queryKey: ['content', 'list', projectId] });
                    toast({ variant: 'success', title: 'Logo actualizado', description: 'Has seleccionado un nuevo logo.' });
                  } catch {
                    toast({ variant: 'error', title: 'Error', description: 'No se pudo actualizar el logo.' });
                  }
                }}
                className="w-12 h-12 bg-white rounded-lg shadow border border-slate-200 overflow-hidden hover:scale-110 hover:border-pink-500 hover:shadow-pink-500/20 transition-all cursor-pointer p-1"
                title="Seleccionar como logo principal"
              >
                <img src={c.asset_url} alt="Candidato" className="w-full h-full object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
