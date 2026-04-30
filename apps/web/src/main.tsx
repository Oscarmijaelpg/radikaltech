import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { AuthProvider } from './providers/AuthProvider';
import { ProjectProvider } from './providers/ProjectProvider';
import {
  SiraContextualProvider,
  SiraContextualPanel,
} from './shared/integration/sira-contextual-exports';
import { ToastProvider } from './shared/ui/Toaster';
import { TourProvider } from './shared/tour';
import { ErrorBoundary } from './shared/ui/ErrorBoundary';
import { ConfirmProvider } from './shared/ui/ConfirmDialog';
import { installGlobalErrorHandlers } from './lib/error-reporting';
import { TooltipProvider } from '@radikal/ui';
import '@radikal/ui/styles/globals.css';
import './index.css';

installGlobalErrorHandlers();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <ProjectProvider>
              <SiraContextualProvider>
                <ToastProvider>
                  <ConfirmProvider>
                    <TooltipProvider delayDuration={250}>
                      <TourProvider>
                        <App />
                        <SiraContextualPanel />
                      </TourProvider>
                    </TooltipProvider>
                  </ConfirmProvider>
                </ToastProvider>
              </SiraContextualProvider>
            </ProjectProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
