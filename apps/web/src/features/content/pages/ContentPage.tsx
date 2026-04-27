import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Icon,
  SectionTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@radikal/ui';
import { AssetGallery } from '../components/AssetGallery';
import { GeneratedLibrary } from '../components/GeneratedLibrary';
import { AssetUploader } from '../components/AssetUploader';
import { ImageGenerator } from '../components/ImageGenerator';
import { NexoIdeasSection } from '../components/NexoIdeasSection';
import { ScheduledPostsTab } from '../components/ScheduledPostsTab';
import { HelpButton } from '@/shared/ui/HelpButton';
import { FeatureHint } from '@/shared/fte/FirstTimeExperience';
import { usePageTour } from '@/shared/tour';

type TabId = 'nexo' | 'gallery' | 'generated_library' | 'upload' | 'generate' | 'scheduled';
const TAB_IDS: TabId[] = ['nexo', 'gallery', 'generated_library', 'upload', 'generate', 'scheduled'];

export function ContentPage() {
  const [searchParams] = useSearchParams();
  const initial = (searchParams.get('tab') as TabId) || 'nexo';
  const [tab, setTab] = useState<TabId>(TAB_IDS.includes(initial) ? initial : 'nexo');
  useEffect(() => {
    const t = searchParams.get('tab') as TabId | null;
    if (t && TAB_IDS.includes(t)) setTab(t);
  }, [searchParams]);

  usePageTour('content');

  const TAB_SUB: Record<TabId, string> = {
    nexo: 'Ideas de Nexo',
    gallery: 'Galería',
    generated_library: 'Biblioteca de imágenes',
    upload: 'Subir archivos',
    generate: 'Generar con IA',
    scheduled: 'Agendados',
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-pink-50/40 via-white to-cyan-50/40">
      {/* Mini breadcrumb */}
      <div className="px-4 sm:px-6 md:px-8 pt-3 pb-1 max-w-7xl mx-auto flex items-center gap-1.5 text-[11px] text-slate-500 min-w-0">
        <Icon name="palette" className="text-[14px] text-[hsl(var(--color-primary))]" />
        <span className="font-semibold truncate">Crear</span>
        <span className="opacity-40">›</span>
        <span className="truncate">Contenido · {TAB_SUB[tab]}</span>
      </div>
      <div className="p-4 sm:p-6 md:p-8 pt-2 max-w-7xl mx-auto">
        <FeatureHint
          id="content-first-v1"
          title="Sube imágenes existentes o genera nuevas con IA"
          description="Aquí vive tu banco visual. Analizamos cada asset y generamos contenido fiel a tu marca."
        >
        <header className="mb-8 md:mb-10 relative overflow-hidden rounded-[28px] md:rounded-[32px] bg-gradient-to-br from-amber-500 to-orange-600 p-6 md:p-10 text-white shadow-2xl">
          <div className="absolute top-4 right-4 z-20">
            <HelpButton
              title="Contenido"
              description="Sube tus imágenes existentes o genera nuevas con IA. Después puedes agendarlas en el calendario editorial."
              tips={[
                'Usa Galería para ver y organizar todo tu contenido visual.',
                'Generar con IA respeta tu logo y paleta de marca si lo activas.',
                'Agenda posts multiplataforma desde la pestaña Agendados.',
              ]}
            />
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-4 md:gap-6">
            <div>
              <SectionTitle className="opacity-80 text-white mb-2">
                Biblioteca visual
              </SectionTitle>
              <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight">
                Contenido
              </h1>
              <p className="text-white/80 mt-3 text-base md:text-lg">
                Sube, evalúa y organiza los archivos de tu marca con IA.
              </p>
            </div>
          </div>
        </header>
        </FeatureHint>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
          <TabsList data-tour="content-tabs">
            <TabsTrigger value="nexo" data-tour="content-nexo">Ideas de Nexo</TabsTrigger>
            <TabsTrigger value="gallery" data-tour="content-gallery">Galería</TabsTrigger>
            <TabsTrigger value="generated_library">Biblioteca de imágenes</TabsTrigger>
            <TabsTrigger value="upload" data-tour="content-upload">Subir</TabsTrigger>
            <TabsTrigger value="generate" data-tour="content-generate">Generar con IA</TabsTrigger>
            <TabsTrigger value="scheduled" data-tour="content-scheduled">Agendados</TabsTrigger>
          </TabsList>

          <TabsContent value="nexo" className="animate-in fade-in slide-in-from-right-2 duration-300">
            <NexoIdeasSection />
          </TabsContent>

          <TabsContent value="gallery" className="animate-in fade-in slide-in-from-right-2 duration-300">
            <AssetGallery />
          </TabsContent>

          <TabsContent value="generated_library" className="animate-in fade-in slide-in-from-right-2 duration-300">
            <GeneratedLibrary />
          </TabsContent>

          <TabsContent value="upload" className="animate-in fade-in slide-in-from-right-2 duration-300">
            <AssetUploader />
          </TabsContent>

          <TabsContent value="generate" className="animate-in fade-in slide-in-from-right-2 duration-300">
            <ImageGenerator />
          </TabsContent>

          <TabsContent value="scheduled" className="animate-in fade-in slide-in-from-right-2 duration-300">
            <ScheduledPostsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
