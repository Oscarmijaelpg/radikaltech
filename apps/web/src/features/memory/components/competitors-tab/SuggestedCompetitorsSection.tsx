import { Badge, Button, Card, Icon } from '@radikal/ui';
import type { Competitor } from '../../api/memory';

interface Props {
  suggested: Competitor[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onApproveAll: () => void;
  onRejectAll: () => void;
  bulkApproving: boolean;
  bulkRejecting: boolean;
}

export function SuggestedCompetitorsSection({
  suggested,
  onApprove,
  onReject,
  onApproveAll,
  onRejectAll,
  bulkApproving,
  bulkRejecting,
}: Props) {
  return (
    <Card className="p-5 bg-amber-50 border-amber-200 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon name="auto_awesome" className="text-amber-700" />
          <p className="text-sm font-semibold text-amber-900">
            Sira detectó {suggested.length} competidores potenciales
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onRejectAll} disabled={bulkRejecting}>
            Rechazar todos
          </Button>
          <Button size="sm" onClick={onApproveAll} disabled={bulkApproving}>
            Aceptar todos
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {suggested.map((c) => (
          <Card key={c.id} className="p-4 bg-white flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold text-slate-900 truncate">{c.name}</h4>
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
              <Badge variant="outline">Sugerido</Badge>
            </div>
            {c.notes && <p className="text-xs text-slate-600 line-clamp-3">{c.notes}</p>}
            <div className="mt-auto flex gap-2 pt-1">
              <Button size="sm" onClick={() => onApprove(c.id)}>
                Aceptar
              </Button>
              <Button size="sm" variant="outline" onClick={() => onReject(c.id)}>
                Rechazar
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
}
