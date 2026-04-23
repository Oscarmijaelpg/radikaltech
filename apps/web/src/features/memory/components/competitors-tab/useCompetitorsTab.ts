import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '../../api/memory';
import type { CompetitorFormData } from '../CompetitorModal';

export type SubTab = 'list' | 'benchmark';

export function useCompetitorsTab(projectId: string) {
  const navigate = useNavigate();
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
  const [pendingAnalyze, setPendingAnalyze] = useState<Competitor | null>(null);
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

  const onAnalyze = (c: Competitor) => {
    setPendingAnalyze(c);
  };

  const onConfirmAnalyze = () => {
    const c = pendingAnalyze;
    if (!c) return;
    setPendingAnalyze(null);
    // Fire-and-forget: el reporte detecta "aún no analizado" y muestra estado "Analizando...".
    analyze.mutate({ id: c.id, project_id: projectId, mode: lastMode });
    navigate(`/competitors/${c.id}/report`);
  };

  const onCancelAnalyze = () => {
    setPendingAnalyze(null);
  };

  const onViewAnalysis = (c: Competitor) => {
    navigate(`/competitors/${c.id}/report`);
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
    creating: create.isPending,
    updating: update.isPending,
    detecting: detect.isPending,
    bulkApproving: bulkApprove.isPending,
    bulkRejecting: bulkReject.isPending,
    pendingAnalyze,
    openCreate,
    openEdit,
    onSubmit,
    onDelete,
    onAnalyze,
    onConfirmAnalyze,
    onCancelAnalyze,
    onViewAnalysis,
    onDetect,
    onApprove,
    onReject,
    onApproveAll,
    onRejectAll,
  };
}
