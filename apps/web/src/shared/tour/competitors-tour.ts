import type { TourDefinition } from './TourProvider';

export const COMPETITORS_TOUR: TourDefinition = {
  id: 'competitors',
  character: 'sira',
  steps: [
    {
      target: '[data-tour="competitors-add"]',
      title: 'Añade a tus competidores',
      description:
        'Dame el nombre y el sitio web. Yo investigo todo lo demás: redes, estrategia, fortalezas y debilidades.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="competitors-detect"]',
      title: 'O deja que yo los descubra',
      description:
        'Busco en tu sector las marcas que compiten contigo y te las traigo ordenadas. Tú decides cuáles guardar.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="competitors-subtabs"]',
      title: 'Lista y benchmark',
      description:
        'En "Lista" ves cada competidor. En "Benchmark" los comparo contra tu marca en posts, engagement y frecuencia.',
      placement: 'bottom',
    },
  ],
};
