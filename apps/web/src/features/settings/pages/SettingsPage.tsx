import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Card,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  RadioGroup,
  RadioGroupItem,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner,
} from '@radikal/ui';
import { useToast } from '@/shared/ui/Toaster';
import { useAuth } from '@/providers/AuthProvider';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

type NotifPrefs = {
  enabled: boolean;
  scheduled_reports: boolean;
  high_impact_news: boolean;
  jobs_completed: boolean;
  new_recommendations: boolean;
};

const DEFAULT_NOTIF: NotifPrefs = {
  enabled: true,
  scheduled_reports: true,
  high_impact_news: true,
  jobs_completed: true,
  new_recommendations: true,
};

const NOTIF_KEY = 'radikal:notification_preferences';
const COLOR_KEY = 'radikal:color_primary';
const DENSITY_KEY = 'radikal:density';
const DARKMODE_KEY = 'radikal:dark_mode';

const COLOR_PRESETS = [
  { id: 'pink', label: 'Rosa', hsl: '335 82% 58%', hex: '#ec4899' },
  { id: 'blue', label: 'Azul', hsl: '217 91% 60%', hex: '#3b82f6' },
  { id: 'green', label: 'Verde', hsl: '160 84% 39%', hex: '#10b981' },
  { id: 'violet', label: 'Violeta', hsl: '262 83% 58%', hex: '#8b5cf6' },
];

function loadNotif(): NotifPrefs {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (!raw) return DEFAULT_NOTIF;
    return { ...DEFAULT_NOTIF, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIF;
  }
}

