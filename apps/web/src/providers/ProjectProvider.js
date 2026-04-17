import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from './AuthProvider';
const ProjectContext = createContext(null);
export function ProjectProvider({ children }) {
    const { session } = useAuth();
    const [activeProject, setActiveProject] = useState(null);
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['projects'],
        queryFn: () => api.get('/projects').then((r) => r.data),
        enabled: !!session,
    });
    const projects = data ?? [];
    useEffect(() => {
        if (!activeProject && projects.length > 0) {
            setActiveProject(projects.find((p) => p.is_default) ?? projects[0] ?? null);
        }
    }, [projects, activeProject]);
    return (_jsx(ProjectContext.Provider, { value: { projects, activeProject, setActiveProject, isLoading, refetch }, children: children }));
}
export function useProject() {
    const ctx = useContext(ProjectContext);
    if (!ctx)
        throw new Error('useProject debe usarse dentro de ProjectProvider');
    return ctx;
}
