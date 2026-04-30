# Documentación de Mejoras en la Generación de Imágenes

Este documento detalla la arquitectura, problemas previos y las soluciones implementadas para optimizar la generación de imágenes con IA en la plataforma Radikal, unificando los modos "Apegado al Referente" y "Creativo" con la fórmula de los "5 Pilares" y solucionando los problemas de integración de logos.

## 1. Integración de Logos (Watermark vs Generación Orgánica)

### Qué pasaba antes:
*   **Problema de la Marca de Agua (Watermark):** La plataforma le prohibía a la IA (DALL-E/Gemini) intentar dibujar el logo. En su lugar, el backend tomaba la imagen final y usaba la librería `sharp` (`watermarkImageWithPadding`) para "pegar" el archivo del logo en la esquina inferior derecha. Esto provocaba que el logo se viera como una pegatina artificial, sin sombras, perspectivas ni coherencia con la iluminación de la escena.
*   **Problema de Selección de Logo:** Si el usuario elegía un logo en la UI o pedía un logo en el texto, el backend usaba `prisma.contentAsset.findFirst({ tags: { has: 'logo' } })`. Esto causaba que el sistema tomara un logo aleatorio (a veces un ícono SVG o un logo secundario raspeado de la web) en lugar del logo principal seleccionado por el usuario.

### Qué se hace ahora:
*   **Integración Orgánica (Multimodal):** Se eliminó el uso de la función `watermarkImageWithPadding`. Ahora, el archivo de la imagen del logo se inyecta directamente como un *Asset Visual* en el *prompt* multimodal hacia Gemini/OpenRouter.
*   **Prompting para Logos:** Se instruye explícitamente a la IA en el pilar de `[ESTILO]`: *"Incorporate the provided logo ORGANICALLY within the scene. It must blend naturally into the environment (e.g., on a product, a sign, or a premium flat overlay). DO NOT alter its shape, colors or fonts"*. Esto permite que la IA renderice el logo con perspectiva e iluminación realista.
*   **Fidelidad de Selección:** Se asegura que el buffer del logo seleccionado (o detectado) se agregue a la lista de referencias (`refs`) que consume la IA.

### Archivos cambiados:
*   `apps/api/src/modules/ai-services/image-generator/index.ts` (Se eliminó la llamada a `watermarkImageWithPadding` y se corrigió el paso del `logoBuf` hacia los `refs`).
*   `apps/api/src/modules/chats/tools/image-tools.ts` (Se actualizó la descripción de la herramienta `generate_image` para el Agente Nexo).
*   `apps/api/src/modules/ai-services/image-generator/helpers.ts` (Se actualizó la regla de composición para exigir integración orgánica del logo).

---

## 2. Los 5 Pilares Flexibles (Identity Lock vs Creative)

### Qué pasaba antes:
*   El motor de síntesis de prompts (`BrandSynthesizer`) recibía el ADN de la marca y las referencias, y generaba un párrafo libre y cinematográfico.
*   Esto causaba que la IA perdiera foco, no definiera bien los elementos técnicos fotográficos y generara imágenes con un aspecto muy artificial (render 3D genérico) porque no se le forzaba a aplicar encuadres e iluminación específica.

### Qué se hace ahora:
*   Se reestructuró el *System Prompt* del Sintetizador en `index.ts`. Ahora está **obligado** a devolver el *prompt* dividido exactamente en **5 bloques (Pilares)**: `[SUJETO]`, `[COMPOSICIÓN]`, `[ILUMINACIÓN]`, `[ESTILO]` y `[NEGATIVE PROMPT]`.
*   **Fusión de Lógicas:** Esta estructura no choca con los modos existentes, sino que adapta su contenido a ellos:
    *   **En Modo Apegado al Referente (Identity Lock):** El `[SUJETO]` describe de forma fotogramétrica y exacta la referencia (ya sea un producto, lugar o persona). La `[COMPOSICIÓN]` respeta el encuadre original, y el `[NEGATIVE PROMPT]` es extremadamente agresivo (*"NO alterar la forma del producto, NO cambiar materiales"*).
    *   **En Modo Creativo:** El `[SUJETO]` es flexible interpretando la intención del usuario. La `[COMPOSICIÓN]` y la `[ILUMINACIÓN]` toman enfoques cinematográficos y dramáticos. El `[ESTILO]` aplica profundamente la estética de la marca.

### Archivos cambiados:
*   `apps/api/src/modules/ai-services/image-generator/index.ts` (Se actualizó el `role: 'system'` del Sintetizador de prompts con la estructura obligatoria de 5 pilares diferenciando los dos modos).
*   `apps/api/src/modules/ai-services/image-generator/helpers.ts` (Se reforzó el *Negative Prompt* en el contexto para el modo Referencial).

---

## 3. Estado Actual de la Implementación (Backend Completado)

Los siguientes componentes ya han sido programados e integrados en el backend (`apps/api`):

1.  **Motor de 5 Pilares:** El Sintetizador de prompts en `index.ts` ahora devuelve las instrucciones obligatoriamente en 5 bloques (`[SUJETO]`, `[COMPOSICIÓN]`, `[ILUMINACIÓN]`, `[ESTILO]`, `[NEGATIVE PROMPT]`), fusionando de forma armónica los modos Apegado al Referente y Creativo.
2.  **Integración Orgánica de Logos:** `index.ts` inyecta el logo directamente a la IA (sin `sharp`), exigiendo que lo integre en el entorno.
3.  **Selección Exacta del Logo:** La lógica `findFirst` aleatoria fue reemplazada. Ahora prioriza el `isMainLogo` y `isValidLogo`.
4.  **Base de Datos (Esquema Prisma):** Se han agregado las banderas booleanas `isMainLogo` y `isValidLogo` al modelo `ContentAsset`, así como `typographyStyle` al `BrandProfile`.
5.  **Análisis de Tipografía:** El agente visual (`brand-orchestrator.ts`) ahora detecta y guarda el estilo tipográfico de la marca para inyectarlo en el pilar de `[ESTILO]`.
6.  **Soporte para Elementos Característicos:** La herramienta de Nexo (`image-tools.ts`) ahora agrupa y sirve los `brand_elements` guardados para sugerirlos antes de la generación.

## 4. Hoja de Ruta Restante (Frontend UI)

El backend ya está listo para procesar la nueva lógica. Lo que falta por implementar en la Interfaz de Usuario (Frontend / React) es:

1.  **Modal de Logos en "Mi Marca":** Crear el UI que permita al usuario marcar su logo como "Principal" y *chulear* los "Válidos". (Consumirá el endpoint para actualizar `isMainLogo` y `isValidLogo`).
2.  **Selector de Elementos Característicos en Nexo:** Mostrar la pestaña o selector de "Elementos Característicos" al momento de pedirle a Nexo que genere una imagen.
3.  **Texto Overlay (Opcional):** Si se requiere texto con ortografía perfecta en el futuro, se creará un flujo extra de UI para pedir un texto promocional y pasarlo al backend.
