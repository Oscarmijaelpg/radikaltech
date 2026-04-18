import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Spinner,
  Textarea,
} from '@radikal/ui';
import type { Project } from '@/providers/ProjectProvider';
import type { BrandProfile } from '../../api/memory';
import { palettetoArray } from './utils';

interface ProjectPatch {
  company_name?: string;
  industry?: string;
  industry_custom?: string;
  website?: string;
  business_summary?: string;
  main_products?: string;
  ideal_customer?: string;
  unique_value?: string;
  additional_context?: string;
}

export interface SavePayload {
  projectPatch?: ProjectPatch;
  brandPatch?: Partial<BrandProfile>;
}

interface DialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  project?: Project;
  brand: BrandProfile | null | undefined;
  savingBrand: boolean;
  savingProject: boolean;
  onSave: (payload: SavePayload) => Promise<void>;
}

function ChipEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (items.includes(v)) {
      setDraft('');
      return;
    }
    onChange([...items, v]);
    setDraft('');
  };
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((it, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary))] text-xs font-semibold"
          >
            {it}
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label={`Quitar ${it}`}
              className="hover:opacity-70"
            >
              <span className="material-symbols-outlined text-[14px]" aria-hidden>close</span>
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Añadir y Enter"
          containerClassName="flex-1"
        />
        <Button type="button" variant="outline" onClick={add}>
          <span className="material-symbols-outlined text-[18px]">add</span>
        </Button>
      </div>
    </div>
  );
}

function ColorEditor({
  colors,
  onChange,
}: {
  colors: string[];
  onChange: (v: string[]) => void;
}) {
  const update = (i: number, value: string) => {
    onChange(colors.map((c, j) => (i === j ? value : c)));
  };
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Paleta de colores</p>
      <div className="space-y-2">
        {colors.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(c) ? c : '#000000'}
              onChange={(e) => update(i, e.target.value)}
              className="h-10 w-14 rounded-xl border border-slate-200 cursor-pointer"
            />
            <Input
              value={c}
              onChange={(e) => update(i, e.target.value)}
              containerClassName="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onChange(colors.filter((_, j) => j !== i))}
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...colors, '#EC4899'])}
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        Añadir color
      </Button>
    </div>
  );
}

export function EditBrandDialog({
  open,
  onOpenChange,
  project,
  brand,
  savingBrand,
  savingProject,
  onSave,
}: DialogProps) {
  // Project state
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [industryCustom, setIndustryCustom] = useState('');
  const [website, setWebsite] = useState('');
  const [businessSummary, setBusinessSummary] = useState('');
  const [mainProducts, setMainProducts] = useState('');
  const [idealCustomer, setIdealCustomer] = useState('');
  const [uniqueValue, setUniqueValue] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');

  // Brand state
  const [essence, setEssence] = useState('');
  const [mission, setMission] = useState('');
  const [vision, setVision] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [competitiveAdvantage, setCompetitiveAdvantage] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [voiceTone, setVoiceTone] = useState('');
  const [visualDirection, setVisualDirection] = useState('');
  const [brandValues, setBrandValues] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [palette, setPalette] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setCompanyName(project?.company_name ?? '');
    setIndustry(project?.industry ?? '');
    setIndustryCustom(project?.industry_custom ?? '');
    setWebsite(project?.website_url ?? '');
    setBusinessSummary(project?.business_summary ?? '');
    setMainProducts(project?.main_products ?? '');
    setIdealCustomer(project?.ideal_customer ?? '');
    setUniqueValue(project?.unique_value ?? '');
    setAdditionalContext(project?.additional_context ?? '');

    setEssence(brand?.essence ?? '');
    setMission(brand?.mission ?? '');
    setVision(brand?.vision ?? '');
    setTargetAudience(brand?.target_audience ?? '');
    setCompetitiveAdvantage(brand?.competitive_advantage ?? '');
    setPortfolio(brand?.portfolio ?? '');
    setVoiceTone(brand?.voice_tone ?? '');
    setVisualDirection(brand?.visual_direction ?? '');
    setBrandValues(brand?.brand_values ?? []);
    setKeywords(brand?.keywords ?? []);
    setPalette(palettetoArray(brand?.color_palette));
  }, [open, project, brand]);

  const saving = savingBrand || savingProject;

  const handleSave = async () => {
    const projectPatch: ProjectPatch = {
      company_name: companyName,
      industry,
      industry_custom: industryCustom,
      website: website || undefined,
      business_summary: businessSummary,
      main_products: mainProducts,
      ideal_customer: idealCustomer,
      unique_value: uniqueValue,
      additional_context: additionalContext,
    };
    const brandPatch: Partial<BrandProfile> = {
      essence,
      mission,
      vision,
      target_audience: targetAudience,
      competitive_advantage: competitiveAdvantage,
      portfolio,
      voice_tone: voiceTone,
      visual_direction: visualDirection,
      brand_values: brandValues,
      keywords,
      color_palette: palette,
    };
    await onSave({ projectPatch, brandPatch });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] sm:max-w-3xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[88vh] overflow-y-auto rounded-none sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Editar identidad de marca</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Empresa */}
          <section className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Empresa
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Nombre comercial"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
              <Input
                label="Industria"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
              <Input
                label="Industria (custom)"
                value={industryCustom}
                onChange={(e) => setIndustryCustom(e.target.value)}
              />
              <Input
                label="Website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <Textarea
              label="Resumen del negocio"
              value={businessSummary}
              onChange={(e) => setBusinessSummary(e.target.value)}
            />
            <Textarea
              label="Productos / servicios"
              value={mainProducts}
              onChange={(e) => setMainProducts(e.target.value)}
            />
            <Textarea
              label="Cliente ideal"
              value={idealCustomer}
              onChange={(e) => setIdealCustomer(e.target.value)}
            />
            <Textarea
              label="Propuesta única de valor"
              value={uniqueValue}
              onChange={(e) => setUniqueValue(e.target.value)}
            />
            <Textarea
              label="Contexto adicional"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
            />
          </section>

          {/* Brand */}
          <section className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Identidad de marca
            </h4>
            <Textarea
              label="Esencia"
              value={essence}
              onChange={(e) => setEssence(e.target.value)}
            />
            <div className="grid md:grid-cols-2 gap-4">
              <Textarea
                label="Misión"
                value={mission}
                onChange={(e) => setMission(e.target.value)}
              />
              <Textarea
                label="Visión"
                value={vision}
                onChange={(e) => setVision(e.target.value)}
              />
            </div>
            <Textarea
              label="Público objetivo"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
            />
            <Textarea
              label="Ventaja competitiva"
              value={competitiveAdvantage}
              onChange={(e) => setCompetitiveAdvantage(e.target.value)}
            />
            <Textarea
              label="Portafolio"
              value={portfolio}
              onChange={(e) => setPortfolio(e.target.value)}
            />
            <Input
              label="Voz y tono"
              value={voiceTone}
              onChange={(e) => setVoiceTone(e.target.value)}
            />
            <Textarea
              label="Dirección visual"
              value={visualDirection}
              onChange={(e) => setVisualDirection(e.target.value)}
            />
            <ChipEditor
              label="Valores de marca"
              items={brandValues}
              onChange={setBrandValues}
            />
            <ChipEditor label="Keywords" items={keywords} onChange={setKeywords} />
            <ColorEditor colors={palette} onChange={setPalette} />
          </section>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Spinner /> : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
