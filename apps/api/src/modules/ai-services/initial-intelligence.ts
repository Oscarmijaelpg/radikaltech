import { prisma } from '@radikal/db';
import { logger } from '../../lib/logger.js';
import { notificationService } from '../notifications/service.js';
import { moonshotWebSearch, stripJsonWrapping } from './moonshot.js';
import { brandSynthesizer } from './index.js';

const NEWS_GENERATOR_PROMPT = `Actúa como analista senior en inteligencia competitiva y estructuración de prompts para investigación de mercado.

Recibirás contenido extraído de varias páginas de un sitio web corporativo.

Toda la información disponible viene en la siguiente variable:

Datos de la empresa

La variable contiene una lista de páginas con los siguientes campos:

url
title
text

Cada objeto representa una página del sitio web.

Tu tarea

Debes analizar la información contenida en Datos de la empresa y generar un prompt optimizado para investigación sectorial profunda que será utilizado por un motor de investigación externa.

⚠️ Importante

No asumas información que no esté en el contenido.
Las empresas pueden pertenecer a cualquier industria.
Debes inferir el contexto empresarial únicamente a partir de los datos proporcionados.
Paso 1 — Analizar el sitio web

A partir de la información contenida en Datos de la empresa, identifica:

1. Nombre de la empresa

Extrae el nombre de la empresa a partir de:

títulos de páginas
encabezados principales
texto repetido en varias páginas
2. Sitio web principal

Identifica el dominio principal a partir de las URLs presentes en los datos.

3. Resumen de la empresa

Genera un resumen claro que explique:

qué hace la empresa
qué productos o servicios ofrece
qué tipo de clientes tiene
qué propuesta de valor ofrece
4. Industria

Identifica:

Industria principal
Subsector o nicho específico
5. Modelo de negocio

Clasifica si aplica:

B2B
B2C
B2B2C
SaaS
Marketplace
Servicios
Manufactura
Otro
6. Ubicación o mercado geográfico

Detecta:

país principal
ciudades o regiones mencionadas
otros mercados relevantes si aparecen en el contenido
7. Palabras clave del sector

Identifica entre 5 y 10 keywords que representen el sector de la empresa.

Paso 2 — Generar el prompt de investigación sectorial

Debes generar UN SOLO TEXTO que será utilizado directamente para realizar investigación estratégica externa.

El prompt debe incluir:

contexto empresarial detectado
industria
modelo de negocio
ubicación
palabras clave del sector
Estructura obligatoria del prompt que debes generar

El prompt final debe tener esta estructura:

Actúa como analista senior en inteligencia competitiva y monitoreo sectorial.

Empresa objetivo

Nombre: [nombre detectado]

Web: [dominio detectado]

Contexto de la empresa (extraído de su sitio web)

[Resumen claro de la empresa]

Información estratégica detectada

Industria principal:
[industria]

Subsector o nicho:
[subsector]

Modelo de negocio:
[modelo]

Ubicación o mercado geográfico:
[países o regiones detectadas]

Palabras clave del sector:
[keywords]

Objetivo de la investigación

Identificar noticias estratégicas, tendencias sectoriales y cambios estructurales que puedan afectar positiva o negativamente a la empresa o a su industria.

Paso 1 – Identificación base

Confirma o ajusta si es necesario:

Industria principal
Subsector
Modelo de negocio

Identifica los países o ciudades donde la empresa opera basándote en la información proporcionada.

Muestra brevemente:

Industria detectada
Lista de países válidos

Paso 2 – Noticias estratégicas sectoriales (PRIORIDAD ALTA)

Busca noticias externas del último año (12 meses) que afecten:

la industria principal
el sector económico relacionado
regulaciones o leyes aplicables
decisiones gubernamentales
cambios impositivos
tendencias de crecimiento o contracción
inversiones relevantes en el sector
adquisiciones o fusiones
competencia relevante
innovaciones tecnológicas del sector
cambios en comportamiento del consumidor
expansión de mercado o internacionalización

Las noticias deben estar relacionadas con:

la industria global
o
los países válidos identificados

⚠️ Si no hay noticias específicas de un país válido, puedes incluir noticias sectoriales globales que impacten la industria.

⚠️ No incluyas noticias de países donde la empresa no opera.

Requisito obligatorio de fuentes

Cada noticia debe incluir SIEMPRE una fuente verificable con URL directa.

No se permite incluir noticias sin fuente.

Formato obligatorio por noticia

Para cada noticia incluye sin excepción:

Titular

Medio o publicación

URL de la fuente

Fecha

País (o Global si aplica)

Resumen estratégico (máx 120 palabras)

Impacto esperado
(Positivo / Negativo / Mixto)

Área afectada

Regulación
Crecimiento
Costos
Demanda
Competencia
Tecnología
Inversión
Consumidor

Paso 3 – Tendencias estructurales del sector

Identifica tendencias clave que estén transformando el sector, como:

digitalización
cambios regulatorios
automatización
sostenibilidad
cambios en modelos de negocio
adopción de nuevas tecnologías

Para cada tendencia incluye:

Nombre de la tendencia
Descripción breve
Impacto esperado en el sector

Siempre que sea posible incluye una fuente que respalde la tendencia (con URL).

Paso 4 – Proyecciones de crecimiento del sector

Si existen datos de crecimiento o contracción del sector, incluye:

País o Global
Fuente
URL de la fuente
Tasa de crecimiento estimada (%)
Horizonte temporal
Implicación estratégica para la empresa

Sección final obligatoria – Fuentes consultadas

Incluye una lista consolidada de todas las fuentes utilizadas, mostrando:

Medio
Título del artículo
URL completa

Reglas de calidad

Prioriza noticias con datos cuantitativos.

No inventes cifras.

No inventes fuentes.

No incluyas noticias sin enlace verificable.

Si no se encuentran fuentes confiables debes indicarlo explícitamente.

Reglas importantes para tu respuesta

Tu salida debe ser únicamente el prompt final generado.

No expliques tu razonamiento.

No incluyas comentarios adicionales.

El texto debe estar listo para enviarse directamente a un motor de investigación.

No digas que es un prompt ni menciones herramientas.

Devuelve solo el texto final.`;

