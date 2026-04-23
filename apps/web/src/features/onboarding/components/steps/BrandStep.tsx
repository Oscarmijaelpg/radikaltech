import { useState, type KeyboardEvent } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Textarea,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@radikal/ui';
import { X } from 'lucide-react';
import { BrandSchema, type BrandData } from '../../schemas/steps';
import { NavButtons } from '../NavButtons';
import { useAiSuggestions } from '../../hooks/useAiSuggestions';

const TONE_OPTIONS = [
  { value: 'profesional', label: 'Profesional' },
  { value: 'cercano', label: 'Cercano' },
  { value: 'divertido', label: 'Divertido' },
  { value: 'autoritario', label: 'Autoritario' },
  { value: 'joven', label: 'Joven' },
  { value: 'lujoso', label: 'Lujoso' },
];

type BrandSuggestableField = 'target_audience' | 'brand_story';

interface BrandStepProps {
  defaultValues?: Partial<BrandData>;
  suggestedFields?: ReadonlyArray<BrandSuggestableField>;
  onSubmit: (data: BrandData) => Promise<void> | void;
  onBack: () => void;
  saving?: boolean;
}

export function BrandStep({
  defaultValues,
  suggestedFields,
  onSubmit,
  onBack,
  saving,
}: BrandStepProps) {
  const form = useForm<BrandData>({
    resolver: zodResolver(BrandSchema),
    defaultValues: {
      tone_of_voice: defaultValues?.tone_of_voice ?? '',
      target_audience: defaultValues?.target_audience ?? '',
      brand_story: defaultValues?.brand_story ?? '',
      values: defaultValues?.values ?? [],
      personality: defaultValues?.personality ?? [],
      keywords: defaultValues?.keywords ?? [],
      forbidden_words: defaultValues?.forbidden_words ?? [],
      color_palette: defaultValues?.color_palette ?? [],
      fonts: defaultValues?.fonts ?? [],
      logo_url: defaultValues?.logo_url ?? null,
    },
  });
  const { register, handleSubmit, control, setValue, watch } = form;
  const suggestions = useAiSuggestions<BrandData>(form, suggestedFields ?? []);

  const values = watch('values') ?? [];
  const [valueDraft, setValueDraft] = useState('');

  const addValue = () => {
    const v = valueDraft.trim();
    if (!v) return;
    if (values.includes(v)) return;
    setValue('values', [...values, v]);
    setValueDraft('');
  };

  const removeValue = (v: string) => {
    setValue(
      'values',
      values.filter((x) => x !== v),
    );
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addValue();
    }
  };

  const submit = handleSubmit(async (data) => {
    const parsed = BrandSchema.parse(data);
    await onSubmit(parsed);
  });

  return (
    <form
      onSubmit={submit}
      className="animate-in slide-in-from-right-10 fade-in duration-500 flex flex-col"
    >
      <div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Tu marca</h2>
        <p className="mt-2 text-[hsl(var(--color-muted))]">
          Todo es opcional pero cada campo ayuda a que la IA suene como tu marca.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase tracking-tighter opacity-50">
            Tono de voz
          </label>
          <Controller
            control={control}
            name="tone_of_voice"
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elige un tono" />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <Textarea
          label="Audiencia objetivo"
          placeholder="¿A quién le hablas? Edad, intereses, necesidades..."
          helperText="Opcional"
          suggested={suggestions.isSuggested('target_audience')}
          {...register('target_audience')}
        />

        <Textarea
          label="Ventaja competitiva"
          placeholder="¿Qué hace única a tu marca? ¿Por qué te eligen?"
          helperText="Opcional — se guarda como parte de tu brand story"
          suggested={suggestions.isSuggested('brand_story')}
          {...register('brand_story')}
        />

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase tracking-tighter opacity-50">
            Valores de marca
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Ej. transparencia, innovación..."
              value={valueDraft}
              onChange={(e) => setValueDraft(e.target.value)}
              onKeyDown={onKey}
              containerClassName="flex-1"
            />
            <button
              type="button"
              onClick={addValue}
              className="rounded-2xl bg-[hsl(var(--color-primary))] text-white px-5 py-2 sm:py-0 font-semibold hover:opacity-90 transition min-h-[44px]"
            >
              Añadir
            </button>
          </div>
          {values.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {values.map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary))] px-3 py-1 text-sm font-medium"
                >
                  {v}
                  <button
                    type="button"
                    onClick={() => removeValue(v)}
                    className="hover:opacity-70"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <NavButtons
        onBack={onBack}
        nextType="submit"
        nextLabel="Continuar"
        loading={saving}
      />
    </form>
  );
}
