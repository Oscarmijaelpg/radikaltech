import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icon,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@radikal/ui';
import {
  useCreateMemory,
  useCompetitorPosts,
  useCompetitorStats,
  type CompetitorAnalysisResult,
} from '../api/memory';
import { AestheticTab } from './competitor-analysis-dialog/AestheticTab';
import { AnalysisTab } from './competitor-analysis-dialog/AnalysisTab';
import { ChartsTab } from './competitor-analysis-dialog/ChartsTab';
import { DisabledTabTrigger } from './competitor-analysis-dialog/DisabledTabTrigger';
import { PostsTab } from './competitor-analysis-dialog/PostsTab';
import { useAesthetic } from './competitor-analysis-dialog/useAesthetic';

const POSTS_LIMIT = 30;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  competitorId?: string | null;
  competitorName: string;
  result: CompetitorAnalysisResult | null;
}

export function CompetitorAnalysisDialog({
  open,
  onOpenChange,
  projectId,
  competitorId,
  competitorName,
  result,
}: Props) {
  const createMemory = useCreateMemory();
  const { data: posts } = useCompetitorPosts(competitorId ?? null, { limit: POSTS_LIMIT });
  const { data: stats } = useCompetitorStats(competitorId ?? null);
  const aesthetic = useAesthetic(posts);

  const save = async () => {
    if (!result) return;
    await createMemory.mutateAsync({
      project_id: projectId,
      category: 'competitor_analysis',
      key: `Análisis: ${competitorName}`,
      value: result.insights.join('\n') || `Análisis de ${competitorName}`,
      metadata: { analysis: result, competitor_name: competitorName },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] sm:max-w-5xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] overflow-y-auto rounded-none sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Análisis de {competitorName}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="analysis">
          <TabsList className="flex overflow-x-auto scrollbar-hide max-w-full flex-nowrap">
            <TabsTrigger value="analysis" className="shrink-0">
              Análisis
            </TabsTrigger>
            <DisabledTabTrigger
              value="charts"
              disabled={!competitorId}
              tooltip="Disponible después de guardar este competidor en tu memoria."
            >
              Gráficos
            </DisabledTabTrigger>
            <DisabledTabTrigger
              value="posts"
              disabled={!competitorId}
              tooltip="Disponible cuando detectemos sus redes sociales (Instagram, TikTok…)."
            >
              Últimos posts
            </DisabledTabTrigger>
            <DisabledTabTrigger
              value="aesthetic"
              disabled={!competitorId || !aesthetic}
              tooltip={
                !competitorId
                  ? 'Disponible después de guardar este competidor.'
                  : 'Se activa cuando analicemos sus posts visualmente.'
              }
            >
              Estética visual
            </DisabledTabTrigger>
          </TabsList>

          <TabsContent value="analysis">
            <AnalysisTab result={result} />
          </TabsContent>

          <TabsContent value="charts">
            {competitorId && (
              <ChartsTab
                projectId={projectId}
                competitorId={competitorId}
                competitorName={competitorName}
                stats={stats}
              />
            )}
          </TabsContent>

          <TabsContent value="posts">
            <PostsTab posts={posts} competitorName={competitorName} />
          </TabsContent>

          <TabsContent value="aesthetic">
            <AestheticTab aesthetic={aesthetic} competitorName={competitorName} />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {result && (
            <Button onClick={save} disabled={createMemory.isPending}>
              <Icon name="bookmark_add" className="text-[18px]" />
              Guardar en Memoria
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
