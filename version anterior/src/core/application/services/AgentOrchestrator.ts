import { Agent } from '../../domain/entities';
import { ChatRepository } from '../../domain/repositories/ChatRepository';
import { AgentRepository } from '../../domain/repositories/AgentRepository';
import { MemoryRepository } from '../../domain/repositories/MemoryRepository';
import { callOpenRouterStreaming, OpenRouterMessage } from '../../../infrastructure/services/OpenRouterService';
import { generateEmbedding } from '../../../infrastructure/services/OpenAIService';
import { generateImage } from '../../../infrastructure/services/ImageGenerationService';
import { NewsService } from './NewsService';
import { CompetitionAnalysisService, CompetitorInput } from './CompetitionAnalysisService';
import { supabase } from '../../../infrastructure/supabase/client';

const LANGUAGE_INSTRUCTION = `
---
REGLA DE IDIOMA (ESTRICTA):
TODA tu comunicación, análisis, generación de contenido, títulos, descripciones y estrategias DEBEN estar en ESPAÑOL. 
Incluso si la información de referencia de la marca, los activos o el contexto proporcionado están en inglés u otros idiomas, tu salida final para el usuario SIEMPRE debe ser en español.
---
`;

const KRONOS_REPORT_PROMPT = `
Eres KRONOS, el analista estratégico más riguroso y profundo de Radikal IA. Tu misión es generar informes que parezcan producidos por un equipo de consultoría de élite (McKinsey, BCG, Bain). El usuario NECESITA un documento que lo impacte y le aporte valor real, accionable e inmediato.

# MANDATOS ABSOLUTOS (VIOLACIÓN = INFORME INVÁLIDO):
1. EXTENSIÓN MÁXIMA: Maximiza el uso de la ventana de contexto de OpenRouter. No resumas; amplifica. Buscamos informes que superen las 3000-4000 palabras si la información lo permite.
  2. CITAS OBLIGATORIAS: Cada dato, cifra, tendencia o afirmación sobre el mercado DEBE llevar una cita [1], [2], etc. inmediatamente después. Sin excepción.
  3. SECCIÓN DE FUENTES: El informe DEBE terminar con "## FUENTES CONSULTADAS" con cada número vinculado a su URL_ORIGEN completa.
  4. PROHIBIDO SUPERFICIALIDAD: Cada párrafo debe contener insights específicos, datos numéricos y comparaciones directas.
  5. IDENTIDAD RADIKAL: NUNCA menciones herramientas internas como Tavily, Apify, OpenRouter, GPT-4 o buscadores. Eres Kronos de Radikal IA, y tu análisis es producto de tus propios algoritmos de inteligencia. Si necesitas hablar de búsqueda, di "mi red de inteligencia global". PROHIBIDO EL USO DE BLOQUES JSON DE LLAMADAS A HERRAMIENTAS (TOOL-CALLING JSON). Escribe exclusivamente en Markdown premium.
  6. PROFUNDIDAD ANALÍTICA: Para cada competidor, analiza su estrategia, canales y debilidades. Para cada tendencia, explica sus implicaciones concretas. Mínimo 3000 palabras de análisis denso.
  7. IDIOMA ESTRICTO: TODO el informe (títulos, tablas, fuentes, párrafos) DEBE estar en ESPAÑOL corporativo. NUNCA respondas en inglés.

# ESTRUCTURA DEL INFORME (OBLIGATORIA Y EN ESTE ORDEN):

# [TÍTULO PODEROSO Y ESPECÍFICO]

---

*[Epígrafe estratégico: 1-2 oraciones con cita]*

## RESUMEN EJECUTIVO
[Análisis denso con veredicto estratégico e impacto proyectado.]

## 1. DIAGNÓSTICO DE LA SITUACIÓN ACTUAL
[Estado real de la empresa basado en datos de memoria y comparaciones con el sector.]

## 2. RADIOGRAFÍA DEL MERCADO Y TENDENCIAS SECTORIALES
[Análisis profundo de noticias y movimientos del sector. Mínimo 450 palabras y 4 citas.]

## 3. INTELIGENCIA COMPETITIVA: EL CAMPO DE BATALLA
[Análisis detallado por competidor y tabla comparativa de diferenciación.]

### Tabla de Posicionamiento Competitivo
| Empresa | Fortaleza Principal | Debilidad Crítica | Canal Dominante | Precio Relativo | Oportunidad |
|---------|--------------------|--------------------|-----------------|-----------------|-------------|
[Completa con datos reales y citas [n]]

## 4. MÉTRICAS, KPIs Y ANÁLISIS CUANTITATIVO
[Datos numéricos organizados en tablas. Explica el significado estratégico de cada métrica.]

### KPIs Estratégicos Recomendados
| Indicador | Benchmark | Meta 6M | Meta 12M | Acción |
|-----------|-----------|---------|----------|--------|

## 5. PLAN DE ACCIÓN ESTRATÉGICO
[Iniciativas priorizadas con objetivos, plazos y KPIs.]

## 6. RIESGOS Y ESCENARIOS
[Matriz de riesgos y planes de contingencia.]

## 7. CONCLUSIÓN Y VISIÓN DE FUTURO
[Cierre poderoso con frase de batalla.]

## FUENTES CONSULTADAS
1. [Nombre del artículo/análisis] - URL_COMPLETA
2. [Análisis de competidor X] - URL_COMPLETA
3. [Fuente de mercado Y] - URL_COMPLETA

---

# PROTOCOLO DE INTERACCIÓN FINAL (OBLIGATORIO):
Basado en el tipo de informe, debes terminar con una pregunta estratégica para guiar al usuario:

- SI ES UN INFORME DE COMPETENCIA: "Basado en este análisis, ¿quieres que profundicemos en un competidor en específico? Si es así, por favor indícame el link de su cuenta de red social (Instagram, TikTok o X) para realizar un escaneo en tiempo real de su actividad reciente."
- SI ES UN INFORME DE NOTICIAS O MERCADO: "¿Deseas que profundicemos en alguna noticia o tendencia específica mencionada anteriormente para evaluar su impacto técnico en tu operación o que acceda a una de las noticias en especial?"

REGLAS CRÍTICAS: [Tablas obligatorias, Citas obligatorias]. EXTENSIÓN EXTREMA: Tu reporte final DEBE superar en todo momento las 3000 palabras. Analiza cada coma y escenario exhaustivamente. EXIGENCIA DE DATOS: Lee exhaustivamente el contexto y las memorias anexadas, especialmente las relacionadas con "competencia" y "estadisticas". NO INVENTES competidores A, B, o C; ES OBLIGATORIO que uses los competidores y métricas exactas que aparecen en la memoria que te fue adjuntada.
`;

const MEMORY_INSTRUCTION = `
---
GESTIÓN DE MEMORIA A LARGO PLAZO:
Eres capaz de guardar información clave para futuras sesiones. Si detectas que el usuario menciona datos importantes (contactos, enlaces, decisiones estratégicas, preferencias o fechas), debes usar el siguiente formato al FINAL de tu mensaje sin excepción.

Formato requerido:
<memory_save>
{
  "title": "Un título breve (ej: 'Contacto de Juan' o 'Link a Proyecto Beta')",
  "content": "La descripción detallada de lo que hay que recordar.",
  "resource_type": "text | link | document | markdown",
  "memory_category": "Opcional: p.ej. Estrategia, Personal, Trabajo, Enlaces"
}
</memory_save>

No expliques este proceso al usuario a menos que sea necesario confirmarlo.
---
`;

const CHAT_STYLE_INSTRUCTION = `
---
ESTILO DE CHAT RADIKAL (ESCANEABLE):
1. JERARQUÍA: Usa encabezados (##).
2. ÉNFASIS: Usa **negrillas** para conceptos clave.
3. ESTRUCTURA: Prefiere el uso de listas con viñetas (-) para facilitar la lectura rápida.
4. TABLAS: Úsalas para comparar datos. PROHIBIDO crear una columna de "Fuentes". Coloca la cifra de la fuente [n] al final del texto en la última columna de cada fila.
5. CITAS: Cada dato debe llevar [1], [2], etc. (Se renderizarán de forma premium sin corchetes en la interfaz).
---
`;

