import { useState } from 'react';
import { Button, Card, Switch } from '@radikal/ui';
import { useToast } from '@/shared/ui/Toaster';
import { NOTIF_KEY, loadNotif, type NotifPrefs } from './constants';

export function NotificationsTab() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotifPrefs>(() => loadNotif());

  const update = (patch: Partial<NotifPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
  };

  const save = () => {
    toast({ title: 'Preferencias guardadas', description: 'Tus notificaciones fueron actualizadas.', variant: 'success' });
  };

  const disabled = !prefs.enabled;

  return (
    <Card className="p-4 sm:p-6 md:p-8 space-y-5">
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <p className="font-bold text-slate-900">Notificaciones en la plataforma</p>
          <p className="text-sm text-slate-500">Activa o desactiva todas las notificaciones</p>
        </div>
        <Switch checked={prefs.enabled} onCheckedChange={(v) => update({ enabled: v })} />
      </div>

      {[
        { key: 'scheduled_reports' as const, title: 'Reportes programados', desc: 'Cuando se genera un reporte' },
        { key: 'high_impact_news' as const, title: 'Noticias de alto impacto', desc: 'Noticias relevantes para tu sector' },
        { key: 'jobs_completed' as const, title: 'Trabajos completados', desc: 'Cuando termina un análisis o generación' },
        { key: 'new_recommendations' as const, title: 'Sugerencias nuevas', desc: 'Nuevas ideas recomendadas por IA' },
      ].map((row) => (
        <div key={row.key} className="flex items-center justify-between gap-4 py-2">
          <div className={disabled ? 'opacity-50' : ''}>
            <p className="font-semibold text-slate-800">{row.title}</p>
            <p className="text-sm text-slate-500">{row.desc}</p>
          </div>
          <Switch
            checked={prefs[row.key]}
            onCheckedChange={(v) => update({ [row.key]: v })}
            disabled={disabled}
          />
        </div>
      ))}

      <div className="flex justify-end pt-2">
        <Button onClick={save}>Guardar preferencias</Button>
      </div>
    </Card>
  );
}
