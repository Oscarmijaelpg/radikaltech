import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Spinner } from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { useToast } from '@/shared/ui/Toaster';
import { WebsiteSource } from '@radikal/shared';
import { useAuth } from '@/providers/AuthProvider';
import { OnboardingLayout } from '../components/OnboardingLayout';
import ankorImg from '@/media/ankor.webp';
import siraImg from '@/media/Sira.webp';
import nexoImg from '@/media/Nexo.webp';
import kronosImg from '@/media/Kronos.webp';
import indexaImg from '@/media/indexa.webp';
import { WelcomeStep } from '../components/steps/WelcomeStep';
import { CompanyStep } from '../components/steps/CompanyStep';
import { WebsiteStep } from '../components/steps/WebsiteStep';
import { SocialStep } from '../components/steps/SocialStep';
import { BrandStep } from '../components/steps/BrandStep';
import { ObjectivesStep } from '../components/steps/ObjectivesStep';
import { CompleteStep } from '../components/steps/CompleteStep';
import { useOnboarding } from '../hooks/useOnboarding';
import type { CompanyData } from '../schemas/steps';

const STEP_INDEX: Record<string, number> = {
  welcome: 0,
  company: 0,
  socials: 2,
  brand: 3,
  objectives: 4,
  complete: 4,
};

