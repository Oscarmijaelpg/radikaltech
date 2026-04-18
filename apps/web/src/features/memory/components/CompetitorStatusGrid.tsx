import { useState } from 'react';
import { Badge, Button, Card, Spinner } from '@radikal/ui';
import {
  useCompetitors,
  useSocialAccounts,
  useAnalyzeCompetitor,
  type Competitor,
} from '../api/memory';
import { UserSocialAccountModal } from './UserSocialAccountModal';

const NETWORKS: Array<{ key: string; label: string; icon: string }> = [
  { key: 'instagram', label: 'Instagram', icon: 'photo_camera' },
  { key: 'tiktok', label: 'TikTok', icon: 'music_note' },
  { key: 'linkedin', label: 'LinkedIn', icon: 'work' },
  { key: 'facebook', label: 'Facebook', icon: 'thumb_up' },
  { key: 'youtube', label: 'YouTube', icon: 'play_circle' },
  { key: 'x', label: 'X', icon: 'alternate_email' },
];

function formatRelativeHours(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const diffH = Math.round((Date.now() - t) / 3_600_000);
  if (diffH < 1) return 'hace < 1h';
  if (diffH < 48) return `hace ${diffH}h`;
  const d = Math.round(diffH / 24);
  return `hace ${d}d`;
}

interface Props {
  projectId: string;
}

export function CompetitorStatusGrid({ projectId }: Props) {
  const { data: competitors, isLoading: loadingC } = useCompetitors(projectId);
  const { data: accounts, isLoading: loadingA } = useSocialAccounts(projectId);
  const analyze = useAnalyzeCompetitor();
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);

  if (loadingC || loadingA) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Spinner />
      </Card>
    );
  }

  const userAccountsByPlatform: Record<string, boolean> = {};
  (accounts ?? []).forEach((a) => {
    userAccountsByPlatform[a.platform] = true;
  });

  const handleSyncAll = async (c: Competitor) => {
    setAnalyzingId(c.id);
    try {
      await analyze.mutateAsync({ id: c.id, project_id: projectId, mode: 'social' });
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Estado de Monitorización</h3>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">
            Matriz de redes sincronizadas
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setUserModalOpen(true)}>
          <span className="material-symbols-outlined text-[16px]">add_link</span>
          Mis redes
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-100 bg-white">
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                Cuenta
              </th>
              {NETWORKS.map((n) => (
                <th
                  key={n.key}
                  className="px-2 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center"
                >
                  {n.label}
                </th>
              ))}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-50 bg-[hsl(var(--color-primary)/0.02)]">
              <td className="px-4 py-3 font-bold text-slate-900">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[hsl(var(--color-primary))]">
                    stars
                  </span>
                  Mi marca
                </div>
              </td>
              {NETWORKS.map((n) => {
                const active = userAccountsByPlatform[n.key];
                return (
                  <td key={n.key} className="px-2 py-3 text-center">
                    <button
                      onClick={() => setUserModalOpen(true)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                        active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-50 text-slate-400 border border-dashed border-slate-200 hover:bg-slate-100'
                      }`}
                      title={active ? 'Conectada' : 'Añadir URL'}
                    >
                      <span className="material-symbols-outlined text-[14px]">{n.icon}</span>
                      {active ? 'OK' : '+'}
                    </button>
                  </td>
                );
              })}
              <td className="px-4 py-3"></td>
            </tr>

            {(competitors ?? []).map((c) => {
              const links = (c.social_links ?? {}) as Record<string, string>;
              const sync = (c.sync_status ?? {}) as Record<string, { synced_at: string; post_count: number }>;
              return (
                <tr key={c.id} className="border-b border-slate-50 last:border-b-0">
                  <td className="px-4 py-3 font-semibold text-slate-800">{c.name}</td>
                  {NETWORKS.map((n) => {
                    const hasUrl = !!links[n.key];
                    const s = sync[n.key];
                    const rel = formatRelativeHours(s?.synced_at);
                    let badge: React.ReactNode;
                    if (s && rel) {
                      badge = (
                        <Badge variant="success" className="whitespace-nowrap">
                          {rel}
                        </Badge>
                      );
                    } else if (hasUrl) {
                      badge = (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                          Solo URL
                        </span>
                      );
                    } else {
                      badge = (
                        <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 border border-dashed border-slate-200 text-[10px] font-bold">
                          —
                        </span>
                      );
                    }
                    return (
                      <td key={n.key} className="px-2 py-3 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <span className="material-symbols-outlined text-[14px] text-slate-400">
                            {n.icon}
                          </span>
                          {badge}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSyncAll(c)}
                      disabled={analyzingId === c.id}
                    >
                      {analyzingId === c.id ? <Spinner /> : (
                        <span className="material-symbols-outlined text-[14px]">sync</span>
                      )}
                      Sincronizar
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <UserSocialAccountModal
        open={userModalOpen}
        onOpenChange={setUserModalOpen}
        projectId={projectId}
      />
    </Card>
  );
}