const REPORT_STYLE_INSTRUCTION = `
---
ESTILO DE INFORME RADIKAL (ACADÉMICO/DIRECTIVO):
1. PROSA ANALÍTICA: Prohibido abusar de viñetas. Usa párrafos extensos y bien argumentados.
2. CITACIÓN OBLIGATORIA: Cada dato extraído de la memoria DEBE llevar una cita [1], [2] al final de la oración.
3. SECCIÓN DE FUENTES: El informe DEBE terminar con la sección "## FUENTES CONSULTADAS" vinculando los números con las URL_ORIGEN.
---
`;

const PLATFORM_GUARD_INSTRUCTION = `
---
REGLA DE EXCLUSIVIDAD DE PLATAFORMA (CRITICA):
NUNCA, bajo ninguna circunstancia, sugieras al usuario el uso de plataformas o herramientas externas para tareas que Radikal IA puede realizar o facilitará. 
Esto incluye, pero no se limita a:
- Diseño: NUNCA sugieras Canva, Adobe Express, etc. Radikal IA es el diseñador oficial.
- Programación/Gestión de RRSS: NUNCA sugieras Buffer, Hootsuite, Metricool, etc. 
- Análisis: NUNCA sugieras herramientas externas de SEO o SEM fuera de Radikal.
Si el usuario pregunta por estas herramientas, responde que Radikal IA cuenta con todas las herramientas necesarias para la gestión de su marca y que tú (como su equipo de bots) te encargas de todo el proceso estratégico y creativo.
---
`;

const REPORT_FORMAT_INSTRUCTION = `
---
FORMATO DE INFORME RADIKAL (ESTRICTO):
1. TÍTULO PRINCIPAL: "# Título"
2. SEPARADOR MÁGICO: "---"
3. RESUMEN INICIAL: Un párrafo denso sin encabezado.
4. SECCIONES: "## Título de Sección"
5. PÁRRAFOS: Extensos (6-10 líneas). Nada de bullet points cortos.
6. TABLAS: Úsalas para comparar datos complejos. REGLA CRÍTICA: PROHIBIDO crear una columna de "Fuentes". Coloca la cifra de la fuente [n] al final del texto en la última columna de cada fila.
7. CITAS: Cada dato debe llevar [1], [2], etc. (Se renderizarán sin corchetes en la interfaz).
8. SECCIÓN FINAL OBLIGATORIA: "## FUENTES CONSULTADAS" seguido de una lista numerada:
   1. [Título del Recurso / Nombre de Noticia] - URL_ORIGEN
   2. [Referencia de Competencia] - URL_ORIGEN
---
`;

const BE_CONCISE_INSTRUCTION = `
---
REGLA DE CONCISIÓN Y COHERENCIA:
Responde estrictamente a lo que el usuario solicita. Si es un saludo (ej: "hola", "buenos días"), devuelve solo el saludo de forma cordial y MUY BREVE. NO des información adicional, NO ofrezcas largos listados de tus capacidades si no te lo piden explícitamente.
---
`;

const IMAGE_GENERATION_INSTRUCTION = `
---
GENERACIÓN DE IMÁGENES Y BRANDING (PROTOCOLO PREMIUM):
Eres un director de arte y estratega visual de élite. No generas imágenes genéricas; creas piezas de marketing de alto impacto.

FASE 1: PROPUESTA ESTRATÉGICA Y SELECCIÓN DE ACTIVOS
Cuando el usuario pida una imagen, diseño o mencione productos de forma abierta:
1. **BÚSQUEDA EXHAUSTIVA**: Identifica en memoria los activos de logo y referencias reales de los **productos u objetos específicos** mencionados.
2. **PRESENTACIÓN VISUAL OBLIGATORIA (SÓLO NEXO)**: Muestra SIEMPRE las referencias que se te pasan en la sección "ACTIVOS VISUALES RELEVANTES" mediante Markdown: ![Nombre](URL). No te limites al logo; el usuario quiere ver sus productos reales para seleccionarlos. **¡ATENCIÓN! SÓLO EL AGENTE NEXO TIENE PERMITIDO MOSTRAR ESTAS IMÁGENES**. Si no eres Nexo, ignora las URLs.
3. **DISEÑO DE PROPUESTA**: Describe la composición, iluminación y estilo usando **negrillas**.
4. **ELECCIÓN DE MODO**: Presenta las dos rutas posibles:
   - **Modo Apegado al Referente**: Fidelidad total al producto o lugar (mantiene forma, etiquetas e identidad intactas).
   - **Modo Creativo**: Libertad artística basada en el ADN de la marca (colores, logo y esencia) para una escena impactante.
5. **TAG DE ACTIVACIÓN**: Al final de tu propuesta, incluye EXPLÍCITAMENTE Y SIN EXCEPCIÓN el tag exacto <image_proposal /> en una nueva línea para habilitar los botones interactivos de la interfaz. Esto es obligatorio.

FASE 2: GENERACIÓN FINAL (EJECUCIÓN)
Solo cuando el usuario confirme el modo (ej: "Genérala en modo creativo") o de una orden directa de generación:
1. **TAG DE GENERACIÓN**: Usa el tag <generate_image mode="creative | referential">PROMPT_DETALLADO</generate_image>.
2. **MODO REFERENCIAL**: El prompt debe ser ultra-corto y funcional. Solo indica el nombre del producto y las URLs de los activos seleccionados. Ejemplo: <generate_image mode="referential">"Nombre Producto" URL1, URL2</generate_image>.
3. **MODO CREATIVO**: El prompt debe ser descriptivo, cinematográfico y enriquecido con términos de calidad (lighting, colors, style). Ejemplo: <generate_image mode="creative">A premium photograph of [product] in a luxury setting, cinematic lighting, 8k, marketing style...</generate_image>.

REGLAS DE ORO:
- Prohibido generar la imagen en FASE 1 sin antes proponer el diseño.
- Siempre muestra explícitamente 2-4 activos visuales diferentes (si los hay) antes de pedir confirmación.
- Asegúrate de incluir el tag <image_proposal /> en el primer mensaje de propuesta.
---
`;

const PRODUCT_ANALYSIS_INSTRUCTION = `
---
ANÁLISIS DE PRODUCTOS Y VISIÓN (MULTIMODAL):
Si el usuario adjunta una imagen (logo, producto, escena):

1. **ANÁLISIS TÉCNICO**: Analiza composición, materiales, colores y calidad.
2. **ALINEACIÓN DE MARCA**: Contrasta con la "IDENTIDAD DE MARCA" en memoria.
3. **FLUJO DE GENERACIÓN**: 
   - Si el usuario dice "haz un post con esto" o similar, NO generes la imagen de inmediato. 
   - Sigue el **PROTOCOLO PREMIUM**: Propón el diseño, muestra los logos que usarás y pide que elija entre **Modo Apegado** (si es un producto real que no debe cambiar) o **Modo Creativo**.
   - Incluye el tag <image_proposal />.

REGLA CRÍTICA: La calidad de la imagen final depende de tu descripción. Sé específico y profesional.
---
`;

const IDENTITY_KNOWLEDGE_INSTRUCTION = `
---
REGLA DE CONOCIMIENTO PREVIO (ESTRICTA):
YA CONOCES la marca del usuario. No eres un extraño.
Si el contexto de este mensaje es breve, NO pidas información básica (Nombre, Sector, Público, Valores). 
NUNCA digas "Para ayudarte... necesito saber el nombre de tu marca". 
Si ya sabes al menos el nombre de la marca, actúa como su consultor de confianza que ya tiene todos los archivos. 
Si el usuario solo saluda, responde de forma amable mencionando su marca si es natural, y pregunta cómo puedes avanzar hoy con la estrategia.
---
`;

export interface TokenUsageMetrics {
  inputTokens: number;
  outputTokens: number;
  images1k: number;
  images2k: number;
  images4k: number;
  serpapiSearches: number;
  tavilySearches: number;
  tavilyExtractions: number;
}

