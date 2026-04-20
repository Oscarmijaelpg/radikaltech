/**
 * Z-index scale centralizado para evitar conflictos de stacking.
 *
 * Regla: todo overlay nuevo debe usar una capa de esta tabla. Si necesitas
 * algo distinto, añade una capa antes de inventarte un número.
 */
export const Z = {
  // Contenido normal de la app
  content: 10,
  // Barras/headers sticky
  sticky: 30,
  // Drawers y sidebars móviles
  drawer: 40,
  // Dropdowns y popovers (menús contextuales, notificaciones, autocompletes)
  popover: 50,
  // Tours interactivos (tienen backdrop propio)
  tour: 60,
  // Paneles flotantes permanentes (Sira contextual)
  floatingPanel: 80,
  // Toasts globales
  toast: 100,
  // Modales bloqueantes (dialogs, busy overlays)
  modal: 1000,
  // Confetti y celebraciones (siempre por encima de todo)
  celebration: 9999,
} as const;

export type ZLayer = keyof typeof Z;
