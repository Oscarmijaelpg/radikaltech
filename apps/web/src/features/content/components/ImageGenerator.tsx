import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Textarea,
  Spinner,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  OptionCard,
} from '@radikal/ui';
import { api } from '@/lib/api';
import { useProject } from '@/providers/ProjectProvider';
import { ReferencePicker } from './ReferencePicker';
import { useAssets, type ContentAsset } from '../api/content';
import { useBrand } from '@/features/memory/api/memory';
import { ImageEditDialog } from './ImageEditDialog';
import { Dialog, DialogContent, DialogTitle } from '@radikal/ui';
import { Tooltip, TooltipContent, TooltipTrigger } from '@radikal/ui';
import { useToast } from '@/shared/ui/Toaster';

type ImageSize = '1024x1024' | '1792x1024' | '1024x1792';
type ImageStyle = 'vivid' | 'natural';
type ImageModel = 'gemini-2.5-flash-image' | 'dall-e-3';

interface GeneratedVariation {
  assetId?: string;
  url: string;
  variant_label: string;
  model: ImageModel;
  quality_score?: number;
}

interface GenerateResult {
  jobId: string;
  batchId?: string;
  variations?: GeneratedVariation[];
  assetId?: string;
  url: string;
  prompt: string;
  size: ImageSize;
  style: ImageStyle;
  model: ImageModel;
}

interface ContentAssetDTO {
  id: string;
  project_id: string;
  asset_url: string;
  asset_type: 'image' | 'video' | 'document' | 'audio';
  ai_description: string | null;
  tags: string[];
  metadata: unknown;
  created_at: string;
}

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

const MAX_REFS = 6;

interface Preset {
  id: string;
  label: string;
  icon: string;
  size: ImageSize;
  prefix: string;
}

const PRESETS: Preset[] = [
  {
    id: 'ig-post',
    label: 'Instagram · Post',
    icon: 'photo_camera',
    size: '1024x1024',
    prefix:
      'Foto cuadrada 1:1 profesional para post de Instagram, composición centrada y balanceada, iluminación natural impactante, alta definición, espacio para texto overlay. ',
  },
  {
    id: 'ig-story',
    label: 'Instagram · Story',
    icon: 'auto_stories',
    size: '1024x1792',
    prefix:
      'Formato vertical 9:16 para Instagram Story, composición vertical, texto llamativo en zona superior, diseño dinámico y atractivo para mobile. ',
  },
  {
    id: 'ig-reel',
    label: 'Instagram · Reel cover',
    icon: 'movie',
    size: '1024x1792',
    prefix:
      'Portada vertical 9:16 para Reel de Instagram, muy llamativa, con elementos visuales de impacto y tipografía grande centrada. ',
  },
  {
    id: 'tt-cover',
    label: 'TikTok · Cover',
    icon: 'music_video',
    size: '1024x1792',
    prefix:
      'Portada vertical 9:16 para TikTok, energética, con efectos visuales dinámicos, colores saturados. ',
  },
  {
    id: 'li-post',
    label: 'LinkedIn · Post',
    icon: 'business',
    size: '1792x1024',
    prefix:
      'Imagen horizontal 16:9 profesional para LinkedIn, estilo corporativo pero moderno, iluminación limpia, composición ejecutiva. ',
  },
  {
    id: 'li-banner',
    label: 'LinkedIn · Banner',
    icon: 'image',
    size: '1792x1024',
    prefix:
      'Banner horizontal corporativo ultra-ancho para LinkedIn, diseño limpio, espacios respirables, profesional. ',
  },
  {
    id: 'fb-cover',
    label: 'Facebook · Cover',
    icon: 'groups',
    size: '1792x1024',
    prefix:
      'Cover de página Facebook 16:9, composición horizontal, marca destacada, tipografía grande. ',
  },
  {
    id: 'x-post',
    label: 'X/Twitter · Post',
    icon: 'alternate_email',
    size: '1792x1024',
    prefix:
      'Imagen horizontal para post en X/Twitter, composición que funcione bien en timeline, impactante y legible en pequeño. ',
  },
  {
    id: 'carousel',
    label: 'Carrusel slide',
    icon: 'view_carousel',
    size: '1024x1024',
    prefix:
      'Slide de carrusel cuadrado 1:1 con diseño informativo, espacio claro para texto grande, tipografía legible. ',
  },
  {
    id: 'product-shot',
    label: 'Producto neutro',
    icon: 'package_2',
    size: '1024x1024',
    prefix:
      'Fotografía de producto profesional sobre fondo neutro claro, iluminación de estudio, sombras suaves, centrado. ',
  },
];

