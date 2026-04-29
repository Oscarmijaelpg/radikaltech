import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Combobox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icon,
  Input,
  Spinner,
} from '@radikal/ui';
import { INDUSTRIES } from '@radikal/shared';
import { api } from '@/lib/api';
import { useProject, type Project } from '@/providers/ProjectProvider';
import { useToast } from '@/shared/ui/Toaster';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  name: string;
  company_name: string;
  industry: string;
  industry_custom: string;
  website: string;
  instagram: string;
}

function normalizeInstagramUrl(raw: string): string | null {
  const s = raw.trim().replace(/^@/, '');
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const handle = s.split('/')[0]?.trim();
  if (!handle) return null;
  return `https://www.instagram.com/${handle}/`;
}

const EMPTY_FORM: FormData = {
  name: '',
  company_name: '',
  industry: '',
  industry_custom: '',
  website: '',
  instagram: '',
};

export function NewProjectDialog({ open, onOpenChange }: Props) {
  const { refetch, setActiveProject } = useProject();
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const isCustomIndustry =
    !!form.industry && !INDUSTRIES.includes(form.industry as (typeof INDUSTRIES)[number]);
  const isOtroIndustry = form.industry === 'Otro';
  const showCustomField = isCustomIndustry || isOtroIndustry;

  function reset() {
    setForm(EMPTY_FORM);
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      toast({ title: 'El nombre es obligatorio', variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
      };
      if (form.company_name.trim()) payload.company_name = form.company_name.trim();
      if (form.industry.trim()) payload.industry = form.industry.trim();
      if (showCustomField && form.industry_custom.trim()) {
        payload.industry_custom = form.industry_custom.trim();
      }
      if (form.website.trim()) payload.website = form.website.trim();
      const igUrl = normalizeInstagramUrl(form.instagram);
      if (igUrl) payload.instagram_url = igUrl;

      const res = await api.post<{ data: Project }>('/projects', payload);
      const created = res.data;

      await refetch();
      setActiveProject(created);

      const analyzing = !!payload.website || !!payload.instagram_url;
      toast({
        title: 'Proyecto creado',
        description: analyzing
          ? 'Estamos analizando tu sitio y redes en segundo plano. Verás el progreso en la parte superior.'
          : undefined,
        variant: 'success',
      });

      handleClose(false);
      navigate('/');

      if (analyzing) {
        const poke = () =>
          qc.invalidateQueries({ queryKey: ['jobs', 'active', created.id] });
        setTimeout(poke, 600);
        setTimeout(poke, 2000);
        setTimeout(poke, 5000);
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'No se pudo crear el proyecto', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo proyecto</DialogTitle>
          <p className="text-sm text-[hsl(var(--color-muted))] mt-1">
            Completa los datos básicos. Podrás editarlos más adelante.
          </p>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <Input
            label="Nombre del proyecto *"
            id="np-name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ej: Mi restaurante"
            autoFocus
          />

          <Input
            label="Nombre de la empresa"
            id="np-company"
            value={form.company_name}
            onChange={(e) => set('company_name', e.target.value)}
            placeholder="Opcional"
          />

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-tighter opacity-50">
              Industria
            </label>
            <Combobox
              options={INDUSTRIES.map((i) => ({ label: i, value: i }))}
              value={form.industry}
              onChange={(val) => {
                set('industry', val);
                set('industry_custom', '');
              }}
              placeholder="Busca o escribe tu industria"
              searchPlaceholder="Busca o crea una..."
              emptyMessage="No encontramos esa industria"
              allowCustom
            />
          </div>

          {showCustomField && (
            <Input
              label="Describe tu industria"
              id="np-industry-custom"
              value={form.industry_custom}
              onChange={(e) => set('industry_custom', e.target.value)}
              placeholder="Ej: Tecnología aplicada a educación rural"
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Website"
              id="np-site"
              value={form.website}
              onChange={(e) => set('website', e.target.value)}
              placeholder="https://..."
            />
            <Input
              label="Instagram"
              id="np-ig"
              value={form.instagram}
              onChange={(e) => set('instagram', e.target.value)}
              placeholder="@usuario"
            />
          </div>

          {(form.website.trim() || form.instagram.trim()) && (
            <div className="flex items-start gap-2 rounded-xl bg-[hsl(var(--color-primary)/0.08)] border border-[hsl(var(--color-primary)/0.15)] px-3 py-2 text-xs text-slate-700">
              <Icon
                name="auto_awesome"
                className="text-[16px] text-[hsl(var(--color-primary))] shrink-0 mt-0.5"
              />
              <span>
                Analizaremos automáticamente
                {form.website.trim() ? ' tu sitio web' : ''}
                {form.website.trim() && form.instagram.trim() ? ' y' : ''}
                {form.instagram.trim() ? ' tu Instagram' : ''}
                {' '}para detectar logo, colores e imágenes. Tardará unos segundos.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleClose(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!form.name.trim() || submitting}>
            {submitting ? <><Spinner size="sm" /> Creando...</> : 'Crear proyecto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
