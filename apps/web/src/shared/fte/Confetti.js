import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
const COLORS = ['#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#8b5cf6', '#f43f5e'];
/**
 * Lightweight CSS-only confetti. Renders N divs that fall with animation.
 * No deps.
 */
export function Confetti({ durationMs = 3000, pieces = 80, onDone }) {
    const [items] = useState(() => Array.from({ length: pieces }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 400,
        duration: 2200 + Math.random() * 1600,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 8,
        rotate: Math.random() * 360,
    })));
    useEffect(() => {
        const t = window.setTimeout(() => onDone?.(), durationMs);
        return () => window.clearTimeout(t);
    }, [durationMs, onDone]);
    return (_jsxs("div", { className: "pointer-events-none fixed inset-0 z-[9999] overflow-hidden", children: [_jsx("style", { children: `
        @keyframes radikal-confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.9; }
        }
      ` }), items.map((it) => (_jsx("span", { style: {
                    position: 'absolute',
                    top: 0,
                    left: `${it.left}%`,
                    width: it.size,
                    height: it.size * 0.4,
                    background: it.color,
                    borderRadius: 2,
                    transform: `rotate(${it.rotate}deg)`,
                    animation: `radikal-confetti-fall ${it.duration}ms ${it.delay}ms linear forwards`,
                } }, it.id)))] }));
}
