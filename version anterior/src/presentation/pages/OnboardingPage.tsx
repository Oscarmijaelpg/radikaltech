import React, { useState } from 'react';
import { OnboardingStep, User } from '../../core/domain/entities';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';
import onboardingVideo from '../../media/onboarding.mp4';
import ankorImage from '../../media/ankor.webp';
import kronosImage from '../../media/Kronos.webp';
import siraImage from '../../media/Sira.webp';
import indexaImage from '../../media/indexa.webp';
import nexoImage from '../../media/Nexo.webp';
import { useNavigate } from 'react-router-dom';
import { useCreateProject, useUpdateProject } from '../hooks/useProjects';
import { SupabaseWebhookLogRepository } from '../../infrastructure/repositories/SupabaseWebhookLogRepository';
import { supabase } from '../../infrastructure/supabase/client';
import { useSaveMemory } from '../hooks/useMemory';
import { SupabaseMemoryRepository } from '../../infrastructure/repositories/SupabaseMemoryRepository';
import { uploadImageFromBase64, uploadFile } from '../../infrastructure/services/SupabaseStorageService';
import { callOpenRouter } from '../../infrastructure/services/OpenRouterService';
import { extractTextFromPdf } from '../utils/pdfExtractor';

const webhookLogRepository = new SupabaseWebhookLogRepository();

interface OnboardingProps {
  onComplete: () => void;
}

const CHANNELS_CONFIG = [
  { name: 'Instagram', icon: 'https://www.svgrepo.com/show/452229/instagram-1.svg', color: '#E1306C' }
];

const INDUSTRIES = [
  'Tecnología / Software', 
  'E-commerce / Retail Online', 
  'Marketing / Publicidad / Mercadeo',
  'Salud / Bienestar / Belleza', 
  'Educación / EdTech',
  'Servicios Financieros / Fintech', 
  'Inmobiliaria / Bienes Raíces',
  'Servicios Legales / Consultoría',
  'Alimentos y Bebidas / Gastronomía', 
  'Hotelería / Turismo / Viajes',
  'Construcción / Arquitectura',
  'Manufactura / Industria Pesada', 
  'Minería / Energía', 
  'Agricultura / Agroindustria',
  'Automotriz / Transporte', 
  'Logística / Cadena de Suministro',
  'Moda / Textil', 
  'Farmacéutica / Biotecnología', 
  'Entretenimiento / Medios',
  'ONG / Sin Ánimo de Lucro',
  'Otro'
];

const STEP_GUIDES = {
  [OnboardingStep.WELCOME]: {
    character: ankorImage,
    message: "¡Hola! Soy Ankor. Te acompañaré en este viaje para configurar tu ecosistema de inteligencia radical."
  },
  [OnboardingStep.COMPANY]: {
    character: ankorImage,
    message: "Necesitamos estos datos para darle una identidad formal a tu empresa y personalizar tus futuros reportes."
  },
  [OnboardingStep.TEAM_INTRO]: {
    character: ankorImage,
    message: "Tu éxito es nuestra misión. Permítenos presentarte a los expertos que están a tu disposición para transformar tu visión en resultados."
  },
  [OnboardingStep.AGENT_ANKOR]: {
    character: ankorImage,
    message: "Como experto en onboarding, mi objetivo es asegurarme de que tu transición a la IA sea fluida y potente."
  },
  [OnboardingStep.AGENT_INDEXA]: {
    character: ankorImage,
    message: "Te presento a Indexa. Ella es nuestra experta en SEO; analizará tu web para que siempre aparezcas en los mejores resultados."
  },
  [OnboardingStep.AGENT_SIRA]: {
    character: ankorImage,
    message: "Esta es Sira. Ella realizará investigaciones de mercado y de tu competencia para que siempre vayas un paso por delante."
  },
  [OnboardingStep.AGENT_NEXO]: {
    character: ankorImage,
    message: "Aquí tienes a Nexo. Él se encarga de tu marketing y de crear los contenidos más creativos para tu marca."
  },
  [OnboardingStep.AGENT_KRONOS]: {
    character: ankorImage,
    message: "Y finalmente Kronos. Él ejecutará tus tareas de forma eficiente, usando todo el conocimiento de tus neuronas."
  },
  [OnboardingStep.TEAM_OUTRO]: {
    character: ankorImage,
    message: "Estamos listos. Somos un equipo unido por un solo propósito: potenciar tu marca al siguiente nivel."
  },
  [OnboardingStep.DETAILS]: {
    character: ankorImage,
    message: "Entender tu valor único es clave para que nuestra IA redacte contenidos que realmente conviertan."
  },
  [OnboardingStep.FINISH]: {
    character: ankorImage,
    message: "¡Excelente! Ya está todo configurado. El sistema ahora empezará a aprender de ti."
  }
};