function palettetoArray(palette: unknown): string[] {
  if (!palette) return [];
  if (Array.isArray(palette))
    return palette.filter((x): x is string => typeof x === 'string');
  if (typeof palette === 'object') {
    return Object.values(palette as Record<string, unknown>).filter(
      (x): x is string => typeof x === 'string',
    );
  }
  return [];
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

  // Brand integration
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

  // Default logo toggle to ON when we discover a logo.
  useEffect(() => {
    if (logo) setUseLogo(true);
  }, [logo?.id]);

  // Default palette toggle based on palette presence.
  useEffect(() => {
    setUseBrandPalette(palette.length > 0);
  }, [palette.length]);

  const generate = useGenerateImage();
  const history = useImageAssets(activeProject?.id);

  const onGenerate = async () => {
    const p = prompt.trim();
    if (p.length < 3) return;

    // Merge logo into references (if toggled on and logo exists).
    const refIds = references.map((r) => r.id);
    if (useLogo && logo && !refIds.includes(logo.id)) {
      refIds.push(logo.id);
    }

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
      toast({ title: 'Error al generar imagen', description: err instanceof Error ? err.message : 'Intenta de nuevo', variant: 'error' });
    }
  };

  const onRegenerate = () => void onGenerate();

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
        metadata: { source: current.model, prompt: current.prompt, size: current.size, style: current.style },
      });
      qc.invalidateQueries({ queryKey: ['content-assets', 'image', activeProject.id] });
      toast({ title: 'Guardado en galería', variant: 'success' });
    } catch {
      toast({ title: 'Error al guardar en galería', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const removeReference = (id: string) => {
    setReferences((prev) => prev.filter((r) => r.id !== id));
  };

  const applyPreset = (preset: Preset) => {
    setSize(preset.size);
    setPrompt((prev) => {
      // Avoid duplicate prefix if the preset prefix is already at start
      if (prev.startsWith(preset.prefix)) return prev;
      return preset.prefix + prev;
    });
    setActivePreset(preset.id);
  };

  const loading = generate.isPending;
  const assets = history.data ?? [];
  const hasRefs = references.length > 0;
  const hasLogo = !!logo;
  const hasPalette = palette.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6 relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 grid place-items-center text-white">
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">Generar imagen con IA</h3>
            <p className="text-xs text-slate-500">
              Nexo usa Gemini 2.5 Flash Image cuando hay referencias, con DALL-E 3 como fallback.
            </p>
          </div>
        </div>

        {/* ====== INTEGRACIÓN CON TU MARCA ====== */}
        <div className="mb-5 p-4 rounded-2xl bg-gradient-to-br from-pink-50 to-cyan-50 border border-white/60 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[18px] text-[hsl(var(--color-primary))]">
              workspace_premium
            </span>
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700">
              Integración con tu marca
            </h4>
          </div>

          {/* Toggle logo */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/70">
            <div className="flex items-center gap-3 min-w-0">
              {hasLogo ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-white shadow-sm">
                  <img
                    src={logo!.asset_url}
                    alt="logo"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-100 grid place-items-center shrink-0">
                  <span className="material-symbols-outlined text-[18px] text-slate-400">
                    image
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800">
                  Usar mi logo como referencia
                </p>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {hasLogo
                    ? 'Gemini 2.5 Flash Image preservará tu logo tal cual'
                    : 'Sube tu logo en Memoria → Marca para activarlo'}
                </p>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Switch
                    checked={useLogo && hasLogo}
                    onCheckedChange={setUseLogo}
                    disabled={!hasLogo}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[240px]">
                Gemini 2.5 preservará tu logo exactamente como es
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Toggle palette */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/70">
            <div className="flex items-center gap-3 min-w-0">
              {hasPalette ? (
                <div className="flex items-center gap-1 shrink-0">
                  {palette.slice(0, 5).map((c, i) => (
                    <span
                      key={i}
                      className="w-6 h-6 rounded-md border border-white shadow-sm"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-100 grid place-items-center shrink-0">
                  <span className="material-symbols-outlined text-[18px] text-slate-400">
                    palette
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800">
                  Respetar paleta de marca
                </p>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {hasPalette
                    ? 'La IA se ceñirá a los colores de tu marca'
                    : 'Genera tu identidad en Memoria → Marca'}
                </p>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Switch
                    checked={useBrandPalette && hasPalette}
                    onCheckedChange={setUseBrandPalette}
                    disabled={!hasPalette}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[240px]">
                Los colores generados coincidirán con tu paleta oficial
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ====== PLANTILLAS POR RED ====== */}
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
                  icon={
                    <span className="material-symbols-outlined text-[20px]">{p.icon}</span>
                  }
                  title={<span className="text-sm">{p.label}</span>}
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
              <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
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
                    <span className="material-symbols-outlined text-[14px]">close</span>
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
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
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

      {current && !loading && current.variations && current.variations.length > 1 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-display text-lg font-bold">
              {current.variations.length} variantes
            </h3>
            <div className="flex gap-2 flex-wrap items-center">
              <Badge variant="muted">{current.size}</Badge>
              <Badge variant="muted">{current.style}</Badge>
              {current.variations.length >= 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAbPair({ a: 0, b: 1 });
                    setAbOpen(true);
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]">compare</span>
                  Comparar A vs B
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {current.variations.map((v, i) => {
              const isSelected = selectedVariantIdx === i;
              return (
                <div
                  key={i}
                  className={`rounded-2xl overflow-hidden bg-slate-100 border-2 ${
                    isSelected ? 'border-fuchsia-500' : 'border-transparent'
                  } relative group`}
                >
                  <img
                    src={v.url}
                    alt={v.variant_label}
                    className="w-full h-auto object-contain max-h-[380px]"
                  />
                  <div className="p-3 bg-white">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge>{v.variant_label}</Badge>
                      {typeof v.quality_score === 'number' && (
                        <Badge variant="muted">score {v.quality_score}/10</Badge>
                      )}
                      {isSelected && <Badge variant="success">Favorita</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          setSelectedVariantIdx(i);
                          if (v.assetId && activeProject?.id) {
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
                        }}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          favorite
                        </span>
                        Elegir esta
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (v.assetId) {
                            setEditTarget({ assetId: v.assetId, url: v.url });
                          }
                        }}
                        disabled={!v.assetId}
                      >
                        <span className="material-symbols-outlined text-[16px]">tune</span>
                        Iterar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = v.url;
                          a.download = `radikal-${current.jobId}-v${i + 1}.png`;
                          a.target = '_blank';
                          a.rel = 'noreferrer noopener';
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                        }}
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-slate-600 mt-4 italic">&ldquo;{current.prompt}&rdquo;</p>
        </Card>
      )}

      {current && !loading && (!current.variations || current.variations.length <= 1) && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-display text-lg font-bold">Tu imagen</h3>
            <div className="flex gap-2 flex-wrap">
              <Badge>
                {current.model === 'gemini-2.5-flash-image'
                  ? 'Generado con Gemini 2.5'
                  : 'Generado con DALL-E 3'}
              </Badge>
              <Badge variant="muted">{current.size}</Badge>
              <Badge variant="muted">{current.style}</Badge>
              {current.variations?.[0]?.quality_score !== undefined && (
                <Badge variant="muted">
                  score {current.variations[0]!.quality_score}/10
                </Badge>
              )}
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden bg-slate-100 mb-4">
            <img
              src={current.url}
              alt={current.prompt}
              className="w-full h-auto object-contain max-h-[600px]"
            />
          </div>
          <p className="text-sm text-slate-600 mb-4 italic">&ldquo;{current.prompt}&rdquo;</p>
          <div className="flex flex-wrap gap-2 items-center">
            <Button variant="outline" onClick={onDownload}>
              <span className="material-symbols-outlined text-[18px]">download</span>
              Descargar
            </Button>
            <Button variant="outline" onClick={onRegenerate} disabled={loading}>
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Regenerar
            </Button>
            {current.assetId && (
              <Button
                variant="outline"
                onClick={() =>
                  setEditTarget({ assetId: current.assetId!, url: current.url })
                }
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                Iterar
              </Button>
            )}
            <Button onClick={() => void onSaveToGallery()} disabled={!activeProject || saving}>
              {saving ? (
                <>
                  <Spinner size="sm" />
                  Guardando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">bookmark_add</span>
                  Guardar en galería
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold">Historial de imágenes</h3>
          <Badge variant="muted">{assets.length}</Badge>
        </div>
        {!activeProject ? (
          <p className="text-sm text-slate-500">Selecciona un proyecto para ver tu historial.</p>
        ) : history.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no has generado imágenes en este proyecto.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {assets.map((a) => (
              <a
                key={a.id}
                href={a.asset_url}
                target="_blank"
                rel="noreferrer noopener"
                className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 block"
                title={a.ai_description ?? ''}
              >
                <img
                  src={a.asset_url}
                  alt={a.ai_description ?? 'asset'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        )}
      </Card>

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

      {current?.variations && current.variations.length >= 2 && (
        <Dialog open={abOpen} onOpenChange={setAbOpen}>
          <DialogContent className="sm:max-w-5xl sm:max-h-[90vh] overflow-auto">
            <DialogTitle>Comparar A vs B</DialogTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {(['a', 'b'] as const).map((key) => {
                const idx = abPair[key];
                const v = current.variations![idx];
                if (!v) return <div key={key} />;
                return (
                  <div key={key} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Badge>{key.toUpperCase()} · {v.variant_label}</Badge>
                      {typeof v.quality_score === 'number' && (
                        <Badge variant="muted">score {v.quality_score}/10</Badge>
                      )}
                    </div>
                    <div className="rounded-2xl overflow-hidden bg-slate-100">
                      <img src={v.url} alt={v.variant_label} className="w-full h-auto object-contain" />
                    </div>
                    <Button
                      onClick={async () => {
                        if (v.assetId) {
                          try {
                            await api.patch(`/content/${v.assetId}`, {
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
                      }}
                    >
                      Preferir {key.toUpperCase()}
                    </Button>
                  </div>
                );
              })}
            </div>
            {current.variations.length > 2 && (
              <div className="mt-4 flex gap-2 flex-wrap">
                <p className="text-xs text-slate-500 w-full">Elegir variantes a comparar:</p>
                {current.variations.map((_, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant={abPair.a === i || abPair.b === i ? 'primary' : 'outline'}
                    onClick={() => {
                      setAbPair((p) => {
                        if (p.a === i) return p;
                        if (p.b === i) return p;
                        return { a: p.b, b: i };
                      });
                    }}
                  >
                    V{i + 1}
                  </Button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