const NEWS_RESEARCH_PROMPT = `Actúa como analista senior en inteligencia competitiva y monitoreo sectorial.

Objetivo de la investigación:
Identificar noticias estratégicas, tendencias sectoriales y cambios estructurales que puedan afectar positiva o negativamente a la industria de la empresa.

⚠️ IMPORTANTE: No busques noticias de la empresa en sí, sino de la INDUSTRIA en general y los COMPETIDORES del sector. El reporte debe ser útil para que la empresa entienda su entorno competitivo y macroeconómico.

Contexto detectado:
{{brand_context}}

Instrucciones de investigación:
Paso 1 – Noticias estratégicas sectoriales (PRIORIDAD ALTA)
Busca noticias externas del último año (2025-2026) que afecten a la industria principal, regulaciones, cambios impositivos, innovaciones tecnológicas y comportamiento del consumidor.

⚠️ Si no hay noticias específicas del país de operación, incluye noticias sectoriales globales de alto impacto.
⚠️ Cada noticia debe incluir SIEMPRE una fuente verificable con URL directa.

Formato obligatorio por noticia:
- Titular
- Medio o publicación
- URL de la fuente (Enlace real)
- Fecha (2025 o 2026)
- Resumen estratégico (máx 120 palabras)
- Impacto esperado (Positivo / Negativo / Mixto)

Paso 2 – Tendencias estructurales del sector
Identifica tendencias clave (digitalización, sostenibilidad, IA, etc.) transformando el sector. Incluye fuentes con URL.

Paso 3 – Proyecciones de crecimiento
Si existen datos de crecimiento del sector para 2026, inclúyelos con su fuente.

REGLA DE ORO: Devuelve un REPORTE EJECUTIVO DE INTELIGENCIA SECTORIAL tipo McKinsey. Elegante, basado en datos, con tablas si es necesario. 

REQUISITO ESTRICTO DE FUENTES:
- Cada noticia, tendencia o dato DEBE incluir un enlace Markdown directo a la fuente: [Nombre del Medio](URL).
- Las fuentes deben ser portales de noticias reconocidos (ej: El Tiempo, Portafolio, Reuters, El Economista, etc.), organismos oficiales o reportes de consultoras.
- NUNCA incluyas fuentes sin enlace o que sean simples blogs personales.
- Los enlaces deben ser reales y verificables de 2025 o 2026.
- Al final del reporte, incluye una tabla consolidada de "Fuentes Consultadas" con sus respectivos links.

No incluyas el proceso de búsqueda ni pensamientos internos.`;