export const OnboardingPage: React.FC<OnboardingProps> = ({ onComplete }) => {
  const navigate = useNavigate();
  const { user, updateOnboarding } = useAuth();
  const [step, setStep] = useState<OnboardingStep>(OnboardingStep.WELCOME);
  const [loading, setLoading] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [autoplayFailed, setAutoplayFailed] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { mutateAsync: createProject } = useCreateProject();
  const { mutateAsync: updateProject } = useUpdateProject();
  const { mutateAsync: saveMemory } = useSaveMemory();
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  // File Upload State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<User>>({
    company_name: '',
    industry: '',
    website: '',
    business_summary: '',
    unique_value: '',
    ideal_customer: '',
    additional_context: ''
  });

  React.useEffect(() => {
    if (showVideo && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn("Autoplay was prevented:", error);
          setAutoplayFailed(true);
        });
      }
    }
  }, [showVideo]);

  const [socialLinks, setSocialLinks] = useState<Record<string, string[]>>({
    'Instagram': ['']
  });

  const totalSteps = 10;
  const progress = (step / totalSteps) * 100;

  const handleNext = async () => {
    setErrors({});

    if (step === OnboardingStep.COMPANY) {
      const newErrors: Record<string, string> = {};

      if (!formData.company_name?.trim()) {
        newErrors.company_name = 'El Nombre Comercial es obligatorio';
      }
      if (!formData.industry) {
        newErrors.industry = 'La Industria o Sector es obligatoria';
      }
      if (!formData.website?.trim()) {
        newErrors.website = 'El Sitio Web es obligatorio';
      }
      if (!socialLinks['Instagram'] || !socialLinks['Instagram'][0]?.trim()) {
        newErrors.instagram = 'La cuenta de Instagram es obligatoria';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      setLoading(true);

      // 1) Crear el proyecto desde YA, para que cualquier dato posterior
      //    (archivos, memorias, n8n) quede ligado a project_id desde el inicio.
      let projectIdForPayload: string | null = createdProjectId;
      try {
        if (user?.id && !createdProjectId) {
          const cleanSocial = Object.entries(socialLinks).reduce((acc, [key, urls]) => {
            const validUrls = urls.filter(u => u.trim() !== '');
            if (validUrls.length > 0) acc[key] = validUrls;
            return acc;
          }, {} as Record<string, string[]>);

          const newProject = await createProject({
            userId: user.id,
            data: {
              name: formData.company_name || 'Mi Primer Proyecto',
              company_name: formData.company_name || '',
              industry: formData.industry || '',
              website: formData.website || '',
              business_summary: formData.business_summary || '',
              ideal_customer: formData.ideal_customer || '',
              unique_value: formData.unique_value || '',
              social_links: cleanSocial
            }
          });
          if (newProject?.id) {
            projectIdForPayload = newProject.id;
            setCreatedProjectId(newProject.id);
            localStorage.setItem('activeProjectId', newProject.id);
          }
        }
      } catch (e) {
        console.error('[Onboarding] Error creating initial project:', e);
      }

      const payload = {
        userId: user?.id || 'anonymous',
        projectId: projectIdForPayload,
        project_id: projectIdForPayload,
        company_name: formData.company_name,
        industry: formData.industry,
        website: formData.website,
        instagram: socialLinks['Instagram'] && socialLinks['Instagram'][0] ? socialLinks['Instagram'][0] : null,
        timestamp: new Date().toISOString(),
        source: 'onboarding_frontend_v2'
      };

      try {
        const { data: functionData, error: functionError } = await supabase.functions.invoke('onboarding-webhook', {
          body: payload,
        });

        if (functionError) throw functionError;


        if (user?.id) {
          await webhookLogRepository.log({
            user_id: user.id,
            webhook_url: 'supabase-edge-function:onboarding-webhook',
            event_type: 'onboarding_webhook_migrated',
            status_code: 200,
            payload: payload,
            response: JSON.stringify(functionData)
          });
        }
      } catch (err: any) {
        console.error('Error in onboarding webhook migration:', err);
        if (user?.id) {
          await webhookLogRepository.log({
            user_id: user.id,
            webhook_url: 'supabase-edge-function:onboarding-webhook',
            event_type: 'onboarding_webhook_error',
            status_code: 0,
            payload: payload,
            error_message: err.message || String(err)
          });
        }
      } finally {
        setLoading(false);
      }
      localStorage.setItem('onboarding_start_time', new Date().getTime().toString());
      setStep(step + 1);
      return;
    }

    if (step === OnboardingStep.DETAILS) {
      if (selectedFiles.length > 0 && user) {
        setIsUploadingFiles(true);
        setUploadProgress({ current: 0, total: selectedFiles.length });

        try {
          for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            setUploadProgress({ current: i + 1, total: selectedFiles.length });

            let content = '';
            let resourceType: 'text' | 'image' | 'link' | 'document' | 'markdown' = 'document';
            let category = 'neuronas';
            let imageUrl = '';

            if (file.type.startsWith('image/')) {
              resourceType = 'image';
              category = 'analisis_imagenes';

              const reader = new FileReader();
              const base64 = await new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
              });

              // 1. Storage
              try {
                imageUrl = await uploadImageFromBase64(base64, `onboarding_${Date.now()}`) || base64;
              } catch (e) {
                imageUrl = base64;
              }

              // 2. AI Analysis
              try {
                const analysis = await callOpenRouter('openai/gpt-4o-mini', [
                  {
                    role: 'user',
                    content: [
                      { type: 'text', text: "Analiza esta imagen de marca y extrae su esencia, productos o valores visuales." },
                      { type: 'image_url', image_url: { url: base64 } }
                    ]
                  }
                ]);
                content = JSON.stringify({ url: imageUrl, analysis });
              } catch (e) {
                content = JSON.stringify({ url: imageUrl, analysis: 'Imagen guardada durante onboarding.' });
              }
            } else if (file.type === 'application/pdf') {
              // 1. Upload to Storage for viewing
              const fileUrl = await uploadFile(file) || '';
              imageUrl = fileUrl;

              // 2. PDF Text Extraction for Bots
              const extractedText = await extractTextFromPdf(file);
              content = `DOCUMENTO PDF: ${file.name}\n\nCONTENIDO EXTRAÍDO:\n${extractedText}`;
              resourceType = 'document';
              category = 'neuronas';
            } else {
              // 1. Upload to Storage
              const fileUrl = await uploadFile(file) || '';
              imageUrl = fileUrl;

              // 2. Metadata
              content = `Archivo: ${file.name}\nTipo: ${file.type}\nTamaño: ${(file.size / 1024).toFixed(2)} KB\nSubido durante onboarding.`;
              resourceType = 'document';
              category = 'neuronas';
            }

            await saveMemory({
              user_id: user.id,
              project_id: createdProjectId || undefined,
              title: file.name,
              content: content,
              resource_type: resourceType,
              memory_category: category,
              summary: imageUrl,
              user_confirmed: true
            });
          }
        } catch (error) {
          console.error('[Onboarding] File processing error:', error);
        } finally {
          setIsUploadingFiles(false);
        }
      }
      setStep(step + 1);
      return;
    }

    if (step === OnboardingStep.FINISH) {
      setLoading(true);
      try {
        const selectedChannelsList = Object.keys(socialLinks).filter(name => socialLinks[name].some(link => link.trim() !== ''));

        // 1. Create the workspace/project
        const cleanSocial = Object.entries(socialLinks).reduce((acc, [key, urls]) => {
          const validUrls = urls.filter(u => u.trim() !== '');
          if (validUrls.length > 0) acc[key] = validUrls;
          return acc;
        }, {} as Record<string, string[]>);
        
        if (user) {
           // 1) Asegurar que existe un proyecto. En el flujo normal ya se creó en
           //    el paso COMPANY, pero si por alguna razón falló lo creamos ahora.
           let finalProjectId = createdProjectId;
           if (!finalProjectId) {
             const newProject = await createProject({
               userId: user.id,
               data: {
                 name: formData.company_name || 'Mi Primer Proyecto',
                 company_name: formData.company_name || '',
                 industry: formData.industry || '',
                 website: formData.website || '',
                 business_summary: formData.business_summary || '',
                 ideal_customer: formData.ideal_customer || '',
                 unique_value: formData.unique_value || '',
                 social_links: cleanSocial
               }
             });
             finalProjectId = newProject?.id || null;
             if (finalProjectId) setCreatedProjectId(finalProjectId);
           } else {
             // Ya existe: completamos los campos que el usuario llenó después
             try {
               await updateProject({
                 projectId: finalProjectId,
                 userId: user.id,
                 updates: {
                   business_summary: formData.business_summary || '',
                   ideal_customer: formData.ideal_customer || '',
                   unique_value: formData.unique_value || '',
                   social_links: cleanSocial
                 }
               });
             } catch (e) {
               console.error('[Onboarding] Error updating project at FINISH:', e);
             }
           }

           // 2) Guardar el resumen del negocio como memoria, ya con project_id
           if (formData.business_summary || formData.ideal_customer) {
             const contextContent = `RESUMEN DE NEGOCIO:\n${formData.business_summary || 'No proporcionado'}\n\nCLIENTE IDEAL:\n${formData.ideal_customer || 'No proporcionado'}`;
             await saveMemory({
               user_id: user.id,
               project_id: finalProjectId || undefined,
               title: 'Resumen de Negocio y Cliente Ideal (Onboarding)',
               content: contextContent,
               resource_type: 'text',
               memory_category: 'identidad_marca',
               user_confirmed: true
             });
           }

           // 3) Red de seguridad: si por algún edge case quedaron memorias huérfanas
           //    (creadas antes de tener finalProjectId), las asociamos al proyecto.
           if (finalProjectId) {
             try {
               const memoryRepo = new SupabaseMemoryRepository();
               await memoryRepo.assignProjectToNullMemories(user.id, finalProjectId);
               localStorage.setItem('activeProjectId', finalProjectId);
             } catch (e) {
               console.error('[Onboarding] Error backfilling project_id on memories:', e);
             }
           }
        }

        // 2. Mark user onboarding as completed
        await updateOnboarding({
          ...formData,
          onboarding_completed: true,
          additional_context: JSON.stringify({ social_links: socialLinks })
        }, selectedChannelsList);

        onComplete();
        navigate('/?tab=news', { replace: true });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > OnboardingStep.WELCOME) setStep(step - 1);
  };

  const toggleChannel = (channelName: string) => {
    if (channelName === 'Instagram') return; // Instagram is mandatory
    setSocialLinks(prev => {
      const newLinks = { ...prev };
      if (newLinks[channelName]) delete newLinks[channelName];
      else newLinks[channelName] = [''];
      return newLinks;
    });
  };

  const updateSocialLink = (channelName: string, index: number, value: string) => {
    setSocialLinks(prev => {
      const newLinks = { ...prev };
      const channelLinks = [...(newLinks[channelName] || [''])];
      channelLinks[index] = value;
      newLinks[channelName] = channelLinks;
      return newLinks;
    });
  };

  const addSocialLink = (channelName: string) => {
    setSocialLinks(prev => {
      const newLinks = { ...prev };
      newLinks[channelName] = [...(newLinks[channelName] || []), ''];
      return newLinks;
    });
  };

  const removeSocialLink = (channelName: string, index: number) => {
    setSocialLinks(prev => {
      const newLinks = { ...prev };
      const channelLinks = [...(newLinks[channelName] || [])];
      if (channelLinks.length > 1) {
        channelLinks.splice(index, 1);
        newLinks[channelName] = channelLinks;
      } else {
        if (channelName === 'Instagram') return prev; // Cannot remove last Instagram link
        delete newLinks[channelName];
      }
      return newLinks;
    });
  };

  const updateField = (field: keyof User, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (showVideo) {
    return (
      <div 
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center cursor-pointer"
        onClick={() => {
          videoRef.current?.play();
          setAutoplayFailed(false);
        }}
      >
        <video
          ref={videoRef}
          src={onboardingVideo}
          autoPlay
          playsInline
          preload="auto"
          muted={false}
          controls={false}
          onEnded={() => setShowVideo(false)}
          className="w-full h-full object-cover"
        />

        {autoplayFailed && (
          <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-500">
            <Button
              variant="primary"
              className="px-12 py-8 rounded-full shadow-2xl scale-125 flex flex-col gap-4 items-center group transition-all hover:scale-[1.3]"
              onClick={(e) => {
                e.stopPropagation();
                videoRef.current?.play();
                setAutoplayFailed(false);
              }}
            >
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/40 group-hover:bg-white/30 group-hover:scale-110 transition-all">
                <span className="material-symbols-outlined text-5xl text-white">play_arrow</span>
              </div>
              <span className="text-xl font-black tracking-widest text-white uppercase italic">Reproducir Introducción</span>
            </Button>
          </div>
        )}

        <div className="absolute bottom-12 right-12 z-[110]">
          <Button
            variant="outline"
            className="border-white/20 hover:bg-white/10 text-white backdrop-blur-md px-8 py-6 rounded-2xl"
            onClick={(e) => {
              e.stopPropagation();
              setShowVideo(false);
            }}
          >
            Saltar Introducción
          </Button>
        </div>
      </div>
    );
  }

  const guide = (STEP_GUIDES as any)[step];

  return (
    <div className="min-h-screen w-full bg-[hsl(var(--color-bg-light))] flex flex-col items-center p-4 relative overflow-x-hidden transition-colors duration-500">

      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/4 -left-20 w-[400px] h-[400px] bg-[hsl(var(--color-primary)/0.1)] rounded-full blur-[100px]"></div>
        <div className="absolute bottom-1/4 -right-20 w-[450px] h-[450px] bg-[hsl(var(--color-secondary)/0.1)] rounded-full blur-[120px]"></div>
      </div>

      {/* Progress */}
      <div className="w-full max-w-4xl p-4 flex items-center gap-6 z-50">
        <Button variant="ghost" size="sm" onClick={handleBack} disabled={step === OnboardingStep.WELCOME}>
          <span className="material-symbols-outlined">arrow_back</span>
        </Button>
        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-[hsl(var(--color-primary))] transition-all duration-700 shadow-[0_0_15px_hsl(var(--color-primary)/0.5)]" style={{ width: `${progress}%` }}></div>
        </div>
        <span className="text-[10px] font-black tracking-widest opacity-40 uppercase text-slate-800 ">Paso {step}/{totalSteps}</span>
      </div>

      <main className="w-full max-w-7xl flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-20 z-10 pt-12 lg:pt-16 px-4 flex-1">

        {/* Desktop Character */}
        {guide && (
          <div className="hidden lg:block flex-shrink-0 animate-in slide-in-from-left-20 duration-1000 self-center">
            <div className="relative w-[260px] xl:w-[300px]">
              <div className="absolute -top-32 -right-4 w-64 bg-white p-5 rounded-3xl rounded-br-none shadow-2xl border border-slate-100 z-20">
                <p className="text-sm font-bold leading-relaxed text-slate-700 italic">
                  "{guide.message}"
                </p>
                <div className="absolute bottom-[-8px] right-6 w-5 h-5 bg-white rotate-45 border-r border-b border-slate-100 "></div>
              </div>
              <img
                src={guide.character}
                alt="Character guide"
                className="w-full drop-shadow-2xl mt-8"
              />
            </div>
          </div>
        )}

        {/* Mobile Character */}
        {guide && (
          <div className="lg:hidden w-full flex flex-col items-center mb-6 animate-in fade-in zoom-in duration-700 pt-4">
            <div className="relative mb-4 w-full max-w-md">
              <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100 text-xs leading-relaxed font-bold text-center italic mb-4">
                "{guide.message}"
              </div>
              <div className="flex justify-center">
                <img src={guide.character} className="w-20 h-20 object-contain drop-shadow-lg" alt="Mobile character" />
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-5xl flex flex-col items-center">
          {step === OnboardingStep.WELCOME && (
            <div className="text-center space-y-8 animate-in fade-in duration-700">
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 ">¡Bienvenido, {user?.full_name}!</h1>
              <p className="text-slate-500 text-lg">Tu viaje hacia la inteligencia radical comienza aquí.</p>
              <div className="relative w-64 h-64 mx-auto rounded-full overflow-hidden border-8 border-white shadow-2xl bg-white ">
                <img src={ankorImage} alt="Profile" className="w-full h-full object-contain" />
              </div>
            </div>
          )}

          {step === OnboardingStep.COMPANY && (
            <div className="w-full space-y-8 text-center animate-in slide-in-from-right-10 duration-500">
              <h1 className="text-4xl font-bold text-slate-900 ">Sobre tu Empresa</h1>
              <Card className="w-full max-w-3xl p-8 space-y-6 text-left shadow-2xl rounded-[32px] bg-white/80 backdrop-blur-xl border-white ">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <Input
                      label="Nombre Comercial"
                      placeholder="Ej. Mi Marca Pro"
                      value={formData.company_name || ''}
                      onChange={(e) => updateField('company_name', e.target.value)}
                      error={errors.company_name}
                    />
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-tighter mb-2 opacity-50">Industria o Sector</label>
                      <select
                        className={`w-full bg-slate-100 border border-transparent rounded-2xl px-5 py-4 text-sm focus:ring-2 outline-none text-slate-900 transition-colors appearance-none ${errors.industry ? 'border-red-500/50 ring-1 ring-red-500/20' : 'focus:ring-primary'}`}
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23475569' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 1.5rem center',
                          backgroundSize: '1.25rem'
                        }}
                        value={formData.industry || ''}
                        onChange={(e) => updateField('industry', e.target.value)}
                      >
                        <option value="">Selecciona una industria</option>
                        {INDUSTRIES.map(i => <option key={i} value={i} className="">{i}</option>)}
                      </select>
                      {errors.industry && <p className="text-[10px] text-red-500 mt-1.5 ml-1 font-medium italic animate-in slide-in-from-top-1">{errors.industry}</p>}
                    </div>
                    <Input
                      label="Sitio Web"
                      placeholder="https://..."
                      value={formData.website || ''}
                      onChange={(e) => updateField('website', e.target.value)}
                      error={errors.website}
                    />
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-tighter mb-4 opacity-50">Red Social (Instagram obligatorio)</label>
                      
                      <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                        {Object.keys(socialLinks).map(name => (
                          <div key={name} className="animate-in fade-in slide-in-from-left-2 transition-all">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 relative w-full">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                                    <img src={CHANNELS_CONFIG.find(c => c.name === name)?.icon} className="w-4 h-4 opacity-40" alt="" />
                                  </span>
                                  <input
                                    className={`block w-full bg-slate-100 border rounded-xl pl-9 pr-4 py-3 text-xs outline-none transition-all font-medium ${errors.instagram && name === 'Instagram' ? 'border-red-500 bg-red-50/50 text-red-900 placeholder-red-300 focus:ring-1 focus:ring-red-500/20' : 'border-transparent text-slate-900 focus:ring-1 focus:ring-primary/30'}`}
                                    placeholder={`URL de ${name}...`}
                                    value={socialLinks[name][0] || ''}
                                    onChange={(e) => updateSocialLink(name, 0, e.target.value)}
                                  />
                                </div>
                                {name !== 'Instagram' && (
                                  <button
                                    type="button"
                                    onClick={() => toggleChannel(name)}
                                    className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-lg">close</span>
                                  </button>
                                )}
                              </div>
                              {errors.instagram && name === 'Instagram' && (
                                <p className="text-[10px] text-red-500 ml-1 font-medium italic animate-in slide-in-from-top-1">
                                  {errors.instagram}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                        {Object.keys(socialLinks).length === 0 && (
                          <p className="text-[10px] text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 ">
                            Haz clic en los iconos para añadir tus redes
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}


          {step === OnboardingStep.DETAILS && (
            <div className="w-full space-y-8 text-center animate-in slide-in-from-right-10 duration-500">
              <h1 className="text-4xl font-bold text-slate-900 ">Tu Propuesta</h1>
              <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
                <Card className="w-full lg:w-3/5 p-8 text-left shadow-2xl rounded-[32px] bg-white/80 space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-2 opacity-50">Resumen del Negocio</label>
                    <textarea 
                      className="w-full bg-slate-100 rounded-2xl p-4 text-sm h-32 resize-none outline-none focus:ring-2 focus:ring-primary text-slate-900 " 
                      placeholder="Describe brevemente qué haces, tu misión y tus productos principales..." 
                      value={formData.business_summary || ''} 
                      onChange={(e) => updateField('business_summary', e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase mb-2 opacity-50">Tu Cliente Ideal</label>
                    <textarea 
                      className="w-full bg-slate-100 rounded-2xl p-4 text-sm h-24 resize-none outline-none focus:ring-2 focus:ring-primary text-slate-900 " 
                      placeholder="¿A quién ayudas? Define su perfil, necesidades y dolores..." 
                      value={formData.ideal_customer || ''} 
                      onChange={(e) => updateField('ideal_customer', e.target.value)} 
                    />
                  </div>
                </Card>

                <Card className="w-full lg:w-2/5 p-8 text-left shadow-2xl rounded-[32px] bg-white/80 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-outlined text-primary">upload_file</span>
                    <h3 className="font-bold text-slate-800">Archivos de Marca</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">
                    Sube PDF, Word, PPT o fotos. Radikal procesará esta información para que todos los bots conozcan tu empresa a fondo.
                  </p>
                  
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center hover:border-primary hover:bg-slate-50 transition-all cursor-pointer group"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      multiple 
                      accept=".pdf,.doc,.docx,.ppt,.pptx,image/*"
                      onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                    />
                    <span className="material-symbols-outlined text-3xl text-slate-300 group-hover:text-primary transition-colors mb-2">add_circle</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600">Adjuntar Documentos</span>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2 mt-4">
                      {selectedFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 animate-in slide-in-from-left-2 transition-all">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span className="material-symbols-outlined text-slate-400 text-sm">
                              {f.type.startsWith('image/') ? 'image' : 'description'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 truncate">{f.name}</span>
                          </div>
                          <button 
                            onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <span className="material-symbols-outlined text-xs">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {step === OnboardingStep.TEAM_INTRO && (
            <div className="text-center space-y-10 animate-in fade-in zoom-in duration-1000 w-full max-w-6xl mx-auto">
              <div className="space-y-4">
                <span className="text-primary font-bold tracking-[0.2em] uppercase text-sm">Tu Equipo de Élite</span>
                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
                  Preparamos tu camino al éxito
                </h1>
              </div>

              <div className="py-12 w-full max-w-7xl mx-auto px-4 overflow-visible">
                <div className="flex flex-row flex-wrap lg:flex-nowrap justify-center items-end gap-6 md:gap-8 lg:gap-12">
                  {[
                    { img: indexaImage, word: 'SEO' },
                    { img: siraImage, word: 'Mercado' },
                    { img: nexoImage, word: 'Marketing' },
                    { img: kronosImage, word: 'Tareas' }
                  ].map((agent, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center shrink-0 lg:shrink"
                    >
                      <div className="w-20 h-20 md:w-28 md:h-28 lg:w-40 lg:h-40 rounded-[24px] md:rounded-[32px] border-4 border-white overflow-hidden shadow-xl bg-white mb-6">
                        <img src={agent.img} className="w-full h-full object-contain" alt={agent.word} />
                      </div>
                      <span
                        className="text-[9px] md:text-xs font-black uppercase tracking-[0.3em] text-[hsl(var(--color-primary))] animate-word-pulse"
                        style={{ animationDelay: `${i * 400}ms` }}
                      >
                        {agent.word}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-400 mt-12 italic opacity-50 text-center">Un equipo multidisciplinar diseñado para potenciar tu marca.</p>
              </div>
            </div>
          )}

          {step === OnboardingStep.AGENT_ANKOR && (
            <div className="text-center space-y-8 animate-in fade-in zoom-in duration-700">
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 ">Conoce a Ankor</h1>
              <div className="relative w-56 h-72 mx-auto rounded-[40px] overflow-hidden border-8 border-white shadow-2xl">
                <img src={ankorImage} alt="Ankor" className="w-full h-full object-contain bg-slate-50 " />
              </div>
            </div>
          )}

          {step === OnboardingStep.AGENT_INDEXA && (
            <div className="text-center space-y-8 animate-in fade-in zoom-in duration-700">
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 ">Conoce a Indexa</h1>
              <div className="relative w-56 h-72 mx-auto rounded-[40px] overflow-hidden border-8 border-white shadow-2xl">
                <img src={indexaImage} alt="Indexa" className="w-full h-full object-contain bg-slate-50 " />
              </div>
            </div>
          )}

          {step === OnboardingStep.AGENT_SIRA && (
            <div className="text-center space-y-8 animate-in fade-in zoom-in duration-700">
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 ">Conoce a Sira</h1>
              <div className="relative w-56 h-72 mx-auto rounded-[40px] overflow-hidden border-8 border-white shadow-2xl">
                <img src={siraImage} alt="Sira" className="w-full h-full object-contain bg-slate-50 " />
              </div>
            </div>
          )}

          {step === OnboardingStep.AGENT_NEXO && (
            <div className="text-center space-y-8 animate-in fade-in zoom-in duration-700">
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 ">Conoce a Nexo</h1>
              <div className="relative w-56 h-72 mx-auto rounded-[40px] overflow-hidden border-8 border-white shadow-2xl">
                <img src={nexoImage} alt="Nexo" className="w-full h-full object-contain bg-slate-50 " />
              </div>
            </div>
          )}

          {step === OnboardingStep.AGENT_KRONOS && (
            <div className="text-center space-y-8 animate-in fade-in zoom-in duration-700">
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 ">Conoce a Kronos</h1>
              <div className="relative w-56 h-72 mx-auto rounded-[40px] overflow-hidden border-8 border-white shadow-2xl">
                <img src={kronosImage} alt="Kronos" className="w-full h-full object-contain bg-slate-50 " />
              </div>
            </div>
          )}

          {step === OnboardingStep.TEAM_OUTRO && (
            <div className="text-center space-y-6 animate-in fade-in zoom-in duration-1000 w-full max-w-5xl mx-auto">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-6xl font-black tracking-tighter text-slate-900 uppercase italic">
                  Somos un equipo
                </h1>
              </div>

              <div className="relative py-6">
                {/* Decorative circles behind images */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-48 bg-primary/5 rounded-full blur-3xl -z-10"></div>

                <div className="flex flex-nowrap justify-center gap-2 md:gap-6 items-end overflow-visible">
                  {[
                    { img: indexaImage, name: 'Indexa' },
                    { img: siraImage, name: 'Sira' },
                    { img: nexoImage, name: 'Nexo' },
                    { img: kronosImage, name: 'Kronos' }
                  ].map((agent, i) => (
                    <div key={i} className={`flex flex-col items-center animate-in slide-in-from-bottom-${10 + i * 10} duration-700 flex-shrink`}>
                      <img src={agent.img} className="h-24 sm:h-32 md:h-40 lg:h-52 object-contain drop-shadow-2xl hover:scale-110 transition-transform cursor-pointer" alt={agent.name} />
                      <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest mt-2 opacity-40">{agent.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/10 p-5 rounded-[32px] backdrop-blur-sm">
                <p className="text-slate-700 font-semibold italic text-sm">
                  "No estás solo en este camino; estamos aquí para potenciar cada una de tus decisiones."
                </p>
              </div>
            </div>
          )}

          {step === OnboardingStep.FINISH && (
            <div className="text-center py-20 animate-in zoom-in duration-700">
              <div className="w-24 h-24 bg-[hsl(var(--color-primary))] rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/30 animate-pulse">
                <span className="material-symbols-outlined text-4xl text-white">rocket_launch</span>
              </div>
              <h1 className="text-5xl font-bold text-slate-900 tracking-tight">¡Todo listo!</h1>
              <p className="text-slate-500 mt-4 text-xl">Tu espacio de trabajo está preparado para despegar.</p>
            </div>
          )}

          <div className="w-full max-w-md mt-6 pb-10">
            <Button
              onClick={handleNext}
              size="lg"
              className="w-full py-5 text-xl rounded-2xl shadow-xl shadow-primary/20"
              isLoading={loading || isUploadingFiles}
            >
              {isUploadingFiles 
                ? `Subiendo (${uploadProgress.current}/${uploadProgress.total})...` 
                : (step === OnboardingStep.FINISH ? 'Ir al Dashboard' : 'Continuar')}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};
