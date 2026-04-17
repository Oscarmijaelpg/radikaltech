import ankorImg from '@/media/ankor_profile.webp';
import SiraImg from '@/media/sira_profile.webp';
import NexoImg from '@/media/nexo_profile.webp';
import KronosImg from '@/media/kronos_profile.webp';
import indexaImg from '@/media/indexa_profile.webp';

export interface AgentMeta {
  id: string;
  name: string;
  role: string;
  color: string;
  avatar: string;
  image: string;
  description: string;
}

export const AGENTS: AgentMeta[] = [
  {
    id: 'ankor',
    name: 'Ankor',
    role: 'Identidad',
    color: 'from-pink-500 to-rose-500',
    avatar: 'ankor',
    image: ankorImg,
    description: 'Esencia, misión, visión, valores y posicionamiento de marca.',
  },
  {
    id: 'sira',
    name: 'Sira',
    role: 'Análisis',
    color: 'from-cyan-500 to-blue-500',
    avatar: 'Sira',
    image: SiraImg,
    description: 'Análisis de mercado, competencia, patrones y oportunidades.',
  },
  {
    id: 'nexo',
    name: 'Nexo',
    role: 'Creatividad',
    color: 'from-amber-500 to-orange-500',
    avatar: 'Nexo',
    image: NexoImg,
    description: 'Ideas, campañas, hooks, copies y conceptos visuales.',
  },
  {
    id: 'kronos',
    name: 'Kronos',
    role: 'Estrategia',
    color: 'from-violet-500 to-purple-500',
    avatar: 'Kronos',
    image: KronosImg,
    description: 'Planificación 6-12 meses, priorización, conexión con objetivos.',
  },
  {
    id: 'indexa',
    name: 'Indexa',
    role: 'Métricas',
    color: 'from-emerald-500 to-teal-500',
    avatar: 'indexa',
    image: indexaImg,
    description: 'KPIs, dashboards, A/B tests y analítica cuantitativa.',
  },
];

export function getAgent(id: string | null | undefined): AgentMeta | undefined {
  if (!id) return undefined;
  return AGENTS.find((a) => a.id === id);
}
