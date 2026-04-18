import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Spinner, Textarea, } from '@radikal/ui';
import { palettetoArray } from './utils';
function ChipEditor({ label, items, onChange, }) {
    const [draft, setDraft] = useState('');
    const add = () => {
        const v = draft.trim();
        if (!v)
            return;
        if (items.includes(v)) {
            setDraft('');
            return;
        }
        onChange([...items, v]);
        setDraft('');
    };
    return (_jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-sm font-semibold", children: label }), _jsx("div", { className: "flex flex-wrap gap-2", children: items.map((it, i) => (_jsxs("span", { className: "inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[hsl(var(--color-primary)/0.1)] text-[hsl(var(--color-primary))] text-xs font-semibold", children: [it, _jsx("button", { type: "button", onClick: () => onChange(items.filter((_, j) => j !== i)), "aria-label": `Quitar ${it}`, className: "hover:opacity-70", children: _jsx("span", { className: "material-symbols-outlined text-[14px]", "aria-hidden": true, children: "close" }) })] }, i))) }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { value: draft, onChange: (e) => setDraft(e.target.value), onKeyDown: (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                add();
                            }
                        }, placeholder: "A\u00F1adir y Enter", containerClassName: "flex-1" }), _jsx(Button, { type: "button", variant: "outline", onClick: add, children: _jsx("span", { className: "material-symbols-outlined text-[18px]", children: "add" }) })] })] }));
}
function ColorEditor({ colors, onChange, }) {
    const update = (i, value) => {
        onChange(colors.map((c, j) => (i === j ? value : c)));
    };
    return (_jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-sm font-semibold", children: "Paleta de colores" }), _jsx("div", { className: "space-y-2", children: colors.map((c, i) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "color", value: /^#[0-9a-fA-F]{6}$/.test(c) ? c : '#000000', onChange: (e) => update(i, e.target.value), className: "h-10 w-14 rounded-xl border border-slate-200 cursor-pointer" }), _jsx(Input, { value: c, onChange: (e) => update(i, e.target.value), containerClassName: "flex-1" }), _jsx(Button, { type: "button", variant: "outline", size: "icon", onClick: () => onChange(colors.filter((_, j) => j !== i)), children: _jsx("span", { className: "material-symbols-outlined text-[18px]", children: "delete" }) })] }, i))) }), _jsxs(Button, { type: "button", variant: "outline", onClick: () => onChange([...colors, '#EC4899']), children: [_jsx("span", { className: "material-symbols-outlined text-[18px]", children: "add" }), "A\u00F1adir color"] })] }));
}
export function EditBrandDialog({ open, onOpenChange, project, brand, savingBrand, savingProject, onSave, }) {
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
    const [brandValues, setBrandValues] = useState([]);
    const [keywords, setKeywords] = useState([]);
    const [palette, setPalette] = useState([]);
    useEffect(() => {
        if (!open)
            return;
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
        const projectPatch = {
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
        const brandPatch = {
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
    return (_jsx(Dialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(DialogContent, { className: "max-w-[100vw] sm:max-w-3xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[88vh] overflow-y-auto rounded-none sm:rounded-lg", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "Editar identidad de marca" }) }), _jsxs("div", { className: "space-y-6", children: [_jsxs("section", { className: "space-y-4", children: [_jsx("h4", { className: "text-[10px] font-black uppercase tracking-[0.2em] text-slate-500", children: "Empresa" }), _jsxs("div", { className: "grid md:grid-cols-2 gap-4", children: [_jsx(Input, { label: "Nombre comercial", value: companyName, onChange: (e) => setCompanyName(e.target.value) }), _jsx(Input, { label: "Industria", value: industry, onChange: (e) => setIndustry(e.target.value) }), _jsx(Input, { label: "Industria (custom)", value: industryCustom, onChange: (e) => setIndustryCustom(e.target.value) }), _jsx(Input, { label: "Website", value: website, onChange: (e) => setWebsite(e.target.value), placeholder: "https://..." })] }), _jsx(Textarea, { label: "Resumen del negocio", value: businessSummary, onChange: (e) => setBusinessSummary(e.target.value) }), _jsx(Textarea, { label: "Productos / servicios", value: mainProducts, onChange: (e) => setMainProducts(e.target.value) }), _jsx(Textarea, { label: "Cliente ideal", value: idealCustomer, onChange: (e) => setIdealCustomer(e.target.value) }), _jsx(Textarea, { label: "Propuesta \u00FAnica de valor", value: uniqueValue, onChange: (e) => setUniqueValue(e.target.value) }), _jsx(Textarea, { label: "Contexto adicional", value: additionalContext, onChange: (e) => setAdditionalContext(e.target.value) })] }), _jsxs("section", { className: "space-y-4", children: [_jsx("h4", { className: "text-[10px] font-black uppercase tracking-[0.2em] text-slate-500", children: "Identidad de marca" }), _jsx(Textarea, { label: "Esencia", value: essence, onChange: (e) => setEssence(e.target.value) }), _jsxs("div", { className: "grid md:grid-cols-2 gap-4", children: [_jsx(Textarea, { label: "Misi\u00F3n", value: mission, onChange: (e) => setMission(e.target.value) }), _jsx(Textarea, { label: "Visi\u00F3n", value: vision, onChange: (e) => setVision(e.target.value) })] }), _jsx(Textarea, { label: "P\u00FAblico objetivo", value: targetAudience, onChange: (e) => setTargetAudience(e.target.value) }), _jsx(Textarea, { label: "Ventaja competitiva", value: competitiveAdvantage, onChange: (e) => setCompetitiveAdvantage(e.target.value) }), _jsx(Textarea, { label: "Portafolio", value: portfolio, onChange: (e) => setPortfolio(e.target.value) }), _jsx(Input, { label: "Voz y tono", value: voiceTone, onChange: (e) => setVoiceTone(e.target.value) }), _jsx(Textarea, { label: "Direcci\u00F3n visual", value: visualDirection, onChange: (e) => setVisualDirection(e.target.value) }), _jsx(ChipEditor, { label: "Valores de marca", items: brandValues, onChange: setBrandValues }), _jsx(ChipEditor, { label: "Keywords", items: keywords, onChange: setKeywords }), _jsx(ColorEditor, { colors: palette, onChange: setPalette })] })] }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => onOpenChange(false), children: "Cancelar" }), _jsx(Button, { onClick: handleSave, disabled: saving, children: saving ? _jsx(Spinner, {}) : 'Guardar cambios' })] })] }) }));
}
