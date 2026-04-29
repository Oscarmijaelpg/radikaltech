import { useState } from 'react';
import { Input, Textarea, Button } from '@radikal/ui';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { ObjectivesSchema, type ObjectivesData } from '../../schemas/steps';
import { NavButtons } from '../NavButtons';

interface ObjectivesStepProps {
  defaultValues?: Partial<ObjectivesData>;
  onSubmit: (data: ObjectivesData) => Promise<void> | void;
  onBack: () => void;
  saving?: boolean;
  brandCompleted?: boolean;
  onSuggestWithAI?: () => Promise<Array<{ title: string; description?: string }>> | null;
}

type Draft = {
  title: string;
  description: string;
  target_date: string;
};

const emptyDraft = (): Draft => ({ title: '', description: '', target_date: '' });

export function ObjectivesStep({
  defaultValues,
  onSubmit,
  onBack,
  saving,
  brandCompleted,
  onSuggestWithAI,
}: ObjectivesStepProps) {
  const initial: Draft[] =
    defaultValues?.objectives && defaultValues.objectives.length > 0
      ? defaultValues.objectives.map((o) => ({
          title: o.title,
          description: o.description ?? '',
          target_date: o.target_date ?? '',
        }))
      : [emptyDraft()];

  const [items, setItems] = useState<Draft[]>(initial);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [suggesting, setSuggesting] = useState(false);

  const addItem = () => {
    if (items.length >= 5) return;
    setItems([...items, emptyDraft()]);
  };

  const removeItem = (idx: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const update = (idx: number, patch: Partial<Draft>) => {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const handleSuggest = async () => {
    if (!onSuggestWithAI) return;
    setSuggesting(true);
    try {
      const suggestions = await onSuggestWithAI();
      if (suggestions && suggestions.length > 0) {
        setItems(
          suggestions.slice(0, 5).map((s) => ({
            title: s.title,
            description: s.description ?? '',
            target_date: '',
          })),
        );
      }
    } finally {
      setSuggesting(false);
    }
  };

  const handleSubmit = async () => {
    const nextErrors: Record<number, string> = {};
    const valid = items.filter((it, i) => {
      if (!it.title.trim()) {
        nextErrors[i] = 'El título es obligatorio';
        return false;
      }
      return true;
    });

    if (valid.length === 0) {
      nextErrors[0] = 'Define al menos un objetivo';
      setErrors(nextErrors);
      return;
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    const payload = ObjectivesSchema.parse({
      objectives: valid.map((it, idx) => ({
        title: it.title.trim(),
        description: it.description.trim() || null,
        priority: idx,
        target_date: it.target_date ? new Date(it.target_date).toISOString() : null,
      })),
    });
    await onSubmit(payload);
  };

  return (
    <div className="animate-in slide-in-from-right-10 fade-in duration-500 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Tus objetivos</h2>
          <p className="mt-2 text-[hsl(var(--color-muted))]">
            Define de 1 a 5 objetivos. La IA los usará como norte para todo lo que cree.
          </p>
        </div>
        {brandCompleted && onSuggestWithAI && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSuggest}
            disabled={suggesting}
          >
            <Sparkles className="h-4 w-4" />
            {suggesting ? 'Sugiriendo...' : 'Sugerir con IA'}
          </Button>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-[hsl(var(--color-border))] bg-white/60 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-[hsl(var(--color-primary))]">
                Objetivo {idx + 1}
              </span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-slate-400 hover:text-red-500 transition"
                  aria-label="Eliminar objetivo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <Input
                label="Título"
                placeholder="Ej. Crecer 30% en ventas online"
                value={item.title}
                onChange={(e) => update(idx, { title: e.target.value })}
                error={errors[idx]}
              />
              <Textarea
                label="Descripción"
                placeholder="Detalles, métricas, contexto (opcional)"
                value={item.description}
                onChange={(e) => update(idx, { description: e.target.value })}
              />
              <Input
                label="Fecha objetivo"
                type="date"
                value={item.target_date ? item.target_date.substring(0, 10) : ''}
                onChange={(e) => update(idx, { target_date: e.target.value })}
                helperText="Opcional"
              />
            </div>
          </div>
        ))}

        {items.length < 5 && (
          <button
            type="button"
            onClick={addItem}
            className="rounded-2xl border-2 border-dashed border-[hsl(var(--color-border))] p-4 text-sm font-semibold text-[hsl(var(--color-muted))] hover:border-[hsl(var(--color-primary))] hover:text-[hsl(var(--color-primary))] transition flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Añadir objetivo
          </button>
        )}
      </div>

      <NavButtons
        onBack={onBack}
        onNext={handleSubmit}
        nextLabel="Finalizar"
        loading={saving}
      />
    </div>
  );
}
