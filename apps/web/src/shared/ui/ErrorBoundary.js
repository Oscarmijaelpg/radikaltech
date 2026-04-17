import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
import { captureException } from '@/lib/error-reporting';
export class ErrorBoundary extends Component {
    state = { hasError: false, error: undefined };
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        captureException(error, { info });
    }
    render() {
        if (this.state.hasError) {
            return (this.props.fallback ?? (_jsx("div", { className: "min-h-screen grid place-items-center p-6", children: _jsxs("div", { className: "max-w-md bg-white rounded-3xl shadow-xl p-8 text-center", children: [_jsx("h2", { className: "font-display text-2xl font-bold mb-2", children: "Algo sali\u00F3 mal" }), _jsx("p", { className: "text-sm text-slate-500 mb-4", children: this.state.error?.message ?? 'Error inesperado' }), _jsx("button", { onClick: () => window.location.reload(), className: "px-4 py-2 rounded-xl bg-[hsl(var(--color-primary))] text-white", children: "Recargar" })] }) })));
        }
        return this.props.children;
    }
}
