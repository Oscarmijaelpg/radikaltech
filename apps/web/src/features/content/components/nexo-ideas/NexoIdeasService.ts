import { api } from '@/lib/api';

export const NexoIdeasService = {
  /**
   * Llama al backend para ejecutar el flujo de investigación profunda
   */
  async refreshIntelligence(userId: string, projectId: string) {
    console.log('[NexoService] Iniciando investigación profunda...');

    // Usamos el proxy configurado en vite.config.ts (/scraper -> localhost:3456)
    const SCRAPER_URL = '/scraper/api/intelligence';

    const [newsRes, compRes] = await Promise.all([
      fetch(`${SCRAPER_URL}/industry-news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, projectId }),
      }),
      fetch(`${SCRAPER_URL}/competitors-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, projectId }),
      }),
    ]);

    if (!newsRes.ok || !compRes.ok) {
      throw new Error('Error al refrescar la inteligencia de mercado.');
    }

    return { success: true };
  },

  /**
   * Genera las 5 ideas estratégicas combinando los reportes de memoria
   */
  async generateIdeas(newsMemory: any, competitorsMemory: any, brandMemories: any[]) {
    const brandIdentity = brandMemories
      .map((m) => `- ${m.title || m.memory_category}: ${m.content.substring(0, 300)}`)
      .join('\n');

    const prompt = `Eres el "Estratega Nexo" de Radikal IA.
Tu misión es transformar datos de mercado en 5 ideas de contenido tácticas y creativas.

### REPORTE DE NOTICIAS Y TENDENCIAS (Contexto actual):
${newsMemory.content.substring(0, 4000)}

### ANÁLISIS DE COMPETENCIA (Acciones de otros):
${competitorsMemory.content.substring(0, 4000)}

### IDENTIDAD DE MARCA (Quiénes somos):
${brandIdentity || 'Marca profesional.'}

INSTRUCCIONES CRÍTICAS:
1. Genera EXACTAMENTE 5 ideas.
2. Formato de descripción: "Qué: [La idea concreta]. Por qué: [El dato real de la noticia o competencia que justifica esta acción]".
3. Sustenta cada "Por qué" en datos reales del texto proporcionado.
4. "visual_suggestion": Describe la imagen ideal para esta pieza.
5. Formato de salida: UNICAMENTE un array JSON.

JSON STRUCTURE:
[
  {
    "title": "Título de la idea",
    "description": "Qué: ... Por qué: ...",
    "platform": "Instagram | LinkedIn | Twitter",
    "visual_suggestion": "Descripción visual para IA",
    "type": "pilar | carrusel",
    "image_count": 1
  }
]`;

    // Usamos el servicio de chat del API principal para llamar al LLM
    const res = await api.post<{ data: { content: string } }>('/ai-services/chat', {
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-4o-mini',
    });

    const response = res.data.content;

    // Extracción robusta de JSON
    const firstBracket = response.indexOf('[');
    const lastBracket = response.lastIndexOf(']');
    if (firstBracket === -1 || lastBracket === -1) {
      throw new Error('Nexo no pudo formatear las ideas correctamente.');
    }

    const jsonStr = response.substring(firstBracket, lastBracket + 1);
    return JSON.parse(jsonStr);
  },
};
