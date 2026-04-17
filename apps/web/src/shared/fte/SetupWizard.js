import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { useFirstTimeProgress } from './useFirstTimeProgress';
import { cn } from '@/shared/utils/cn';
const SETUP_STEPS = [
    {
        id: 'complete_identity',
        step: 1,
        title: 'Cuéntanos sobre tu marca',
        description: 'Nombre, industria, qué vendes y qué te hace diferente.',
        icon: 'auto_awesome',
        gradient: 'from-pink-500 to-rose-500',
        cta: { label: 'Configurar', to: '/memory?tab=brand' },
    },
    {
        id: 'upload_logo',
        step: 2,
        title: 'Sube tu logo',
        description: 'Lo usaremos para extraer tu paleta de colores y personalizar todo.',
        icon: 'image',
        gradient: 'from-amber-500 to-orange-500',
        cta: { label: 'Subir logo', to: '/memory?tab=brand' },
    },
    {
        id: 'first_competitor',
        step: 3,
        title: 'Agrega un competidor',
        description: 'Sira lo empezará a monitorear automáticamente.',
        icon: 'radar',
        gradient: 'from-cyan-500 to-blue-600',
        cta: { label: 'Agregar', to: '/memory?tab=competitors' },
    },
    {
        id: 'first_chat',
        step: 4,
        title: 'Habla con tu equipo IA',
        description: 'Pregunta lo que quieras. Los agentes ya conocen tu marca.',
        icon: 'chat',
        gradient: 'from-violet-500 to-purple-600',
        cta: { label: 'Ir al chat', to: '/chat' },
    },
];
export function SetupWizard() {
    const navigate = useNavigate();
    const { activeProject } = useProject();
    const { loading, completedIds, allCompleted } = useFirstTimeProgress(activeProject?.id);
    const currentStep = useMemo(() => {
        for (const step of SETUP_STEPS) {
            if (!completedIds.has(step.id))
                return step;
        }
        return null;
    }, [completedIds]);
    const completedCount = SETUP_STEPS.filter((s) => completedIds.has(s.id)).length;
    if (!activeProject || loading || allCompleted)
        return null;
    return (_jsxs(Card, { className: "relative overflow-hidden p-0 border-2 border-pink-100", children: [_jsx("div", { className: "bg-gradient-to-r from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] px-6 py-4 text-white", children: _jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-black uppercase tracking-widest opacity-80", children: "Configura tu marca" }), _jsxs("h3", { className: "font-display font-black text-lg", children: ["Paso ", completedCount + 1, " de ", SETUP_STEPS.length] })] }), _jsx("div", { className: "flex items-center gap-1", children: SETUP_STEPS.map((s, i) => (_jsx("div", { className: cn('w-8 h-2 rounded-full transition-all', completedIds.has(s.id)
                                    ? 'bg-white'
                                    : s.id === currentStep?.id
                                        ? 'bg-white/60 animate-pulse'
                                        : 'bg-white/20') }, s.id))) })] }) }), _jsx("div", { className: "p-5 space-y-3", children: SETUP_STEPS.map((step) => {
                    const isDone = completedIds.has(step.id);
                    const isCurrent = step.id === currentStep?.id;
                    return (_jsxs("div", { className: cn('flex items-center gap-4 p-4 rounded-2xl transition-all', isDone
                            ? 'bg-emerald-50 border border-emerald-100'
                            : isCurrent
                                ? 'bg-white border-2 border-pink-200 shadow-lg shadow-pink-100/50'
                                : 'bg-slate-50/50 border border-slate-100 opacity-50'), children: [_jsx("div", { className: cn('w-12 h-12 rounded-2xl grid place-items-center shrink-0 text-white shadow-md', isDone
                                    ? 'bg-gradient-to-br from-emerald-400 to-teal-500'
                                    : isCurrent
                                        ? `bg-gradient-to-br ${step.gradient}`
                                        : 'bg-gradient-to-br from-slate-300 to-slate-400'), children: _jsx("span", { className: "material-symbols-outlined text-[22px]", children: isDone ? 'check' : step.icon }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: cn('text-sm font-bold', isDone ? 'text-emerald-700 line-through' : 'text-slate-900'), children: step.title }), _jsx("p", { className: "text-xs text-slate-500 mt-0.5", children: step.description })] }), isDone ? (_jsx("span", { className: "text-emerald-500 shrink-0", children: _jsx("span", { className: "material-symbols-outlined text-[20px]", children: "check_circle" }) })) : isCurrent ? (_jsxs(Button, { size: "sm", onClick: () => navigate(step.cta.to), className: "shrink-0", children: [step.cta.label, _jsx("span", { className: "material-symbols-outlined text-[16px]", children: "arrow_forward" })] })) : (_jsxs("span", { className: "text-xs text-slate-400 shrink-0", children: ["Paso ", step.step] }))] }, step.id));
                }) })] }));
}
