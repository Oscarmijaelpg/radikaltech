import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Spinner,
} from '@radikal/ui';
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

export function NewProjectDialog({ open, onOpenChange }: Props) {
  const { refetch, setActiveProject } = useProject();
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState<FormData>({
    name: '',
    company_name: '',
    industry: '',
    website: '',
    instagram: '',
  });
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setForm({ name: '', company_name: '', industry: '', website: '', instagram: '' });
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
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
        // Forzar que el banner global detecte los jobs que acaban de dispararse.
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo proyecto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="np-name">Nombre del proyecto *</Label>
            <Input
              id="np-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Mi restaurante"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="np-company">Nombre de la empresa</Label>
            <Input
              id="np-company"
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              placeholder="Opcional"
            />
          </div>
          <div>
            <Label htmlFor="np-industry">Industria</Label>
            <Input
              id="np-industry"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              placeholder="Ej: Gastronomía, Tecnología, Moda..."
            />
          </div>
          <div>
            <Label htmlFor="np-site">Website (opcional)</Label>
            <Input
              id="np-site"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label htmlFor="np-ig">Instagram (opcional)</Label>
            <Input
              id="np-ig"
              value={form.instagram}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              placeholder="@usuario o https://instagram.com/..."
            />
          </div>
          {(form.website.trim() || form.instagram.trim()) && (
            <div className="flex items-start gap-2 rounded-xl bg-[hsl(var(--color-primary)/0.08)] border border-[hsl(var(--color-primary)/0.15)] px-3 py-2 text-xs text-slate-700">
              <span className="material-symbols-outlined text-[16px] text-[hsl(var(--color-primary))] shrink-0 mt-0.5">
                auto_awesome
              </span>
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
