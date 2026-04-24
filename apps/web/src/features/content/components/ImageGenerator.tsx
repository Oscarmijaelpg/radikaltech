import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  Icon,
  OptionCard,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Textarea,
} from '@radikal/ui';
import { api } from '@/lib/api';
import { useProject } from '@/providers/ProjectProvider';
import { ReferencePicker } from './ReferencePicker';
import { useAssets, type ContentAsset } from '../api/content';
import { useBrand } from '@/features/memory/api/memory';
import { useChargeConfirm } from '@/features/credits/hooks/useChargeConfirm';
import { ImageEditDialog } from './ImageEditDialog';
import { useToast } from '@/shared/ui/Toaster';
import { AbCompareDialog } from './image-generator/AbCompareDialog';
import { BrandIntegration } from './image-generator/BrandIntegration';
import { HistoryGrid } from './image-generator/HistoryGrid';
import { PRESETS, palettetoArray, presetSizeLabel } from './image-generator/presets';
import { SingleResult } from './image-generator/SingleResult';
import {
  type ContentAssetDTO,
  type GenerateResult,
  type ImageSize,
  type ImageStyle,
  type Preset,
  MAX_REFS,
} from './image-generator/types';
import { VariationsGrid } from './image-generator/VariationsGrid';

function useGenerateImage() {
  return useMutation({
    mutationFn: async (vars: {
      prompt: string;
      size: ImageSize;
      style: ImageStyle;
      project_id?: string;
      reference_asset_ids?: string[];
      use_brand_palette?: boolean;
      variations?: number;
    }) => {
      const res = await api.post<{ data: GenerateResult }>(
        '/ai-services/generate-image',
        vars,
      );
      return res.data;
    },
  });
}

function useImageAssets(projectId: string | undefined) {
  return useQuery({
    queryKey: ['content-assets', 'image', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const res = await api.get<{ data: ContentAssetDTO[] }>(
        `/content?project_id=${projectId}&type=image&sort=recent&limit=24`,
      );
      return res.data;
    },
  });
}

