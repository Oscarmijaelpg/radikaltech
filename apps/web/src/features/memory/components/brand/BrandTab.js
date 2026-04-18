import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@radikal/ui';
import { useBrand, useUpsertBrand, useSocialAccounts, useUpdateProject, useActiveJobs, } from '../../api/memory';
import { api } from '@/lib/api';
import { useProject } from '@/providers/ProjectProvider';
import { palettetoArray } from './utils';
import { BrandHero } from './BrandHero';
import { BrandStats } from './BrandStats';
import { BusinessSummarySection } from './BusinessSummarySection';
import { MarketsSection } from './MarketsSection';
import { BrandIdentitySection } from './BrandIdentitySection';
import { BrandBusinessSection } from './BrandBusinessSection';
import { VisualDirectionSection } from './VisualDirectionSection';
import { SocialAccountsSection } from './SocialAccountsSection';
import { MoodboardSection } from './MoodboardSection';
import { ActiveJobsBanner } from './ActiveJobsBanner';
import { EditBrandDialog } from './EditBrandDialog';
import { BrandHistory } from './BrandHistory';
function useProjectAssets(projectId) {
    return useQuery({
        queryKey: ['content', 'list', projectId, { type: 'image' }],
        queryFn: async () => {
            const res = await api.get(`/content?project_id=${projectId}&type=image&limit=100`);
            return res.data;
        },
        enabled: !!projectId,
    });
}
export function BrandTab({ projectId }) {
    const { data: brand, isLoading: brandLoading } = useBrand(projectId);
    const { projects, refetch: refetchProjects } = useProject();
    const project = projects.find((p) => p.id === projectId);
    const { data: assets } = useProjectAssets(projectId);
    const { data: socialAccounts } = useSocialAccounts(projectId);
    const { data: activeJobs = [] } = useActiveJobs(projectId);
    const upsertBrand = useUpsertBrand();
    const updateProject = useUpdateProject();
    const [open, setOpen] = useState(false);
    const logo = assets?.find((a) => a.tags?.includes('logo')) ?? null;
    const instagramRefs = assets?.filter((a) => a.tags?.includes('instagram')).slice(0, 18) ?? [];
    const moodboardAssets = assets?.filter((a) => a.tags?.includes('moodboard')).slice(0, 12) ?? [];
    const palette = palettetoArray(brand?.color_palette);
    const paletteSuggested = palettetoArray(brand?.color_palette_suggested);
    const hasDistinctSuggested = paletteSuggested.length > 0 &&
        (palette.length === 0 ||
            paletteSuggested.join(',').toLowerCase() !== palette.join(',').toLowerCase());
    if (brandLoading) {
        return (_jsxs("div", { className: "space-y-4", children: [_jsx(Skeleton, { className: "h-64" }), _jsxs("div", { className: "grid md:grid-cols-3 gap-4", children: [_jsx(Skeleton, { className: "h-32" }), _jsx(Skeleton, { className: "h-32" }), _jsx(Skeleton, { className: "h-32" })] }), _jsx(Skeleton, { className: "h-48" })] }));
    }
    const companyName = project?.company_name ?? project?.name ?? 'Sin nombre';
    const relevantJobs = activeJobs.filter((j) => [
        'website_analyze',
        'brand_analyze',
        'brand_synthesize',
        'image_analyze',
        'instagram_scrape',
        'tiktok_scrape',
    ].includes(j.kind));
    return (_jsxs("div", { className: "space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500", children: [relevantJobs.length > 0 && _jsx(ActiveJobsBanner, { jobs: relevantJobs }), _jsx(BrandHero, { projectId: projectId, project: project, companyName: companyName, logo: logo, palette: palette, onEdit: () => setOpen(true) }), _jsx(BrandStats, { projectId: projectId, brand: brand, palette: palette, paletteSuggested: paletteSuggested, hasDistinctSuggested: hasDistinctSuggested }), _jsx(BusinessSummarySection, { project: project }), _jsx(MarketsSection, { projectId: projectId }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsx(BrandIdentitySection, { brand: brand }), _jsx(BrandBusinessSection, { project: project, brand: brand })] }), _jsx(VisualDirectionSection, { brand: brand, instagramRefs: instagramRefs }), socialAccounts && socialAccounts.length > 0 && (_jsx(SocialAccountsSection, { accounts: socialAccounts })), moodboardAssets.length > 0 && _jsx(MoodboardSection, { assets: moodboardAssets }), _jsx(BrandHistory, { projectId: projectId }), _jsx(EditBrandDialog, { open: open, onOpenChange: setOpen, projectId: projectId, project: project, brand: brand, savingBrand: upsertBrand.isPending, savingProject: updateProject.isPending, onSave: async (payload) => {
                    const tasks = [];
                    if (payload.projectPatch && project) {
                        tasks.push(updateProject.mutateAsync({ id: project.id, ...payload.projectPatch }));
                    }
                    if (payload.brandPatch) {
                        tasks.push(upsertBrand.mutateAsync({
                            project_id: projectId,
                            summary: payload.brandPatch.essence ?? undefined,
                            audience: payload.brandPatch.target_audience ?? undefined,
                            visual: payload.brandPatch.visual_direction ?? undefined,
                            voice: payload.brandPatch.voice_tone ?? undefined,
                            values: payload.brandPatch.brand_values ?? undefined,
                        }));
                    }
                    await Promise.all(tasks);
                    refetchProjects();
                    setOpen(false);
                } })] }));
}
