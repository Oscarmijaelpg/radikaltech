import { useState } from 'react';
import { Input } from '@radikal/ui';
import { SOCIAL_PLATFORMS, SocialPlatform, SocialSource } from '@radikal/shared';
import type { SocialPlatformMeta } from '@radikal/shared';
import { SocialsSchema, type SocialsData, type OnboardingSocialAccount } from '../../schemas/steps';
import { NavButtons } from '../NavButtons';
import { cn } from '@/shared/utils/cn';
import { AlertCircle, Check } from 'lucide-react';

interface SocialStepProps {
  defaultValues?: Partial<SocialsData>;
  onSubmit: (data: SocialsData) => Promise<void> | void;
  onBack: () => void;
  saving?: boolean;
}

type Draft = { url: string };

function BrandLogo({ src, color, size = 28 }: { src: string; color: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  );
}

function PlatformChip({
  platform,
  active,
  onToggle,
}: {
  platform: SocialPlatformMeta;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        'relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 sm:p-4 min-h-[96px] transition-all duration-200',
        active
          ? 'bg-white shadow-md scale-[1.02]'
          : 'border-[hsl(var(--color-border))] bg-white hover:border-[hsl(var(--color-primary)/0.4)] hover:-translate-y-0.5',
      )}
      style={active ? { borderColor: platform.color } : undefined}
    >
      <BrandLogo src={platform.icon} color={platform.color} size={28} />
      <span className="text-xs sm:text-sm font-semibold">{platform.name}</span>
      {active && (
        <span
          className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full text-white shadow"
          style={{ backgroundColor: platform.color }}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function PlatformInput({
  platform,
  draft,
  error,
  onChange,
  onRemove,
}: {
  platform: SocialPlatformMeta;
  draft: Draft;
  error?: string;
  onChange: (v: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--color-border))] bg-white p-4 sm:p-5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div
        className="h-11 w-11 rounded-xl grid place-items-center shrink-0"
        style={{ backgroundColor: `${platform.color}15` }}
      >
        <BrandLogo src={platform.icon} color={platform.color} size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className="font-semibold text-sm">{platform.name}</p>
          <button
            type="button"
            onClick={onRemove}
            className="text-[11px] font-semibold text-[hsl(var(--color-muted))] hover:text-red-500 transition-colors"
          >
            Quitar
          </button>
        </div>
        <Input
          type="url"
          inputMode="url"
          placeholder={`https://${platform.name.toLowerCase()}.com/tu-cuenta`}
          value={draft.url}
          onChange={(e) => onChange(e.target.value)}
          error={error}
        />
      </div>
    </div>
  );
}

export function SocialStep({ defaultValues, onSubmit, onBack, saving }: SocialStepProps) {
  const initial: Record<string, Draft> = {};
  (defaultValues?.accounts ?? []).forEach((acc) => {
    if (acc.source === SocialSource.URL && acc.url) {
      initial[acc.platform] = { url: acc.url };
    }
  });

  const [selected, setSelected] = useState<Record<string, Draft>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = { url: '' };
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateUrl = (id: string, url: string) => {
    setSelected((prev) => ({ ...prev, [id]: { url } }));
  };

  const handleSubmit = async () => {
    const accounts: OnboardingSocialAccount[] = [];
    const nextErrors: Record<string, string> = {};

    for (const [platform, draft] of Object.entries(selected)) {
      const url = draft.url.trim();
      if (!url) {
        nextErrors[platform] = 'Ingresa la URL de tu cuenta';
        continue;
      }
      try {
        new URL(url);
      } catch {
        nextErrors[platform] = 'URL inválida';
        continue;
      }
      accounts.push({
        platform: platform as SocialPlatform,
        source: SocialSource.URL,
        url,
        manual_description: null,
        handle: null,
      });
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const parsed = SocialsSchema.parse({ accounts });
    await onSubmit(parsed);
  };

  const selectedCount = Object.keys(selected).length;

  return (
    <div className="animate-in slide-in-from-right-10 fade-in duration-500 flex flex-col">
      <div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
          Tus redes sociales
        </h2>
        <p className="mt-2 text-[hsl(var(--color-muted))]">
          Activa las plataformas donde tu marca tiene presencia y pega el enlace. Todas son
          opcionales — puedes añadir más después.
        </p>
      </div>

      <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
        {SOCIAL_PLATFORMS.map((p) => (
          <PlatformChip
            key={p.id}
            platform={p}
            active={!!selected[p.id]}
            onToggle={() => toggle(p.id)}
          />
        ))}
      </div>

      {selectedCount > 0 ? (
        <div className="mt-6 sm:mt-8 flex flex-col gap-3">
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[hsl(var(--color-muted))]">
            Enlaces de tus {selectedCount === 1 ? 'red' : `${selectedCount} redes`}
          </p>
          {Object.entries(selected).map(([id, draft]) => {
            const meta = SOCIAL_PLATFORMS.find((p) => p.id === id);
            if (!meta) return null;
            return (
              <PlatformInput
                key={id}
                platform={meta}
                draft={draft}
                error={errors[id]}
                onChange={(v) => updateUrl(id, v)}
                onRemove={() => toggle(id)}
              />
            );
          })}
        </div>
      ) : (
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Puedes continuar sin seleccionar redes. Podrás añadirlas cuando quieras desde Memoria
            › Mi identidad.
          </span>
        </div>
      )}

      <NavButtons onBack={onBack} onNext={handleSubmit} nextLabel="Continuar" loading={saving} />
    </div>
  );
}
