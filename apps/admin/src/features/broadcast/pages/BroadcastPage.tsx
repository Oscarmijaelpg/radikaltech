import { useState } from 'react';
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@radikal/ui';
import { Send, Eye, CheckCircle2 } from 'lucide-react';
import { useBroadcast, type BroadcastPayload } from '../api/broadcast';
import { useToast } from '@/shared/ui/Toaster';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

type Segment = BroadcastPayload['segment'];

export function BroadcastPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [segment, setSegment] = useState<Segment>('all');
  const [userIdsRaw, setUserIdsRaw] = useState('');
  const [result, setResult] = useState<{ preview: boolean; count: number; created?: number } | null>(null);

  const broadcast = useBroadcast();
  const { toast } = useToast();
  const confirmDialog = useConfirm();

  const buildPayload = (preview: boolean): BroadcastPayload => {
    const ids =
      segment === 'user_ids'
        ? userIdsRaw.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean)
        : undefined;
    return {
      title: title.trim(),
      body: body.trim() || undefined,
      actionUrl: actionUrl.trim() || undefined,
      segment,
      userIds: ids,
      preview,
    };
  };

  const onPreview = async () => {
    setResult(null);
    const res = await broadcast.mutateAsync(buildPayload(true));
    setResult({ preview: true, count: res.recipientCount });
  };

  const onSend = async () => {
    const ok = await confirmDialog({
      title: 'Enviar notificación masiva',
      description: 'Se enviará a todos los destinatarios del segmento seleccionado. No se puede deshacer.',
      confirmLabel: 'Enviar',
    });
    if (!ok) return;
    setResult(null);
    try {
      const res = await broadcast.mutateAsync(buildPayload(false));
      setResult({ preview: false, count: res.recipientCount, created: res.created });
      setTitle('');
      setBody('');
      setActionUrl('');
      setUserIdsRaw('');
      toast({
        variant: 'success',
        title: 'Notificación enviada',
        description: `${res.created} notificaciones creadas.`,
      });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Error enviando notificación',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const canSubmit = title.trim().length > 0 && (segment !== 'user_ids' || userIdsRaw.trim().length > 0);

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-black">Notificaciones masivas</h1>
        <p className="text-sm text-slate-500">Envía una notificación a segmentos de usuarios.</p>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 p-4 sm:p-6 space-y-4">
        <div>
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Mantenimiento programado"
          />
        </div>

        <div>
          <Label htmlFor="body">Mensaje (opcional)</Label>
          <Textarea
            id="body"
            rows={4}
            maxLength={2000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Detalle de la notificación…"
          />
        </div>

        <div>
          <Label htmlFor="actionUrl">URL de acción (opcional)</Label>
          <Input
            id="actionUrl"
            type="url"
            value={actionUrl}
            onChange={(e) => setActionUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>

        <div>
          <Label>Segmento</Label>
          <Select value={segment} onValueChange={(v) => setSegment(v as Segment)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los usuarios</SelectItem>
              <SelectItem value="onboarded">Usuarios con onboarding completo</SelectItem>
              <SelectItem value="not_onboarded">Usuarios sin terminar onboarding</SelectItem>
              <SelectItem value="user_ids">IDs específicos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {segment === 'user_ids' && (
          <div>
            <Label htmlFor="userIds">IDs de usuarios (separados por coma o línea)</Label>
            <Textarea
              id="userIds"
              rows={4}
              value={userIdsRaw}
              onChange={(e) => setUserIdsRaw(e.target.value)}
              placeholder="uuid1, uuid2, uuid3…"
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={onPreview}
            disabled={!canSubmit || broadcast.isPending}
            className="w-full sm:w-auto"
          >
            <Eye size={16} className="mr-2" />
            Previsualizar
          </Button>
          <Button
            onClick={onSend}
            disabled={!canSubmit || broadcast.isPending}
            className="w-full sm:w-auto"
          >
            <Send size={16} className="mr-2" />
            {broadcast.isPending ? 'Enviando…' : 'Enviar notificación'}
          </Button>
        </div>

        {result && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              {result.preview ? (
                <>
                  <div className="font-medium text-emerald-900">Previsualización</div>
                  <div className="text-emerald-800">
                    Se enviaría a <strong>{result.count}</strong> destinatarios.
                  </div>
                </>
              ) : (
                <>
                  <div className="font-medium text-emerald-900">Enviado</div>
                  <div className="text-emerald-800">
                    {result.created} notificaciones creadas para {result.count} destinatarios.
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {broadcast.isError && (
          <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-700">
            {broadcast.error instanceof Error ? broadcast.error.message : 'Error enviando broadcast'}
          </div>
        )}
      </div>
    </div>
  );
}
