import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  RadioGroup,
  RadioGroupItem,
  Spinner,
  Textarea,
} from '@radikal/ui';
import type { AnalysisMode, Competitor } from '../api/memory';

const SOCIAL_NETWORKS: Array<{ key: string; label: string; icon: string }> = [
  { key: 'instagram', label: 'Instagram', icon: 'photo_camera' },
  { key: 'tiktok', label: 'TikTok', icon: 'music_note' },
  { key: 'facebook', label: 'Facebook', icon: 'thumb_up' },
  { key: 'youtube', label: 'YouTube', icon: 'play_circle' },
  { key: 'linkedin', label: 'LinkedIn', icon: 'work' },
  { key: 'x', label: 'X / Twitter', icon: 'alternate_email' },
];

export interface CompetitorFormData {
  name: string;
  website: string;
  notes: string;
  social_links: Record<string, string>;
  analysis_mode: AnalysisMode;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Competitor | null;
  onSubmit: (data: CompetitorFormData) => Promise<void> | void;
  saving?: boolean;
}

export function CompetitorModal({ open, onOpenChange, initial, onSubmit, saving }: Props) {
  const [form, setForm] = useState<CompetitorFormData>({
    name: '',
    website: '',
    notes: '',
    social_links: {},
    analysis_mode: 'combined',
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? '',
        website: initial?.website ?? '',
        notes: initial?.notes ?? '',
        social_links: (initial?.social_links as Record<string, string> | null) ?? {},
        analysis_mode: 'combined',
      });
    }
  }, [open, initial]);

  const submit = async () => {
    if (!form.name.trim()) return;
    await onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] sm:max-w-xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] overflow-y-auto rounded-none sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar competidor' : 'Nuevo competidor'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            label="Nombre *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Website"
            placeholder="https://..."
            value={form.website}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
          />
          <Textarea
            label="Notas"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Redes sociales
            </p>
            {SOCIAL_NETWORKS.map((n) => (
              <Input
                key={n.key}
                icon={n.icon}
                placeholder={`URL de ${n.label}`}
                value={form.social_links[n.key] ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    social_links: { ...f.social_links, [n.key]: e.target.value },
                  }))
                }
              />
            ))}
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Modo de análisis
            </p>
            <RadioGroup
              value={form.analysis_mode}
              onValueChange={(v) => setForm((f) => ({ ...f, analysis_mode: v as AnalysisMode }))}
            >
              {[
                { v: 'social', t: 'Solo redes (engagement)', d: 'Scrapea Instagram y TikTok; calcula métricas.' },
                { v: 'web', t: 'Solo web (mercado)', d: 'Búsqueda web + síntesis IA sin tocar redes.' },
                { v: 'combined', t: 'Combinado (recomendado)', d: 'Ejecuta ambos para máxima visibilidad.' },
              ].map((o) => (
                <label
                  key={o.v}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50"
                >
                  <RadioGroupItem value={o.v} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{o.t}</p>
                    <p className="text-[11px] text-slate-500">{o.d}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || !form.name.trim()}>
            {saving ? <Spinner /> : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
