import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Tabs, TabsContent, TabsList, TabsTrigger } from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { BrandTab } from '../components/BrandTab';
import { ProductsTab } from '../components/ProductsTab';
import { CustomersTab } from '../components/CustomersTab';
import { CompetitorsTab } from '../components/CompetitorsTab';
import { SavedChatsTab } from '../components/SavedChatsTab';
import { NeuronasTab } from '../components/NeuronasTab';
import { HelpButton } from '@/shared/ui/HelpButton';
import { FeatureHint } from '@/shared/fte/FirstTimeExperience';

type TabId = 'brand' | 'products' | 'customers' | 'competitors' | 'saved_chats' | 'neuronas';
const VALID_TABS: TabId[] = ['brand', 'products', 'customers', 'competitors', 'saved_chats', 'neuronas'];

const TAB_CONTEXT: Record<TabId, { section: string; sub: string }> = {
  brand: { section: 'Mi marca', sub: 'Mi identidad' },
  products: { section: 'Mi marca', sub: 'Productos' },
  customers: { section: 'Mi marca', sub: 'Clientes' },
  competitors: { section: 'Mi marca', sub: 'Competencia' },
  saved_chats: { section: 'Mi marca', sub: 'Chats guardados' },
  neuronas: { section: 'Mi marca', sub: 'Biblioteca' },
};

export function MemoryPage() {
  const { activeProject } = useProject();
  const [searchParams] = useSearchParams();
  const initial = searchParams.get('tab') as TabId | null;
  const [tab, setTab] = useState<TabId>(initial && VALID_TABS.includes(initial) ? initial : 'brand');

  useEffect(() => {
    const t = searchParams.get('tab') as TabId | null;
    if (t && VALID_TABS.includes(t)) setTab(t);
  }, [searchParams]);

  const ctx = TAB_CONTEXT[tab];

  return (
    <div className="min-h-full bg-gradient-to-br from-pink-50/40 via-white to-cyan-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Mini breadcrumb */}
      <div className="px-4 sm:px-6 md:px-8 pt-3 pb-1 max-w-7xl mx-auto flex items-center justify-between gap-3 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="material-symbols-outlined text-[14px] text-[hsl(var(--color-primary))]">auto_awesome</span>
          <span className="font-semibold truncate">{ctx.section}</span>
          <span className="opacity-40">›</span>
          <span className="truncate">{ctx.sub}</span>
        </div>
        <kbd className="hidden md:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
          ⌘K Buscar
        </kbd>
      </div>
      <div className="p-4 sm:p-6 md:p-8 pt-2 max-w-7xl mx-auto">
        <FeatureHint
          id="memory-brand-v1"
          title="Aquí defines cómo eres como marca"
          description="Completa tu identidad: esencia, tono de voz y visión. Todo lo que creemos será coherente."
        >
        <header className="mb-4 sm:mb-6 md:mb-8 relative overflow-hidden rounded-2xl sm:rounded-[28px] md:rounded-[32px] bg-gradient-to-br from-violet-500 to-purple-600 p-4 sm:p-6 md:p-10 text-white shadow-2xl">
          <div className="absolute top-4 right-4 z-20">
            <HelpButton
              title="Memoria de marca"
              description="Aquí vive todo sobre tu marca: identidad, productos, clientes, competidores y notas. Cuanto más completes, mejor funciona la IA."
              tips={[
                'Completa primero Mi identidad para que todos los agentes tengan contexto.',
                'Añade competidores para activar análisis comparativos.',
                'Usa Chats guardados y Biblioteca como memoria de largo plazo.',
              ]}
            />
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-sm grid place-items-center shrink-0">
              <span className="material-symbols-outlined text-[24px] sm:text-[32px]">auto_awesome</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">
                Base de conocimiento
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-display font-black tracking-tight">
                Identidad
              </h1>
              <p className="text-white/80 mt-2">
                Todo lo que la IA sabe sobre tu marca, en un solo lugar.
              </p>
            </div>
          </div>
        </header>
        </FeatureHint>

        {!activeProject ? (
          <Card className="p-12 text-center">
            <p className="text-sm text-slate-500">
              Selecciona un proyecto para ver su identidad.
            </p>
          </Card>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="w-full">
            <TabsList className="flex overflow-x-auto scrollbar-hide max-w-full flex-nowrap">
              <TabsTrigger value="brand" className="shrink-0">Mi identidad</TabsTrigger>
              <TabsTrigger value="products" className="shrink-0">Productos</TabsTrigger>
              <TabsTrigger value="customers" className="shrink-0">Clientes</TabsTrigger>
              <TabsTrigger value="competitors" className="shrink-0">Competencia</TabsTrigger>
              <TabsTrigger value="saved_chats" className="shrink-0">Chats guardados</TabsTrigger>
              <TabsTrigger value="neuronas" className="shrink-0">Biblioteca</TabsTrigger>
            </TabsList>
            <TabsContent value="brand" className="animate-in fade-in slide-in-from-right-2 duration-300">
              <BrandTab projectId={activeProject.id} />
            </TabsContent>
            <TabsContent value="products" className="animate-in fade-in slide-in-from-right-2 duration-300">
              <ProductsTab projectId={activeProject.id} />
            </TabsContent>
            <TabsContent value="customers" className="animate-in fade-in slide-in-from-right-2 duration-300">
              <CustomersTab projectId={activeProject.id} />
            </TabsContent>
            <TabsContent value="competitors" className="animate-in fade-in slide-in-from-right-2 duration-300">
              <CompetitorsTab projectId={activeProject.id} />
            </TabsContent>
            <TabsContent value="saved_chats" className="animate-in fade-in slide-in-from-right-2 duration-300">
              <SavedChatsTab projectId={activeProject.id} />
            </TabsContent>
            <TabsContent value="neuronas" className="animate-in fade-in slide-in-from-right-2 duration-300">
              <NeuronasTab projectId={activeProject.id} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
