import { Icon } from '@radikal/ui';

interface Props {
  paragraphs?: number;
}

export function NarrativeSkeleton({ paragraphs = 3 }: Props) {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
        <Icon name="psychology" className="text-[16px] text-[hsl(var(--color-primary))] animate-pulse" />
        Sira está interpretando los datos…
      </div>
      {Array.from({ length: paragraphs }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 bg-slate-200 rounded w-[95%]" />
          <div className="h-3 bg-slate-200 rounded w-[88%]" />
          <div className="h-3 bg-slate-200 rounded w-[72%]" />
        </div>
      ))}
    </div>
  );
}
