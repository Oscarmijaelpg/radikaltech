import {
  Button,
  Icon,
  Spinner,
} from '@radikal/ui';
import { useAcceptBrandSuggestion } from '../../api/memory';

export function SuggestedPaletteBlock({
  projectId,
  suggested,
}: {
  projectId: string;
  suggested: string[];
}) {
  const accept = useAcceptBrandSuggestion();
  return (
    <div className="mt-5 pt-4 border-t border-white/60">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 flex items-center gap-1.5">
          <Icon name="auto_awesome" className="text-[14px] text-[hsl(var(--color-primary))]" />
          Paleta sugerida por IA
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={accept.isPending}
          onClick={() => accept.mutate({ project_id: projectId, field: 'color_palette' })}
        >
          {accept.isPending ? <Spinner /> : null}
          Usar esta paleta
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggested.slice(0, 6).map((c, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl border-2 border-dashed border-white shadow-md"
              style={{ backgroundColor: c }}
              title={c}
            />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
              {c}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
