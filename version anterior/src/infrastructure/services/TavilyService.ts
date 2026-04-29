export class TavilyService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = (import.meta.env.VITE_TAVILY_API_KEY as string)?.trim();
  }

  async search(query: string, searchDepth: 'basic' | 'advanced' = 'basic'): Promise<any> {
    if (!this.apiKey) {
      console.error('[StrategyService] KEY_MISSING');
      throw new Error('Configuración de búsqueda incompleta. Contacta soporte.');
    }

    const safeQuery = query.substring(0, 395).trim();

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: this.apiKey,
        query: safeQuery,
        search_depth: searchDepth,
        include_images: false,
        include_answer: false,
        max_results: 10,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const detail = typeof error.detail === 'object' ? JSON.stringify(error.detail) : error.detail;
      const errorMessage = detail || JSON.stringify(error) || response.statusText;
      console.error('[StrategyService] ERROR_DETAIL:', errorMessage);
      throw new Error(`Error en el motor de búsqueda estratégica de Radikal IA.`);
    }

    return await response.json();
  }
}

export const tavilyService = new TavilyService();
