import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button, Input, Label, Spinner, } from '@radikal/ui';
import { api } from '@/lib/api';
import { useProject } from '@/providers/ProjectProvider';
import { useToast } from '@/shared/ui/Toaster';
function normalizeInstagramUrl(raw) {
    const s = raw.trim().replace(/^@/, '');
    if (!s)
        return null;
    if (/^https?:\/\//i.test(s))
        return s;
    const handle = s.split('/')[0]?.trim();
    if (!handle)
        return null;
    return `https://www.instagram.com/${handle}/`;
}
export function NewProjectDialog({ open, onOpenChange }) {
    const { refetch, setActiveProject } = useProject();
    const { toast } = useToast();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const [form, setForm] = useState({
        name: '',
        company_name: '',
        industry: '',
        website: '',
        instagram: '',
    });
    const [submitting, setSubmitting] = useState(false);
    function reset() {
        setForm({ name: '', company_name: '', industry: '', website: '', instagram: '' });
    }
    function handleClose(nextOpen) {
        if (!nextOpen)
            reset();
        onOpenChange(nextOpen);
    }
    async function handleSubmit() {
        if (!form.name.trim()) {
            toast({ title: 'El nombre es obligatorio', variant: 'error' });
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                name: form.name.trim(),
            };
            if (form.company_name.trim())
                payload.company_name = form.company_name.trim();
            if (form.industry.trim())
                payload.industry = form.industry.trim();
            if (form.website.trim())
                payload.website = form.website.trim();
            const igUrl = normalizeInstagramUrl(form.instagram);
            if (igUrl)
                payload.instagram_url = igUrl;
            const res = await api.post('/projects', payload);
            const created = res.data;
            await refetch();
            setActiveProject(created);
            const analyzing = !!payload.website || !!payload.instagram_url;
            toast({
                title: 'Proyecto creado',
                description: analyzing
                    ? 'Estamos analizando tu sitio y redes en segundo plano. Verás el progreso en la parte superior.'
                    : undefined,
                variant: 'success',
            });
            handleClose(false);
            navigate('/');
            if (analyzing) {
                // Forzar que el banner global detecte los jobs que acaban de dispararse.
                const poke = () => qc.invalidateQueries({ queryKey: ['jobs', 'active', created.id] });
                setTimeout(poke, 600);
                setTimeout(poke, 2000);
                setTimeout(poke, 5000);
            }
        }
        catch (err) {
            console.error(err);
            toast({ title: 'No se pudo crear el proyecto', variant: 'error' });
        }
        finally {
            setSubmitting(false);
        }
    }
    return (_jsx(Dialog, { open: open, onOpenChange: handleClose, children: _jsxs(DialogContent, { className: "sm:max-w-md", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Nuevo proyecto" }) }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "np-name", children: "Nombre del proyecto *" }), _jsx(Input, { id: "np-name", value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), placeholder: "Ej: Mi restaurante", autoFocus: true })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "np-company", children: "Nombre de la empresa" }), _jsx(Input, { id: "np-company", value: form.company_name, onChange: (e) => setForm({ ...form, company_name: e.target.value }), placeholder: "Opcional" })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "np-industry", children: "Industria" }), _jsx(Input, { id: "np-industry", value: form.industry, onChange: (e) => setForm({ ...form, industry: e.target.value }), placeholder: "Ej: Gastronom\u00EDa, Tecnolog\u00EDa, Moda..." })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "np-site", children: "Website (opcional)" }), _jsx(Input, { id: "np-site", value: form.website, onChange: (e) => setForm({ ...form, website: e.target.value }), placeholder: "https://..." })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "np-ig", children: "Instagram (opcional)" }), _jsx(Input, { id: "np-ig", value: form.instagram, onChange: (e) => setForm({ ...form, instagram: e.target.value }), placeholder: "@usuario o https://instagram.com/..." })] }), (form.website.trim() || form.instagram.trim()) && (_jsxs("div", { className: "flex items-start gap-2 rounded-xl bg-[hsl(var(--color-primary)/0.08)] border border-[hsl(var(--color-primary)/0.15)] px-3 py-2 text-xs text-slate-700", children: [_jsx("span", { className: "material-symbols-outlined text-[16px] text-[hsl(var(--color-primary))] shrink-0 mt-0.5", children: "auto_awesome" }), _jsxs("span", { children: ["Analizaremos autom\u00E1ticamente", form.website.trim() ? ' tu sitio web' : '', form.website.trim() && form.instagram.trim() ? ' y' : '', form.instagram.trim() ? ' tu Instagram' : '', ' ', "para detectar logo, colores e im\u00E1genes. Tardar\u00E1 unos segundos."] })] }))] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "ghost", onClick: () => handleClose(false), disabled: submitting, children: "Cancelar" }), _jsx(Button, { onClick: handleSubmit, disabled: !form.name.trim() || submitting, children: submitting ? _jsxs(_Fragment, { children: [_jsx(Spinner, { size: "sm" }), " Creando..."] }) : 'Crear proyecto' })] })] }) }));
}
