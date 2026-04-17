import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner,
  Card,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@radikal/ui';
import { useProject } from '@/providers/ProjectProvider';
import { useToast } from '@/shared/ui/Toaster';
import {
  useGenerateCaption,
  type GenerateCaptionResult,
  type CaptionVariant,
} from '../api/content';
import type { ScheduledPostPlatform } from '../api/scheduler';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultPlatform: ScheduledPostPlatform;
  assetId: string | null;
  onUseCaption: (caption: string, hashtags: string[]) => void;
}

const LENGTH_LABEL: Record<CaptionVariant['length'], string> = {
  short: 'Corta',
  medium: 'Media',
  long: 'Larga',
};

export function CaptionGeneratorDialog({
  open,
  onOpenChange,
  defaultPlatform,
  assetId,
  onUseCaption,
}: Props) {
  const { activeProject } = useProject();
  const { toast } = useToast();
  const mut = useGenerateCaption();
  const [platform, setPlatform] = useState<ScheduledPostPlatform>(defaultPlatform);
  const [topic, setTopic] = useState('');
  const [result, setResult] = useState<GenerateCaptionResult | null>(null);

  const handleGenerate = async () => {
    try {
      const res = await mut.mutateAsync({
        asset_id: assetId ?? undefined,
        topic: topic || undefined,
        platforms: [platform],
        project_id: activeProject?.id,
      });
      setResult(res);
    } catch {
      toast({ title: 'No se pudo generar captions', variant: 'error' });
    }
  };

  const variants = result?.per_platform?.[platform]?.variants ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generar caption con IA</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm font-semibold mb-2">Plataforma</p>
            <Select value={platform} onValueChange={(v) => setPlatform(v as ScheduledPostPlatform)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="x">X / Twitter</SelectItem>
                <SelectItem value="threads">Threads</SelectItem>
                <SelectItem value="pinterest">Pinterest</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2">Tema / descripción (opcional)</p>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ej: lanzamiento producto, detrás de cámaras..."
            />
          </div>

          <Button onClick={() => void handleGenerate()} disabled={mut.isPending}>
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            {mut.isPending ? 'Generando...' : mut.isError ? 'Reintentar' : result ? 'Regenerar' : 'Generar 3 variantes'}
          </Button>

          {mut.isPending && (
            <div className="py-8 grid place-items-center text-center">
              <Spinner />
              <p className="text-sm text-slate-600 mt-3">Nexo está escribiendo copies...</p>
            </div>
          )}

          {!mut.isPending && variants.length > 0 && (
            <div className="space-y-3">
              {variants.map((v, i) => (
                <Card key={i} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--color-primary))]">
                      {LENGTH_LABEL[v.length] ?? v.length}
                    </span>
                    {v.emoji_suggested?.length > 0 && (
                      <span className="text-lg">{v.emoji_suggested.join(' ')}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{v.caption}</p>
                  {v.hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {v.hashtags.map((h) => (
                        <span
                          key={h}
                          className="text-[11px] text-[hsl(var(--color-primary))] font-medium"
                        >
                          #{h}
                        </span>
                      ))}
                    </div>
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      onUseCaption(v.caption, v.hashtags ?? []);
                      onOpenChange(false);
                    }}
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    Usar esta
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
