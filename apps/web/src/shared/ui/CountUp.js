import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
export function CountUp({ end, duration = 1200, decimals = 0 }) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (!Number.isFinite(end)) {
            setValue(0);
            return;
        }
        let raf = 0;
        const start = performance.now();
        const tick = (now) => {
            const elapsed = now - start;
            const progress = Math.min(1, elapsed / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(end * eased);
            if (progress < 1) {
                raf = requestAnimationFrame(tick);
            }
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [end, duration]);
    return _jsx(_Fragment, { children: value.toFixed(decimals) });
}
