import type { TourDefinition } from './TourProvider';

export const CONTENT_TOUR: TourDefinition = {
  id: 'content',
  character: 'nexo',
  steps: [
    {
      target: '[data-tour="content-gallery"]',
      title: 'Tu banco visual',
      description:
        'Aquí vive todo el contenido del proyecto: lo que subes y lo que genero yo. Todo queda etiquetado y buscable.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="content-upload"]',
      title: 'Sube lo que ya tienes',
      description:
        'Fotos, logos, assets previos. Yo los analizo y los guardo con descripción para reusarlos después.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="content-generate"]',
      title: 'Genero imágenes con tu marca',
      description:
        'Dime qué quieres y elijo el mejor modelo. Si activas logo y paleta, salen con tu identidad visual.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="content-scheduled"]',
      title: 'Agenda tus posts',
      description:
        'Desde cualquier imagen puedes crear un post, sumarle un caption y programarlo a una o varias redes.',
      placement: 'bottom',
    },
  ],
};
