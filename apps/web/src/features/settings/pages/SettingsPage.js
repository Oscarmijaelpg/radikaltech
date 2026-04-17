import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Button, Card, Input, Label, Tabs, TabsContent, TabsList, TabsTrigger, Switch, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, RadioGroup, RadioGroupItem, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Spinner, } from '@radikal/ui';
import { useToast } from '@/shared/ui/Toaster';
import { useAuth } from '@/providers/AuthProvider';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
const DEFAULT_NOTIF = {
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
function loadNotif() {
    try {
        const raw = localStorage.getItem(NOTIF_KEY);
        if (!raw)
            return DEFAULT_NOTIF;
        return { ...DEFAULT_NOTIF, ...JSON.parse(raw) };
    }
    catch {
        return DEFAULT_NOTIF;
    }
}
export function SettingsPage() {
    return (_jsxs("div", { className: "min-h-full bg-gradient-to-br from-pink-50/40 via-white to-cyan-50/40", children: [_jsxs("div", { className: "px-4 sm:px-6 md:px-8 pt-3 pb-1 max-w-5xl mx-auto flex items-center gap-1.5 text-[11px] text-slate-500", children: [_jsx("span", { className: "material-symbols-outlined text-[14px] text-[hsl(var(--color-primary))]", children: "settings" }), _jsx("span", { className: "font-semibold", children: "Configurar" }), _jsx("span", { className: "opacity-40", children: "\u203A" }), _jsx("span", { children: "Ajustes" })] }), _jsxs("div", { className: "p-4 sm:p-6 md:p-8 pt-2 max-w-5xl mx-auto", children: [_jsxs("header", { className: "mb-6 md:mb-8 relative overflow-hidden rounded-[20px] sm:rounded-[28px] md:rounded-[32px] bg-gradient-to-br from-slate-700 to-slate-900 p-4 sm:p-6 md:p-10 text-white shadow-2xl", children: [_jsx("div", { className: "absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" }), _jsxs("div", { className: "relative z-10 flex items-center gap-3 sm:gap-4", children: [_jsx("div", { className: "w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-sm grid place-items-center shrink-0", children: _jsx("span", { className: "material-symbols-outlined text-[24px] sm:text-[32px]", children: "settings" }) }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest opacity-80 mb-1 sm:mb-2", children: "Cuenta" }), _jsx("h1", { className: "text-2xl sm:text-3xl md:text-4xl font-display font-black tracking-tight", children: "Ajustes" }), _jsx("p", { className: "text-white/70 mt-2", children: "Personaliza tu experiencia en Radikal." })] })] })] }), _jsxs(Tabs, { defaultValue: "profile", className: "w-full", children: [_jsxs(TabsList, { className: "flex-wrap overflow-x-auto", children: [_jsx(TabsTrigger, { value: "profile", children: "Perfil" }), _jsx(TabsTrigger, { value: "notifications", children: "Notificaciones" }), _jsx(TabsTrigger, { value: "appearance", children: "Apariencia" }), _jsx(TabsTrigger, { value: "security", children: "Seguridad" }), _jsx(TabsTrigger, { value: "data", children: "Datos" })] }), _jsx(TabsContent, { value: "profile", children: _jsx(ProfileTab, {}) }), _jsx(TabsContent, { value: "notifications", children: _jsx(NotificationsTab, {}) }), _jsx(TabsContent, { value: "appearance", children: _jsx(AppearanceTab, {}) }), _jsx(TabsContent, { value: "security", children: _jsx(SecurityTab, {}) }), _jsx(TabsContent, { value: "data", children: _jsx(DataTab, {}) })] })] })] }));
}
function ProfileTab() {
    const { profile, refreshProfile } = useAuth();
    const { toast } = useToast();
    const [fullName, setFullName] = useState(profile?.full_name ?? '');
    const [language, setLanguage] = useState(profile?.language ?? 'es');
    const [avatar, setAvatar] = useState(profile?.avatar_url ?? null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef(null);
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
        }
        catch (err) {
            toast({
                title: 'Error al guardar',
                description: err instanceof Error ? err.message : 'Intenta de nuevo',
                variant: 'error',
            });
        }
        finally {
            setSaving(false);
        }
    };
    const onFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !profile)
            return;
        setUploading(true);
        try {
            const ext = file.name.split('.').pop() ?? 'png';
            const path = `${profile.id}/${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
            if (error)
                throw error;
            const { data } = supabase.storage.from('avatars').getPublicUrl(path);
            setAvatar(data.publicUrl);
            toast({ title: 'Avatar subido', description: 'No olvides guardar los cambios.', variant: 'success' });
        }
        catch (err) {
            toast({
                title: 'No se pudo subir',
                description: err instanceof Error ? err.message : 'Verifica que el bucket "avatars" exista',
                variant: 'error',
            });
        }
        finally {
            setUploading(false);
        }
    };
    return (_jsxs(Card, { className: "p-4 sm:p-6 md:p-8 space-y-6", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "w-20 h-20 rounded-2xl bg-slate-100 grid place-items-center overflow-hidden border border-slate-200", children: avatar ? (_jsx("img", { src: avatar, alt: "Avatar", className: "w-full h-full object-cover" })) : (_jsx("span", { className: "material-symbols-outlined text-slate-400 text-[32px]", children: "person" })) }), _jsxs("div", { children: [_jsx("input", { ref: fileRef, type: "file", accept: "image/*", onChange: onFile, className: "hidden" }), _jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: () => fileRef.current?.click(), disabled: uploading, children: uploading ? _jsx(Spinner, { size: "sm" }) : 'Cambiar avatar' }), _jsx("p", { className: "text-[11px] text-slate-500 mt-1", children: "PNG o JPG, m\u00E1x 2MB" })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "full_name", children: "Nombre completo" }), _jsx(Input, { id: "full_name", value: fullName, onChange: (e) => setFullName(e.target.value), placeholder: "Tu nombre" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "email", children: "Email" }), _jsx(Input, { id: "email", value: profile?.email ?? '', readOnly: true, disabled: true })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "language", children: "Idioma" }), _jsxs(Select, { value: language, onValueChange: setLanguage, children: [_jsx(SelectTrigger, { id: "language", children: _jsx(SelectValue, {}) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "es", children: "Espa\u00F1ol" }), _jsx(SelectItem, { value: "en", children: "English (pr\u00F3ximamente)" })] })] })] }), _jsx("div", { className: "flex justify-end", children: _jsx(Button, { onClick: save, disabled: saving, children: saving ? _jsx(Spinner, { size: "sm" }) : 'Guardar cambios' }) })] }));
}
function NotificationsTab() {
    const { toast } = useToast();
    const [prefs, setPrefs] = useState(() => loadNotif());
    const update = (patch) => {
        const next = { ...prefs, ...patch };
        setPrefs(next);
        try {
            localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
        }
        catch {
            /* noop */
        }
    };
    const save = () => {
        // TODO: persistir en profile.notification_preferences (jsonb) — requiere migración Prisma.
        toast({ title: 'Preferencias guardadas', description: 'Tus notificaciones fueron actualizadas.', variant: 'success' });
    };
    const disabled = !prefs.enabled;
    return (_jsxs(Card, { className: "p-4 sm:p-6 md:p-8 space-y-5", children: [_jsxs("div", { className: "flex items-center justify-between gap-4 pb-4 border-b border-slate-100", children: [_jsxs("div", { children: [_jsx("p", { className: "font-bold text-slate-900", children: "Notificaciones en la plataforma" }), _jsx("p", { className: "text-sm text-slate-500", children: "Activa o desactiva todas las notificaciones" })] }), _jsx(Switch, { checked: prefs.enabled, onCheckedChange: (v) => update({ enabled: v }) })] }), [
                { key: 'scheduled_reports', title: 'Reportes programados', desc: 'Cuando se genera un reporte' },
                { key: 'high_impact_news', title: 'Noticias de alto impacto', desc: 'Noticias relevantes para tu sector' },
                { key: 'jobs_completed', title: 'Trabajos completados', desc: 'Cuando termina un análisis o generación' },
                { key: 'new_recommendations', title: 'Sugerencias nuevas', desc: 'Nuevas ideas recomendadas por IA' },
            ].map((row) => (_jsxs("div", { className: "flex items-center justify-between gap-4 py-2", children: [_jsxs("div", { className: disabled ? 'opacity-50' : '', children: [_jsx("p", { className: "font-semibold text-slate-800", children: row.title }), _jsx("p", { className: "text-sm text-slate-500", children: row.desc })] }), _jsx(Switch, { checked: prefs[row.key], onCheckedChange: (v) => update({ [row.key]: v }), disabled: disabled })] }, row.key))), _jsx("div", { className: "flex justify-end pt-2", children: _jsx(Button, { onClick: save, children: "Guardar preferencias" }) })] }));
}
function applyColor(hsl) {
    document.documentElement.style.setProperty('--color-primary', hsl);
}
function applyDensity(density) {
    document.documentElement.dataset.density = density;
}
function AppearanceTab() {
    const { toast } = useToast();
    const [color, setColor] = useState(() => {
        try {
            return localStorage.getItem(COLOR_KEY) ?? 'pink';
        }
        catch {
            return 'pink';
        }
    });
    const [density, setDensity] = useState(() => {
        try {
            return localStorage.getItem(DENSITY_KEY) ?? 'comfortable';
        }
        catch {
            return 'comfortable';
        }
    });
    const [darkMode, setDarkMode] = useState(() => {
        try {
            return localStorage.getItem(DARKMODE_KEY) === '1';
        }
        catch {
            return false;
        }
    });
    useEffect(() => {
        const preset = COLOR_PRESETS.find((c) => c.id === color);
        if (preset)
            applyColor(preset.hsl);
        try {
            localStorage.setItem(COLOR_KEY, color);
        }
        catch {
            /* noop */
        }
    }, [color]);
    useEffect(() => {
        applyDensity(density);
        try {
            localStorage.setItem(DENSITY_KEY, density);
        }
        catch {
            /* noop */
        }
    }, [density]);
    const toggleDark = (v) => {
        setDarkMode(v);
        // Si el DS soporta dark mode con clase 'dark':
        document.documentElement.classList.toggle('dark', v);
        try {
            localStorage.setItem(DARKMODE_KEY, v ? '1' : '0');
        }
        catch {
            /* noop */
        }
        toast({
            title: v ? 'Modo oscuro activado' : 'Modo claro activado',
            description: 'Algunas secciones pueden verse incompletas — integración total en progreso.',
        });
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs(Card, { className: "p-4 sm:p-6 md:p-8 space-y-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-bold text-slate-900", children: "Modo oscuro" }), _jsx("p", { className: "text-sm text-slate-500", children: "Cambia el tema de la interfaz" })] }), _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold text-slate-800", children: "Activar modo oscuro" }), _jsx("p", { className: "text-xs text-slate-500", children: "Funcionalidad en progreso \u2014 integraci\u00F3n completa pr\u00F3ximamente" })] }), _jsx(Switch, { checked: darkMode, onCheckedChange: toggleDark })] })] }), _jsxs(Card, { className: "p-4 sm:p-6 md:p-8 space-y-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-bold text-slate-900", children: "Color principal" }), _jsx("p", { className: "text-sm text-slate-500", children: "Elige el color de acento para toda la app" })] }), _jsx(RadioGroup, { value: color, onValueChange: setColor, className: "grid-cols-1 sm:grid-cols-2 md:grid-cols-4", children: COLOR_PRESETS.map((preset) => (_jsxs("label", { htmlFor: `color-${preset.id}`, className: `flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${color === preset.id ? 'border-[hsl(var(--color-primary))] bg-slate-50' : 'border-slate-200'}`, children: [_jsx(RadioGroupItem, { id: `color-${preset.id}`, value: preset.id }), _jsx("span", { className: "w-6 h-6 rounded-full shrink-0 border border-white shadow", style: { backgroundColor: preset.hex } }), _jsx("span", { className: "font-semibold text-sm", children: preset.label })] }, preset.id))) })] }), _jsxs(Card, { className: "p-4 sm:p-6 md:p-8 space-y-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-bold text-slate-900", children: "Densidad" }), _jsx("p", { className: "text-sm text-slate-500", children: "Espaciado general de la interfaz" })] }), _jsx(RadioGroup, { value: density, onValueChange: (v) => setDensity(v), className: "grid-cols-1 sm:grid-cols-2", children: [
                            { id: 'comfortable', label: 'Cómoda', desc: 'Más espacio, recomendada' },
                            { id: 'compact', label: 'Compacta', desc: 'Más contenido visible' },
                        ].map((opt) => (_jsxs("label", { htmlFor: `density-${opt.id}`, className: `flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${density === opt.id ? 'border-[hsl(var(--color-primary))] bg-slate-50' : 'border-slate-200'}`, children: [_jsx(RadioGroupItem, { id: `density-${opt.id}`, value: opt.id }), _jsxs("span", { children: [_jsx("span", { className: "block font-semibold text-sm", children: opt.label }), _jsx("span", { className: "block text-xs text-slate-500", children: opt.desc })] })] }, opt.id))) })] })] }));
}
function SecurityTab() {
    const { toast } = useToast();
    const [newPass, setNewPass] = useState('');
    const [confirm, setConfirm] = useState('');
    const [saving, setSaving] = useState(false);
    const [sessionInfo, setSessionInfo] = useState(null);
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
            if (error)
                throw error;
            toast({ title: 'Contraseña actualizada', variant: 'success' });
            setNewPass('');
            setConfirm('');
        }
        catch (err) {
            toast({
                title: 'Error',
                description: err instanceof Error ? err.message : 'No se pudo actualizar',
                variant: 'error',
            });
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs(Card, { className: "p-4 sm:p-6 md:p-8 space-y-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-bold text-slate-900", children: "Cambiar contrase\u00F1a" }), _jsx("p", { className: "text-sm text-slate-500", children: "M\u00EDnimo 8 caracteres" })] }), _jsxs("div", { className: "grid md:grid-cols-2 gap-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "new-pass", children: "Nueva contrase\u00F1a" }), _jsx(Input, { id: "new-pass", type: "password", value: newPass, onChange: (e) => setNewPass(e.target.value) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "confirm-pass", children: "Confirmar" }), _jsx(Input, { id: "confirm-pass", type: "password", value: confirm, onChange: (e) => setConfirm(e.target.value) })] })] }), _jsx("div", { className: "flex justify-end", children: _jsx(Button, { onClick: changePassword, disabled: saving || !newPass || !confirm, children: saving ? _jsx(Spinner, { size: "sm" }) : 'Actualizar contraseña' }) })] }), _jsxs(Card, { className: "p-4 sm:p-6 md:p-8 space-y-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-bold text-slate-900", children: "Sesi\u00F3n activa" }), _jsx("p", { className: "text-sm text-slate-500", children: "Dispositivo donde est\u00E1s conectado ahora" })] }), sessionInfo ? (_jsxs("div", { className: "flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50", children: [_jsx("span", { className: "material-symbols-outlined text-slate-500", children: "devices" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-semibold text-sm truncate", children: sessionInfo.email }), _jsxs("p", { className: "text-xs text-slate-500", children: ["Cuenta desde ", sessionInfo.created_at] })] }), _jsx("span", { className: "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-white", children: "Activa" })] })) : (_jsx("p", { className: "text-sm text-slate-400", children: "Sin sesi\u00F3n detectada" })), _jsx("div", { className: "pt-2", children: _jsx(Button, { variant: "outline", onClick: () => toast({
                                title: 'Acción no disponible',
                                description: 'Requiere rotación global de JWT. Próximamente podrás cerrar todas las sesiones desde aquí.',
                                variant: 'warning',
                            }), children: "Cerrar sesi\u00F3n en todos los dispositivos" }) })] })] }));
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
            const res = await api.get('/users/me/export');
            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `radikal-export-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast({ title: 'Descarga iniciada', variant: 'success' });
        }
        catch (err) {
            toast({
                title: 'Error',
                description: err instanceof Error ? err.message : 'No se pudo exportar',
                variant: 'error',
            });
        }
        finally {
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
        }
        catch (err) {
            toast({
                title: 'Error',
                description: err instanceof Error ? err.message : 'No se pudo eliminar',
                variant: 'error',
            });
        }
        finally {
            setDeleting(false);
            setDeleteOpen(false);
        }
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs(Card, { className: "p-4 sm:p-6 md:p-8 space-y-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-bold text-slate-900", children: "Exportar mis datos" }), _jsx("p", { className: "text-sm text-slate-500", children: "Descarga todos tus proyectos, memorias, reportes y chats en formato JSON." })] }), _jsx(Button, { onClick: exportData, disabled: exporting, children: exporting ? _jsx(Spinner, { size: "sm" }) : 'Descargar JSON' })] }), _jsxs(Card, { className: "p-4 sm:p-6 md:p-8 space-y-4 border-red-200", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-bold text-red-600", children: "Eliminar mi cuenta" }), _jsx("p", { className: "text-sm text-slate-500", children: "Esta acci\u00F3n es permanente. Perder\u00E1s todos tus proyectos, contenidos y an\u00E1lisis." })] }), _jsx(Button, { variant: "destructive", onClick: () => setDeleteOpen(true), children: "Eliminar cuenta" })] }), _jsx(Dialog, { open: deleteOpen, onOpenChange: setDeleteOpen, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "\u00BFEliminar tu cuenta?" }), _jsxs(DialogDescription, { children: ["Esta acci\u00F3n no se puede deshacer. Para confirmar, escribe ", _jsx("strong", { children: "ELIMINAR" }), " abajo."] })] }), _jsx(Input, { value: confirmText, onChange: (e) => setConfirmText(e.target.value), placeholder: "Escribe ELIMINAR" }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setDeleteOpen(false), children: "Cancelar" }), _jsx(Button, { variant: "destructive", disabled: confirmText !== 'ELIMINAR' || deleting, onClick: deleteAccount, children: deleting ? _jsx(Spinner, { size: "sm" }) : 'Sí, eliminar todo' })] })] }) })] }));
}
