import { useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Icon,
  Input,
  Spinner,
} from '@radikal/ui';
import {
  useCreateSocialAccount,
  useDeleteSocialAccount,
  useSocialAccounts,
} from '../api/memory';

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'x', label: 'X / Twitter' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'pinterest', label: 'Pinterest' },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
}

export function UserSocialAccountModal({ open, onOpenChange, projectId }: Props) {
  const { data: accounts } = useSocialAccounts(projectId);
  const create = useCreateSocialAccount();
  const remove = useDeleteSocialAccount();

  const [platform, setPlatform] = useState('instagram');
  const [url, setUrl] = useState('');

  const submit = async () => {
    if (!url.trim()) return;
    await create.mutateAsync({
      project_id: projectId,
      platform,
      source: 'url',
      url: url.trim(),
    });
    setUrl('');
  };

  const onRemove = async (id: string) => {
    await remove.mutateAsync({ id, project_id: projectId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] sm:max-w-xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[85vh] overflow-y-auto rounded-none sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Mis redes sociales</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Añade tus propias cuentas para que Sira pueda comparar tu rendimiento con la competencia.
          </p>

          <div className="space-y-3">
            {(accounts ?? []).length === 0 ? (
              <div className="p-4 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                No hay cuentas registradas todavía.
              </div>
            ) : (
              (accounts ?? []).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <Badge variant="primary">{a.platform}</Badge>
                    <span className="text-xs text-slate-600 truncate">{a.url ?? a.handle ?? '—'}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => onRemove(a.id)}>
                    <Icon name="delete" className="text-[16px]" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                className="h-12 w-full rounded-2xl bg-slate-100 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))]"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <div className="sm:col-span-2">
                <Input
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={submit} disabled={create.isPending || !url.trim()} className="w-full">
              {create.isPending ? <Spinner /> : <Icon name="add" className="text-[16px]" />}
              Añadir cuenta
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