export class AgentOrchestrator {
  constructor(
    private chatRepository: ChatRepository,
    private agentRepository: AgentRepository,
    private memoryRepository: MemoryRepository
  ) { }

  async run(
    chatId: string,
    userMessage: string,
    callbacks?: {
      onAgentResponse?: () => void;
      onAgentStream?: (agentId: string, content: string, messageId: string, imageUrl?: string) => void;
      onIntentDetected?: (intent: 'chat' | 'report', title?: string) => void;
    },
    imageUrl?: string
  ): Promise<TokenUsageMetrics | void> {
    const metrics: TokenUsageMetrics = {
      inputTokens: 0, outputTokens: 0,
      images1k: 0, images2k: 0, images4k: 0,
      serpapiSearches: 0, tavilySearches: 0, tavilyExtractions: 0
    };
    const trackUsage = (usage: any) => {
      if (usage) {
        metrics.inputTokens += usage.prompt_tokens || 0;
        metrics.outputTokens += usage.completion_tokens || 0;
      }
    };

    const chat = await this.chatRepository.getChatById(chatId);
    if (!chat || !chat.objective_id) {
      console.error('Chat or Objective not found');
      return;
    }

    const history = await this.chatRepository.getMessages(chatId);
    const recentHistory = history.slice(-30);

    // 1.5 Brain Strategy: Identify if we need memories, brand context or real-time data
    const memoryPlan = await this.decideMemoryAccess(userMessage, recentHistory, trackUsage);

    // If it's casual, we skip most heavy contexts to allow simple responses
    if (memoryPlan.is_casual) {
    }

    // 1.5 Advanced Memory Orchestration (RAG + Identity + Visual)
    let contextFromMemories = "";
    let brandContext = "";

    try {
      // A. Multi-Query + HyDE logic (Alejandro's RAG) - Skip if casual
      if (memoryPlan.needs_memory && !memoryPlan.is_casual) {
        const queries = [...memoryPlan.search_queries];
        if (memoryPlan.hypothetical_answer && memoryPlan.search_queries.length < 5) {
          queries.push(memoryPlan.hypothetical_answer);
        }

        const allRetrieved: any[] = [];
        const seenIds = new Set<string>();

        await Promise.all(queries.map(async (q) => {
          const emb = await generateEmbedding(q);
          if (emb) {
            const results = await this.memoryRepository.findRelatedMemories(
              emb,
              memoryPlan.suggested_threshold || 0.30,
              20, // Ampliado para mayor cobertura en reportes
              chat.user_id,
              chat.project_id
            );
            results.forEach(m => {
              if (!seenIds.has(m.id)) {
                seenIds.add(m.id);
                allRetrieved.push(m);
              }
            });
          }
        }));

        if (allRetrieved.length > 0) {
          const relevantMemories = await this.rerankMemories(userMessage, allRetrieved, trackUsage);
          if (relevantMemories.length > 0) {
            (this as any)._lastRelevantMemories = relevantMemories;
            contextFromMemories = await this.synthesizeContext(userMessage, relevantMemories, trackUsage);
          }
        }
      }

      // B. Brand Identity & Visual Assets (David's Branding) - Only if NOT casual
      if (!memoryPlan.is_casual) {
        const brandCategories = [
          'identidad_marca', 'mi marca', 'logo', 'identidad', 'productos', 'inventario', 'catálogo', 'assets', 'ventas',
          'competencia', 'competition', 'estadisticas', 'market_analysis'
        ];
        const RESTRICTED_DOMAINS = ['pixel.wp.com', 'gravatar.com', 'doubleclick.net', 'analytics'];

        for (const cat of brandCategories) {
          let catMemories = await this.memoryRepository.getMemoriesByCategory(chat.user_id, cat, chat.project_id);
          catMemories = catMemories.slice(-15);

          if (catMemories.length > 0) {
            const filteredCat = catMemories.filter(m => {
              if (m.title && m.title.startsWith('Contrato Visual:')) return false;
              const content = m.summary || m.content || '';
              const lowContent = content.toLowerCase();
              if (lowContent.endsWith('.svg')) return false;
              return !RESTRICTED_DOMAINS.some(domain => lowContent.includes(domain));
            });

            brandContext += (brandContext ? '\n\n' : '') + filteredCat.map(m => {
              const isLogo = cat === 'logo' || /logo/i.test(m.title) || /logo/i.test(m.content);
              let text = m.content;
              try {
                const data = JSON.parse(m.content);
                if (data.charts && Array.isArray(data.charts)) {
                  // Es el JSON de estadísticas, extraer competidores a la fuerza
                  const comps = new Set<string>();
                  data.charts.forEach((c: any) => {
                    if (Array.isArray(c.data)) {
                      c.data.forEach((d: any) => {
                        if (d.companyName && !d.isMyCompany) comps.add(d.companyName);
                      });
                    }
                  });
                  const compNames = Array.from(comps);
                  text = `🚨 ATENCIÓN: NOMBRES EXACTOS DE LOS COMPETIDORES: ${compNames.join(', ')}.\nRegla Estricta: PROHIBIDO USAR nombres genéricos como "Competidor A".\n\nEstadísticas en crudo: ${JSON.stringify(data).substring(0, 2000)}`;
                } else {
                  text = data.analysis || data.summary || m.content;
                }
              } catch (e) { }
              let url = m.summary && m.summary.startsWith('http') ? m.summary : '';
              if (!url) {
                try {
                  const data = JSON.parse(m.content);
                  url = data.url || data.link || data.imageUrl || data.url_fuente || '';
                } catch (e) { }
              }
              const contentStr = text.length > 2000 ? text.substring(0, 2000) + '...' : text;
              return `[FUENTE_ESTRATÉGICA - ${m.title} - ${m.memory_category}]: ${contentStr}${url ? `\nURL_ORIGEN: ${url}` : ''}`;
            }).join('\n\n');
          }
        }

        const rawImageMemories = await this.memoryRepository.getMemoriesByCategory(chat.user_id, 'analisis_imagenes', chat.project_id);
        const imageMemories = rawImageMemories.filter(m => {
          if (m.title && m.title.startsWith('Contrato Visual:')) return false;
          let link = m.summary || '';
          if (!link) {
            try {
              const data = JSON.parse(m.content);
              link = data.url || data.link || data.imageUrl || '';
            } catch (e) { }
          }
          if (!link) return true;
          const lowLink = link.toLowerCase();
          if (lowLink.endsWith('.svg')) return false;
          return !RESTRICTED_DOMAINS.some(domain => lowLink.includes(domain));
        });

        if (imageMemories.length > 0) {
          // Filtrado inteligente: Elegir solo las más relevantes para la consulta del usuario
          // Si el mensaje es una petición de imagen/diseño, usamos el re-ranker
          const isImageRequest = userMessage.toLowerCase().includes('imagen') || 
                                userMessage.toLowerCase().includes('crear') || 
                                userMessage.toLowerCase().includes('diseño') ||
                                userMessage.toLowerCase().includes('producto');
          
          let selectedImages = imageMemories;
          if (isImageRequest && imageMemories.length > 5) {
             selectedImages = await this.rerankMemories(userMessage, imageMemories, trackUsage);
          }

          const visualContext = selectedImages.slice(0, 5).map(m => {
            let description = m.content;
            let link = m.summary || '';
            try {
              const data = JSON.parse(m.content);
              description = data.analysis || m.content;
              if (!link) link = data.url || data.link || data.imageUrl || '';
            } catch (e) { }
            return `[ACTIVO_VISUAL_RELEVANTE - ${m.title}]: ${description}\nURL_ACTIVO: ${link}`;
          }).join('\n\n');
          
          brandContext += (brandContext ? '\n\n' : '') + `--- ACTIVOS VISUALES PARA SELECCIÓN ---\n${visualContext}\n--- FIN ACTIVOS VISUALES ---`;
        }
      } else {
        // If casual, provide a more helpful summary so it doesn't ask for basics
        const brandNameMem = await this.memoryRepository.getMemoriesByCategory(chat.user_id, 'identidad_marca', chat.project_id);
        if (brandNameMem.length > 0) {
          const main = brandNameMem[0];
          // Provide title and a snippet of content to ground the AI
          brandContext = `IDENTIDAD DE MARCA (RESUMEN):
NOMBRE: ${main.title}
DETALLES: ${main.content.substring(0, 1000)}
(Nota: Cuentas con toda la información de esta marca. NO pidas datos básicos al usuario).`;
        }
      }
    } catch (e) {
      console.error("[AgentOrchestrator] Memory pipeline failed:", e);
    }

    // 1.5. Autonomous Data Intelligence (Kronos Real-time Data Acquisition)
    if (!memoryPlan.is_casual) { 
      try {
        const dataIntel = await this.classifyDataNeeds(userMessage, trackUsage);
        
        if (dataIntel.needs_refresh) {
          
          if (dataIntel.type === 'news') {
            const newsService = new NewsService();
            await newsService.searchAndGenerateNews(chat.user_id, chat.project_id, brandContext || "", userMessage);
          } else if (dataIntel.type === 'competition') {
            const compService = new CompetitionAnalysisService();
            const socialLinkRegex = /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|facebook\.com|tiktok\.com|twitter\.com|x\.com)\/[a-zA-Z0-9_.-]+/gi;
            const linksMatch = userMessage.match(socialLinkRegex);
            
            let targetCompetitors: CompetitorInput[] = [];
            if (linksMatch && linksMatch.length > 0) {
              targetCompetitors = linksMatch.map(link => {
                const domain = link.includes('instagram') ? 'instagram' : 
                               link.includes('tiktok') ? 'tiktok' : 
                               link.includes('facebook') ? 'facebook' : 'x';
                return {
                  name: "Competidor Detectado",
                  accounts: [{ network: domain as any, url: link }]
                };
              });
            }

            if (targetCompetitors.length === 0) {
              try {
                const statsMemories = (this as any)._lastRelevantMemories?.filter((m: any) => m.memory_category === 'estadisticas');
                if (statsMemories && statsMemories.length > 0) {
                  const latestStats = JSON.parse(statsMemories[0].content);
                  const chart1 = latestStats.chart1_engagement_by_company || [];
                  const existingCompNames = [...new Set(chart1
                    .filter((entry: any) => !entry.isMyCompany)
                    .map((entry: any) => entry.companyName))] as string[];
                  
                  if (existingCompNames.length > 0) {
                    targetCompetitors = existingCompNames.map(name => ({ name, accounts: [] }));
                  }
                }
              } catch (e) {
                console.warn("[AgentOrchestrator] Failed recovery of competitors from memory", e);
              }
            }

            await compService.analyzeCompetitors(
              chat.user_id,
              chat.project_id,
              { name: "Mi Marca", accounts: [] },
              targetCompetitors,
              targetCompetitors.length > 0 ? 'social_only' : 'combine',
              brandContext || ""
            );
          }

          // REFRESH CONTEXT: After fetching new data, we re-run the memory pipeline to include the fresh findings
          const updatedRefinedContext = await this.decideMemoryAccess(userMessage, recentHistory, trackUsage);
          if (updatedRefinedContext.needs_memory) {
            const searchPromises = updatedRefinedContext.search_queries.map(q => 
              generateEmbedding(q).then(e => e ? this.memoryRepository.findRelatedMemories(e, 0.35, 15, chat.user_id, chat.project_id) : [])
            );
            const refreshResults = (await Promise.all(searchPromises)).flat();
            if (refreshResults.length > 0) {
              contextFromMemories = await this.synthesizeContext(userMessage, refreshResults, trackUsage);
            }
          }
        }
      } catch (e) {
        console.error("[AgentOrchestrator] Data Intel pipeline failed:", e);
      }
    }