const COMPETITION_PROMPT_BASE = `Actúa como analista estratégico senior especializado en inteligencia competitiva internacional y estructuración de prompts para investigación de mercado.

Recibirás contenido extraído de varias páginas de un sitio web corporativo.

Toda la información disponible viene en la siguiente variable:

Datos de la empresa

La variable contiene múltiples páginas del sitio web con los siguientes campos:

url
title
text

Cada objeto representa una página del sitio web.

Tu tarea

Debes analizar la información contenida en Datos de la empresa y generar UN SOLO TEXTO que será utilizado como prompt para realizar investigación competitiva avanzada.

⚠️ Reglas importantes:

No asumas información que no esté presente en el contenido.
Las empresas pueden pertenecer a cualquier industria.
Debes inferir el contexto empresarial únicamente a partir de los datos proporcionados.
Paso 1 — Analizar el sitio web

A partir de Datos de la empresa, identifica:

Nombre de la empresa

Extrae el nombre de la empresa a partir de:

títulos de páginas
encabezados principales
texto repetido
menciones corporativas
Sitio web principal

Identifica el dominio principal a partir de las URLs presentes en los datos.

Resumen de la empresa

Genera un resumen claro que explique:

qué hace la empresa
qué productos o servicios ofrece
qué tipo de clientes tiene
cuál es su propuesta de valor
Industria

Identifica:

Industria principal
Subsector o nicho específico

Modelo de negocio

Clasifica si aplica:

B2B
B2C
B2B2C
SaaS
Marketplace
Servicios
Manufactura
Otro
Ubicación o mercado geográfico

Detecta países o ciudades donde la empresa indique operación directa.

⚠️ Solo considera ubicaciones explícitamente mencionadas en el sitio web.

Paso 2 — Generar el prompt de investigación competitiva

Debes generar UN SOLO TEXTO que será utilizado directamente para realizar investigación competitiva externa.

⚠️ IMPORTANTE: El prompt que generes debe exigir un reporte McKinsey detallado de 2025-2026.

Estructura obligatoria del prompt que debes generar

Actúa como analista estratégico senior especializado en inteligencia competitiva internacional.

Empresa objetivo:

Nombre: [nombre detectado]

Web: [dominio detectado]

Contexto de la empresa (extraído de su sitio web):

[Resumen claro de la empresa]

Información estratégica detectada:

Industria principal:
[industria]

Subsector o nicho:
[subsector]

Modelo de negocio:
[modelo]

Ubicación o mercado geográfico:
[países o regiones detectadas]

Paso 1 – Determinar países válidos

Antes de identificar competidores:

Extrae únicamente los países o ciudades donde la empresa opera que estén explícitamente mencionados en su sitio web.

Solo considera como válidos países que aparezcan en:

sección “Dónde operamos”
oficinas o sedes
contactos por país
direcciones físicas
dominios o subdominios por país
mapa de presencia corporativa

❗ No infieras países
❗ No asumas expansión futura
❗ No utilices países mencionados en noticias externas

Si no hay países explícitos, indica:

"Sin países explícitos en el sitio web."

Alcance del análisis

El análisis competitivo debe limitarse estrictamente a las ciudades o regiones válidas identificadas en los datos de la empresa.

PRIORIDAD GEOGRÁFICA CRÍTICA:
- Si la empresa opera en una ciudad o micro-región específica, los competidores deben ser principalmente locales de esa misma zona.
- No incluyas competidores de otras ciudades lejanas a menos que tengan una sede física o servicio directo en la ubicación exacta del cliente.
- Prioriza la cercanía física y la competencia por el mismo mercado local.

No incluyas:
- mercados potenciales o regiones inferidas.
- competidores que operen solo fuera de la zona geográfica específica del cliente.
Proceso de investigación competitiva

Realiza investigación en tres etapas.

Etapa 1 — Descubrimiento de competidores

Identifica empresas que:

ofrezcan productos o servicios similares
resuelvan el mismo problema del cliente
compitan por el mismo segmento
tengan modelo de negocio comparable

Incluye también:

sustitutos directos
soluciones alternativas
plataformas tecnológicas que compitan por el mismo presupuesto del cliente

Genera una lista inicial amplia.

Etapa 2 — Validación geográfica

Para cada empresa identificada:

Verifica si tiene presencia en al menos uno de los países válidos.

La evidencia puede incluir:

oficinas
operaciones comerciales
clientes en ese país
páginas locales
presencia en marketplaces o partners

Elimina empresas sin evidencia de presencia en esos países.

Etapa 3 — Validación competitiva

Confirma que cada empresa restante:

ofrece una solución realmente comparable
compite por el mismo problema del cliente
tiene modelo de negocio equivalente o sustituto relevante

Solo después de esta validación genera el listado final.

Fase 1 – Identificación de competidores

Selecciona entre 5 y 10 competidores reales.

Para cada competidor incluye obligatoriamente:

Nombre
Web oficial
País sede
País donde compite con la empresa (debe coincidir con países válidos)
Modelo de negocio (máx 60 palabras)
Evidencia verificable de competencia

La evidencia debe ser una de las siguientes:

página de producto comparable
página de servicio equivalente
página que indique operación en ese país
comparaciones de mercado
página oficial de pricing o solución

⚠️ Si no hay evidencia clara, no incluyas el competidor.

Fase 2 – Clasificación estratégica

Clasifica cada competidor en uno de estos niveles:

Nivel 1 — Competencia Directa Crítica
Nivel 2 — Competencia Directa Diferenciada
Nivel 3 — Sustituto o Disruptivo
Nivel 4 — Referente Estratégico

La clasificación debe basarse únicamente en:

similitud del producto
coincidencia de cliente objetivo
presencia en países válidos
Fase 3 – Evaluación cuantitativa

Evalúa cada competidor del 1 al 5 en:

Participación estimada en los países válidos
Innovación observable
Fortaleza digital
Experiencia de cliente
Diferenciación estratégica
Poder de pricing
Escalabilidad en esos países
Crecimiento visible

Reglas:

No asignar 5 sin evidencia clara
Justificar puntuaciones ≥4
Si falta información, usar valoración conservadora
No evaluar crecimiento en países no válidos

Calcula un score sobre 100 y genera un ranking descendente.

Fase 4 – Análisis profundo (Top 3)

Para los tres competidores con mayor score analiza:

Modelo de negocio detallado
Ventajas estructurales
Debilidades
Estrategia digital
Uso de tecnología o IA
Capacidad competitiva en los países válidos
Probabilidad de quitar cuota de mercado en 12 meses (Alta / Media / Baja)

Fase 5 – Diagnóstico estratégico

Responde:

¿Quién es la amenaza real en 12 meses en los países válidos?

¿Quién puede escalar más fuerte en 3 años en esos mercados?

¿Qué competidor representa mayor presión competitiva local?

¿Cuál de los países válidos representa mayor riesgo competitivo?

¿Cuál es el mayor riesgo estructural para [nombre detectado] en sus mercados actuales?

Recomendaciones estratégicas

Propón 3 acciones estratégicas concretas para ejecutar en 90 días.

Las acciones deben:

ser específicas
ser aplicables dentro de los países válidos
evitar recomendaciones genéricas
Reglas de salida

Tu respuesta debe ser únicamente el prompt final generado.

No expliques tu razonamiento.

No incluyas comentarios adicionales.

El texto debe estar listo para enviarse directamente a un motor de investigación.

No menciones herramientas ni que es un prompt.`;

