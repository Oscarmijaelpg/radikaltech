import {
  Badge,
  Button,
  Card,
  Icon,
  Spinner,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@radikal/ui';
import type { Competitor } from '../../api/memory';

interface Props {
  competitor: Competitor;
  analyzing: boolean;
  onAnalyze: (c: Competitor) => void;
  onViewAnalysis: (c: Competitor) => void;
  onEdit: (c: Competitor) => void;
  onDelete: (c: Competitor) => void;
}

export function CompetitorCard({
  competitor: c,
  analyzing,
  onAnalyze,
  onViewAnalysis,
  onEdit,
  onDelete,
}: Props) {
  const analyzed = !!c.last_analyzed_at;
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display font-bold text-lg text-slate-900 truncate">{c.name}</h3>
          {c.website && (
            <a
              href={c.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[hsl(var(--color-primary))] hover:underline truncate block"
            >
              {c.website}
            </a>
          )}
        </div>
        {analyzed && <Badge variant="success">Analizado</Badge>}
      </div>

      {c.notes && <p className="text-sm text-slate-600 line-clamp-3">{c.notes}</p>}

      <div className="mt-auto flex flex-wrap gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" onClick={() => onAnalyze(c)} disabled={analyzing}>
              {analyzing ? <Spinner /> : <Icon name="auto_awesome" className="text-[16px]" />}
              Analizar
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px]">
            Investigamos al competidor con IA y encontramos sus fortalezas y debilidades
          </TooltipContent>
        </Tooltip>
        {analyzed && (
          <Button size="sm" variant="outline" onClick={() => onViewAnalysis(c)}>
            Ver análisis
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => onEdit(c)} aria-label="Editar">
          <Icon name="edit" className="text-[16px]" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(c)} aria-label="Eliminar">
          <Icon name="delete" className="text-[16px]" />
        </Button>
      </div>
    </Card>
  );
}
