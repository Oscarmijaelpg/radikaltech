import { Button, Card, Icon } from '@radikal/ui';
import { CHARACTERS } from '@/shared/characters';

interface Props {
  onGenerate: () => void;
  generating: boolean;
}

export function MissingNarrativeBanner({ onGenerate, generating }: Props) {
  const sira = CHARACTERS.sira;
  return (
    <Card className="p-5 sm:p-6 bg-gradient-to-br from-violet-50 to-pink-50 border-violet-200">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${sira.accent} p-[2px] shrink-0`}>
          <div className="w-full h-full rounded-[14px] bg-white overflow-hidden">
            <img src={sira.image} alt={sira.name} className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-black text-base text-slate-900">
            Interpretación pendiente
          </p>
          <p className="text-sm text-slate-600 mt-1">
            Este competidor fue analizado antes de que Sira interpretara los datos. Genera el
            resumen ejecutivo, la lectura de estética y tus oportunidades.
          </p>
        </div>
        <Button onClick={onGenerate} disabled={generating} className="shrink-0">
          <Icon name={generating ? 'hourglass_empty' : 'auto_awesome'} className="text-[18px]" />
          {generating ? 'Generando…' : 'Generar interpretación'}
        </Button>
      </div>
    </Card>
  );
}
