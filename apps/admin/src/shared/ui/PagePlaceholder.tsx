interface Props {
  title: string;
  description?: string;
}

export function PagePlaceholder({ title, description }: Props) {
  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
        En construcción.
      </div>
    </div>
  );
}
