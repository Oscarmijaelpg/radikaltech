import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Project } from '../../../core/domain/entities';
import { useCreateProject, useUpdateProject } from '../../hooks/useProjects';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SupabaseWebhookLogRepository } from '../../../infrastructure/repositories/SupabaseWebhookLogRepository';
import { supabase } from '../../../infrastructure/supabase/client';

const webhookLogRepository = new SupabaseWebhookLogRepository();

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, project }) => {
  const { user } = useAuth();
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    industry: '',
    website: '',
    business_summary: '',
    ideal_customer: '',
    unique_value: ''
  });

  const [socialLinks, setSocialLinks] = useState<Record<string, string[]>>({
    'Instagram': ['']
  });

  const updateSocialLink = (channelName: string, index: number, value: string) => {
    setSocialLinks(prev => {
      const newLinks = { ...prev };
      const channelLinks = [...(newLinks[channelName] || [''])];
      channelLinks[index] = value;
      newLinks[channelName] = channelLinks;
      return newLinks;
    });
  };

  useEffect(() => {
    if (isOpen && project) {
      setFormData({
        name: project.name || '',
        company_name: project.company_name || '',
        industry: project.industry || '',
        website: project.website || '',
        business_summary: project.business_summary || '',
        ideal_customer: project.ideal_customer || '',
        unique_value: project.unique_value || ''
      });
      if (project.social_links) {
        setSocialLinks(project.social_links as Record<string, string[]>);
      } else {
        setSocialLinks({ 'Instagram': [''] });
      }
    } else if (isOpen && !project) {
      setFormData({
        name: '',
        company_name: '',
        industry: '',
        website: '',
        business_summary: '',
        ideal_customer: '',
        unique_value: ''
      });
      setSocialLinks({ 'Instagram': [''] });
    }
  }, [isOpen, project]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const cleanSocial = Object.entries(socialLinks).reduce((acc, [key, urls]) => {
        const validUrls = urls.filter(u => u.trim() !== '');
        if (validUrls.length > 0) acc[key] = validUrls;
        return acc;
      }, {} as Record<string, string[]>);

      if (project) {
        await updateProjectMutation.mutateAsync({
          projectId: project.id,
          userId: user.id,
          updates: { ...formData, social_links: cleanSocial }
        });
      } else {
        const newProject = await createProjectMutation.mutateAsync({
          userId: user.id,
          data: { ...formData, social_links: cleanSocial }
        });

        // Send data to webhook (incluye project_id para que n8n
        // pueda asociar todo lo que escriba al proyecto correcto)
        const payload = {
          userId: user.id,
          projectId: newProject?.id || null,
          project_id: newProject?.id || null,
          company_name: formData.company_name,
          industry: formData.industry,
          website: formData.website,
          instagram: socialLinks['Instagram'] && socialLinks['Instagram'][0] ? socialLinks['Instagram'][0] : null,
          timestamp: new Date().toISOString(),
          source: 'project_creation'
        };

        try {
          const { data: functionData, error: functionError } = await supabase.functions.invoke('onboarding-webhook', {
            body: payload,
          });

          if (functionError) throw functionError;

          await webhookLogRepository.log({
            user_id: user.id,
            webhook_url: 'supabase-edge-function:onboarding-webhook',
            event_type: 'project_webhook_migrated',
            status_code: 200,
            payload: payload,
            response: JSON.stringify(functionData)
          });
        } catch (err: any) {
          console.error('Error in project webhook migration:', err);
          await webhookLogRepository.log({
            user_id: user.id,
            webhook_url: 'supabase-edge-function:onboarding-webhook',
            event_type: 'project_webhook_error',
            status_code: 0,
            payload: payload,
            error_message: err.message || String(err)
          });
        }
      }
      onClose();
    } catch (error) {
      console.error("Failed to save project", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || createProjectMutation.isPending || updateProjectMutation.isPending;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={isLoading ? undefined : onClose}
      />
      
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <h2 className="text-xl font-bold text-slate-800">
            {project ? 'Editar Proyecto' : 'Crear Nuevo Proyecto'}
          </h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="project-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <Input
                  label="Nombre del Proyecto (Workspace)"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ej: Marketing Corporativo"
                  required
                />
              </div>
              <div className="space-y-1">
                <Input
                  label="Nombre Comercial"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder="Ej: Mi Marca Pro"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <Input
                  label="Industria o Sector"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  placeholder="Ej: Tecnología"
                />
              </div>
              <div className="space-y-1">
                <Input
                  label="Sitio Web"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase mb-1 opacity-50">URL de Instagram</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                    <img src="https://www.svgrepo.com/show/452229/instagram-1.svg" className="w-4 h-4 opacity-40" alt="" />
                  </span>
                  <input
                    className="block w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-xs outline-none transition-all font-medium text-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="URL de Instagram..."
                    value={socialLinks['Instagram']?.[0] || ''}
                    onChange={(e) => updateSocialLink('Instagram', 0, e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Contexto del Negocio</h3>
              
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase mb-1 opacity-50">Resumen del Negocio</label>
                <textarea 
                  name="business_summary"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm h-24 resize-none outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-slate-900 transition-all" 
                  placeholder="Describe brevemente qué hace este proyecto o negocio..." 
                  value={formData.business_summary} 
                  onChange={handleChange} 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase mb-1 opacity-50">Cliente Ideal</label>
                <textarea 
                  name="ideal_customer"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm h-20 resize-none outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-slate-900 transition-all" 
                  placeholder="¿A quién ayudas?" 
                  value={formData.ideal_customer} 
                  onChange={handleChange} 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase mb-1 opacity-50">Propuesta de Valor Única</label>
                <textarea 
                  name="unique_value"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm h-20 resize-none outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-slate-900 transition-all" 
                  placeholder="¿Qué te diferencia de la competencia?" 
                  value={formData.unique_value} 
                  onChange={handleChange} 
                />
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" form="project-form" isLoading={isLoading}>
            {project ? 'Guardar Cambios' : 'Crear Proyecto'}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
