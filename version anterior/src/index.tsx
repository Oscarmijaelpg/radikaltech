import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { AuthProvider } from './presentation/context/AuthContext';
import { ProjectProvider } from './presentation/context/ProjectContext';


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("index.tsx: Could not find root element to mount to!");
  throw new Error("Could not find root element to mount to!");
}


try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ProjectProvider>
            <App />
          </ProjectProvider>
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
} catch (error) {
  console.error('index.tsx: Error during initial render:', error);
}