export class InitialIntelligenceOrchestrator {
  /**
   * Ejecuta de forma totalmente asíncrona (fire-and-forget) los diagnósticos iniciales.
   * Diseñado para ser llamado desde el onboarding o procesos automáticos sin bloquear la respuesta.
   */
  runInitialIntelligence(input: { projectId: string; userId: string }) {
    const { projectId, userId } = input;
    logger.info({ projectId, userId }, '[Intelligence] Iniciando orquestación de inteligencia inicial (Background)...');

    // Lanzamos ambos en paralelo de forma totalmente desacoplada
    void this.runIndustryNewsIntelligence({ projectId, userId }).catch(err =>
      logger.error({ err, projectId }, 'Fallo crítico en runIndustryNewsIntelligence en segundo plano')
    );

    void this.runCompetitionIntelligence({ projectId, userId }).catch(err =>
      logger.error({ err, projectId }, 'Fallo crítico en runCompetitionIntelligence en segundo plano')
    );
  }

  async runCompetitionIntelligence(input: { projectId: string; userId: string }) {
    const { projectId, userId } = input;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return;

    const companyData = await this.getCompanyData(projectId);
    const companyDataStr = JSON.stringify(companyData, null, 2);
    const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();

    // Crear Job para seguimiento en UI
    const job = await prisma.aiJob.create({
      data: {
        userId,
        projectId,
        kind: 'competition-refresh',
        status: 'running',
        startedAt: new Date(),
        metadata: { step: 'initializing' }
      }
    });

    try {
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { metadata: { step: 'generating-prompt' } }
      });

