import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useProjects } from '../hooks/useProjects';
import { Project } from '../../core/domain/entities';

interface ProjectContextType {
  activeProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  setActiveProjectId: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { data: projects = [], isLoading } = useProjects(user?.id);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Auto-select first project if none selected
  useEffect(() => {
    if (projects.length > 0 && !activeProjectId) {
      // Try to get from localStorage first
      const stored = localStorage.getItem('activeProjectId');
      if (stored && projects.some((p) => p.id === stored)) {
        setActiveProjectId(stored);
      } else {
        setActiveProjectId(projects[0].id);
        localStorage.setItem('activeProjectId', projects[0].id);
      }
    } else if (projects.length === 0 && !isLoading) {
      setActiveProjectId(null);
      localStorage.removeItem('activeProjectId');
    }
  }, [projects, activeProjectId, isLoading]);

  const handleSetActiveProject = (id: string) => {
    setActiveProjectId(id);
    localStorage.setItem('activeProjectId', id);
  };

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  return (
    <ProjectContext.Provider value={{
      activeProject,
      projects,
      isLoading,
      setActiveProjectId: handleSetActiveProject
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};
