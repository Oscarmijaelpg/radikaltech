import { Button } from '@radikal/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  totalPages: number;
  total: number;
  isFetching?: boolean;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, isFetching, onChange }: Props) {
  if (totalPages <= 1) {
    return (
      <div className="text-xs text-slate-500 pt-2">
        {total} {total === 1 ? 'resultado' : 'resultados'}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between pt-2">
      <div className="text-xs text-slate-500">
        Página {page} de {totalPages} · {total} total
        {isFetching && ' · actualizando…'}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={16} />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Siguiente
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
