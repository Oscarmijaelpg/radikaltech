import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icon,
  Spinner,
} from '@radikal/ui';
import { CHARACTERS } from '@/shared/characters';
import type { Competitor } from '../../api/memory';

const ESTIMATED_SECONDS = 30;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  competitor: Competitor | null;
  onConfirm: () => void;
  loading?: boolean;
}

export function AnalyzeCompetitorConfirm({
  open,
  onOpenChange,
  competitor,
  onConfirm,
  loading,
}: Props) {
  const sira = CHARACTERS.sira;
  const socialLinks = competitor?.social_links || {};
  const hasSocials = Object.keys(socialLinks).length > 0;

  const steps = [
    { icon: 'public', label: 'Leemos su sitio web' },
    { 
      icon: 'hub', 
      label: hasSocials 
        ? `Analizamos ${Object.keys(socialLinks).join(', ')}` 
        : 'Buscamos sus redes sociales' 
    },
    { icon: 'balance', label: 'Extraemos fortalezas y debilidades' },
    { icon: 'insights', label: 'Analizamos sus últimas publicaciones' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Analizar a {competitor?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div
              className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${sira.accent} p-[2px] shrink-0`}
            >
              <div className="w-full h-full rounded-[14px] bg-white overflow-hidden">
                <img src={sira.image} alt={sira.name} className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">Sira se encarga</p>
              <p className="text-xs text-slate-500">{sira.tagline}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              Qué vamos a hacer
            </p>
            <ul className="space-y-2">
              {steps.map((s) => (
                <li key={s.icon} className="flex items-center gap-3 text-sm text-slate-700">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 grid place-items-center text-slate-600 shrink-0">
                    <Icon name={s.icon} className="text-[18px]" />
                  </div>
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2">
            <Icon name="schedule" className="text-[16px]" />
            Tiempo aproximado: ~{ESTIMATED_SECONDS}s
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? <Spinner /> : <Icon name="auto_awesome" className="text-[18px]" />}
            {loading ? 'Analizando…' : 'Analizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
