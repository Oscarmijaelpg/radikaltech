import { tavilyService } from '../../../infrastructure/services/TavilyService';
import { callOpenRouter } from '../../../infrastructure/services/OpenRouterService';
import { MemoryResource } from '../../domain/entities';
import { MemoryRepository } from '../../domain/repositories/MemoryRepository';
import { SupabaseMemoryRepository } from '../../../infrastructure/repositories/SupabaseMemoryRepository';

export class NewsService {
  private memoryRepository: MemoryRepository;

  constructor() {
    this.memoryRepository = new SupabaseMemoryRepository();
  }

  async searchAndGenerateNews(userId: string, projectId: string | null | undefined, companyContext: string, specificTopic?: string): Promise<MemoryResource> {
    
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    // 1. Generate a high-quality Research Prompt (Optimized for Deep Intelligence)
    const researchMetaPrompt = `
      Actúa como analista estratégico senior especializado en inteligencia competitiva y estructuración de prompts para investigación de mercado.
      
      DATOS DE LA EMPRESA (Contexto de búsqueda):
      ${companyContext}

      ${specificTopic ? `SOLICITUD ESPECÍFICA DEL USUARIO: ${specificTopic}` : ''}
      
      TU TAREA:
      Analiza la información de la empresa y genera un prompt optimizado para investigación sectorial profunda que será utilizado por un motor de búsqueda avanzada (Tavily).
      
      REGLAS CRÍTICAS:
      - No asumas información que no esté en el contenido.
      - Infiere la industria y el mercado geográfico.
      - El prompt resultante DEBE RETORNAR ÚNICAMENTE LA CONSULTA DE BÚSQUEDA TÉCNICA.
      - La consulta debe estar enfocada en noticias estratégicas, tendencias disruptivas, y movimientos del mercado en ${currentYear}-${nextYear}.
      - Si la empresa es local, fuerza la búsqueda en su país de operación.
      - Máximo 400 caracteres para la consulta final.
    `;

    const researchQuery = await callOpenRouter('openai/gpt-4o', [
      { role: 'system', content: 'Eres un experto en generación de queries de búsqueda industrial.' },
      { role: 'user', content: researchMetaPrompt }
    ]);

    
    // 2. Search using the generated query
    let searchResults;
    try {
      searchResults = await tavilyService.search(researchQuery.substring(0, 400).trim(), 'advanced');
    } catch (searchError: any) {
      console.error('[NewsService] Search failed:', searchError);
      throw searchError;
    }
    
    if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
      throw new Error("No se encontraron noticias relevantes. Intenta con un tema más general.");
    }


    // 3. Synthesize the report using LLM for Professional Formatting
    const synthesisPrompt = `
      # ELITE STRATEGIC INTELLIGENCE TASK
      Eres Kronos, el motor de inteligencia de Radikal IA. Tu misión es transformar estos resultados de búsqueda en un informe de inteligencia estratégica DE ALTA PROFUNDIDAD y nivel de consultoría (McKinsey/Bain/BCG) para la siguiente empresa:
      
      EMPRESA: ${companyContext.substring(0, 1000)}
      ${specificTopic ? `FOCO ESPECÍFICO DE INVESTIGACIÓN: ${specificTopic}` : ''}

      # DATOS CRUCIALES RECUPERADOS (Tavily)
      ${searchResults.results.map((r: any, i: number) => `
      [Result ${i+1}]
      Título: ${r.title}
      URL: ${r.url}
      Contenido: ${r.content}
      `).join('\n---\n')}

      # REGLAS DE FORMATO Y CONTENIDO (MÁXIMA PROFUNDIDAD):
      1. TÍTULO: Genera un título de alto impacto que defina la tesis del informe.
      2. ESTRUCTURA: Utiliza headers '##' para cada sección (NewsTab divide el contenido por estos headers).
      3. PROFUNDIDAD OBLIGATORIA: Por cada noticia o hallazgo relevante, debes desarrollar:
         - ## [Título del Hallazgo Estratégico]
         - **Contextualización:** ¿Qué está pasando exactamente en el mercado? (Mínimo 3 parrafos)
         - **Análisis de Impacto para ${companyContext.substring(0, 50)}:** ¿Cómo afecta esto ESPECÍFICAMENTE a esta empresa? No seas genérico.
         - **Nivel de Riesgo/Oportunidad:** [Bajo/Medio/Alto/Crítico] con justificación técnica.
         - **Recomendación Estratégica:** ¿Qué paso concreto debe dar la empresa MAÑANA mismo?
         - **Fuente:** [Nombre del Medio](url)
      
      4. SECCIONES MAGISTRALES (OBLIGATORIAS):
         - ## Tesis Estratégica del Informe (Resumen de alto nivel con las implicaciones macro)
         - ## Tablero de Tendencias y Disrupciones (Incluye una TABLA Markdown detallada con: Tendencia | Fuente | Impacto Directo | Prioridad)
         - ## Deep Dive: [Mínimo 6 secciones de hallazgos detallados siguiendo la estructura del punto 3]
         - ## Conclusiones Críticas y Próximos Pasos (Roadmap de acción)

      # RESTRICCIONES:
      - PROHIBIDO el contenido superficial. Si mencionas algo, explícalo a fondo.
      - PROHIBIDO resumir en un solo párrafo. Queremos profundidad de consultoría.
      - CONECTA los puntos: Busca patrones entre las diferentes noticias para ver el panorama completo.
      - IDIOMA: Español Profesional.
    `;

    const professionalReport = await callOpenRouter('openai/gpt-4o', [
      { role: 'system', content: 'Eres un analista de inteligencia estratégica de élite. Generas informes de mercado profundos, estructurados y visualmente impecables en Markdown.' },
      { role: 'user', content: synthesisPrompt }
    ]);

    const title = 'Actualización Estratégica de Inteligencia';
    const cleanContent = professionalReport.trim();

    // 4. Persistence logic
    await Promise.all([
      this.memoryRepository.deleteMemoriesByCategory(userId, 'news', projectId),
      this.memoryRepository.deleteMemoriesByCategory(userId, 'noticias', projectId),
      this.memoryRepository.deleteMemoriesByCategory(userId, 'actualizaciones', projectId)
    ]);

    const newMemory: Partial<MemoryResource> = {
      user_id: userId,
      project_id: projectId || undefined,
      title: title,
      content: cleanContent,
      memory_category: 'news',
      resource_type: 'markdown',
      tags: ['noticias', 'actualizaciones', 'inteligencia_estrategica']
    };

    const savedMemory = await this.memoryRepository.saveMemory(newMemory);
    return savedMemory;
  }
}

export const newsService = new NewsService();
