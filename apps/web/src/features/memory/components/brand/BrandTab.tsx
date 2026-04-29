import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton, Dialog, DialogContent, DialogTitle, Button, Icon, Card } from '@radikal/ui';
import {
  useBrand,
  useUpsertBrand,
  useSocialAccounts,
  useUpdateProject,
  useActiveJobs,
} from '../../api/memory';
import { useDeleteAsset } from '@/features/content/api/content';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useProject, type Project } from '@/providers/ProjectProvider';
import { palettetoArray, type ContentAssetLite } from './utils';
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
import { AssetUploader } from '@/features/content/components/AssetUploader';
import { ImageAnalysisDialog } from '@/features/content/components/ImageAnalysisDialog';

interface Props {
  projectId: string;
}

function useProjectAssets(projectId: string) {
  return useQuery({
    queryKey: ['content', 'list', projectId, { type: 'image' }],
    queryFn: async () => {
      const res = await api.get<{ data: ContentAssetLite[] }>(
        `/content?project_id=${projectId}&type=image&limit=100`,
      );
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function BrandTab({ projectId }: Props) {
  const { data: brand, isLoading: brandLoading } = useBrand(projectId);
  const { projects, refetch: refetchProjects } = useProject();
  const project = projects.find((p) => p.id === projectId) as Project | undefined;
  const { data: assets } = useProjectAssets(projectId);
  const { data: socialAccounts } = useSocialAccounts(projectId);
  const { data: activeJobs = [] } = useActiveJobs(projectId);

  const upsertBrand = useUpsertBrand();
  const updateProject = useUpdateProject();
  const [open, setOpen] = useState(false);
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<import('./utils').ContentAssetLite | null>(null);
  const deleteAsset = useDeleteAsset();
  const queryClient = useQueryClient();

  const handleDelete = async (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation();
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta imagen de tu memoria?')) return;
    
    try {
      await deleteAsset.mutateAsync({ id: assetId, project_id: projectId });
      // Force refresh assets
      queryClient.invalidateQueries({ queryKey: ['content', 'list', projectId] });
    } catch (err) {
      console.error('Failed to delete asset:', err);
    }
  };

  const logo = assets?.find((a) => a.tags?.includes('logo')) ?? null;
  const logoCandidates = assets?.filter((a) => a.tags?.includes('logo_candidate')) ?? [];
  const instagramRefs =
    assets?.filter((a) => a.tags?.includes('instagram')).slice(0, 18) ?? [];
  const moodboardAssets =
    assets?.filter((a) => a.tags?.includes('moodboard')).slice(0, 12) ?? [];
  const userUploads = 
    assets?.filter((a) => a.tags?.includes('user_uploaded')) ?? [];

  const palette = palettetoArray(brand?.color_palette);
  const paletteSuggested = palettetoArray(brand?.color_palette_suggested);
  const hasDistinctSuggested =
    paletteSuggested.length > 0 &&
    (palette.length === 0 ||
      paletteSuggested.join(',').toLowerCase() !== palette.join(',').toLowerCase());

  if (brandLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64" />
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  const companyName = project?.company_name ?? project?.name ?? 'Sin nombre';

  const relevantJobs = activeJobs.filter((j) =>
    [
      'website_analyze',
      'brand_analyze',
      'brand_synthesize',
      'image_analyze',
      'instagram_scrape',
      'tiktok_scrape',
    ].includes(j.kind),
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {relevantJobs.length > 0 && <ActiveJobsBanner jobs={relevantJobs} />}

      <BrandHero
        projectId={projectId}
        project={project}
        companyName={companyName}
        logo={logo}
        logoCandidates={logoCandidates}
        palette={palette}
        onEdit={() => setOpen(true)}
      />

      <BrandStats
        projectId={projectId}
        brand={brand}
        palette={palette}
        paletteSuggested={paletteSuggested}
        hasDistinctSuggested={hasDistinctSuggested}
      />

      <BusinessSummarySection project={project} />

      <MarketsSection projectId={projectId} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BrandIdentitySection brand={brand} />
        <BrandBusinessSection project={project} brand={brand} />
      </div>

      <VisualDirectionSection 
        brand={brand} 
        instagramRefs={instagramRefs} 
        onImageClick={(asset) => setPreviewAsset(asset)}
        onDelete={handleDelete}
      />

      {socialAccounts && socialAccounts.length > 0 && (
        <SocialAccountsSection accounts={socialAccounts} />
      )}

      <div className="flex items-center justify-between mt-8 mb-4">
        <div>
          <h3 className="font-display font-bold text-2xl">Imágenes subidas por el usuario</h3>
          <p className="text-sm text-slate-500">Imágenes que has añadido a tu memoria para ser usadas como referencias.</p>
        </div>
        <Button onClick={() => setOpenUploadModal(true)}>
          <Icon name="add_circle" className="mr-2" />
          Añadir conocimientos
        </Button>
      </div>

      {userUploads.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
           {userUploads.map((asset) => (
              <button
                key={asset.id}
                onClick={() => setPreviewAsset(asset)}
                className="relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm group cursor-pointer hover:shadow-xl hover:border-violet-300 transition-all"
              >
                 <img src={asset.asset_url} className="w-full h-full object-cover" alt="User upload" />
                 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-[10px] font-black uppercase tracking-widest">Ver análisis</span>
                 </div>
                 {asset.aesthetic_score != null && (
                   <div className="absolute top-1.5 left-1.5 bg-emerald-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.5 shadow">
                     {Number(asset.aesthetic_score).toFixed(1)}
                   </div>
                 )}
                 <button
                    onClick={(e) => handleDelete(e, asset.id)}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 text-red-500 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                    title="Eliminar imagen"
                  >
                    <Icon name="delete" className="text-[14px]" />
                  </button>
              </button>
           ))}
        </div>
      ) : (
        <Card className="p-8 text-center bg-slate-50/50 border-dashed">
          <Icon name="imagesmode" className="text-4xl text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Aún no has subido imágenes propias. Sube referencias de tu marca para enseñarle a la IA tu estilo visual.
          </p>
        </Card>
      )}

      {moodboardAssets.length > 0 && (
        <MoodboardSection 
          assets={moodboardAssets} 
          onImageClick={(asset) => setPreviewAsset(asset)}
          onDelete={handleDelete}
        />
      )}

      <BrandHistory projectId={projectId} />

      <Dialog open={openUploadModal} onOpenChange={setOpenUploadModal}>
        <DialogContent className="sm:max-w-[700px] rounded-[2rem]">
          <DialogTitle className="text-2xl font-black mb-4">Añadir imágenes de marca</DialogTitle>
          <AssetUploader tags={['user_uploaded', 'reference', 'social_auto']} onUploadComplete={() => setOpenUploadModal(false)} />
        </DialogContent>
      </Dialog>

      <ImageAnalysisDialog 
        asset={previewAsset} 
        open={!!previewAsset} 
        onOpenChange={(v) => !v && setPreviewAsset(null)} 
      />

      <EditBrandDialog
        open={open}
        onOpenChange={setOpen}
        projectId={projectId}
        project={project}
        brand={brand}
        savingBrand={upsertBrand.isPending}
        savingProject={updateProject.isPending}
        onSave={async (payload) => {
          const tasks: Promise<unknown>[] = [];
          if (payload.projectPatch && project) {
            tasks.push(
              updateProject.mutateAsync({ id: project.id, ...payload.projectPatch }),
            );
          }
          if (payload.brandPatch) {
            tasks.push(
              upsertBrand.mutateAsync({
                project_id: projectId,
                summary: payload.brandPatch.essence ?? undefined,
                audience: payload.brandPatch.target_audience ?? undefined,
                visual: payload.brandPatch.visual_direction ?? undefined,
                voice: payload.brandPatch.voice_tone ?? undefined,
                values: payload.brandPatch.brand_values ?? undefined,
              }),
            );
          }
          await Promise.all(tasks);
          refetchProjects();
          setOpen(false);
        }}
      />
    </div>
  );
}
