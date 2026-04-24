export interface FirstDayTask {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  estimatedMinutes: number;
  cta: { label: string; to: string };
}

export const FIRST_DAY_TASKS: FirstDayTask[] = [
  {
    id: 'complete_identity',
    title: 'Define tu identidad',
    description: 'Completa los datos clave de tu marca',
    icon: 'auto_awesome',
    points: 20,
    estimatedMinutes: 3,
    cta: { label: 'Ir a Identidad', to: '/memory?tab=brand' },
  },
  {
    id: 'upload_logo',
    title: 'Sube o genera tu logo',
    description: 'Tu logo será el corazón visual de todo lo que creemos',
    icon: 'image',
    points: 15,
    estimatedMinutes: 2,
    cta: { label: 'Subir logo', to: '/memory?tab=brand' },
  },
  {
    id: 'first_competitor',
    title: 'Añade un competidor',
    description: 'Sira empezará a monitorearlos por ti',
    icon: 'radar',
    points: 15,
    estimatedMinutes: 2,
    cta: { label: 'Ir a Competencia', to: '/competitors' },
  },
  {
    id: 'first_chat',
    title: 'Habla con un agente',
    description: 'Pregúntale a Ankor o Sira algo sobre tu marca',
    icon: 'chat',
    points: 10,
    estimatedMinutes: 3,
    cta: { label: 'Ir al chat', to: '/chat' },
  },
  {
    id: 'first_image',
    title: 'Genera tu primera imagen',
    description: 'Crea contenido visual con IA que respeta tu marca',
    icon: 'palette',
    points: 15,
    estimatedMinutes: 3,
    cta: { label: 'Generar imagen', to: '/content?tab=generate' },
  },
  {
    id: 'first_report',
    title: 'Crea tu primer reporte',
    description: 'Consolida información estratégica en un documento',
    icon: 'assignment',
    points: 10,
    estimatedMinutes: 2,
    cta: { label: 'Ir a Reportes', to: '/reports' },
  },
  {
    id: 'first_recommendation',
    title: 'Obtén sugerencias IA',
    description: 'Deja que Kronos te diga qué hacer a continuación',
    icon: 'tips_and_updates',
    points: 10,
    estimatedMinutes: 1,
    cta: { label: 'Ver sugerencias', to: '/recommendations' },
  },
  {
    id: 'schedule_post',
    title: 'Agenda tu primer post',
    description: 'Planifica tu contenido con el calendario editorial',
    icon: 'event',
    points: 10,
    estimatedMinutes: 2,
    cta: { label: 'Ir al calendario', to: '/content?tab=scheduled' },
  },
];

export interface Level {
  minPoints: number;
  label: string;
  emoji: string;
  color: string;
}

export const LEVELS: Level[] = [
  { minPoints: 0, label: 'Aprendiz', emoji: '🌱', color: 'from-slate-400 to-slate-600' },
  { minPoints: 25, label: 'Explorador', emoji: '🔎', color: 'from-cyan-400 to-blue-500' },
  { minPoints: 50, label: 'Constructor', emoji: '🛠️', color: 'from-amber-400 to-orange-500' },
  { minPoints: 75, label: 'Estratega', emoji: '🎯', color: 'from-violet-500 to-purple-600' },
  { minPoints: 100, label: 'Embajador', emoji: '🏆', color: 'from-pink-500 to-rose-600' },
];

export function levelForPoints(points: number): Level {
  let current: Level = LEVELS[0]!;
  for (const l of LEVELS) if (points >= l.minPoints) current = l;
  return current;
}

export const TOTAL_TASKS = FIRST_DAY_TASKS.length;
export const MAX_POINTS = FIRST_DAY_TASKS.reduce((acc, t) => acc + t.points, 0);