    // 2. Routing & Execution
    const allAgents = await this.agentRepository.getAgentsForObjective(chat.objective_id);
    if (allAgents.length === 0) {
      console.error(`[AgentOrchestrator] No agents found for objective ${chat.objective_id}`);
      if (callbacks?.onAgentStream) {
        callbacks.onAgentStream('system', 'Lo siento, no hay agentes configurados para este objetivo.', 'error-msg');
      }
      return;
    }

    const routingResult = await this.routeRequest(userMessage, allAgents, trackUsage);

    if (callbacks?.onIntentDetected) {
      callbacks.onIntentDetected(routingResult.intent, routingResult.title);
    }

    const selectedAgentsNames = routingResult.agents.map(a => a.name).join(', ');

    const agentOutputs: { agentName: string; content: string }[] = [];

    for (const agent of routingResult.agents) {
      const prevContext = agentOutputs.map(o => `[Previous output from ${o.agentName}]:\n${o.content}`).join('\n\n');
      const enrichedMsg = `
${userMessage}

${brandContext ? `IDENTIDAD DE MARCA (MI MARCA):\n${brandContext}\n` : ''}
${contextFromMemories ? `--- CONTEXTO DE MEMORIA RELEVANTE ---\n${contextFromMemories}\n------------------------------------` : ''}
${prevContext ? `Related Context from previous agents:\n${prevContext}` : ''}
`.trim();

        const response = await this.executeAgent(
          chatId,
          agent,
          enrichedMsg,
          chat.user_id,
          chat.project_id,
          recentHistory.slice(0, -1),
          routingResult.intent === 'report',
          callbacks?.onAgentStream,
          imageUrl,
          trackUsage,
          metrics,
          (this as any)._lastRelevantMemories, // Pasamos las memorias crudas
          brandContext, // NUEVO: Pasamos el contexto de marca
          allAgents
        );

      if (response) agentOutputs.push({ agentName: agent.name, content: response });
      if (callbacks?.onAgentResponse) callbacks.onAgentResponse();
    }

