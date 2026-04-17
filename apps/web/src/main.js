import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
console.log('[BOOT] main.tsx ejecutando', new Date().toISOString());
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { AuthProvider } from './providers/AuthProvider';
import { ProjectProvider } from './providers/ProjectProvider';
import { SiraContextualProvider, SiraContextualPanel, } from './shared/integration/sira-contextual-exports';
import { ToastProvider } from './shared/ui/Toaster';
import { TourProvider } from './shared/tour';
import { ErrorBoundary } from './shared/ui/ErrorBoundary';
import { ConfirmProvider } from './shared/ui/ConfirmDialog';
import { installGlobalErrorHandlers } from './lib/error-reporting';
import { ThemeProvider } from './shared/theme/ThemeProvider';
import { TooltipProvider } from '@radikal/ui';
import '@radikal/ui/styles/globals.css';
import './index.css';
installGlobalErrorHandlers();
const queryClient = new QueryClient({
    defaultOptions: {
        queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    },
});
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(ThemeProvider, { children: _jsx(ErrorBoundary, { children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(BrowserRouter, { children: _jsx(AuthProvider, { children: _jsx(ProjectProvider, { children: _jsx(SiraContextualProvider, { children: _jsx(ToastProvider, { children: _jsx(ConfirmProvider, { children: _jsx(TooltipProvider, { delayDuration: 250, children: _jsxs(TourProvider, { children: [_jsx(App, {}), _jsx(SiraContextualPanel, {})] }) }) }) }) }) }) }) }) }) }) }) }));
