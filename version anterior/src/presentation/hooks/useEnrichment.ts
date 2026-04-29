import { useState } from 'react';
import { generateImage } from '../../infrastructure/services/ImageGenerationService';
import { callOpenRouter } from '../../infrastructure/services/OpenRouterService';
import { useSaveMemory } from './useMemory';
import { MemoryResource } from '../../core/domain/entities';
import { supabase } from '../../infrastructure/supabase/client';

export const useEnrichment = (userId: string, projectId?: string | null) => {
  const [isLoading, setIsLoading] = useState(false);
  const { mutate: saveMemory } = useSaveMemory();

  const enrichSection = async (
    type: 'infographic' | 'chart',
    parentId: string,
    sectionTitle: string,
    sectionContent: string
  ) => {
    setIsLoading(true);
    try {
      let enrichedContent = '';
      let resourceType: MemoryResource['resource_type'] = 'text';

      if (type === 'infographic') {
        // Find logo URL from all memories if available
        const { data: memories } = await supabase.from('memories').select('*').eq('user_id', userId);
        const logoMemory = memories?.find(m => String(m.memory_category || '').toLowerCase() === 'logo');
        const logoUrl = logoMemory?.content;
        const assets = logoUrl ? [logoUrl] : [];

        const prompt = `Crea una infografía profesional, minimalista y empresarial basada en: "${sectionContent}". 
        
        ESTILO VISUAL:
        - Diseño limpio, elegante y de alta gama.
        - Prioriza gráficos vectoriales, diagramas y visualización de datos sobre bloques de texto.
        - Estética minimalista con mucho espacio en blanco.
        - Usa una paleta de colores corporativa y profesional.
        - Iconografía elegante y sobria (NO caricaturca).
        - Debe ser un complemento visual claro que ayude a entender la información de un vistazo.
        - INTEGRACIÓN DEL LOGO: Incluye el logo oficial adjunto de forma elegante y protagonista.
        
        TÍTULO DE LA SECCIÓN: ${sectionTitle}`;

        const imageUrl = await generateImage(prompt, assets);
        enrichedContent = JSON.stringify({
          url: imageUrl,
          type: 'infographic',
          parentId,
          sectionTitle
        });
        resourceType = 'image';
      } else if (type === 'chart') {
        const prompt = `Analiza los siguientes datos y selecciona el mejor tipo de gráfico para representarlos. 
        Si hay múltiples entidades (ej: varias empresas) comparadas en varias dimensiones (ej: precio, calidad, etc), usa "bar" (barras agrupadas) o "radar".
        Si es una distribución simple de un total, usa "pie".
        
        CONTENIDO A ANALIZAR: 
        "${sectionContent}"
        
        REQUISITOS DEL JSON (ESTRICTO):
        {
          "chartType": "bar" | "pie" | "radar",
          "title": "Título descriptivo y profesional",
          "labels": ["Dimensión 1", "Dimensión 2", ...], 
          "datasets": [
            {
              "label": "Nombre Entidad/Categoría 1",
              "data": [Valor1, Valor2, ...]
            },
            {
              "label": "Nombre Entidad/Categoría 2",
              "data": [Valor1, Valor2, ...]
            }
          ]
        }
        
        REGLAS CRÍTICAS:
        1. "labels" son los puntos en el eje X (o los ángulos del radar).
        2. Cada objeto en "datasets" es una serie de datos (ej: una empresa diferente).
        3. Los valores en "data" deben ser SOLO NÚMEROS.
        4. Si el contenido es una tabla comparativa, asegúrate de extraer TODOS los competidores y valores correctamente.
        5. IDIOMA: Todo el contenido del JSON (títulos, etiquetas, leyendas) DEBE estar en ESPAÑOL.
        Devuelve ÚNICAMENTE el JSON puro.`;

        const chartResponse = await callOpenRouter('anthropic/claude-3-haiku', [
          { role: 'user', content: prompt }
        ]);

        const jsonMatch = chartResponse.match(/\{[\s\S]*\}/);
        const chartData = jsonMatch ? jsonMatch[0] : chartResponse;

        enrichedContent = JSON.stringify({
          chartData: JSON.parse(chartData),
          type: 'chart',
          parentId,
          sectionTitle
        });
        resourceType = 'text';
      }

      saveMemory({
        user_id: userId,
        project_id: projectId || undefined,
        title: `Enriquecimiento (${type}): ${sectionTitle}`,
        content: enrichedContent,
        memory_category: type === 'infographic' ? 'infografia_analisis' : 'enrichment',
        resource_type: resourceType
      });

      return true;
    } catch (error) {
      console.error('Error enriching section:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    enrichSection,
    isLoading
  };
};
