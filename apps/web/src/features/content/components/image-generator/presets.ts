import type { ImageSize, Preset } from './types';

const ASPECT_LABELS: Record<ImageSize, string> = {
  '1024x1024': '1:1 · 1024×1024',
  '1024x1792': '9:16 · Vertical',
  '1792x1024': '16:9 · Horizontal',
};

export function presetSizeLabel(size: ImageSize): string {
  return ASPECT_LABELS[size];
}

export const PRESETS: Preset[] = [
  {
    id: 'ig-post',
    label: 'Instagram · Post',
    icon: 'photo_camera',
    size: '1024x1024',
    prefix:
      'Foto cuadrada 1:1 profesional para post de Instagram, composición centrada y balanceada, iluminación natural impactante, alta definición, espacio para texto overlay. ',
  },
  {
    id: 'ig-story',
    label: 'Instagram · Story',
    icon: 'auto_stories',
    size: '1024x1792',
    prefix:
      'Formato vertical 9:16 para Instagram Story, composición vertical, texto llamativo en zona superior, diseño dinámico y atractivo para mobile. ',
  },
  {
    id: 'ig-reel',
    label: 'Instagram · Reel cover',
    icon: 'movie',
    size: '1024x1792',
    prefix:
      'Portada vertical 9:16 para Reel de Instagram, muy llamativa, con elementos visuales de impacto y tipografía grande centrada. ',
  },
  {
    id: 'tt-cover',
    label: 'TikTok · Cover',
    icon: 'music_video',
    size: '1024x1792',
    prefix:
      'Portada vertical 9:16 para TikTok, energética, con efectos visuales dinámicos, colores saturados. ',
  },
  {
    id: 'li-post',
    label: 'LinkedIn · Post',
    icon: 'business',
    size: '1792x1024',
    prefix:
      'Imagen horizontal 16:9 profesional para LinkedIn, estilo corporativo pero moderno, iluminación limpia, composición ejecutiva. ',
  },
  {
    id: 'li-banner',
    label: 'LinkedIn · Banner',
    icon: 'image',
    size: '1792x1024',
    prefix:
      'Banner horizontal corporativo ultra-ancho para LinkedIn, diseño limpio, espacios respirables, profesional. ',
  },
  {
    id: 'fb-cover',
    label: 'Facebook · Cover',
    icon: 'groups',
    size: '1792x1024',
    prefix:
      'Cover de página Facebook 16:9, composición horizontal, marca destacada, tipografía grande. ',
  },
  {
    id: 'x-post',
    label: 'X/Twitter · Post',
    icon: 'alternate_email',
    size: '1792x1024',
    prefix:
      'Imagen horizontal para post en X/Twitter, composición que funcione bien en timeline, impactante y legible en pequeño. ',
  },
  {
    id: 'carousel',
    label: 'Carrusel slide',
    icon: 'view_carousel',
    size: '1024x1024',
    prefix:
      'Slide de carrusel cuadrado 1:1 con diseño informativo, espacio claro para texto grande, tipografía legible. ',
  },
  {
    id: 'product-shot',
    label: 'Producto neutro',
    icon: 'package_2',
    size: '1024x1024',
    prefix:
      'Fotografía de producto profesional sobre fondo neutro claro, iluminación de estudio, sombras suaves, centrado. ',
  },
];

export function palettetoArray(palette: unknown): string[] {
  if (!palette) return [];
  if (Array.isArray(palette))
    return palette.filter((x): x is string => typeof x === 'string');
  if (typeof palette === 'object') {
    return Object.values(palette as Record<string, unknown>).filter(
      (x): x is string => typeof x === 'string',
    );
  }
  return [];
}