      const compInstruction = `
${COMPETITION_PROMPT_BASE}

Datos de la empresa:
${companyDataStr}

IMPORTANTE: El reporte final que generes para Kimi debe exigir un análisis tipo McKinsey, enfocado en decisiones estratégicas, expansiones, tratos comerciales, rondas de inversión y cualquier dato crítico de 2025-2026 para cada competidor.
Asegúrate de que los competidores sean relevantes para los países donde opera la empresa: ${companyData.markets || 'Global'}.
`;
      logger.info('Generando prompt final de competencia...');
      const finalCompPrompt = await brandSynthesizer.getLLMCompletion(compInstruction);

      await prisma.aiJob.update({
        where: { id: job.id },
        data: { metadata: { step: 'searching-kimi' } }
      });

      logger.info('Ejecutando búsqueda de competencia en Kimi...');
      const compSearch = await moonshotWebSearch({
        systemPrompt: `Eres Sira, analista estratégica senior. HOY ES ${today}. 
Tu única misión es realizar una investigación profunda de competidores y estrategias ACTUALES (2025-2026).
REGLA DE IDENTIDAD: Si incluyes una firma o encabezado de analista, DEBE decir "Analista: Sira — [Tu Práctica o Especialidad]". NUNCA menciones a McKinsey como el autor.
REGLA CRÍTICA: No digas "necesito buscar" o "voy a investigar". USA LA HERRAMIENTA $web_search de inmediato.
Realiza todas las búsquedas necesarias hasta tener datos concretos.

REGLA DE ORO PARA TABLAS MARKDOWN:
- TODAS las tablas deben estar correctamente formadas con encabezados y separadores (|---|---|).
- Debe haber un SALTO DE LÍNEA REAL (\n) después de cada fila.
- NUNCA pongas una tabla completa en un solo bloque de texto continuo o sin saltos de línea.

REGLA DE PRECISIÓN GEOGRÁFICA:
- PRIORIDAD LOCAL: Debes buscar competidores que operen en la MISMA CIUDAD o MUNICIPIO detectado en los datos del cliente. 
- Si no hay suficientes en la ciudad exacta, expande a la región inmediata (provincia/estado), pero evita empresas de otras ciudades lejanas a menos que operen a nivel nacional y compitan directamente por el mismo público local.

Al finalizar, redacta un reporte ejecutivo tipo McKinsey en Markdown elegante, con tablas bien formateadas y fuentes con enlaces reales. Cada competidor debe tener su link oficial.`,
        userPrompt: finalCompPrompt || 'Busca competencia estratégica profunda para esta empresa: ' + companyData.name,
      });

