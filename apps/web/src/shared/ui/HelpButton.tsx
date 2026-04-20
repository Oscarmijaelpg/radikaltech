import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Icon,
} from '@radikal/ui';

export interface HelpButtonProps {
  title: string;
  description: string;
  tips?: string[];
  videoUrl?: string;
  className?: string;
}

export function HelpButton({ title, description, tips, videoUrl, className }: HelpButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ayuda: ${title}`}
        title="Ayuda"
        className={
          className ??
          'w-10 h-10 grid place-items-center rounded-xl bg-white/90 border border-[hsl(var(--color-border))] hover:bg-white text-slate-600 shadow-sm transition-colors'
        }
      >
        <Icon name="help_outline" className="text-[20px]" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] grid place-items-center text-white shadow-md">
                <Icon name="help_outline" className="text-[20px]" />
              </div>
              <DialogTitle>{title}</DialogTitle>
            </div>
            <DialogDescription className="mt-2 text-[hsl(var(--color-muted))]">
              {description}
            </DialogDescription>
          </DialogHeader>

          {tips && tips.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] font-black uppercase tracking-tighter opacity-60 mb-2">
                Tips y atajos
              </p>
              <ul className="space-y-2">
                {tips.map((tip, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <Icon name="auto_awesome" className="text-[16px] text-[hsl(var(--color-primary))] mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between text-xs">
            {videoUrl ? (
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[hsl(var(--color-primary))] hover:underline"
              >
                <Icon name="play_circle" className="text-[16px]" />
                Ver video
              </a>
            ) : (
              <span />
            )}
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="inline-flex items-center gap-1 font-semibold text-[hsl(var(--color-primary))] hover:underline"
            >
              Ver ayuda completa
              <Icon name="arrow_forward" className="text-[14px]" />
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
