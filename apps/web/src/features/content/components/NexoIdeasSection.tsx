import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  Icon,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import { useToast } from '@/shared/ui/Toaster';
import { IdeaCard } from './nexo-ideas/IdeaCard';
import { VisualContract } from './nexo-ideas/VisualContract';
import {
  useGenerateIdeas,
  type ContentIdea,
  type IdeaAngle,
} from './nexo-ideas/api';

const ANGLES: Array<{ value: IdeaAngle; label: string; hint: string }> = [
  { value: 'auto', label: 'Automático', hint: 'La IA elige el mejor ángulo por idea' },
  { value: 'educativo', label: 'Educativo', hint: 'Enseñar, datos, how-tos' },
  { value: 'entretenimiento', label: 'Entretenimiento', hint: 'Humor, trends, cultura' },
  { value: 'venta', label: 'Venta directa', hint: 'Demostración con CTA' },
  { value: 'storytelling', label: 'Storytelling', hint: 'Casos y narrativa de marca' },
];

export function NexoIdeasSection() {
  const { activeProject } = useProject();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [angle, setAngle] = useState<IdeaAngle>('auto');
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [selected, setSelected] = useState<ContentIdea | null>(null);

  const generate = useGenerateIdeas();
  const loading = generate.isPending;

  const handleGenerate = async () => {
    if (!activeProject) return;
    try {
      const res = await generate.mutateAsync({ projectId: activeProject.id, angle });
      setIdeas(res.ideas);
      if (res.ideas.length === 0) {
        toast({
          title: 'Sin ideas',
          description: 'El motor no produjo ideas. Prueba con otro ángulo.',
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast({ title: 'No pudimos generar ideas', description: msg, variant: 'error' });
    }
  };

  const handleGenerateImage = (idea: ContentIdea) => {
    const prompt = [idea.title, idea.visual_suggestion].filter(Boolean).join('. ');
    navigate(
      `/content?tab=generate&prompt=${encodeURIComponent(prompt)}&variations=${idea.image_count}`,
    );
  };

  if (!activeProject) {
    return (
      <Card className="p-6">
        <CharacterEmpty
          character="sira"
          title="Selecciona un proyecto"
          message="Para generar ideas de contenido necesito saber de qué marca estamos hablando."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5 md:p-6 bg-gradient-to-br from-cyan-50/60 to-blue-50/60 border-cyan-100">
        <div className="flex items-start gap-3 mb-4">
          <Icon name="lightbulb" className="text-cyan-600 text-[28px] mt-1" />
          <div>
            <h2 className="font-display font-bold text-lg text-slate-900">Ideas de Nexo</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Propuestas de contenido sustentadas en la memoria de tu marca y tendencias
              verificadas del sector. Cada idea incluye un gancho, por qué funciona, y sugerencia
              visual.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1 min-w-0">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1.5 block">
              Ángulo de contenido
            </label>
            <Select value={angle} onValueChange={(v) => setAngle(v as IdeaAngle)}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANGLES.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{a.label}</span>
                      <span className="text-xs text-slate-500">{a.hint}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={loading} className="h-11">
            {loading ? (
              <>
                <Spinner size="sm" />
                Generando…
              </>
            ) : (
              <>
                <Icon name="auto_awesome" className="text-[18px]" />
                {ideas.length > 0 ? 'Regenerar ideas' : 'Generar ideas'}
              </>
            )}
          </Button>
        </div>
      </Card>

      {loading && ideas.length === 0 && (
        <Card className="p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <Spinner size="lg" />
            <p className="font-display font-semibold text-slate-700">
              Nexo está analizando tu marca y el mercado…
            </p>
            <p className="text-xs text-slate-500 max-w-md">
              Esto puede tardar entre 60 y 90 segundos mientras la IA verifica tendencias con
              búsqueda web y cruza tu memoria de marca.
            </p>
          </div>
        </Card>
      )}

      {!loading && ideas.length === 0 && (
        <Card className="p-6">
          <CharacterEmpty
            character="sira"
            title="Listo cuando quieras"
            message='Elige un ángulo y pulsa "Generar ideas". Usaré tu memoria de marca, los competidores detectados y tendencias en vivo para proponer contenido accionable.'
          />
        </Card>
      )}

      {ideas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ideas.map((idea, i) => (
            <IdeaCard
              key={`${idea.title}-${i}`}
              idea={idea}
              onOpen={() => setSelected(idea)}
              onGenerateImage={() => handleGenerateImage(idea)}
            />
          ))}
        </div>
      )}

      <VisualContract
        idea={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        onGenerateImage={() => {
          if (selected) handleGenerateImage(selected);
          setSelected(null);
        }}
      />
    </div>
  );
}