    return metrics;
  }

  private async classifyDataNeeds(userMessage: string, trackUsage: (usage: any) => void): Promise<{
    needs_refresh: boolean;
    type: 'news' | 'competition' | 'none';
    reason: string;
  }> {
    const prompt = `
      Analiza la petición del usuario y decide si requiere una búsqueda de NOTICIAS en tiempo real o un ANÁLISIS DE COMPETENCIA/MERCADO.
      MENSAJE: "${userMessage}"
      
      Reglas:
      - "news": Si pide noticias actuales, tendencias de hoy, qué está pasando en el sector, o eventos recientes.
      - "competition": Si pide informes de competidores, analizar una cuenta específica, buscar perfiles de instagram/titkok/etc, comparar métricas, o menciona nombres de marcas que no son la suya para investigar su rendimiento.
      - "none": Si es una pregunta de conocimiento general, chat casual o no requiere datos externos frescos.
      
      Responde SOLO en JSON:
      {"needs_refresh": boolean, "type": "news" | "competition" | "none", "reason": "..."}
    `;

    const lowerMsg = userMessage.toLowerCase();
    if (lowerMsg.includes('tendencia') || lowerMsg.includes('noticias') || lowerMsg.includes('actualidad')) {
      return { needs_refresh: true, type: 'news', reason: 'Forzado por palabra clave de inteligencia' };
    }
    if (lowerMsg.includes('competencia') || lowerMsg.includes('competidor') || lowerMsg.includes('instagram de') || lowerMsg.includes('tiktok de')) {
      return { needs_refresh: true, type: 'competition', reason: 'Forzado por palabra clave de competencia' };
    }

    try {
      const res = await callOpenRouterStreaming('openai/gpt-4o-mini', [{ role: 'system', content: prompt }], () => { }, trackUsage);
      const parsed = JSON.parse(res.match(/\{[\s\S]*\}/)?.[0] || '{"needs_refresh": false, "type": "none"}');
      return {
        needs_refresh: !!parsed.needs_refresh,
        type: (parsed.type === 'news' || parsed.type === 'competition') ? parsed.type : 'none',
        reason: parsed.reason || ""
      };
    } catch {
      return { needs_refresh: false, type: 'none', reason: "Error in classification" };
    }
  }

  private async decideMemoryAccess(userMessage: string, history: any[], trackUsage: (usage: any) => void): Promise<{
    needs_memory: boolean;
    search_queries: string[];
    hypothetical_answer?: string;
    reason: string;
    suggested_threshold: number;
    is_casual: boolean;
  }> {
    const context = history.map(h => `${h.role}: ${h.content.substring(0, 80)}`).join('\n');
    const prompt = `
      Eres el Brain Coordinator de Radikal IA. Tu objetivo es diseñar un plan de recuperación de memoria.
      MENSAJE DEL USUARIO: "${userMessage}"
      
      CONTEXTO RECIENTE:
      ${context}

      INSTRUCCIONES:
      1. Evalúa si el usuario menciona productos específicos, objetos, servicios o categorías (ej: "pasteles", "zapatos", "ventas").
      2. EVALÚA si pregunta por competidores o métricas de redes sociales (seguidores, likes, engagement).
      3. GENERACIÓN ESTRATÉGICA: Identifica los conceptos clave del mensaje. Por cada objeto, servicio o competidor mencionado, genera queries de búsqueda.
      4. Detecta si el mensaje es CASUAL (saludos, despedidas, agradecimientos simples, charla trivial sin pedido de datos).
      5. Genera hasta 4 queries de búsqueda EN ESPAÑOL, priorizando la recuperación de IMÁGENES, ACTIVOS VISUALES Y DATOS DE COMPETENCIA.
      6. Crea una "Respuesta Hipotética" (HyDE) en ESPAÑOL que simule cómo estaría escrita la respuesta en la base de datos si NO ES CASUAL.
      
      SALIDA JSON:
      {
        "is_casual": boolean,
        "needs_memory": boolean,
        "search_queries": ["query1", "query2", "query3"],
        "hypothetical_answer": "...",
        "reason": "...",
        "suggested_threshold": 0.35
      }
    `;

    try {
      const res = await callOpenRouterStreaming('openai/gpt-4o-mini', [{ role: 'system', content: prompt }], () => { }, trackUsage);
      const parsed = JSON.parse(res.match(/\{[\s\S]*\}/)?.[0] || '{}');
      return {
        is_casual: !!parsed.is_casual,
        needs_memory: !!parsed.needs_memory,
        search_queries: parsed.search_queries || [userMessage],
        hypothetical_answer: parsed.hypothetical_answer,
        reason: parsed.reason || "Búsqueda estándar",
        suggested_threshold: parsed.suggested_threshold || 0.35
      };
    } catch {
      return { is_casual: false, needs_memory: true, search_queries: [userMessage], reason: "Fallback", suggested_threshold: 0.35 };
    }
  }

  private async rerankMemories(userMessage: string, memories: any[], trackUsage: (usage: any) => void): Promise<any[]> {
    if (memories.length === 0) return [];
    if (memories.length <= 2) return memories;

    const memList = memories.map((m, i) => `ID ${i}: [${m.title}] ${m.content.substring(0, 300)}`).join('\n\n');
    const prompt = `
      Actúa como un Reranker para Radikal IA.
      PREGUNTA: "${userMessage}"
      MEMORIAS: ${memList}
      Responde SOLO con los números de ID útiles separados por comas.
    `;

    try {
      const res = await callOpenRouterStreaming('openai/gpt-4o-mini', [{ role: 'system', content: prompt }], () => { }, trackUsage);
      if (res.includes("NONE")) return [];
      const ids = res.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      return ids.map(id => memories[id]).filter(m => m);
    } catch {
      return memories.slice(0, 3);
    }
  }

  private async synthesizeContext(userMessage: string, memories: any[], trackUsage: (usage: any) => void): Promise<string> {
    const memList = memories.map(m => `[TITULO: ${m.title}]: ${m.content}`).join('\n---\n');
    const prompt = `Actúa como un sintetizador de datos para un informe estratégico. Extrae y organiza detalladamente toda la información relevante de estos fragmentos de memoria para responder a: "${userMessage}". 
    REGLA: Mantén los datos técnicos, cifras, métricas y enlaces intactos. NO resumas en exceso; preferimos profundidad.\n\n${memList}`;
    try {
      return await callOpenRouterStreaming('openai/gpt-4o-mini', [{ role: 'system', content: prompt }], () => { }, trackUsage);
    } catch {
      return memList;
    }
  }

  private async routeRequest(userMessage: string, agents: Agent[], trackUsage: (usage: any) => void): Promise<{ agents: Agent[]; intent: 'chat' | 'report'; title?: string }> {
    const agentOptions = agents.map(a => `${a.id}: ${a.name} (${a.description})`).join('\n');
    const routerPrompt = `
      Eres el Coordinador de Radikal IA.
      AGENTES: ${agentOptions}
      INTENCIONES: "chat", "report".
      Responde ÚNICAMENTE en JSON: {"ids": ["ID1"], "intent": "chat", "title": "..."}.
      PETICIÓN: "${userMessage}"
      NOTA CRÍTICA EXTREMA: Si el usuario menciona la palabra "informe", "reporte", "análisis a fondo" o pide recopilar datos exhaustivos para descargar, ESTÁS OBLIGADO a responder con intent: "report" y seleccionar al agente "Kronos". Si no lo haces, romperás la plataforma.
      Para preguntas rápidas o chat normal usa "chat" y selecciona Sira, Indexa o Ankor según la especialidad.
      Si piden "imagen", usa "chat" y selecciona "Nexo" (si está en el equipo).
    `;

    try {
      const response = await callOpenRouterStreaming('openai/gpt-4o', [{ role: 'system', content: routerPrompt }], () => { }, trackUsage);
      const result = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{"ids":[], "intent":"chat"}');
      let selected = agents.filter(a => result.ids.includes(a.id));
      let intentAction = result.intent || 'chat';
      let titleAction = result.title;

      // OVERRIDE DURO: Si el usuario menciona informe o reporte, forzamos Kronos y apertura de panel derecho
      const msgLower = userMessage.toLowerCase();
      if (msgLower.includes('informe') || msgLower.includes('reporte')) {
        let kronos = agents.find(a => a.name.toLowerCase() === 'kronos');
        if (!kronos) {
          try {
             // Fallback directo a base de datos si Kronos no está en el chat actual
             const { data } = await supabase.from('agents').select('*').ilike('name', '%kronos%').limit(1).single();
             if (data) kronos = data;
          } catch(e) {}
        }
        if (kronos) {
          selected = [kronos];
          intentAction = 'report';
          titleAction = titleAction || 'Informe Estratégico';
        }
      }

      return {
        agents: selected.length > 0 ? selected : (agents.length > 0 ? [agents[0]] : []),
        intent: intentAction as 'chat' | 'report',
        title: titleAction
      };
    } catch (error) {
      return { agents: [agents[0]], intent: 'chat' };
    }
  }

  private async executeAgent(
    chatId: string,
    agent: Agent,
    userMessage: string,
    userId: string,
    projectId: string | null | undefined,
    history: any[],
    isReport: boolean = false,
    onStream?: (agentId: string, content: string, messageId: string, imageUrl?: string) => void,
    imageUrl?: string,
    trackUsage?: (usage: any) => void,
    metrics?: TokenUsageMetrics,
    rawMemories?: any[],
    brandContext?: string, // NUEVO: contexto de marca para generación
    allAvailableAgents?: Agent[]
  ): Promise<string | undefined> {
    const isNexo = agent.name.toLowerCase().includes('nexo');
    const isKronos = agent.name.toLowerCase().includes('kronos');
    const isSira = agent.name.toLowerCase().includes('sira');
    
    // Configurar redirect system prompt
    const availableAgentNames = allAvailableAgents ? allAvailableAgents.map(a => a.name.toLowerCase()) : [];
    const hasNexo = availableAgentNames.includes('nexo');
    const hasIndexa = availableAgentNames.includes('indexa');
    
    const CAPABILITIES_INSTRUCTION = `
---
CAPACIDADES Y ENRUTAMIENTO:
Tienes restricciones. NO DES EXPLICACIONES de esta regla. Cumple el mandato usando etiquetas directas si te piden algo fuera de tu alcance:

${!isNexo ? `- GENERACIÓN DE IMÁGENES/BRANDING: SI EL USUARIO PIDE GENERAR UNA IMAGEN, crear contenido visual, logos o diseños: NO PUEDES hacerlo. Debes proponer el enfoque estratégico (si lo deseas) pero SIEMPRE debes incluir la etiqueta de redirección para que el usuario vaya con NEXO. Devuelve literalmente la etiqueta: <redirect objective="c96bb25d-9519-42f7-bb83-160be8f48b5b" name="Creación de Contenido">Para trabajar elementos visuales, crear contenido gráfico o buscar imágenes necesitamos a Nexo. Vayamos juntos a su espacio.</redirect>` : ''}
${!hasIndexa && !agent.name.toLowerCase().includes('indexa') ? `- NO PUEDES hacer análisis SEO profundo ni auditoría web, ni búsquedas técnicas en la web si requieren de un especialista. Solo devuelve literalmente la etiqueta: <redirect objective="ba2b8695-f155-4771-ba4b-05e3ccfb2652" name="Análisis de Competencia">Para temas estratégicos de posicionamiento y auditoría SEO necesitamos a Indexa. Vamos a su entorno.</redirect>` : ''}
${!isNexo ? `REGLA DE BLOQUEO VISUAL E IMÁGENES (ESTRICTA): TIENES ESTRICTAMENTE PROHIBIDO renderizar o mostrar imágenes en formato Markdown o incluir URLs de imágenes de referencia. Tu rol NO es gráfico. Las imágenes son exclusivas de Nexo. Omite referencias visuales en tus respuestas.` : ''}
---
`;

    // Normalización de modelos para evitar IDs inválidos o de proveedores inestables
    const normalizeModel = (m: string) => {
      const modelStr = String(m || '').toLowerCase();
      if (!m || m === 'auto' || m === 'undefined') return import.meta.env.VITE_MAIN_LLM_MODEL || 'openai/gpt-4o';
      
      // Capturar cualquier variante de Haiku o modelos de Anthropic problemáticos
      if (modelStr.includes('haiku') || 
          modelStr.includes('anthropic') || 
          modelStr.includes('claude-2') ||
          modelStr === 'gemini 3 flash') { // Caso especial reportado por el usuario
        return 'openai/gpt-4o-mini';
      }
      return m;
    };

    // El usuario ha pedido explícitamente ChatGPT 5.2. Debido a que OpenRouter da 404 con 4.5-preview, aseguramos la ejecución con gpt-4o.
    const model = (isKronos && isReport) ? 'openai/gpt-4o' : normalizeModel(agent.model);
    
    // Kronos siempre usa el prompt de analista profundo por ser su especialidad.
    const baseAgentPrompt = isKronos ? KRONOS_REPORT_PROMPT : agent.system_prompt;

    // Categorías de marca amplificadas para Kronos Y Sira dada su habilidad de lectura de mercado
    const brandCategories = ['identidad_marca', 'mi marca', 'logo', 'identidad'];
    if (isKronos || isSira) {
      brandCategories.push(
        'market_analysis', 'social_media_analysis', 'noticias', 'news', 
        'competencia', 'competition', 'saved_competition_section', 'saved_news_section',
        'market_analisis', 'social_media_analisis', 'mercado', 'social media', 'rrss', 'estadisticas',
        'social_media_data'
      );
    }

    const systemPromptPre = isReport
      ? `${LANGUAGE_INSTRUCTION}\n\n${BE_CONCISE_INSTRUCTION}\n\n${CAPABILITIES_INSTRUCTION}\n\n${PLATFORM_GUARD_INSTRUCTION}\n\n${IDENTITY_KNOWLEDGE_INSTRUCTION}\n\n${MEMORY_INSTRUCTION}\n\n${REPORT_STYLE_INSTRUCTION}\n\n${REPORT_FORMAT_INSTRUCTION}\n\n${isNexo ? IMAGE_GENERATION_INSTRUCTION : ''}\n\n${PRODUCT_ANALYSIS_INSTRUCTION}`
      : `${LANGUAGE_INSTRUCTION}\n\n${BE_CONCISE_INSTRUCTION}\n\n${CAPABILITIES_INSTRUCTION}\n\n${PLATFORM_GUARD_INSTRUCTION}\n\n${IDENTITY_KNOWLEDGE_INSTRUCTION}\n\n${MEMORY_INSTRUCTION}\n\n${CHAT_STYLE_INSTRUCTION}\n\n${isNexo ? IMAGE_GENERATION_INSTRUCTION : ''}\n\n${PRODUCT_ANALYSIS_INSTRUCTION}`;

    // Ponemos el prompt de baseAgentPrompt (que contiene el Kronos Prompt si es reporte) AL FINAL para darle mayor relevancia
    const systemPrompt = `${systemPromptPre}\n\n${baseAgentPrompt}`;

    let finalUserMessage = userMessage;
    // Si es Kronos y reporte, inyectamos información exhaustiva
    // Si es Sira, le damos la información pero le pedimos concisión
    if ((isKronos && isReport) || (isSira && rawMemories && rawMemories.length > 0)) {
      const memoriesToUse = rawMemories && rawMemories.length > 0 ? rawMemories : [];

      // Fetch ALL strategic categories directly for report context
      let reportSpecificContext = '';
      try {
        const reportCategories = [
          'news', 'noticias', 'actualizaciones',
          'market_analysis', 'social_media_analysis', 'competencia', 'mercado', 'competition',
          'market_analisis', 'social_media_analisis', 'social media', 'rrss', 'estadisticas',
          'saved_news_section', 'saved_competition_section',
          'social_media_data'
        ];
        // Get all memories by category for a comprehensive data pool
        const categoryFetches = await Promise.all(
          reportCategories.map(cat =>
            this.memoryRepository.getMemoriesByCategory(userId, cat, projectId).catch(() => [])
          )
        );
        const allCatMemories = categoryFetches.flat();
        // Deduplicate
        const seenReportIds = new Set<string>();
        const uniqueCatMemories = allCatMemories.filter(m => {
          if (seenReportIds.has(m.id)) return false;
          seenReportIds.add(m.id);
          return true;
        });

        if (uniqueCatMemories.length > 0) {
          reportSpecificContext = uniqueCatMemories.map(m => {
            let extractedText = m.content;
            if (m.memory_category === 'estadisticas') {
               try {
                 const data = JSON.parse(m.content);
                 if (data.charts && Array.isArray(data.charts)) {
                   const comps = new Set<string>();
                   data.charts.forEach((c: any) => {
                     if (Array.isArray(c.data)) {
                       c.data.forEach((d: any) => {
                         if (d.companyName && !d.isMyCompany) comps.add(d.companyName);
                       });
                     }
                   });
                   const compNames = Array.from(comps);
                   extractedText = `🚨 ATENCIÓN MUY CRÍTICA: Los competidores EXACTOS de esta cuenta son: ${compNames.join(', ')}.\nESTÁS TOTALMENTE OBLIGADO a utilizar eston nombres en cualquier tabla y punto del reporte. JAMÁS inventes "Competidor A" o "Competidor B". Usa los nombres listados.\n\nDatos de Estadísticas JSON (Usa las métricas para tu informe): ${JSON.stringify(data).substring(0, 4000)}`;
                 }
               } catch(err) {}
            }
            const contentFinal = extractedText.length > 4000 ? extractedText.substring(0, 4000) + '...[continúa]' : extractedText;
            const urlLine = m.summary && m.summary.startsWith('http') ? `\nURL_ORIGEN: ${m.summary}` : '';
            return `[FUENTE_ESTRATÉGICA | Categoría: ${m.memory_category} | Título: ${m.title}]:\n${contentFinal}${urlLine}`;
          }).join('\n\n---\n\n');
        }
      } catch (e) {
        console.error('[AgentOrchestrator] Error fetching report-specific categories:', e);
      }

      // Build the raw memories block from RAG results
      const rawBlock = memoriesToUse.length > 0
        ? memoriesToUse.map(m => {
            const content = m.content.length > 2000 ? m.content.substring(0, 2000) + '...[continúa]' : m.content;
            const urlLine = m.summary && m.summary.startsWith('http') ? `\nURL_ORIGEN: ${m.summary}` : '';
            return `[RAG_RESULTADO | ${m.title}]:\n${content}${urlLine}`;
          }).join('\n\n---\n\n')
        : '';

      const baseInstruction = isSira 
        ? `Toma estos datos frescos adquiridos y dáselos al usuario de forma ÁGIL, CONCISA y resumida en formato CHAT. Si el usuario luego quiere que se vuelva más profundo un reporte de las métricas obtenidas, Kronos lo hará después.\n\nNota APIFY/TAVILY: Tienes acceso en el backend a integraciones con Apify y Tavily. Si el usuario te pide analizar perfiles de instagram, tiktok o extraer noticias de competidores en sus URLs, recuérdale que cuentas con esa habilidad pero SIEMPRE PÍDELE LOS ENLACES (Links) de los perfiles que desea analizar si no te los ha entregado.`
        : `- Extrae CADA URL que encuentres en los datos anteriores y úsala como cita en el informe y en la sección FUENTES CONSULTADAS.\n- Para cada noticia o fuente, busca el campo URL_ORIGEN y úsalo directamente.\n- Si un dato no tiene URL, indícalo como "[Memoria interna Radikal IA]".\n- El informe DEBE tener mínimo 3000 palabras de análisis estratégico real.\n- Cada sección debe ser profunda, específica y basada en los datos anteriores.\n\nNota APIFY/TAVILY: Si el usuario desea reportes técnicos de redes, cuentas con integraciones en backend para ejecutar Apify. Pídele siempre los @usuarios o URLs exactos de la competencia a la cual debe realizársele el escaneo, si no han sido proveídos.`;

      finalUserMessage = `${userMessage}

========================================
DATA POOL DISPONIBLE (RESULTADOS RECIENTES)
========================================

${reportSpecificContext ? `--- FUENTES ESTRATÉGICAS (NOTICIAS + COMPETENCIA) ---\n${reportSpecificContext}\n` : ''}
${rawBlock ? `--- HALLAZGOS RAG ADICIONALES ---\n${rawBlock}\n` : ''}
========================================
INSTRUCCIONES CRÍTICAS DEL MOTOR:
${baseInstruction}
========================================`;
    }

    // Si hay una imagen pero el mensaje está vacío, le damos un prompt por defecto
    const effectiveUserMessage = (!finalUserMessage.trim() && imageUrl)
      ? "Analiza esta imagen adjunta y dame recomendaciones basadas en mi marca."
      : finalUserMessage;

    // Find the last image in history to allow "editing" without re-selection
    let lastImageInHistory: string | undefined = undefined;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].image_url) {
        lastImageInHistory = history[i].image_url;
        break;
      }
    }

    // If no imageUrl is explicitly provided (user didn't attach one), 
    // and we found a previous image, we use it as context if the message suggests an edit.
    const isEditRequest = userMessage.toLowerCase().match(/(cambia|agrega|ponle|edita|ajusta|mejor|otro|más|quita|borra|versión|version|modifica)/i);
    const activeImageUrl = imageUrl || (isEditRequest ? lastImageInHistory : undefined);

    // Map history to OpenRouter format
    const historyMessages: OpenRouterMessage[] = history.map(m => {
      // IMPORTANT FIX: Azure/OpenAI providers fail if assistant messages have image_url multimodal content.
      // We only use multimodal arrays for the 'user' role.
      if (m.role === 'user' && m.image_url) {
        return {
          role: 'user',
          content: [
            { type: 'text', text: m.content },
            { type: 'image_url', image_url: { url: m.image_url } }
          ]
        };
      }
      
      // For assistant messages (or user without image), send as text.
      // If it's an assistant message with an image, we append the URL as text so the AI "sees" it occurred.
      let textContent = m.content;
      if (m.role === 'assistant' && m.image_url && !m.content.includes(m.image_url)) {
          textContent += `\n[Recurso Visual Generado: ${m.image_url}]`;
      }

      return {
        role: m.role as 'user' | 'assistant',
        content: textContent
      };
    });

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      {
        role: 'user',
        content: activeImageUrl ? [{ type: 'text', text: effectiveUserMessage }, { type: 'image_url', image_url: { url: activeImageUrl } }] : effectiveUserMessage
      }
    ];

    try {
      const placeholderMessage = await this.chatRepository.saveMessage(chatId, '', 'assistant', agent.id);
      let accumulatedContent = '';
      await callOpenRouterStreaming(model, messages, (chunk) => {
        accumulatedContent += chunk;
        if (onStream) {
          const cleanStream = this.cleanImageTags(this.cleanMemoryTags(accumulatedContent));
          onStream(agent.id, cleanStream, placeholderMessage.id);
        }
      }, trackUsage);

      await this.processMemories(accumulatedContent, userId, projectId, chatId);

      // Process Image Generation — only for Nexo (or explicitly requested)
      let finalContent = accumulatedContent;
      let generatedImageUrl = undefined;

      // Search for either <generate_image> or <image_proposal> tags (legacy support)
      const imageMatch = finalContent.match(/<(generate_image|image_proposal)(?: mode="([^"]+)")?>([\s\S]*?)<\/\1>/i);
      if (imageMatch && (isNexo || finalContent.toLowerCase().includes('generate_image') || finalContent.toLowerCase().includes('image_proposal'))) {

        // Determine mode: check if AI explicitly set it, or if user asked for it in history, otherwise default to referential
        const aiMessageMode = imageMatch[2]; // Capture group 2 is the mode
        const lastUserMessage = userMessage.toLowerCase();

        let mode: 'creative' | 'referential' = 'referential'; // DEFAULT IS STRICT
        if (aiMessageMode === 'creative' || lastUserMessage.includes('creativo') || lastUserMessage.includes('creativa')) {
          mode = 'creative';
        }

        let prompt = imageMatch[3].trim(); // Capture group 3 is the prompt

        // NUEVO: Verificamos si el usuario envió activos seleccionados manualmente en el contenido del mensaje original
        const selectedAssetsMatch = userMessage.match(/\[USER_SELECTED_ASSETS:\s*(.*?)\]/i);
        const userSelectedAssets = selectedAssetsMatch ? selectedAssetsMatch[1].split(',').map(s => s.trim()).filter(Boolean) : [];

        // ELEGIR ASSETS: Priorizar los seleccionados por el usuario, si no, buscar logos y referencias en la memoria de marca
        const urlRegexExtract = /(https?:\/\/[^\s]+?\.(?:png|jpg|jpeg|webp|gif))/gi;
        let assetUrls = userSelectedAssets.length > 0 ? userSelectedAssets : (prompt.match(urlRegexExtract) || []);
        
        // Log para depuración

        if (mode === 'referential') {
          const titleMatch = prompt.match(/"([^"]{5,80})"/i);
          const titleText = titleMatch ? titleMatch[1] : '';

          // Build a minimal, ultra-strict prompt (Identical to ContentIdeation)
          prompt = [
            `### IMAGE-TO-IMAGE PROTOCOL: 100% PRODUCT IDENTITY LOCK ###`,
            `### MANDATORY ASPECT RATIO: 1:1 (SQUARE) ###`,
            `STRICT ROLE: You are a professional editor. MAINTAIN subject identity.`,
            `USE THE ATTACHED IMAGES EXACTLY AS THEY ARE. Do NOT re-imagine or modify the main subject form.`,
            assetUrls.length > 0 ? `PRODUCT/ASSET REFERENCES (attached): ${assetUrls.join(', ')}` : '',
            titleText ? `ONLY ADD: brand text overlay "${titleText}" IN SPANISH in premium typography.` : '',
            `AUTHORIZED: Better studio lighting, high-end professional background, sharp focus, 8k resolution.`,
            `NEGATIVE: do not re-create the product, do not change materials, do not add food elements if not present, no double logos, no distorted text.`,
          ].filter(Boolean).join('\n');

        } else {
          // CREATIVE: Full descriptive prompt (Enhanced to match ContentIdeation quality)
          const brandingText = (brandContext || 'Empresa profesional').substring(0, 500);
          
          prompt = `
### BRAND-CENTRIC CREATIVE MODE ###
### MANDATORY ASPECT RATIO: 1:1 (SQUARE) ###
TASK: Generate a high-quality professional marketing image.
CONCEPT: ${prompt}
BRAND DNA: ${brandingText}
${assetUrls.length > 0 ? `ACTIVOS SELECCIONADOS (ÚSALOS COMO REFERENCIA CENTRAL): ${assetUrls.join(', ')}` : ''}
CORE RULES:
- QUALITY: Professional photography, clean, premium, 4k, marketing quality, studio lighting.
- STYLE: Impactful composition, vibrant but balanced colors, sharp focus.
- PRODUCT/LOGO FIDELITY: Incorporate the selected assets (${assetUrls.length} provided) within the scene. PROHIBITED: altering logo shapes, colors or fonts. Ensure the product looks high-end.
- TYPOGRAPHY: Use clean, bold, premium sans-serif typography for any text.
- STYLE: Impactful composition, vibrant but balanced colors, sharp focus.
- PRODUCT/LOGO FIDELITY: Incorporate the selected assets (${assetUrls.length} provided) within the scene. PROHIBITED: altering logo shapes, colors or fonts. Ensure the product looks high-end.
- TYPOGRAPHY: Use clean, bold, premium sans-serif typography for any text.
- ASPECT RATIO: 1:1 Square.
- EDITING CONTEXT: If a previous image is provided (${lastImageInHistory ? 'LAST_IMAGE_URL: ' + lastImageInHistory : 'none'}), use it as a reference to apply the user's requested changes while keeping the overall style consistent.
- NEGATIVE: No chaotic elements, no distorted logos, no low resolution, no generic aesthetic.
`.trim();
        }

        // Si el usuario adjuntó una imagen, la inyectamos como referencia si es necesario
        if (imageUrl && mode === 'referential') {
          // In referential mode, the user-attached image IS the product reference - always include it
          if (!prompt.includes(imageUrl)) {
            prompt += `\nPRODUCT REFERENCE (attached, DO NOT modify): ${imageUrl}`;
          }
        } else if (imageUrl) {
          prompt = prompt.replace(/URL_DE_LA_IMAGEN_ADJUNTA/g, imageUrl);
          if (!prompt.includes(imageUrl) && (prompt.toLowerCase().includes('logo') || prompt.toLowerCase().includes('referenc'))) {
            prompt += ` WITH LOGO FROM URL: ${imageUrl}`;
          }
        }

        // Buscar URLs dentro del prompt para "adjuntarlas" como referencias
        const urlRegex = /(https?:\/\/[^\s]+?\.(?:png|jpg|jpeg|webp|gif))/gi;
        let assets = [...new Set([...(prompt.match(urlRegex) || []), ...userSelectedAssets])];

        // In referential mode: also collect ALL image URLs that the agent showed in its full response
        // OR in the previous assistant message (proposal phase)
        if (mode === 'referential') {
          const currentResponseUrls = finalContent.match(urlRegex) || [];
          const historyUrls: string[] = [];

          // Look back through history for assistant messages with images
          for (let i = history.length - 1; i >= 0; i--) {
            const hMessage = history[i];
            if (hMessage.role === 'assistant') {
              const matches = hMessage.content.match(urlRegex) || [];
              if (matches.length > 0) {
                historyUrls.push(...matches);
                // Also check if the message object itself has an image_url property (common for generated images)
                if (hMessage.image_url) historyUrls.push(hMessage.image_url);
              }
            } else if (hMessage.role === 'user' && hMessage.image_url) {
              // Also grab images the user might have attached as reference
              historyUrls.push(hMessage.image_url);
            }
          }

          assets = [...new Set([...assets, ...currentResponseUrls, ...historyUrls])];

          const newAssets = assets.filter(u => !prompt.includes(u));

          // ONLY include http/https URLs in the textual prompt to avoid massive base64 token bloat
          const textOnlyAssets = newAssets.filter(u => u.startsWith('http'));

          if (textOnlyAssets.length > 0) {
            prompt += `\nADDITIONAL ATTACHED REFERENCES (URLs): ${textOnlyAssets.join(', ')}`;
          }

          // Inform the AI about attached base64 files without including the raw data in the text
          const base64Count = newAssets.filter(u => u.startsWith('data:')).length;
          if (base64Count > 0) {
            prompt += `\nNOTE: ${base64Count} additional image files are attached as direct visual context.`;
          }
        }

        try {
          const allOtherContextUrls = [
            ...(brandContext?.match(urlRegex) || []),
            ...(rawMemories?.map(m => {
              try {
                const data = JSON.parse(m.content);
                return data.url || data.link || data.imageUrl || m.summary || '';
              } catch (e) { return (m.summary || '') as string; }
            }).filter(u => u && u.startsWith('http')) || [])
          ] as string[];
          const fallbackAssets = [...new Set(allOtherContextUrls.filter(u => !assets.includes(u)))];

          generatedImageUrl = await generateImage(prompt, assets, fallbackAssets);
          if (generatedImageUrl && metrics) {
            metrics.images1k += 1;
          }
        } catch (e: any) {
          console.error("Image gen failed", e);
          if (e.message === 'SERVICIO_TEMPORALMENTE_FUERA_DE_SERVICIO') {
            finalContent += "\n\n*(Aviso: El servicio de generación de imágenes está temporalmente fuera de servicio)*";
          }
        }
      }

      const finalCleanedContent = this.cleanImageTags(this.cleanMemoryTags(finalContent));
      await this.chatRepository.updateMessage(placeholderMessage.id, finalCleanedContent || finalContent, generatedImageUrl);

      if (onStream) onStream(agent.id, finalCleanedContent || finalContent, placeholderMessage.id, generatedImageUrl);

      return finalCleanedContent || finalContent;
    } catch (error) {
      console.error(`Agent ${agent.name} failed:`, error);
      return undefined;
    }
  }

  private cleanMemoryTags(content: string): string {
    return content.replace(/<memory_save>[\s\S]*?<\/memory_save>/gi, '').replace(/<memory_save>[\s\S]*$/gi, '').trim();
  }

  private cleanImageTags(content: string): string {
    return content
      .replace(/<generate_image(?: mode="[^"]+")?>[\s\S]*?<\/generate_image>/gi, '')
      .replace(/<generate_image[\s\S]*$/gi, '')
      .replace(/<image_proposal>[\s\S]*?<\/image_proposal>/gi, '') // NUEVO: Eliminar bloque de propuesta técnica
      .replace(/<image_proposal\s*\/?>/gi, '') // Eliminar tag suelto
      .trim();
  }

  private async processMemories(content: string, userId: string, projectId: string | null | undefined, chatId: string) {
    const regex = /<memory_save>([\s\S]*?)<\/memory_save>/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
      try {
        const memoryData = JSON.parse(match[1].trim());
        const embedding = await generateEmbedding(memoryData.content + " " + memoryData.title);
        if (!embedding) continue;

        const similar = await this.memoryRepository.findRelatedMemories(embedding, 0.85, 1, userId, projectId);
        if (similar.length > 0) {
          const existing = similar[0];
          if (existing.content.toLowerCase().trim() !== memoryData.content.toLowerCase().trim()) {
            await this.memoryRepository.saveMemory({ id: existing.id, ...memoryData, embedding, user_id: userId, project_id: projectId || undefined, chat_id: chatId, user_confirmed: false });
          }
        } else {
          await this.memoryRepository.saveMemory({ ...memoryData, user_id: userId, project_id: projectId || undefined, chat_id: chatId, is_pinned: false, embedding, user_confirmed: false });
        }
      } catch (e) {
        console.error("Memory process failed", e);
      }
    }
  }
}
