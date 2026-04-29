import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type Notification,
} from '../api/notifications';
import {
  Icon,
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from '@radikal/ui';
import { Z } from '@/shared/ui/z-layers';

export function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const q = useNotifications(false, 10);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const [pendingReadId, setPendingReadId] = useState<string | null>(null);
  const unread = q.data?.unread_count ?? 0;
  const items: Notification[] = q.data?.items ?? [];

  const handleClick = (n: Notification) => {
    if (!n.isRead) {
      setPendingReadId(n.id);
      markRead.mutate(n.id, {
        onSettled: () => setPendingReadId(null),
      });
    }
    setOpen(false);
    if (n.actionUrl) {
      navigate(n.actionUrl);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notificaciones"
          className="relative w-11 h-11 grid place-items-center rounded-xl hover:bg-slate-100 transition-colors"
        >
          <Icon name="notifications" className="text-slate-600 text-[22px]" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black grid place-items-center shadow">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          align="end"
          sideOffset={8}
          style={{ zIndex: Z.popover }}
          className="w-[340px] max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h4 className="text-sm font-black font-display">Notificaciones</h4>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="text-[11px] font-semibold text-[hsl(var(--color-primary))] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {markAll.isPending ? 'Marcando...' : 'Marcar todas leídas'}
              </button>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {q.isLoading ? (
              <p className="text-xs text-slate-500 text-center py-6">Cargando...</p>
            ) : items.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                No tienes notificaciones.
              </p>
            ) : (
              <ul>
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-all border-b border-slate-50 flex items-start gap-3 ${
                        !n.isRead ? 'bg-[hsl(var(--color-primary)/0.04)]' : ''
                      } ${pendingReadId === n.id ? 'opacity-50' : ''}`}
                    >
                      {!n.isRead && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-[hsl(var(--color-primary))] shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-slate-500 line-clamp-2">{n.body}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">
                          {formatDistanceToNow(new Date(n.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}
