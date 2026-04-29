import type { TourDefinition } from './TourProvider';

export const REPORTS_TOUR: TourDefinition = {
  id: 'reports',
  character: 'kronos',
  steps: [
    {
      target: '[data-tour="reports-new"]',
      title: 'Yo redacto tus reportes',
      description:
        'Tengo 5 tipos: uno integral que cruza todo, uno por competidor, uno de noticias, estrategia de marca y auditoría mensual.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="reports-scheduled"]',
      title: 'Automatiza lo recurrente',
      description:
        'Si necesitas el mismo reporte cada semana o mes, prográmalo aquí y lo genero solo.',
      placement: 'top',
    },
  ],
};
