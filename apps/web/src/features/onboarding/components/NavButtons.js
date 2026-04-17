import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Spinner } from '@radikal/ui';
import { ArrowLeft, ArrowRight } from 'lucide-react';
export function NavButtons({ onBack, onNext, backLabel = 'Atrás', nextLabel = 'Siguiente', nextDisabled, loading, hideBack, nextType = 'button', }) {
    return (_jsxs("div", { className: "flex items-center justify-between gap-3 pt-6 sm:pt-8 mt-6 sm:mt-8 border-t border-[hsl(var(--color-border))]", children: [!hideBack ? (_jsxs(Button, { type: "button", variant: "ghost", onClick: onBack, disabled: loading, children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), backLabel] })) : (_jsx("span", {})), _jsxs(Button, { type: nextType, variant: "primary", onClick: onNext, disabled: nextDisabled || loading, children: [loading ? _jsx(Spinner, { size: "sm", className: "border-white border-t-white/40" }) : null, nextLabel, !loading && _jsx(ArrowRight, { className: "h-4 w-4" })] })] }));
}
