import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from './AuthProvider';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  company_name: string | null;
  industry: string | null;
  industry_custom: string | null;
  website_source: 'url' | 'manual' | 'none' | null;
  website_url: string | null;
  website_manual_description: string | null;
  business_summary: string | null;
  ideal_customer: string | null;
  unique_value: string | null;
  main_products: string | null;
  additional_context: string | null;
  operating_countries?: string | null;
  operating_countries_suggested?: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface ProjectContextValue {
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (p: Project | null) => void;
  isLoading: boolean;
  refetch: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<{ data: Project[] }>('/projects').then((r) => r.data),
    enabled: !!session,
  });

  // Limpiar estado y caché al cerrar sesión para que no persistan datos entre cuentas
  useEffect(() => {
    if (!session) {
      setActiveProject(null);
      queryClient.removeQueries({ queryKey: ['projects'] });
    }
  }, [session, queryClient]);

  const projects = data ?? [];

  useEffect(() => {
    if (!activeProject && projects.length > 0) {
      setActiveProject(projects.find((p) => p.is_default) ?? projects[0] ?? null);
    }
  }, [projects, activeProject]);

  return (
    <ProjectContext.Provider
      value={{ projects, activeProject, setActiveProject, isLoading, refetch }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject debe usarse dentro de ProjectProvider');
  return ctx;
}
