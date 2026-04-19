import type { ProjectStats } from './api/stats';

export const KPI_META: Array<{
  key: keyof Pick<
    ProjectStats,
    'chats_count' | 'messages_count' | 'content_count' | 'reports_count'
  >;
  label: string;
  icon: string;
  color: string;
}> = [
  { key: 'chats_count', label: 'Chats', icon: 'forum', color: 'from-pink-500 to-rose-500' },
  { key: 'messages_count', label: 'Mensajes', icon: 'chat', color: 'from-cyan-500 to-blue-500' },
  {
    key: 'content_count',
    label: 'Contenido',
    icon: 'photo_library',
    color: 'from-amber-500 to-orange-500',
  },
  {
    key: 'reports_count',
    label: 'Reportes',
    icon: 'analytics',
    color: 'from-emerald-500 to-teal-500',
  },
];
