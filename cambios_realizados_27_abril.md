# Registro de Cambios - 27 de Abril (Sesión de Tarde)

Este archivo registra las mejoras y correcciones realizadas para estabilizar el flujo creativo y la visualización de la plataforma. Este log está diseñado para ser exhaustivo y servir de guía técnica.

---

### ✅ CAMBIO 1: Limpieza de Historial
- Se ha reiniciado este registro para enfocarse en los ajustes de estabilización finales del flujo de imágenes y chat.

### 🛠️ CAMBIO 2: Refuerzo del Flujo de Biblioteca (Referencias)
- **Ampliación de Acceso**: Se ha actualizado la lógica de búsqueda para incluir activos con etiquetas de `website`, `social_media`, `moodboard`, `product`, etc.
- **Fin de Alucinaciones**: Reconfiguración del prompt de sistema para prohibir a los agentes declarar falta de acceso a los activos.
- **Mandato de Galería**: Se estableció el uso obligatorio de la herramienta de galería antes de cualquier generación de imagen.

---

### 🛡️ CAMBIO 3: Anonimización Total y Segmentación de Activos (Arquitectura Nexo 2.0)

Este es un hito crítico para la identidad de marca y la usabilidad de la plataforma. Se ha implementado una política de **tolerancia cero** a artefactos técnicos y una **segmentación física** de los historiales de imágenes.

#### 1. Anonimización del Motor de IA
**Proceso Lógico**: Se eliminó cualquier rastro de los proveedores de tecnología (Gemini, Google, OpenAI, DALL-E) tanto en el frontend como en las instrucciones de comportamiento de los agentes.
- **Backend (`agents.ts`)**: Se inyectó una directriz inquebrantable en el `system_prompt`. Los agentes tienen prohibido mencionar el modelo que usan. Deben referirse a la tecnología como "nuestro motor creativo" o "la IA de Nexo".
- **Frontend (`BrandIntegration.tsx`, `ImageEditDialog.tsx`)**: Se reemplazaron etiquetas técnicas por términos de negocio. Por ejemplo, "Generado por Gemini" ahora es "Interpretación de Nexo".

#### 2. Segmentación de Historiales por Sección (Etiquetado Dinámico)
**Problema**: El historial de imágenes en la sección "Contenido" mostraba todas las imágenes del proyecto mezcladas, lo que saturaba la vista del usuario.
**Funcionalidad Nueva**: Implementación de un pipeline de etiquetado basado en el origen (`source_section`).
- **Archivos Modificados**:
    - `apps/api/src/modules/content/service.ts`: Se expandió la interfaz `ListFilter` para soportar el parámetro `tags`. Ahora el backend puede filtrar colecciones usando el operador `hasEvery` de Prisma.
    - `apps/api/src/modules/ai-services/image-generator/index.ts`: Se modificó el creador de assets para inyectar etiquetas de sección (ej. `section:generate`, `section:nexo_ideas`, `section:chat`) automáticamente al finalizar una generación.
    - `apps/api/src/modules/ai-services/routes.ts`: Se añadió el campo `source_section` a los endpoints de generación y edición para permitir la trazabilidad desde el origen.

**Implementación en UI**:
- **Generar con IA (`ImageGenerator.tsx`)**: El grid de "Historial" ahora consulta exclusivamente assets con la etiqueta `section:generate`.
- **Ideas de Nexo (`NexoIdeasSection.tsx`)**: Su historial es ahora independiente y solo muestra piezas creadas desde el flujo de ideación (`section:nexo_ideas`).
- **Chat Inteligente (`image-tools.ts`)**: Las imágenes generadas vía chat ahora se marcan como `section:chat`, permitiendo futuras vistas de historial específicas para conversaciones.
- **Biblioteca Maestra (`GeneratedLibrary.tsx`)**: Actúa como el archivo total, filtrando únicamente por la etiqueta global `generated`.

#### 3. Optimización del Pipeline de Análisis Visual
- **Regla de Negocio**: Las imágenes generadas por la propia plataforma ya no pasan por el proceso de análisis visual automático. Esto ahorra créditos, evita redundancia en la base de datos y acelera la disponibilidad de la imagen.
- **Bugfix Crítico (`content/service.ts`)**: Se corrigió un error donde el método `create` retornaba prematuramente, impidiendo la persistencia de etiquetas.

#### 4. Unificación de la Experiencia de Visualización (Modal de Análisis)
- **Corrección de Error (`MoodboardSection.tsx`)**: Se resolvió un `ReferenceError` por la falta de importación de `extractVisualAnalysis`.
- **Refactorización de UI**: Se delegó la gestión de modales al componente padre `BrandTab.tsx`. Ahora, las imágenes de la web se abren en el mismo `ImageAnalysisDialog` profesional que el resto de activos, mostrando su ADN visual y feedback de marketing.

---

### 💬 CAMBIO 4: Optimización de Generación en Chat (Experiencia Premium)

Se ha blindado el flujo de chat para evitar alucinaciones técnicas y mejorar la precisión creativa mediante el uso obligatorio de referencias.

#### 1. Flujo "Elegir, No Suponer"
**Lógica**: Se prohibió que el asistente genere imágenes basándose en suposiciones. Ahora es obligatorio invocar `get_library_assets` para que el usuario elija referencias reales de su marca antes de proceder.
- **Búsqueda Semántica**: La herramienta `get_library_assets` descompone el concepto del usuario en términos clave para priorizar los activos más relevantes en la parte superior de la galería propuesta.

#### 2. Filtro de Ruido Visual en Mensajes
**Archivos Modificados**: `apps/web/src/features/chat/components/MessageBubble.tsx`
- **Ocultación de IDs**: Se interceptan las listas de Markdown que contienen IDs técnicos o links de activos (`[ASSETS: ...]`). Estas listas ahora se ocultan al usuario final, manteniendo el chat limpio mientras la lógica subyacente sigue funcionando.
- **Prioridad Visual**: El chat ahora se enfoca en el lenguaje natural y en la visualización de la galería, eliminando el "spam" de UUIDs.

#### 3. Modo Apegado vs Creativo (Paridad de Plataforma)
- Se han refinado las instrucciones de los modos en `image-tools.ts` para replicar el comportamiento de versiones anteriores:
    - **Modo Apegado (`referential`)**: Obliga a mantener proporciones 1:1, texturas exactas y etiquetas de producto idénticas. Prohíbe la distorsión del sujeto principal.
    - **Modo Creativo (`creative`)**: Permite mayor libertad en la composición pero bloquea el uso de colores fuera de la paleta de marca detectada.

---

### 🚀 Guía para Implementación en Otras Versiones
1. **DB**: Asegurarse de que la tabla `ContentAsset` soporte arreglos de strings en la columna `tags`.
2. **Service**: Implementar en el método `list` la capacidad de recibir un string de etiquetas y convertirlo en un filtro `hasEvery`.
3. **API**: Añadir `source_section` a las validaciones de Zod en las rutas de IA.
4. **Chat**: Configurar el `system_prompt` para que el agente nunca asuma activos y siempre use las herramientas de búsqueda visual primero.

---
*Última actualización: 27 de abril de 2026 - 20:45 (Fase: Estabilización de Branding y Chat Completa)*