export function ImageGenerator() {
  const { activeProject } = useProject();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<ImageSize>('1024x1024');
  const [style, setStyle] = useState<ImageStyle>('vivid');
  const [current, setCurrent] = useState<GenerateResult | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [references, setReferences] = useState<ContentAsset[]>([]);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [variationsCount, setVariationsCount] = useState<number>(1);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number | null>(null);
  const [editTarget, setEditTarget] = useState<{ assetId: string; url: string } | null>(null);
  const [abOpen, setAbOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [abPair, setAbPair] = useState<{ a: number; b: number }>({ a: 0, b: 1 });

  const imageAssets = useAssets(activeProject?.id, { type: 'image' });
  const logo = useMemo(
    () => imageAssets.data?.find((a) => a.tags?.includes('logo')),
    [imageAssets.data],
  );
  const { data: brand } = useBrand(activeProject?.id);
  const palette = useMemo(
    () => palettetoArray(brand?.color_palette),
    [brand?.color_palette],
  );

  const [useLogo, setUseLogo] = useState(false);
  const [useBrandPalette, setUseBrandPalette] = useState(true);

  useEffect(() => {
    if (logo) setUseLogo(true);
  }, [logo?.id]);

  useEffect(() => {
    setUseBrandPalette(palette.length > 0);
  }, [palette.length]);

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const promptParam = searchParams.get('prompt');
    const variationsParam = searchParams.get('variations');
    if (!promptParam && !variationsParam) return;
    if (promptParam) setPrompt(promptParam);
    if (variationsParam) {
      const n = Number(variationsParam);
      if (Number.isFinite(n) && n > 0) setVariationsCount(Math.min(4, Math.max(1, Math.floor(n))));
    }
    const next = new URLSearchParams(searchParams);
    next.delete('prompt');
    next.delete('variations');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = useGenerateImage();
  const history = useImageAssets(activeProject?.id);
  const confirmCharge = useChargeConfirm();

  const onGenerate = async () => {
    const p = prompt.trim();
    if (p.length < 3) return;

    const refIds = references.map((r) => r.id);
    if (useLogo && logo && !refIds.includes(logo.id)) {
      refIds.push(logo.id);
    }

    const ok = await confirmCharge('image.generate', {
      detail:
        variationsCount > 1
          ? `Vas a generar ${variationsCount} variantes de imagen.`
          : 'Vas a generar una imagen.',
    });
    if (!ok) return;

    try {
      const res = await generate.mutateAsync({
        prompt: p,
        size,
        style,
        project_id: activeProject?.id,
        reference_asset_ids: refIds.length ? refIds : undefined,
        use_brand_palette: useBrandPalette,
        variations: variationsCount,
      });
      setCurrent(res);
      setSelectedVariantIdx(null);
      setAbPair({ a: 0, b: Math.min(1, (res.variations?.length ?? 1) - 1) });
      if (activeProject?.id) {
        qc.invalidateQueries({ queryKey: ['content-assets', 'image', activeProject.id] });
      }
    } catch (err) {
      toast({
        title: 'Error al generar imagen',
        description: err instanceof Error ? err.message : 'Intenta de nuevo',
        variant: 'error',
      });
    }
  };

  const onDownload = () => {
    if (!current) return;
    const a = document.createElement('a');
    a.href = current.url;
    a.download = `radikal-${current.jobId}.png`;
    a.target = '_blank';
    a.rel = 'noreferrer noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast({ title: 'Descargando imagen...', variant: 'success' });
  };

  const onDownloadVariant = (url: string, index: number, jobId: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `radikal-${jobId}-v${index + 1}.png`;
    a.target = '_blank';
    a.rel = 'noreferrer noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const onSaveToGallery = async () => {
    if (!current || !activeProject?.id) return;
    if (current.assetId) {
      toast({ title: 'Ya está en tu galería', variant: 'success' });
      return;
    }
    setSaving(true);
    try {
      await api.post('/content', {
        project_id: activeProject.id,
        asset_url: current.url,
        asset_type: 'image',
        metadata: {
          source: current.model,
          prompt: current.prompt,
          size: current.size,
          style: current.style,
        },
      });
      qc.invalidateQueries({ queryKey: ['content-assets', 'image', activeProject.id] });
      toast({ title: 'Guardado en galería', variant: 'success' });
    } catch {
      toast({ title: 'Error al guardar en galería', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const onSelectVariant = async (i: number) => {
    setSelectedVariantIdx(i);
    const v = current?.variations?.[i];
    if (v?.assetId && activeProject?.id) {
      try {
        await api.patch(`/content/${v.assetId}`, {
          tags: ['generated', 'ai', 'selected'],
        });
        qc.invalidateQueries({
          queryKey: ['content-assets', 'image', activeProject.id],
        });
      } catch {
        toast({ title: 'Error al marcar favorita', variant: 'error' });
      }
    }
  };

  const onPreferAb = async (key: 'a' | 'b', idx: number, assetId: string | undefined) => {
    if (assetId) {
      try {
        await api.patch(`/content/${assetId}`, {
          tags: ['generated', 'ai', 'selected', `ab_winner:${key}`],
        });
        if (activeProject?.id) {
          qc.invalidateQueries({
            queryKey: ['content-assets', 'image', activeProject.id],
          });
        }
      } catch {
        toast({ title: 'Error al guardar preferencia', variant: 'error' });
      }
    }
    setSelectedVariantIdx(idx);
    setAbOpen(false);
  };

  const removeReference = (id: string) => {
    setReferences((prev) => prev.filter((r) => r.id !== id));
  };

  const applyPreset = (preset: Preset) => {
    setSize(preset.size);
    setPrompt((prev) => {
      if (prev.startsWith(preset.prefix)) return prev;
      return preset.prefix + prev;
    });
    setActivePreset(preset.id);
  };

  const loading = generate.isPending;
  const assets = history.data ?? [];
  const hasRefs = references.length > 0;
  const hasLogo = !!logo;

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6 relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 grid place-items-center text-white">
            <Icon name="auto_awesome" className="text-[20px]" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">Generar imagen con IA</h3>
            <p className="text-xs text-slate-500">
              Nexo elige automáticamente el mejor modelo y aplica tu logo y paleta si lo pides.
            </p>
          </div>
        </div>

        <BrandIntegration
          logo={logo}
          palette={palette}
          useLogo={useLogo}
          useBrandPalette={useBrandPalette}
          onChangeUseLogo={setUseLogo}
          onChangeUseBrandPalette={setUseBrandPalette}
        />

        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-tighter opacity-60 mb-2">
            Plantillas por red
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {PRESETS.map((p) => {
              const active = activePreset === p.id;
              return (
                <OptionCard
                  key={p.id}
                  selected={active}
                  onClick={() => applyPreset(p)}
                  icon={<Icon name={p.icon} className="text-[20px]" />}
                  title={<span className="text-sm">{p.label}</span>}
                  description={presetSizeLabel(p.size)}
                  className="p-4"
                />
              );
            })}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[10px] font-black uppercase tracking-tighter opacity-60">
              Referencias (opcional)
            </label>
            <span className="text-[10px] text-slate-500">
              {references.length} / {MAX_REFS}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPickerOpen(true)}
              disabled={!activeProject}
            >
              <Icon name="add_photo_alternate" className="text-[18px]" />
              Elegir de mi galería
            </Button>
            {!activeProject && (
              <span className="text-xs text-slate-500">Necesitas un proyecto activo</span>
            )}
          </div>
        </div>

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe la imagen que quieres crear... Ej. Un zorro cyberpunk bebiendo café en una cafetería de Tokio al atardecer, estilo ilustración editorial, colores neón."
          rows={4}
          className="mb-4"
        />

        {hasRefs && (
          <div className="mb-4">
            <div className="text-[10px] font-black uppercase tracking-tighter opacity-60 mb-2">
              Usando como referencia
            </div>
            <div className="flex flex-wrap gap-2">
              {references.map((r) => (
                <div
                  key={r.id}
                  className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-100 group"
                >
                  <img
                    src={r.asset_url}
                    alt={r.ai_description ?? 'ref'}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeReference(r.id)}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white grid place-items-center hover:bg-black/80"
                    aria-label="Quitar referencia"
                  >
                    <Icon name="close" className="text-[14px]" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-tighter mb-2 opacity-60">
              Tamaño
            </label>
            <Select value={size} onValueChange={(v) => setSize(v as ImageSize)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1024x1024">Cuadrado (1024x1024)</SelectItem>
                <SelectItem value="1792x1024">Horizontal (1792x1024)</SelectItem>
                <SelectItem value="1024x1792">Vertical (1024x1792)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-tighter mb-2 opacity-60">
              Estilo
            </label>
            <Select value={style} onValueChange={(v) => setStyle(v as ImageStyle)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vivid">Vívido (cinemático)</SelectItem>
                <SelectItem value="natural">Natural (realista)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-tighter mb-2 opacity-60">
              Variantes
            </label>
            <Select
              value={String(variationsCount)}
              onValueChange={(v) => setVariationsCount(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 (rápido)</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap items-center">
          <Button
            onClick={() => void onGenerate()}
            disabled={prompt.trim().length < 3 || loading}
            className="h-12 px-6"
          >
            <Icon name="auto_awesome" className="text-[18px]" />
            Generar
          </Button>
          {!activeProject && (
            <p className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">
              Selecciona un proyecto para guardar las imágenes.
            </p>
          )}
          {generate.isError && (
            <p className="text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-lg">
              Error generando. Intenta de nuevo.
            </p>
          )}
        </div>

        {loading && (
          <div className="absolute inset-0 z-20 rounded-[32px] bg-white/80 backdrop-blur-sm grid place-items-center">
            <div className="flex flex-col items-center gap-3 text-center px-6">
              <Spinner size="lg" />
              <p className="font-display font-semibold text-slate-700">
                {variationsCount > 1
                  ? `Generando ${variationsCount} variantes...`
                  : hasRefs || (useLogo && hasLogo)
                  ? 'Nexo está generando con tu logo y referencias...'
                  : 'Nexo está creando tu imagen...'}
              </p>
              <p className="text-xs text-slate-500">
                {variationsCount > 1 ? `~${15 * variationsCount} segundos` : '~15 segundos'}
              </p>
            </div>
          </div>
        )}
      </Card>

      {current && !loading && (
        <>
          <VariationsGrid
            current={current}
            selectedVariantIdx={selectedVariantIdx}
            onSelectVariant={onSelectVariant}
            onEditVariant={(assetId, url) => setEditTarget({ assetId, url })}
            onDownloadVariant={onDownloadVariant}
            onOpenCompare={() => {
              setAbPair({ a: 0, b: 1 });
              setAbOpen(true);
            }}
          />

          <SingleResult
            current={current}
            loading={loading}
            saving={saving}
            activeProjectId={activeProject?.id}
            onDownload={onDownload}
            onRegenerate={() => void onGenerate()}
            onEdit={(assetId, url) => setEditTarget({ assetId, url })}
            onSaveToGallery={onSaveToGallery}
          />
        </>
      )}

      <HistoryGrid
        activeProjectId={activeProject?.id}
        isLoading={history.isLoading}
        assets={assets}
      />

      <ReferencePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        projectId={activeProject?.id}
        initialSelectedIds={references.map((r) => r.id)}
        maxSelection={MAX_REFS}
        onConfirm={(picked) => setReferences(picked)}
      />

      {editTarget && (
        <ImageEditDialog
          open={!!editTarget}
          onOpenChange={(o) => !o && setEditTarget(null)}
          sourceUrl={editTarget.url}
          sourceAssetId={editTarget.assetId}
          projectId={activeProject?.id}
          onUseNew={() => {
            if (activeProject?.id) {
              qc.invalidateQueries({ queryKey: ['content-assets', 'image', activeProject.id] });
              qc.invalidateQueries({ queryKey: ['content', 'list', activeProject.id] });
            }
          }}
        />
      )}

      {current && (
        <AbCompareDialog
          open={abOpen}
          onOpenChange={setAbOpen}
          current={current}
          abPair={abPair}
          onSetAbPair={setAbPair}
          onPrefer={onPreferAb}
        />
      )}
    </div>
  );
}
