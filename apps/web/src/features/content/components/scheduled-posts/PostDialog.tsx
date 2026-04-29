import { useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icon,
  Input,
  Spinner,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@radikal/ui';
import type { ContentAsset } from '../../api/content';
import type { ScheduledPostPlatform } from '../../api/scheduler';
import { CaptionGeneratorDialog } from '../CaptionGeneratorDialog';
import { type DialogState, PLATFORMS, minScheduledValue } from './helpers';

interface Props {
  dialog: DialogState;
  preferredAssets: ContentAsset[];
  isSubmitting: boolean;
  canSubmit: boolean;
  onChange: (updater: (prev: DialogState) => DialogState) => void;
  onClose: () => void;
  onSubmit: () => Promise<void> | void;
  onDelete?: () => void;
}

export function PostDialog({
  dialog,
  preferredAssets,
  isSubmitting,
  canSubmit,
  onChange,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false);

  const addHashtag = () => {
    const v = dialog.hashtagDraft.trim().replace(/^#/, '');
    if (!v || dialog.hashtags.includes(v)) {
      onChange((d) => ({ ...d, hashtagDraft: '' }));
      return;
    }
    onChange((d) => ({ ...d, hashtags: [...d.hashtags, v], hashtagDraft: '' }));
  };

  const removeHashtag = (h: string) =>
    onChange((d) => ({ ...d, hashtags: d.hashtags.filter((x) => x !== h) }));

  const togglePlatform = (p: ScheduledPostPlatform) =>
    onChange((d) => ({
      ...d,
      platforms: d.platforms.includes(p)
        ? d.platforms.filter((x) => x !== p)
        : [...d.platforms, p],
    }));

  return (
    <>
      <Dialog open={dialog.open} onOpenChange={(v) => onChange((d) => ({ ...d, open: v }))}>
        <DialogContent className="sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialog.editingId ? 'Editar post agendado' : 'Nuevo post agendado'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div>
              <p className="text-sm font-semibold mb-2">Asset (opcional)</p>
              {preferredAssets.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No hay imágenes disponibles. Sube o genera imágenes primero.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => onChange((d) => ({ ...d, assetId: null }))}
                    className={
                      dialog.assetId === null
                        ? 'aspect-square rounded-xl border-2 border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.1)] grid place-items-center'
                        : 'aspect-square rounded-xl border-2 border-slate-200 bg-slate-50 grid place-items-center hover:border-slate-300'
                    }
                  >
                    <Icon name="block" className="text-[20px] text-slate-400" />
                  </button>
                  {preferredAssets.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onChange((d) => ({ ...d, assetId: a.id }))}
                      className={
                        dialog.assetId === a.id
                          ? 'aspect-square rounded-xl overflow-hidden border-2 border-[hsl(var(--color-primary))] ring-2 ring-[hsl(var(--color-primary)/0.3)]'
                          : 'aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-slate-300'
                      }
                    >
                      <img src={a.asset_url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Caption</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setCaptionDialogOpen(true)}
                    >
                      <Icon name="auto_awesome" className="text-[16px]" />
                      Generar caption con IA
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px]">
                    Genera 3 variantes por plataforma en tu tono de marca
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                rows={4}
                value={dialog.caption}
                onChange={(e) => onChange((d) => ({ ...d, caption: e.target.value }))}
                placeholder="Texto del post..."
              />
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Hashtags</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {dialog.hashtags.map((h) => (
                  <span
                    key={h}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary))] text-xs font-semibold"
                  >
                    #{h}
                    <button type="button" onClick={() => removeHashtag(h)} aria-label={`Quitar ${h}`}>
                      <Icon name="close" className="text-[14px]" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={dialog.hashtagDraft}
                  onChange={(e) => onChange((d) => ({ ...d, hashtagDraft: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addHashtag();
                    }
                  }}
                  placeholder="Añadir hashtag (Enter)"
                  containerClassName="flex-1"
                />
                <Button type="button" variant="outline" onClick={addHashtag}>
                  <Icon name="add" className="text-[18px]" />
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Plataformas</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PLATFORMS.map((p) => {
                  const checked = dialog.platforms.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={
                        checked
                          ? 'flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-[hsl(var(--color-primary))] bg-[hsl(var(--color-primary)/0.05)] cursor-pointer'
                          : 'flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-slate-300'
                      }
                    >
                      <Checkbox checked={checked} onCheckedChange={() => togglePlatform(p.id)} />
                      <Icon name={p.icon} className="text-[18px]" />
                      <span className="text-sm font-semibold">{p.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Fecha y hora</p>
              <input
                type="datetime-local"
                min={minScheduledValue()}
                value={dialog.scheduledAt}
                onChange={(e) => onChange((d) => ({ ...d, scheduledAt: e.target.value }))}
                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
              />
              <p className="text-[11px] text-slate-500 mt-1">Mínimo 10 minutos en el futuro.</p>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Notas (opcional)</p>
              <Textarea
                rows={2}
                value={dialog.notes}
                onChange={(e) => onChange((d) => ({ ...d, notes: e.target.value }))}
                placeholder="Referencias internas, briefs..."
              />
            </div>
          </div>

          <DialogFooter>
            {dialog.editingId && onDelete && (
              <Button variant="outline" onClick={onDelete}>
                <Icon name="delete" className="text-[18px]" />
                Eliminar
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={() => void onSubmit()} disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner size="sm" /> Guardando...
                </>
              ) : dialog.editingId ? (
                'Guardar cambios'
              ) : (
                'Agendar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CaptionGeneratorDialog
        open={captionDialogOpen}
        onOpenChange={setCaptionDialogOpen}
        defaultPlatform={dialog.platforms[0] ?? 'instagram'}
        assetId={dialog.assetId}
        onUseCaption={(caption, hashtags) =>
          onChange((d) => ({
            ...d,
            caption,
            hashtags: Array.from(new Set([...d.hashtags, ...hashtags])),
          }))
        }
      />

    </>
  );
}
