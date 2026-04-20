import type { TourDefinition } from './TourProvider';

export const MEMORY_TOUR: TourDefinition = {
  id: 'memory',
  character: 'ankor',
  steps: [
    {
      target: '[data-tour="memory-tabs"]',
      title: 'Aquí vive tu marca',
      description:
        'Esta es la memoria que los agentes consultan antes de hacer cualquier cosa. Cuanto más completa, mejor trabajo hacemos.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="memory-brand"]',
      title: 'Empieza por Mi identidad',
      description:
        'Tu esencia, tono y valores son lo primero. Sin esto, todo lo demás queda en el aire.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="memory-library"]',
      title: 'Biblioteca: tu memoria de largo plazo',
      description:
        'Notas rápidas y documentos completos (briefs, manuales). Todo queda indexado para que la IA lo consulte.',
      placement: 'bottom',
    },
  ],
};
