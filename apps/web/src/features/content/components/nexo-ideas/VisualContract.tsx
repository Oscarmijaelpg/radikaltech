import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icon,
} from '@radikal/ui';
import type { ContentIdea } from './api';

interface Props {
  idea: ContentIdea | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onGenerateImage: () => void;
}

export function VisualContract({ idea, open, onOpenChange, onGenerateImage }: Props) {
  if (!idea) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{idea.title}</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200">
              {idea.platform}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
              {idea.type === 'carrusel'
                ? `Carrusel · ${idea.image_count} imágenes`
                : 'Pilar · 1 imagen'}
            </span>
          </div>

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Concepto
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {idea.description}
            </p>
          </section>

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Sugerencia visual
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {idea.visual_suggestion || 'Sin sugerencia visual específica.'}
            </p>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={onGenerateImage}>
            <Icon name="auto_awesome" className="text-[16px]" />
            Generar imagen con esta idea
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
