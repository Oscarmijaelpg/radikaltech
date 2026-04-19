import { useState } from 'react';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
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
} from '../../api/memory';
import type { CompetitorFormData } from '../CompetitorModal';

export type SubTab = 'list' | 'benchmark';

export function useCompetitorsTab(projectId: string) {
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
  const competitors = (allCompetitors ?? []).filter(
    (c) => !c.status || c.status === 'confirmed',
  );

  const [subTab, setSubTab] = useState<SubTab>('list');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Competitor | null>(null);
  const [userSocialOpen, setUserSocialOpen] = useState(false);
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
    const ok = await confirmDialog({
      title: `¿Eliminar ${c.name}?`,
      variant: 'danger',
      confirmLabel: 'Eliminar',
    });
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

  return {
    isLoading,
    suggested,
    competitors,
    subTab,
    setSubTab,
    modalOpen,
    setModalOpen,
    editing,
    userSocialOpen,
    setUserSocialOpen,
    analyzingId,
    analysisOpen,
    setAnalysisOpen,
    analysisName,
    analysisCompetitorId,
    analysisResult,
    creating: create.isPending,
    updating: update.isPending,
    detecting: detect.isPending,
    bulkApproving: bulkApprove.isPending,
    bulkRejecting: bulkReject.isPending,
    openCreate,
    openEdit,
    onSubmit,
    onDelete,
    onAnalyze,
    onViewAnalysis,
    onDetect,
    onApprove,
    onReject,
    onApproveAll,
    onRejectAll,
  };
}