export function OnboardingPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const { refetch: refetchProjects } = useProject();
  const qc = useQueryClient();
  const { toast } = useToast();
  const {
    state,
    loading,
    saving,
    error,
    dismissError,
    submitStep,
    goNext,
    goBack,
    goToStep,
    completeOnboarding,
  } = useOnboarding();

  // El paso "company" se divide visualmente en CompanyStep + WebsiteStep. forceBasics permite
  // volver al primer substep desde el botón "Atrás" del WebsiteStep sin borrar la data ya guardada.
  const [forceBasics, setForceBasics] = useState(false);

  const stepperIndex = useMemo(() => {
    if (state.currentStep === 'company') {
      // company step contains both "company" sub-screen and website. Keep index 0 for company.
      // If company already has website_source set beyond NONE or business_summary, treat as website substep (1).
      const hasCompanyBasics =
        state.company?.company_name && state.company?.industry;
      if (
        hasCompanyBasics &&
        (state.company?.website_source !== undefined &&
          state.company?.website_source !== null)
      ) {
        return 1;
      }
      return 0;
    }
    return STEP_INDEX[state.currentStep] ?? 0;
  }, [state]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-pink-50 via-white to-cyan-50">
        <Spinner size="lg" />
      </div>
    );
  }

  const hasBasics = !!(state.company?.company_name && state.company?.industry);
  const showWebsiteSubstep = state.currentStep === 'company' && hasBasics && !forceBasics;

  const handleCompanyBasics = async (partial: CompanyData) => {
    await submitStep('company', partial);
    setForceBasics(false);
  };

  const handleCompanyFull = async (full: CompanyData) => {
    const prevUrl = state.company?.website_url ?? null;
    await submitStep('company', full);
    if (full.website_source === WebsiteSource.URL && full.website_url && full.website_url !== prevUrl) {
      toast({
        title: 'Analizando tu sitio web',
        description:
          'Sira está extrayendo logo, colores y propuesta de valor. Aparecerán automáticamente en los próximos pasos.',
        variant: 'success',
      });
      qc.invalidateQueries({ queryKey: ['jobs', 'active', 'user'] });
    }
    goNext(); // → socials
  };

  const character = (() => {
    if (state.currentStep === 'welcome' || state.currentStep === 'complete') return undefined;
    if (state.currentStep === 'company' && !showWebsiteSubstep) {
      return {
        src: ankorImg,
        name: 'Ankor',
        message:
          'Necesitamos estos datos para darle una identidad formal a tu empresa. Será el ancla de todo lo que creemos juntos.',
      };
    }
    if (state.currentStep === 'company' && showWebsiteSubstep) {
      return {
        src: siraImg,
        name: 'Sira',
        message:
          'Si tienes un sitio, puedo analizarlo y mapear tu negocio en segundos. Si no, cuéntame tú a qué te dedicas.',
      };
    }
    if (state.currentStep === 'socials') {
      return {
        src: nexoImg,
        name: 'Nexo',
        message:
          'Conecta tus redes — tantas como quieras, ninguna es obligatoria. Las uso para aprender tu voz visual.',
      };
    }
    if (state.currentStep === 'brand') {
      return {
        src: kronosImg,
        name: 'Kronos',
        message:
          'Tu voz de marca es tu firma. Cuéntame cómo suenas para que todo lo que escriba se sienta 100% tuyo.',
      };
    }
    if (state.currentStep === 'objectives') {
      return {
        src: indexaImg,
        name: 'Indexa',
        message:
          'Con objetivos claros puedo medir lo que importa y orientar cada propuesta hacia resultados reales.',
      };
    }
    return undefined;
  })();

  return (
    <OnboardingLayout
      stepIndex={stepperIndex}
      showStepper={state.currentStep !== 'welcome' && state.currentStep !== 'complete'}
      character={character}
      fullWidth={state.currentStep === 'welcome' || state.currentStep === 'complete'}
      errorMessage={error}
      onDismissError={dismissError}
      saving={saving}
    >
      {state.currentStep === 'welcome' && (
        <WelcomeStep onStart={() => goToStep('company')} />
      )}

      {state.currentStep === 'company' && !showWebsiteSubstep && (
        <CompanyStep
          defaultValues={state.company}
          saving={saving}
          onBack={() => goToStep('welcome')}
          onSubmit={handleCompanyBasics}
        />
      )}

      {state.currentStep === 'company' && showWebsiteSubstep && (
        <WebsiteStep
          defaultValues={{
            company_name: state.company!.company_name!,
            industry: state.company!.industry!,
            industry_custom: state.company?.industry_custom ?? null,
            website_source: state.company?.website_source ?? WebsiteSource.NONE,
            website_url: state.company?.website_url ?? null,
            website_manual_description: state.company?.website_manual_description ?? null,
            business_summary: state.company?.business_summary ?? null,
            ideal_customer: state.company?.ideal_customer ?? null,
            unique_value: state.company?.unique_value ?? null,
            main_products: state.company?.main_products ?? null,
            additional_context: state.company?.additional_context ?? null,
          }}
          saving={saving}
          onBack={() => setForceBasics(true)}
          onSubmit={handleCompanyFull}
        />
      )}

      {state.currentStep === 'socials' && (
        <SocialStep
          defaultValues={state.socials}
          saving={saving}
          onBack={goBack}
          onSubmit={async (data) => {
            await submitStep('socials', data);
            const hasIgUrl = data.accounts.some(
              (a) => a.platform === 'instagram' && a.source === 'url' && a.url,
            );
            if (hasIgUrl) {
              toast({
                title: 'Extrayendo tu Instagram',
                description:
                  'Estamos descargando tus últimos posts para aprender tu voz visual. Puedes seguir avanzando mientras termina.',
                variant: 'success',
              });
              qc.invalidateQueries({ queryKey: ['jobs', 'active', 'user'] });
            }
            goNext();
          }}
        />
      )}

      {state.currentStep === 'brand' && (
        <BrandStep
          defaultValues={{
            ...(state.brand ?? {}),
            target_audience:
              state.brand?.target_audience || state.company?.ideal_customer || null,
            brand_story:
              state.brand?.brand_story || state.company?.unique_value || null,
          }}
          saving={saving}
          onBack={goBack}
          onSubmit={async (data) => {
            await submitStep('brand', data);
            goNext();
          }}
        />
      )}

      {state.currentStep === 'objectives' && (
        <ObjectivesStep
          defaultValues={state.objectives}
          saving={saving}
          brandCompleted={!!state.brand?.tone_of_voice}
          onBack={goBack}
          onSubmit={async (data) => {
            await submitStep('objectives', data);
            goNext();
          }}
        />
      )}

      {state.currentStep === 'complete' && (
        <CompleteStep
          state={state}
          onFinish={async () => {
            await completeOnboarding();
            await refreshProfile();
            await refetchProjects();
            await qc.invalidateQueries({ queryKey: ['projects'] });
            await qc.invalidateQueries({ queryKey: ['memory'] });
            await qc.invalidateQueries({ queryKey: ['content'] });
            await qc.invalidateQueries({ queryKey: ['stats'] });
            navigate('/', { replace: true });
          }}
        />
      )}
    </OnboardingLayout>
  );
}
