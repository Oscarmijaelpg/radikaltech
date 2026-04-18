import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Spinner, } from '@radikal/ui';
import { useAnalyzeBrand } from '../../api/memory';
const STAGE_LABELS = [
    'Scrape web',
    'Logo',
    'Imágenes',
    'Social',
    'Síntesis',
];
export function AnalyzeBrandButton({ projectId }) {
    const analyze = useAnalyzeBrand();
    const [overlay, setOverlay] = useState(false);
    const [stage, setStage] = useState(0);
    const [summary, setSummary] = useState(null);
    const stageTimer = useRef(null);
    const handleClick = async () => {
        setOverlay(true);
        setStage(0);
        setSummary(null);
        stageTimer.current = setInterval(() => {
            setStage((prev) => (prev < STAGE_LABELS.length - 1 ? prev + 1 : prev));
        }, 8000);
        try {
            // El endpoint ahora retorna inmediato (jobId) y el orchestrator corre en background.
            // useActiveJobs (con polling) muestra el progreso real en el banner superior y refresca todo al terminar.
            await analyze.mutateAsync({ project_id: projectId });
            setStage(STAGE_LABELS.length - 1);
            setSummary('✓ Análisis iniciado. Verás los resultados aparecer en esta pantalla en los próximos 30-60 segundos.');
            setTimeout(() => {
                setOverlay(false);
                setSummary(null);
                setStage(0);
            }, 2500);
        }
        catch {
            setSummary('Error en el análisis. Revisa los logs.');
        }
        finally {
            if (stageTimer.current)
                clearInterval(stageTimer.current);
        }
    };
    const close = () => {
        setOverlay(false);
        setSummary(null);
        setStage(0);
    };
    return (_jsxs(_Fragment, { children: [_jsxs(Button, { variant: "primary", onClick: handleClick, disabled: analyze.isPending, children: [analyze.isPending ? (_jsx(Spinner, {})) : (_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "auto_awesome" })), "Actualizar con IA"] }), _jsx(Dialog, { open: overlay, onOpenChange: (v) => (v ? null : close()), children: _jsxs(DialogContent, { className: "max-w-[100vw] sm:max-w-lg h-auto max-h-[100dvh] sm:max-h-[85vh] rounded-none sm:rounded-lg", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "An\u00E1lisis completo de marca" }) }), _jsxs("div", { className: "space-y-3 py-4", children: [STAGE_LABELS.map((label, i) => {
                                    const done = summary ? true : i < stage;
                                    const active = !summary && i === stage;
                                    return (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: `w-6 h-6 rounded-full grid place-items-center text-[11px] font-black text-white ${done
                                                    ? 'bg-gradient-to-br from-pink-500 to-cyan-500'
                                                    : active
                                                        ? 'bg-slate-400 animate-pulse'
                                                        : 'bg-slate-200 text-slate-500'}`, children: done ? '✓' : i + 1 }), _jsx("span", { className: `text-sm font-semibold ${active ? 'text-slate-900' : done ? 'text-slate-700' : 'text-slate-400'}`, children: label })] }, label));
                                }), summary && (_jsx("p", { className: "text-xs text-slate-600 mt-4 pt-3 border-t border-slate-100", children: summary }))] }), _jsx(DialogFooter, { children: _jsx(Button, { variant: "outline", onClick: close, disabled: !summary && analyze.isPending, children: "Cerrar" }) })] }) })] }));
}
