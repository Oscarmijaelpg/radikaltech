import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Icon,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@radikal/ui';
import { useToast } from '@/shared/ui/Toaster';
import { useAuth } from '@/providers/AuthProvider';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export function ProfileTab() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [language, setLanguage] = useState(profile?.language ?? 'es');
  const [avatar, setAvatar] = useState<string | null>(profile?.avatar_url ?? null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setLanguage(profile?.language ?? 'es');
    setAvatar(profile?.avatar_url ?? null);
  }, [profile]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/users/me', {
        full_name: fullName,
        locale: language,
        ...(avatar ? { avatar_url: avatar } : {}),
      });
      await refreshProfile();
      toast({ title: 'Perfil actualizado', description: 'Tus cambios se guardaron correctamente.', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Error al guardar',
        description: err instanceof Error ? err.message : 'Intenta de nuevo',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'png';
      const path = `${profile.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatar(data.publicUrl);
      toast({ title: 'Avatar subido', description: 'No olvides guardar los cambios.', variant: 'success' });
    } catch (err) {
      toast({
        title: 'No se pudo subir',
        description: err instanceof Error ? err.message : 'Verifica que el bucket "avatars" exista',
        variant: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-4 sm:p-6 md:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-slate-100 grid place-items-center overflow-hidden border border-slate-200">
          {avatar ? (
            <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <Icon name="person" className="text-slate-400 text-[32px]" />
          )}
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Spinner size="sm" /> : 'Cambiar avatar'}
          </Button>
          <p className="text-[11px] text-slate-500 mt-1">PNG o JPG, máx 2MB</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="full_name">Nombre completo</Label>
        <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tu nombre" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={profile?.email ?? ''} readOnly disabled />
      </div>

      <div className="space-y-2">
        <Label htmlFor="language">Idioma</Label>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger id="language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="es">Español</SelectItem>
            <SelectItem value="en">English (próximamente)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Spinner size="sm" /> : 'Guardar cambios'}
        </Button>
      </div>
    </Card>
  );
}
