import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Icon,
  Skeleton,
  Spinner,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@radikal/ui';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { CharacterEmpty } from '@/shared/ui/CharacterEmpty';
import {
  useAnalyzeCompetitor,
  useCompetitors,
  useCreateCompetitor,
  useDeleteCompetitor,
  useUpdateCompetitor,
  useDetectCompetitors,
  useApproveCompetitor,
  useRejectCompetitor,
  useBulkApproveCompetitors,
  useBulkRejectCompetitors,
  type Competitor,
  type CompetitorAnalysisResult,
} from '../api/memory';
import { CompetitorModal, type CompetitorFormData } from './CompetitorModal';
import { CompetitorAnalysisDialog } from './CompetitorAnalysisDialog';
import { CompetitorStatusGrid } from './CompetitorStatusGrid';
import { CompetitionCharts } from './CompetitionCharts';
import { UserSocialAccountModal } from './UserSocialAccountModal';
import { CompetitorsBenchmarkTab } from './CompetitorsBenchmarkTab';

interface Props {
  projectId: string;
}

export function CompetitorsTab({ projectId }: Props) {
  const confirmDialog = useConfirm();
  const { data: allCompetitors, isLoading } = useCompetitors(projectId, 'all');
  const create = useCreateCompetitor();
  const update = useUpdateCompetitor();
  const remove = useDeleteCompetitor();
  const analyze = useAnalyzeCompetitor();
  const detect = useDetectCompetitors();
  const approve = useApproveCompetitor();
  const reject = useRejectCompetitor();
  const bulkApprove = useBulkApproveCompetitors();
  const bulkReject = useBulkRejectCompetitors();

  const suggested = (allCompetitors ?? []).filter((c) => c.status === 'suggested');
  const competitors = (allCompetitors ?? []).filter((c) => !c.status || c.status === 'confirmed');

  const onDetect = async () => {
    await detect.mutateAsync({ project_id: projectId });
  };
  const onApprove = async (id: string) => {
    await approve.mutateAsync({ id, project_id: projectId });
  };
  const onReject = async (id: string) => {
    await reject.mutateAsync({ id, project_id: projectId });
  };
  const onApproveAll = async () => {
    const ids = suggested.map((c) => c.id);
    if (ids.length === 0) return;
    await bulkApprove.mutateAsync({ ids, project_id: projectId });
  };
  const onRejectAll = async () => {
    const ids = suggested.map((c) => c.id);
    if (ids.length === 0) return;
    await bulkReject.mutateAsync({ ids, project_id: projectId });
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Competitor | null>(null);
  const [userSocialOpen, setUserSocialOpen] = useState(false);

  const [subTab, setSubTab] = useState<'list' | 'benchmark'>('list');

  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisName, setAnalysisName] = useState('');
  const [analysisCompetitorId, setAnalysisCompetitorId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<CompetitorAnalysisResult | null>(null);
  const [lastMode, setLastMode] = useState<CompetitorFormData['analysis_mode']>('combined');

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (c: Competitor) => {
    setEditing(c);
    setModalOpen(true);
  };

  const onSubmit = async (data: CompetitorFormData) => {
    const socialEntries = Object.entries(data.social_links).filter(([, v]) => v && v.trim());
    const socialLinks: Record<string, string> | null =
      socialEntries.length > 0 ? Object.fromEntries(socialEntries) : null;

    setLastMode(data.analysis_mode);

    if (editing) {
      await update.mutateAsync({
        id: editing.id,
        project_id: projectId,
        name: data.name,
        website: data.website || null,
        notes: data.notes || null,
        social_links: socialLinks,
      });
    } else {
      await create.mutateAsync({
        project_id: projectId,
        name: data.name,
        website: data.website || null,
        notes: data.notes || null,
        social_links: socialLinks,
      });
    }
    setModalOpen(false);
  };

  const onDelete = async (c: Competitor) => {
    const ok = await confirmDialog({ title: `¿Eliminar ${c.name}?`, variant: 'danger', confirmLabel: 'Eliminar' });
    if (!ok) return;
    await remove.mutateAsync({ id: c.id, project_id: projectId });
  };

  const onAnalyze = async (c: Competitor) => {
    setAnalyzingId(c.id);
    setAnalysisName(c.name);
    setAnalysisCompetitorId(c.id);
    try {
      const res = await analyze.mutateAsync({
        id: c.id,
        project_id: projectId,
        mode: lastMode,
      });
      const webResult =
        res.result && typeof res.result === 'object'
          ? (res.result as CompetitorAnalysisResult)
          : null;
      setAnalysisResult(webResult);
      setAnalysisOpen(true);
    } finally {
      setAnalyzingId(null);
    }
  };

  const onViewAnalysis = (c: Competitor) => {
    if (!c.analysis_data) return;
    setAnalysisName(c.name);
    setAnalysisCompetitorId(c.id);
    const raw = c.analysis_data as unknown as Record<string, unknown>;
    const hasWeb = raw && (raw.competitors || raw.insights || raw.query);
    setAnalysisResult(hasWeb ? (c.analysis_data as CompetitorAnalysisResult) : null);
    setAnalysisOpen(true);
  };

  if (isLoading) return <Skeleton className="h-48" />;

  const analyzedIds = (competitors ?? []).filter((c) => c.last_analyzed_at).map((c) => c.id);

  const subTabToggle = (
    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
      <button
        type="button"
        onClick={() => setSubTab('list')}
        className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
          subTab === 'list'
            ? 'bg-white text-violet-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        Lista
      </button>
      <button
        type="button"
        onClick={() => setSubTab('benchmark')}
        className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
          subTab === 'benchmark'
            ? 'bg-white text-violet-700 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        Benchmark
      </button>
    </div>
  );

  if (subTab === 'benchmark') {
    return (
      <div className="space-y-5">
        <div className="flex justify-start">{subTabToggle}</div>
        <CompetitorsBenchmarkTab projectId={projectId} />
      </div>
    );
  }

  return (
    <div className="space-y-5 relative">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3 sm:gap-2">
        {subTabToggle}
        <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => setUserSocialOpen(true)}>
          <Icon name="hub" className="text-[18px]" />
          Mis redes sociales
        </Button>
        <Button variant="outline" onClick={onDetect} disabled={detect.isPending}>
          {detect.isPending ? (
            <Spinner />
          ) : (
            <Icon name="auto_awesome" className="text-[18px]" />
          )}
          Detectar competidores con IA
        </Button>
        <Button onClick={openCreate}>
          <Icon name="add" className="text-[18px]" />
          Añadir competidor
        </Button>
        </div>
      </div>

      {suggested.length > 0 && (
        <Card className="p-5 bg-amber-50 border-amber-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon name="auto_awesome" className="text-amber-700" />
              <p className="text-sm font-semibold text-amber-900">
                Sira detectó {suggested.length} competidores potenciales
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onRejectAll}
                disabled={bulkReject.isPending}
              >
                Rechazar todos
              </Button>
              <Button size="sm" onClick={onApproveAll} disabled={bulkApprove.isPending}>
                Aceptar todos
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggested.map((c) => (
              <Card key={c.id} className="p-4 bg-white flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-900 truncate">{c.name}</h4>
                    {c.website && (
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[hsl(var(--color-primary))] hover:underline truncate block"
                      >
                        {c.website}
                      </a>
                    )}
                  </div>
                  <Badge variant="outline">Sugerido</Badge>
                </div>
                {c.notes && (
                  <p className="text-xs text-slate-600 line-clamp-3">{c.notes}</p>
                )}
                <div className="mt-auto flex gap-2 pt-1">
                  <Button size="sm" onClick={() => onApprove(c.id)}>
                    Aceptar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onReject(c.id)}>
                    Rechazar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {detect.isPending && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <Card className="p-8 max-w-sm text-center space-y-4">
            <div className="flex justify-center">
              <Spinner />
            </div>
            <p className="text-sm text-slate-700">
              Sira está investigando tu sector…
            </p>
          </Card>
        </div>
      )}

      {competitors && competitors.length > 0 && (
        <CompetitorStatusGrid projectId={projectId} />
      )}

      {!competitors || competitors.length === 0 ? (
        <Card className="p-6">
          <CharacterEmpty
            character="sira"
            title="Dame nombres, yo hago el trabajo"
            message="Añade a tus competidores y yo investigo, detecto oportunidades y te traigo insights estratégicos."
            action={{ label: 'Añadir competidor', onClick: openCreate }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {competitors.map((c) => {
            const analyzed = !!c.last_analyzed_at;
            return (
              <Card key={c.id} className="p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-lg text-slate-900 truncate">
                      {c.name}
                    </h3>
                    {c.website && (
                      <a
                        href={c.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[hsl(var(--color-primary))] hover:underline truncate block"
                      >
                        {c.website}
                      </a>
                    )}
                  </div>
                  {analyzed && <Badge variant="success">Analizado</Badge>}
                </div>

                {c.notes && (
                  <p className="text-sm text-slate-600 line-clamp-3">{c.notes}</p>
                )}

                <div className="mt-auto flex flex-wrap gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => onAnalyze(c)}
                        disabled={analyzingId === c.id}
                      >
                        {analyzingId === c.id ? <Spinner /> : (
                          <Icon name="auto_awesome" className="text-[16px]" />
                        )}
                        Analizar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[240px]">
                      Investigamos al competidor con IA y encontramos sus fortalezas y debilidades
                    </TooltipContent>
                  </Tooltip>
                  {analyzed && (
                    <Button size="sm" variant="outline" onClick={() => onViewAnalysis(c)}>
                      Ver análisis
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)} aria-label="Editar">
                    <Icon name="edit" className="text-[16px]" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(c)} aria-label="Eliminar">
                    <Icon name="delete" className="text-[16px]" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {analyzedIds.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="analytics" className="text-[hsl(var(--color-primary))]" />
            <h3 className="text-sm font-bold text-slate-900">Benchmark de inteligencia social</h3>
          </div>
          <CompetitionCharts projectId={projectId} competitorIds={analyzedIds} />
        </div>
      )}

      {analyzingId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <Card className="p-8 max-w-sm text-center space-y-4">
            <div className="flex justify-center">
              <Spinner />
            </div>
            <p className="text-sm text-slate-700">
              Sira está investigando a <strong>{analysisName}</strong>…
              <br />
              Esto puede tardar ~30s.
            </p>
          </Card>
        </div>
      )}

      <CompetitorModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        initial={editing}
        onSubmit={onSubmit}
        saving={create.isPending || update.isPending}
      />

      <CompetitorAnalysisDialog
        open={analysisOpen}
        onOpenChange={setAnalysisOpen}
        projectId={projectId}
        competitorId={analysisCompetitorId}
        competitorName={analysisName}
        result={analysisResult}
      />

      <UserSocialAccountModal
        open={userSocialOpen}
        onOpenChange={setUserSocialOpen}
        projectId={projectId}
      />
    </div>
  );
}
