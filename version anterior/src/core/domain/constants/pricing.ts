export const PRICING_TR = {
  BASE_FEE_JOB: 0,
  LLM_INPUT_1K: 2,
  LLM_OUTPUT_1K: 8,
  SERPAPI_SEARCH: 6,
  TAVILY_CREDIT: 5,
  TAVILY_EXTRACTION: 5,
  IMAGE_1K: 45,
  IMAGE_2K: 45,
  IMAGE_4K: 45
};

export const COP_PER_TR = 100;

export const TOKEN_PACKAGES = {
  STARTER: { price: 50000, baseTokens: 500, bonusTokens: 0, totalTokens: 500 },
  GROWTH: { price: 100000, baseTokens: 1000, bonusTokens: 50, totalTokens: 1050 },
  PRO: { price: 250000, baseTokens: 2500, bonusTokens: 250, totalTokens: 2750 },
  SCALE: { price: 500000, baseTokens: 5000, bonusTokens: 750, totalTokens: 5750 },
  ENTERPRISE: { price: 1000000, baseTokens: 10000, bonusTokens: 2000, totalTokens: 12000 }
};

export const PREDEFINED_PRODUCTS = {
  QUICK_REPLY: { name: 'Respuesta rápida / microtarea', price: 25, cop: 2500 },
  SOCIAL_POST: { name: 'Contenido para redes (1 post)', price: 60, cop: 6000 },
  CONTENT_CALENDAR: { name: 'Calendario de contenidos (30 posts)', price: 600, cop: 60000 },
  COMPETITION_REPORT: { name: 'Reporte de competencia (express)', price: 250, cop: 25000 },
  SOCIAL_LISTENING: { name: 'Reporte de escucha social (mensual)', price: 800, cop: 80000 },
  CREATIVE_KIT: { name: 'Kit creativo (5 imágenes 1K + copies)', price: 300, cop: 30000 }
};