      await prisma.aiJob.update({
        where: { id: job.id },
        data: { metadata: { step: 'saving-report' } }
      });

      // Limpiar el reporte de basura (pensamientos del modelo, planes de búsqueda, etc.)
      let cleanedReport = compSearch.text;
      const reportHeader = 'REPORTE EJECUTIVO DE INTELIGENCIA COMPETITIVA';
      const headerIndex = cleanedReport.toUpperCase().indexOf(reportHeader);
      if (headerIndex !== -1) {
        cleanedReport = cleanedReport.slice(headerIndex);
      }

      // Guardar o actualizar el reporte de competencia con el texto limpio
      const existingReport = await prisma.report.findFirst({
        where: { projectId, reportType: 'competition', title: 'Reporte Inicial de Competencia' }
      });

      if (existingReport) {
        await prisma.report.update({
          where: { id: existingReport.id },
          data: {
            content: cleanedReport,
            sourceData: {
              pipeline: 'initial-intelligence-comp',
              promptUsed: finalCompPrompt || 'Default prompt',
              refreshedAt: new Date()
            },
          }
        });
      } else {
        await prisma.report.create({
          data: {
            projectId,
            userId,
            title: 'Reporte Inicial de Competencia',
            reportType: 'competition',
            content: cleanedReport,
            summary: 'Análisis competitivo inicial generado a partir de investigación web profunda.',
            sourceData: {
              pipeline: 'initial-intelligence-comp',
              promptUsed: finalCompPrompt || 'Default prompt'
            },
          },
        });
      }

      await prisma.aiJob.update({
        where: { id: job.id },
        data: { metadata: { step: 'extracting-competitors' } }
      });

      // Extraer competidores para actualizar tarjetas sugeridas (usando el reporte limpio)
      await this.extractCompetitorsToCards(projectId, userId, cleanedReport);

      await prisma.aiJob.update({
        where: { id: job.id },
        data: {
          status: 'succeeded',
          finishedAt: new Date(),
          metadata: { step: 'completed' }
        }
      });

