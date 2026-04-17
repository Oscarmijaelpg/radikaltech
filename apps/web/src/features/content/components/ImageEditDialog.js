import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, Button, Input, Spinner, Badge, } from '@radikal/ui';
import { useEditImage } from '../api/content';
const QUICK_CHIPS = [
    'Más brillante',
    'Más minimalista',
    'Cambia fondo a blanco',
    'Más dramático',
    'Más colorido',
];
export function ImageEditDialog({ open, onOpenChange, sourceUrl, sourceAssetId, projectId, onUseNew, }) {
    const [instruction, setInstruction] = useState('');
    const [result, setResult] = useState(null);
    const edit = useEditImage();
    useEffect(() => {
        if (!open) {
            setInstruction('');
            setResult(null);
            edit.reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
    const onGenerate = async () => {
        const text = instruction.trim();
        if (text.length < 3)
            return;
        try {
            const r = await edit.mutateAsync({
                source_asset_id: sourceAssetId,
                edit_instruction: text,
                project_id: projectId,
            });
            setResult(r);
        }
        catch {
            /* handled via edit.error */
        }
    };
    const loading = edit.isPending;
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "sm:max-w-4xl sm:max-h-[90vh] overflow-auto", children: [_jsx(DialogTitle, { children: "Iterar imagen con Nexo" }), _jsx(DialogDescription, { children: "Describe el cambio que quieres. Nexo editar\u00E1 manteniendo el branding." }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mt-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-tighter opacity-60 mb-2", children: "Original" }), _jsx("div", { className: "rounded-2xl overflow-hidden bg-slate-100 relative", children: _jsx("img", { src: sourceUrl, alt: "source", className: "w-full h-auto object-contain max-h-[420px]" }) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-tighter opacity-60 mb-2", children: "Resultado" }), _jsx("div", { className: "rounded-2xl overflow-hidden bg-slate-100 min-h-[260px] relative grid place-items-center", children: loading ? (_jsxs("div", { className: "flex flex-col items-center gap-2 p-6 text-center", children: [_jsx(Spinner, { size: "lg" }), _jsx("p", { className: "text-sm font-semibold text-slate-700", children: "Nexo est\u00E1 editando..." })] })) : result ? (_jsx("img", { src: result.url, alt: "edited", className: "w-full h-auto object-contain max-h-[420px]" })) : (_jsx("p", { className: "text-xs text-slate-500 p-6 text-center", children: "La imagen editada aparecer\u00E1 aqu\u00ED." })) }), result && (_jsx("div", { className: "mt-2 flex gap-2 flex-wrap", children: _jsx(Badge, { variant: "muted", children: result.model === 'gemini-2.5-flash-image' ? 'Gemini 2.5' : 'DALL-E 3' }) }))] })] }), _jsxs("div", { className: "mt-4", children: [_jsx("label", { className: "block text-[10px] font-black uppercase tracking-tighter mb-2 opacity-60", children: "\u00BFQu\u00E9 cambio quieres?" }), _jsx("div", { className: "flex flex-wrap gap-2 mb-3", children: QUICK_CHIPS.map((c) => (_jsx("button", { type: "button", onClick: () => setInstruction(c), className: "px-3 py-2 rounded-full text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 min-h-[44px] sm:min-h-0 sm:py-1.5", children: c }, c))) }), _jsx(Input, { value: instruction, onChange: (e) => setInstruction(e.target.value), placeholder: "Ej. Cambia el fondo a azul cielo, estilo minimalista...", disabled: loading })] }), edit.isError && (_jsx("p", { className: "mt-3 text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-lg", children: "Error editando. Intenta de nuevo." })), _jsxs("div", { className: "mt-5 flex gap-2 justify-end flex-wrap [&>button]:min-h-[44px]", children: [_jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), disabled: loading, children: "Cerrar" }), result ? (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "outline", onClick: () => {
                                        setResult(null);
                                        setInstruction('');
                                    }, disabled: loading, children: "Descartar" }), _jsxs(Button, { variant: "outline", onClick: () => {
                                        setResult(null);
                                    }, disabled: loading, children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "tune" }), "Iterar otra vez"] }), _jsx(Button, { onClick: () => {
                                        onUseNew?.(result);
                                        onOpenChange(false);
                                    }, children: "Usar esta nueva" })] })) : (_jsxs(Button, { onClick: () => void onGenerate(), disabled: instruction.trim().length < 3 || loading, children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "auto_awesome" }), "Generar iteraci\u00F3n"] }))] })] }) }));
}
