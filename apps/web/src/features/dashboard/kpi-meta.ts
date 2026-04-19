import type { ProjectStats } from './api/stats';

export interface KpiMeta {
  key: keyof Pick<
    ProjectStats,
    'chats_count' | 'messages_count' | 'content_count' | 'reports_count'
  >;
  label: string;
  icon: string;
  color: string;
  tooltip: string;
}

export const KPI_META: KpiMeta[] = [
  {
    key: 'chats_count',
    label: 'Chats',
    icon: 'forum',
    color: 'from-pink-500 to-rose-500',
    tooltip:
      'Conversaciones iniciadas con tus agentes. Cada chat alimenta la memoria del proyecto.',
  },
  {
    key: 'messages_count',
    label: 'Mensajes',
    icon: 'chat',
    color: 'from-cyan-500 to-blue-500',
    tooltip: 'Total de mensajes intercambiados con tus agentes.',
  },
  {
    key: 'content_count',
    label: 'Contenido',
    icon: 'photo_library',
    color: 'from-amber-500 to-orange-500',
    tooltip: 'Imágenes subidas o generadas con IA, disponibles en Galería.',
  },
  {
    key: 'reports_count',
    label: 'Reportes',
    icon: 'analytics',
    color: 'from-emerald-500 to-teal-500',
    tooltip: 'Reportes estratégicos generados por Kronos (competencia, noticias, estrategia).',
  },
];