export function SettingsPage() {
  return (
    <div className="min-h-full bg-gradient-to-br from-pink-50/40 via-white to-cyan-50/40">
      <div className="px-4 sm:px-6 md:px-8 pt-3 pb-1 max-w-5xl mx-auto flex items-center gap-1.5 text-[11px] text-slate-500">
        <span className="material-symbols-outlined text-[14px] text-[hsl(var(--color-primary))]">settings</span>
        <span className="font-semibold">Configurar</span>
        <span className="opacity-40">›</span>
        <span>Ajustes</span>
      </div>
      <div className="p-4 sm:p-6 md:p-8 pt-2 max-w-5xl mx-auto">
        <header className="mb-6 md:mb-8 relative overflow-hidden rounded-[20px] sm:rounded-[28px] md:rounded-[32px] bg-gradient-to-br from-slate-700 to-slate-900 p-4 sm:p-6 md:p-10 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10 flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm grid place-items-center shrink-0">
              <span className="material-symbols-outlined text-[24px] sm:text-[32px]">settings</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1 sm:mb-2">Cuenta</p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black tracking-tight">Ajustes</h1>
              <p className="text-white/70 mt-2">Personaliza tu experiencia en Radikal.</p>
            </div>
          </div>
        </header>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="flex-wrap overflow-x-auto">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
            <TabsTrigger value="appearance">Apariencia</TabsTrigger>
            <TabsTrigger value="security">Seguridad</TabsTrigger>
            <TabsTrigger value="data">Datos</TabsTrigger>
          </TabsList>

          <TabsContent value="profile"><ProfileTab /></TabsContent>
          <TabsContent value="notifications"><NotificationsTab /></TabsContent>
          <TabsContent value="appearance"><AppearanceTab /></TabsContent>
          <TabsContent value="security"><SecurityTab /></TabsContent>
          <TabsContent value="data"><DataTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ProfileTab() {
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
            <span className="material-symbols-outlined text-slate-400 text-[32px]">person</span>
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

function NotificationsTab() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotifPrefs>(() => loadNotif());

  const update = (patch: Partial<NotifPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
  };

  const save = () => {
    // TODO: persistir en profile.notification_preferences (jsonb) — requiere migración Prisma.
    toast({ title: 'Preferencias guardadas', description: 'Tus notificaciones fueron actualizadas.', variant: 'success' });
  };

  const disabled = !prefs.enabled;

  return (
    <Card className="p-4 sm:p-6 md:p-8 space-y-5">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <p className="font-bold text-slate-900">Notificaciones en la plataforma</p>
          <p className="text-sm text-slate-500">Activa o desactiva todas las notificaciones</p>
        </div>
        <Switch checked={prefs.enabled} onCheckedChange={(v) => update({ enabled: v })} />
      </div>

      {[
        { key: 'scheduled_reports' as const, title: 'Reportes programados', desc: 'Cuando se genera un reporte' },
        { key: 'high_impact_news' as const, title: 'Noticias de alto impacto', desc: 'Noticias relevantes para tu sector' },
        { key: 'jobs_completed' as const, title: 'Trabajos completados', desc: 'Cuando termina un análisis o generación' },
        { key: 'new_recommendations' as const, title: 'Sugerencias nuevas', desc: 'Nuevas ideas recomendadas por IA' },
      ].map((row) => (
        <div key={row.key} className="flex items-center justify-between gap-4 py-2">
          <div className={disabled ? 'opacity-50' : ''}>
            <p className="font-semibold text-slate-800">{row.title}</p>
            <p className="text-sm text-slate-500">{row.desc}</p>
          </div>
          <Switch
            checked={prefs[row.key]}
            onCheckedChange={(v) => update({ [row.key]: v })}
            disabled={disabled}
          />
        </div>
      ))}

      <div className="flex justify-end pt-2">
        <Button onClick={save}>Guardar preferencias</Button>
      </div>
    </Card>
  );
}

function applyColor(hsl: string) {
  document.documentElement.style.setProperty('--color-primary', hsl);
}

function applyDensity(density: 'compact' | 'comfortable') {
  document.documentElement.dataset.density = density;
}

function AppearanceTab() {
  const { toast } = useToast();
  const [color, setColor] = useState(() => {
    try {
      return localStorage.getItem(COLOR_KEY) ?? 'pink';
    } catch {
      return 'pink';
    }
  });
  const [density, setDensity] = useState<'compact' | 'comfortable'>(() => {
    try {
      return (localStorage.getItem(DENSITY_KEY) as 'compact' | 'comfortable' | null) ?? 'comfortable';
    } catch {
      return 'comfortable';
    }
  });
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem(DARKMODE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const preset = COLOR_PRESETS.find((c) => c.id === color);
    if (preset) applyColor(preset.hsl);
    try {
      localStorage.setItem(COLOR_KEY, color);
    } catch {
      /* noop */
    }
  }, [color]);

  useEffect(() => {
    applyDensity(density);
    try {
      localStorage.setItem(DENSITY_KEY, density);
    } catch {
      /* noop */
    }
  }, [density]);

  const toggleDark = (v: boolean) => {
    setDarkMode(v);
    // Si el DS soporta dark mode con clase 'dark':
    document.documentElement.classList.toggle('dark', v);
    try {
      localStorage.setItem(DARKMODE_KEY, v ? '1' : '0');
    } catch {
      /* noop */
    }
    toast({
      title: v ? 'Modo oscuro activado' : 'Modo claro activado',
      description: 'Algunas secciones pueden verse incompletas — integración total en progreso.',
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6 md:p-8 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900">Modo oscuro</h3>
          <p className="text-sm text-slate-500">Cambia el tema de la interfaz</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-800">Activar modo oscuro</p>
            <p className="text-xs text-slate-500">
              {/* TODO: cuando dark mode esté completo en el DS, quitar este aviso */}
              Funcionalidad en progreso — integración completa próximamente
            </p>
          </div>
          <Switch checked={darkMode} onCheckedChange={toggleDark} />
        </div>
      </Card>

      <Card className="p-4 sm:p-6 md:p-8 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900">Color principal</h3>
          <p className="text-sm text-slate-500">Elige el color de acento para toda la app</p>
        </div>
        <RadioGroup value={color} onValueChange={setColor} className="grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
          {COLOR_PRESETS.map((preset) => (
            <label
              key={preset.id}
              htmlFor={`color-${preset.id}`}
              className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                color === preset.id ? 'border-[hsl(var(--color-primary))] bg-slate-50' : 'border-slate-200'
              }`}
            >
              <RadioGroupItem id={`color-${preset.id}`} value={preset.id} />
              <span
                className="w-6 h-6 rounded-full shrink-0 border border-white shadow"
                style={{ backgroundColor: preset.hex }}
              />
              <span className="font-semibold text-sm">{preset.label}</span>
            </label>
          ))}
        </RadioGroup>
      </Card>

      <Card className="p-4 sm:p-6 md:p-8 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900">Densidad</h3>
          <p className="text-sm text-slate-500">Espaciado general de la interfaz</p>
        </div>
        <RadioGroup
          value={density}
          onValueChange={(v) => setDensity(v as 'compact' | 'comfortable')}
          className="grid-cols-1 sm:grid-cols-2"
        >
          {[
            { id: 'comfortable', label: 'Cómoda', desc: 'Más espacio, recomendada' },
            { id: 'compact', label: 'Compacta', desc: 'Más contenido visible' },
          ].map((opt) => (
            <label
              key={opt.id}
              htmlFor={`density-${opt.id}`}
              className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                density === opt.id ? 'border-[hsl(var(--color-primary))] bg-slate-50' : 'border-slate-200'
              }`}
            >
              <RadioGroupItem id={`density-${opt.id}`} value={opt.id} />
              <span>
                <span className="block font-semibold text-sm">{opt.label}</span>
                <span className="block text-xs text-slate-500">{opt.desc}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </Card>
    </div>
  );
}

function SecurityTab() {
  const { toast } = useToast();
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{ email?: string; created_at?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionInfo({
          email: data.session.user.email ?? undefined,
          created_at: new Date(data.session.user.created_at ?? Date.now()).toLocaleString('es'),
        });
      }
    });
  }, []);

  const changePassword = async () => {
    if (newPass.length < 8) {
      toast({ title: 'Password muy corto', description: 'Mínimo 8 caracteres', variant: 'error' });
      return;
    }
    if (newPass !== confirm) {
      toast({ title: 'No coincide', description: 'Confirma la misma contraseña', variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      toast({ title: 'Contraseña actualizada', variant: 'success' });
      setNewPass('');
      setConfirm('');
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo actualizar',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6 md:p-8 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900">Cambiar contraseña</h3>
          <p className="text-sm text-slate-500">Mínimo 8 caracteres</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="new-pass">Nueva contraseña</Label>
            <Input id="new-pass" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pass">Confirmar</Label>
            <Input id="confirm-pass" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={changePassword} disabled={saving || !newPass || !confirm}>
            {saving ? <Spinner size="sm" /> : 'Actualizar contraseña'}
          </Button>
        </div>
      </Card>

      <Card className="p-4 sm:p-6 md:p-8 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900">Sesión activa</h3>
          <p className="text-sm text-slate-500">Dispositivo donde estás conectado ahora</p>
        </div>
        {sessionInfo ? (
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50">
            <span className="material-symbols-outlined text-slate-500">devices</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{sessionInfo.email}</p>
              <p className="text-xs text-slate-500">Cuenta desde {sessionInfo.created_at}</p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-white">
              Activa
            </span>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Sin sesión detectada</p>
        )}
        <div className="pt-2">
          <Button
            variant="outline"
            onClick={() =>
              toast({
                title: 'Acción no disponible',
                description:
                  'Requiere rotación global de JWT. Próximamente podrás cerrar todas las sesiones desde aquí.',
                variant: 'warning',
              })
            }
          >
            Cerrar sesión en todos los dispositivos
          </Button>
        </div>
      </Card>
    </div>
  );
}

function DataTab() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const exportData = async () => {
    setExporting(true);
    try {
      const res = await api.get<{ data: unknown }>('/users/me/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `radikal-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Descarga iniciada', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo exportar',
        variant: 'error',
      });
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete('/users/me');
      await signOut();
      navigate('/auth');
      toast({ title: 'Cuenta eliminada', description: 'Tu cuenta y datos fueron borrados.' });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'No se pudo eliminar',
        variant: 'error',
      });
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6 md:p-8 space-y-4">
        <div>
          <h3 className="font-bold text-slate-900">Exportar mis datos</h3>
          <p className="text-sm text-slate-500">
            Descarga todos tus proyectos, memorias, reportes y chats en formato JSON.
          </p>
        </div>
        <Button onClick={exportData} disabled={exporting}>
          {exporting ? <Spinner size="sm" /> : 'Descargar JSON'}
        </Button>
      </Card>

      <Card className="p-4 sm:p-6 md:p-8 space-y-4 border-red-200">
        <div>
          <h3 className="font-bold text-red-600">Eliminar mi cuenta</h3>
          <p className="text-sm text-slate-500">
            Esta acción es permanente. Perderás todos tus proyectos, contenidos y análisis.
          </p>
        </div>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          Eliminar cuenta
        </Button>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar tu cuenta?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Para confirmar, escribe <strong>ELIMINAR</strong> abajo.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Escribe ELIMINAR"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== 'ELIMINAR' || deleting}
              onClick={deleteAccount}
            >
              {deleting ? <Spinner size="sm" /> : 'Sí, eliminar todo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
