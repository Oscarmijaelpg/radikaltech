import { jsx as _jsx } from "react/jsx-runtime";
import { useProject } from '@/providers/ProjectProvider';
import { useFirstTimeProgress } from './useFirstTimeProgress';
/**
 * Small emoji badge that renders the user's current FTE level. Designed to sit
 * on the bottom-right of the sidebar avatar (absolute positioned by parent).
 */
export function LevelBadge({ size = 16 }) {
    const { activeProject } = useProject();
    const { progress, level } = useFirstTimeProgress(activeProject?.id);
    if (!activeProject || !progress)
        return null;
    return (_jsx("span", { title: `Nivel: ${level.label}`, className: "absolute -bottom-1 -right-1 grid place-items-center rounded-full ring-2 ring-white bg-white shadow text-[10px]", style: { width: size, height: size, fontSize: Math.round(size * 0.7) }, children: _jsx("span", { "aria-hidden": true, children: level.emoji }) }));
}
