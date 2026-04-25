import { Badge, Button, Icon } from '@radikal/ui';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { CHARACTERS } from '@/shared/characters';
import type { Competitor } from '../../api/memory';

interface Props {
  competitor: Competitor;
  onBack: () => void;
  onDownload: () => void;
}

export function HeaderSection({ competitor, onBack, onDownload }: Props) {
  const sira = CHARACTERS.sira;
  const analyzed = competitor.last_analyzed_at
    ? formatDistanceToNow(new Date(competitor.last_analyzed_at), {
        addSuffix: true,
        locale: es,
      })
    : null;

  return (
    <div className="relative overflow-hidden rounded-[28px] md:rounded-[32px] bg-gradient-to-br from-rose-500 to-fuchsia-600 p-6 md:p-10 text-white shadow-2xl">
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/10 blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3 mb-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="!text-white hover:!bg-white/15"
          >
            <Icon name="arrow_back" className="text-[18px]" />
            Competencia
          </Button>
          <Button
            onClick={onDownload}
            className="bg-white !text-rose-600 hover:bg-white/90"
          >
            <Icon name="download" className="text-[18px]" />
            Descargar PDF
          </Button>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`hidden sm:block w-14 h-14 rounded-2xl bg-gradient-to-br ${sira.accent} p-[2px] shrink-0`}
            >
              <div className="w-full h-full rounded-[14px] bg-white overflow-hidden">
                <img src={sira.image} alt={sira.name} className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">
                Reporte de competencia · Sira
              </p>
              <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight truncate">
                {competitor.name}
              </h1>
              {competitor.website && (
                <a
                  href={competitor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 text-sm hover:underline inline-flex items-center gap-1 mt-1"
                >
                  <Icon name="open_in_new" className="text-[14px]" />
                  {competitor.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
          {analyzed && (
            <Badge className="bg-white/20 text-white border border-white/30 self-start md:self-end">
              <Icon name="schedule" className="text-[14px]" />
              Analizado {analyzed}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
