export type ReportMode = 'unified' | 'competition' | 'news' | 'brand' | 'audit';

export interface ReportModeMeta {
  id: ReportMode;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  bullets: string[];
  estimatedSeconds: number;
  requiresInput?: 'competitor' | 'topic';
}

export const REPORT_MODES: Record<ReportMode, ReportModeMeta> = {
  unified: {
    id: 'unified',
    icon: 'hub',
    title: 'Reporte integral',
    subtitle: 'Tu marca + competencia + noticias, todo junto',
    description:
      'La foto completa de tu situación estratégica. Ideal cuando necesitas una sola lectura de contexto.',
    bullets: [
      'Diagnóstico de tu marca con datos actuales',
      'Comparativa contra tus competidores guardados',
      'Noticias del sector de los últimos días',
      'Recomendaciones activas priorizadas',
    ],
    estimatedSeconds: 90,
  },
  competition: {
    id: 'competition',
    icon: 'groups',
    title: 'Análisis de un competidor',
    subtitle: 'Profundiza en 1 marca específica',
    description:
      'Todo lo que tenemos sobre un competidor, estructurado: redes, estrategia, frecuencia, fortalezas.',
    bullets: [
      'Presencia digital: web y redes sociales',
      'Últimos posts analizados visualmente',
      'Frecuencia, engagement y mejores horarios',
      'Fortalezas, debilidades y oportunidades',
    ],
    estimatedSeconds: 60,
    requiresInput: 'competitor',
  },
  news: {
    id: 'news',
    icon: 'newspaper',
    title: 'Noticias de un tema',
    subtitle: 'Rastreo y análisis de los últimos 14 días',
    description:
      'Busco noticias frescas sobre un tema y te entrego un resumen con las implicaciones para tu marca.',
    bullets: [
      'Noticias clave de los últimos 14 días',
      'Fuentes citadas con enlaces',
      'Resumen ejecutivo en 1 página',
      'Qué significa para tu marca',
    ],
    estimatedSeconds: 50,
    requiresInput: 'topic',
  },
  brand: {
    id: 'brand',
    icon: 'psychology',
    title: 'Estrategia de marca',
    subtitle: 'Diagnóstico + iniciativas + métricas',
    description:
      'Leo toda tu memoria de marca (identidad, productos, clientes) y te entrego un plan estratégico.',
    bullets: [
      'Diagnóstico de tu identidad actual',
      'Oportunidades detectadas',
      '5 iniciativas concretas recomendadas',
      'Métricas para medir resultados',
    ],
    estimatedSeconds: 70,
  },
  audit: {
    id: 'audit',
    icon: 'calendar_month',
    title: 'Auditoría mensual',
    subtitle: 'Todo lo que pasó en los últimos 30 días',
    description:
      'Consolidado de actividad del proyecto: contenido generado, competidores analizados, métricas y aprendizajes.',
    bullets: [
      'Contenido publicado y pendiente',
      'Movimientos de tu competencia',
      'Recomendaciones ejecutadas vs pendientes',
      'Aprendizajes y próximos pasos',
    ],
    estimatedSeconds: 60,
  },
};

export const REPORT_MODES_LIST: ReportModeMeta[] = [
  REPORT_MODES.unified,
  REPORT_MODES.competition,
  REPORT_MODES.news,
  REPORT_MODES.brand,
  REPORT_MODES.audit,
];
