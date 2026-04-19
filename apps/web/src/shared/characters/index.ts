import ankorProfile from '@/media/ankor_profile.webp';
import siraProfile from '@/media/sira_profile.webp';
import nexoProfile from '@/media/nexo_profile.webp';
import kronosProfile from '@/media/kronos_profile.webp';
import indexaProfile from '@/media/indexa_profile.webp';

export type CharacterKey = 'ankor' | 'sira' | 'nexo' | 'kronos' | 'indexa';

export interface CharacterMeta {
  key: CharacterKey;
  name: string;
  role: string;
  tagline: string;
  image: string;
  accent: string;
}

export const CHARACTERS: Record<CharacterKey, CharacterMeta> = {
  ankor: {
    key: 'ankor',
    name: 'Ankor',
    role: 'Identidad de marca',
    tagline: 'Ancla tu esencia y la mantengo viva.',
    image: ankorProfile,
    accent: 'from-pink-500 to-rose-500',
  },
  sira: {
    key: 'sira',
    name: 'Sira',
    role: 'Investigación e inteligencia',
    tagline: 'Rastreo la competencia y el mundo por ti.',
    image: siraProfile,
    accent: 'from-cyan-500 to-blue-500',
  },
  nexo: {
    key: 'nexo',
    name: 'Nexo',
    role: 'Contenido social',
    tagline: 'Conecto tu marca con el ritmo de las redes.',
    image: nexoProfile,
    accent: 'from-amber-500 to-orange-500',
  },
  kronos: {
    key: 'kronos',
    name: 'Kronos',
    role: 'Estrategia y reportes',
    tagline: 'Ordeno el tiempo y entrego estrategia.',
    image: kronosProfile,
    accent: 'from-emerald-500 to-teal-500',
  },
  indexa: {
    key: 'indexa',
    name: 'Indexa',
    role: 'Métricas y recomendaciones',
    tagline: 'Leo tus números y te digo qué hacer.',
    image: indexaProfile,
    accent: 'from-violet-500 to-fuchsia-500',
  },
};

export function getCharacter(key: CharacterKey): CharacterMeta {
  return CHARACTERS[key];
}
