import ankor_profile from '@/media/ankor_profile.webp';
import sira_profile from '@/media/sira_profile.webp';
import nexo_profile from '@/media/nexo_profile.webp';
import kronos_profile from '@/media/kronos_profile.webp';
import indexa_profile from '@/media/indexa_profile.webp';

export interface TeamAgent {
  id: string;
  name: string;
  role: string;
  color: string; // tailwind gradient from-... to-...
  glow: string; // tailwind shadow-color
  image: string;
  description: string;
  expertise: string[];
  example: string;
}

export const AGENTS: TeamAgent[] = [
  {
    id: 'ankor',
    name: 'Ankor',
    role: 'Estratega de Identidad',
    color: 'from-pink-500 to-rose-500',
    glow: 'shadow-pink-300/50',
    image: ankor_profile,
    description:
      'Define la esencia, misión, visión y valores de tu marca. Es quien aterriza los conceptos abstractos en decisiones prácticas, ayudándote a construir una identidad coherente que conecte con tu audiencia.',
    expertise: [
      'Identidad de marca',
      'Posicionamiento estratégico',
      'Misión, visión y valores',
      'Arquitectura de marca',
      'Tono de voz y personalidad',
      'Diferenciación competitiva',
    ],
    example: 'Si tu marca hablara como una persona, ¿qué diría antes del café de la mañana?',
  },
  {
    id: 'sira',
    name: 'Sira',
    role: 'Analista de Mercado',
    color: 'from-cyan-500 to-blue-500',
    glow: 'shadow-cyan-300/50',
    image: sira_profile,
    description:
      'Rastrea tendencias, analiza competidores y detecta patrones de mercado. Transforma datos dispersos en insights claros para que tomes decisiones informadas con total claridad.',
    expertise: [
      'Análisis competitivo',
      'Investigación de mercado',
      'Monitoreo de tendencias',
      'Detección de oportunidades',
      'Benchmarks sectoriales',
      'Reportes estratégicos',
    ],
    example: '¿Qué está haciendo tu competencia esta semana que tú deberías aprovechar?',
  },
  {
    id: 'nexo',
    name: 'Nexo',
    role: 'Director Creativo',
    color: 'from-amber-500 to-orange-500',
    glow: 'shadow-amber-300/50',
    image: nexo_profile,
    description:
      'Conecta ideas que nadie había conectado antes. Genera conceptos, campañas y hooks con un enfoque creativo que rompe patrones y captura la atención de tu audiencia.',
    expertise: [
      'Ideación de campañas',
      'Copywriting de alto impacto',
      'Hooks y ganchos creativos',
      'Conceptos visuales',
      'Narrativa de marca',
      'Brainstorming estructurado',
    ],
    example: 'Dame tres hooks para tu próximo lanzamiento que hagan detenerse el scroll.',
  },
  {
    id: 'kronos',
    name: 'Kronos',
    role: 'Jefe de Estrategia',
    color: 'from-violet-500 to-purple-500',
    glow: 'shadow-violet-300/50',
    image: kronos_profile,
    description:
      'Diseña el plan a 6-12 meses con prioridades claras. Traduce objetivos en acciones ordenadas en el tiempo, conectando cada iniciativa con los resultados que importan.',
    expertise: [
      'Planificación estratégica',
      'Roadmaps trimestrales',
      'Priorización de iniciativas',
      'OKRs y objetivos',
      'Gestión de portafolio',
      'Alineación ejecutiva',
    ],
    example: 'Si solo pudieras ejecutar tres cosas este trimestre, ¿cuáles moverían la aguja?',
  },
  {
    id: 'indexa',
    name: 'Indexa',
    role: 'Data Analyst',
    color: 'from-emerald-500 to-teal-500',
    glow: 'shadow-emerald-300/50',
    image: indexa_profile,
    description:
      'Convierte números en decisiones. Construye dashboards, diseña experimentos y te ayuda a entender qué funciona de verdad detrás de cada métrica de tu marca.',
    expertise: [
      'KPIs y métricas clave',
      'Dashboards ejecutivos',
      'A/B testing',
      'Analítica cuantitativa',
      'Cohortes y retención',
      'Atribución de marketing',
    ],
    example: '¿Qué métrica te está mintiendo y cuál deberías estar mirando en su lugar?',
  },
];