      await notificationService.create({
        userId,
        projectId,
        kind: 'report_ready',
        title: 'Análisis de Competencia Actualizado',
        body: 'El diagnóstico estratégico de competidores ha sido regenerado con datos de 2025-2026.',
        actionUrl: '/competitors',
      }).catch(() => null);

    } catch (err: any) {
      logger.error({ err }, 'Error en runCompetitionIntelligence');
      await prisma.aiJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          error: err.message || 'Error desconocido en el proceso de inteligencia'
        }
      }).catch(() => null);
    }
  }

  async runIndustryNewsIntelligence(input: { projectId: string; userId: string }) {
    const { projectId, userId } = input;
    const job = await prisma.aiJob.create({
      data: {
        kind: 'news-refresh',
        status: 'running',
        projectId,
        userId,
        metadata: { step: 'initializing' }
      }
    });

    try {
      const companyData = await this.getCompanyData(projectId);
      const brandContext = `
Empresa: ${companyData.name}
Sector: ${companyData.industry || companyData.industryCustom}
Mercados: ${companyData.markets || 'Global'}
Resumen: ${companyData.businessSummary || 'Sin resumen disponible'}
Productos: ${companyData.products || 'Sin productos especificados'}
`;

      await prisma.aiJob.update({
        where: { id: job.id },
        data: { metadata: { step: 'generating-prompt' } }
      });

      const newsInstruction = NEWS_RESEARCH_PROMPT.replace('{{brand_context}}', brandContext);
      const finalNewsPrompt = await brandSynthesizer.getLLMCompletion(newsInstruction);

      await prisma.aiJob.update({
        where: { id: job.id },
        data: { metadata: { step: 'searching-kimi' } }
      });

      const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
      logger.info('Ejecutando búsqueda de noticias sectoriales en Kimi...');

      const newsSearch = await moonshotWebSearch({
        systemPrompt: `Eres Sira, analista senior de inteligencia sectorial. HOY ES ${today}. 
Tu única misión es encontrar noticias y tendencias ESTRATÉGICAS para la industria del usuario en 2025-2026.
REGLA DE IDENTIDAD: Si incluyes una firma o encabezado de analista, DEBE decir "Analista: Sira — [Tu Especialidad]".
REGLA CRÍTICA: No hables de la empresa del usuario, busca noticias de su SECTOR y su COMPETENCIA.
No digas "voy a buscar". USA LA HERRAMIENTA $web_search de inmediato.

REGLA DE ORO PARA TABLAS MARKDOWN:
- Las tablas deben tener saltos de línea (\n) reales entre cada fila.
- NUNCA generes tablas comprimidas en una sola línea.

REQUISITO DE FUENTES Y LINKS:
- Todas las fuentes deben ser LINKS CLICKABLES en formato Markdown: [Nombre Fuente](URL).
- Prioriza portales reconocidos (Portafolio, El Tiempo, Bloomberg, Forbes, Reuters, etc.).
- Asegúrate de que los links lleven a la noticia específica.

Al finalizar, redacta un REPORTE EJECUTIVO DE INTELIGENCIA SECTORIAL.
REGLA DE IDENTIDAD: En el encabezado del reporte, el campo Analista debe decir: "Analista: Sira — [Tu Especialidad]".
No incluyas bitácoras de búsqueda. Empieza directamente con el título del reporte.`,
        userPrompt: finalNewsPrompt || 'Busca noticias estratégicas 2025-2026 para el sector de ' + (companyData.industry || 'la industria'),
      });

      await prisma.aiJob.update({
        where: { id: job.id },
        data: { metadata: { step: 'saving-report' } }
      });

      // Limpiar basura
      let cleanedReport = newsSearch.text;
      const reportHeader = 'REPORTE EJECUTIVO DE INTELIGENCIA SECTORIAL';
      const headerIndex = cleanedReport.toUpperCase().indexOf(reportHeader);
      if (headerIndex !== -1) {
        cleanedReport = cleanedReport.slice(headerIndex);
      }

      const existingReport = await prisma.report.findFirst({
        where: { projectId, reportType: 'news', title: 'Reporte Inicial de Noticias' }
      });

      if (existingReport) {
        await prisma.report.update({
          where: { id: existingReport.id },
          data: {
            content: cleanedReport,
            sourceData: {
              pipeline: 'initial-intelligence-news',
              promptUsed: finalNewsPrompt || 'Default prompt',
              refreshedAt: new Date()
            },
          }
        });
      } else {
        await prisma.report.create({
          data: {
            projectId,
            userId,
            title: 'Reporte Inicial de Noticias',
            reportType: 'news',
            content: cleanedReport,
            summary: 'Análisis sectorial actualizado con noticias de 2025-2026.',
            sourceData: {
              pipeline: 'initial-intelligence-news',
              promptUsed: finalNewsPrompt || 'Default prompt'
            },
          },
        });
      }

      await prisma.aiJob.update({
        where: { id: job.id },
        data: {
          status: 'succeeded',
          finishedAt: new Date(),
          metadata: { step: 'completed' }
        }
      });

      await notificationService.create({
        userId,
        projectId,
        kind: 'report_ready',
        title: 'Noticias del Sector Actualizadas',
        body: 'El diagnóstico de noticias y tendencias de tu industria ha sido regenerado.',
        actionUrl: '/news',
      }).catch(() => null);

    } catch (err: any) {
      logger.error({ err }, 'Error en runIndustryNewsIntelligence');
      await prisma.aiJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          finishedAt: new Date(),
          error: err.message || 'Error desconocido en el proceso de noticias'
        }
      }).catch(() => null);
    }
  }

  private async getCompanyData(projectId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    const brand = await prisma.brandProfile.findUnique({ where: { projectId } });

    return {
      name: project?.companyName ?? project?.name,
      website: project?.websiteUrl,
      industry: project?.industry,
      industryCustom: project?.industryCustom,
      businessSummary: project?.businessSummary,
      products: project?.mainProducts,
      markets: project?.operatingCountries,
      essence: brand?.essence,
      mission: brand?.mission,
      values: brand?.brandValues,
      targetAudience: brand?.targetAudience,
      competitiveAdvantage: brand?.competitiveAdvantage,
    };
  }

  private async extractCompetitorsToCards(projectId: string, userId: string, reportText: string) {
    logger.info('Extrayendo competidores a tarjetas de sugerencia...');
    const extractPrompt = `
Eres un extractor de datos de alta precisión. Recibirás un reporte de inteligencia competitiva.
Tu tarea es identificar todos los competidores mencionados en el reporte y extraer sus datos básicos.

Genera un JSON estricto con esta estructura:
{
  "competitors": [
    {
      "name": "Nombre exacto de la empresa",
      "website": "URL si se menciona, sino null",
      "country": "País mencionado (ej: Colombia, México), o null",
      "business_model": "Breve descripción de su enfoque o modelo de negocio",
      "evidence_summary": "Párrafo corto de por qué es relevante según el reporte"
    }
  ]
}

REPORTE:
${reportText}
`;
    const extractedCompetitorsStr = await brandSynthesizer.getLLMCompletion(extractPrompt);
    if (!extractedCompetitorsStr) {
      logger.warn('No se pudo obtener respuesta del extractor de competidores');
      return;
    }

    try {
      const cleanJson = stripJsonWrapping(extractedCompetitorsStr);
      const parsed = JSON.parse(cleanJson);
      const competitors = Array.isArray(parsed.competitors) ? parsed.competitors : [];

      logger.info({ count: competitors.length }, 'Competidores extraídos del reporte');

      for (const c of competitors) {
        if (!c.name) continue;

        // Evitar duplicados por nombre en el mismo proyecto
        const existing = await prisma.competitor.findFirst({
          where: { projectId, name: { equals: String(c.name), mode: 'insensitive' } }
        });

        if (existing) {
          logger.info({ name: c.name }, 'El competidor ya existe, saltando...');
          continue;
        }

        logger.info({ name: c.name }, 'Creando competidor sugerido...');
        await prisma.competitor.create({
          data: {
            projectId,
            userId,
            name: String(c.name).slice(0, 200),
            website: c.website ? String(c.website).slice(0, 500) : null,
            notes: c.evidence_summary ? String(c.evidence_summary) : null,
            status: 'suggested', // Se mantienen como sugeridos según solicitud del usuario
            source: 'auto_detected',
            analysisData: {
              businessModel: c.business_model,
              country: c.country,
              pipeline: 'initial-intelligence-refresh',
            },
          },
        });
      }
    } catch (err) {
      logger.error({ err, text: extractedCompetitorsStr.slice(0, 200) }, 'Fallo al parsear los competidores extraídos');
    }
  }
}
