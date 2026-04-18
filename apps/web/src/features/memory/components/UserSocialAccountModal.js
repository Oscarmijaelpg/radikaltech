import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Badge, Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Spinner, } from '@radikal/ui';
import { useCreateSocialAccount, useDeleteSocialAccount, useSocialAccounts, } from '../api/memory';
const PLATFORMS = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'x', label: 'X / Twitter' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'pinterest', label: 'Pinterest' },
];
export function UserSocialAccountModal({ open, onOpenChange, projectId }) {
    const { data: accounts } = useSocialAccounts(projectId);
    const create = useCreateSocialAccount();
    const remove = useDeleteSocialAccount();
    const [platform, setPlatform] = useState('instagram');
    const [url, setUrl] = useState('');
    const submit = async () => {
        if (!url.trim())
            return;
        await create.mutateAsync({
            project_id: projectId,
            platform,
            source: 'url',
            url: url.trim(),
        });
        setUrl('');
    };
    const onRemove = async (id) => {
        await remove.mutateAsync({ id, project_id: projectId });
    };
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-[100vw] sm:max-w-xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] overflow-y-auto rounded-none sm:rounded-lg", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Mis redes sociales" }) }), _jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-xs text-slate-500", children: "A\u00F1ade tus propias cuentas para que Sira pueda comparar tu rendimiento con la competencia." }), _jsx("div", { className: "space-y-3", children: (accounts ?? []).length === 0 ? (_jsx("div", { className: "p-4 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400", children: "No hay cuentas registradas todav\u00EDa." })) : ((accounts ?? []).map((a) => (_jsxs("div", { className: "flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl", children: [_jsxs("div", { className: "min-w-0 flex items-center gap-2", children: [_jsx(Badge, { variant: "primary", children: a.platform }), _jsx("span", { className: "text-xs text-slate-600 truncate", children: a.url ?? a.handle ?? '—' })] }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => onRemove(a.id), children: _jsx("span", { className: "material-symbols-outlined text-[16px]", children: "delete" }) })] }, a.id)))) }), _jsxs("div", { className: "pt-4 border-t border-slate-100 space-y-3", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3", children: [_jsx("select", { className: "h-12 w-full rounded-2xl bg-slate-100 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))]", value: platform, onChange: (e) => setPlatform(e.target.value), children: PLATFORMS.map((p) => (_jsx("option", { value: p.value, children: p.label }, p.value))) }), _jsx("div", { className: "sm:col-span-2", children: _jsx(Input, { placeholder: "https://...", value: url, onChange: (e) => setUrl(e.target.value) }) })] }), _jsxs(Button, { onClick: submit, disabled: create.isPending || !url.trim(), className: "w-full", children: [create.isPending ? _jsx(Spinner, {}) : _jsx("span", { className: "material-symbols-outlined text-[16px]", children: "add" }), "A\u00F1adir cuenta"] })] })] }), _jsx(DialogFooter, { children: _jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Cerrar" }) })] }) }));
}
