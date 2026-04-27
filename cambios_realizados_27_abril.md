# Registro de Cambios — Radikal AI

## 📅 27 de Abril 2026: Estabilización de Análisis Visual y Chat IA

### 📌 Resumen de la Sesión
Esta sesión se centró en restaurar la paridad funcional con la plataforma anterior respecto al **análisis automático de imágenes** y corregir un error crítico de legibilidad en el **streaming del chat**.

### 🔧 CAMBIO 1: Restauración del Motor de Análisis Visual (Gemini 2.5 Flash)
- **Motor principal**: Migración a `google/gemini-2.5-flash` vía OpenRouter.
- **Persistencia Dual**: Se guarda el análisis en `metadata.visual_analysis` y el texto narrativo en `ai_description`.
- **Automatización**: Integración en `AssetUploader` para que el análisis se dispare inmediatamente al subir una imagen.

### 🔧 CAMBIO 2: Corrección de Espaciado en el Chat (SSE Parsing)
- **Fix**: Eliminación de `.trim()` en el parseo de tokens SSE (frontend y backend).
- **Resultado**: Las palabras ya no aparecen pegadas; se preservan los espacios enviados por la IA.

---

## 📅 25 de Abril 2026: Optimización del Módulo Nexo AI

### 📌 Contexto General
Migración y mejora de las funcionalidades de generación de imágenes desde la plataforma anterior hacia la nueva.

### 🔧 CAMBIO 1: Multi-Selección de Referencias (hasta 3)
- Soporte para seleccionar múltiples imágenes en el Contrato Visual de Nexo Ideas.
- Badge numérico de orden (1, 2, 3) y contador dinámico.

### 🔧 CAMBIO 2: Backend Robusto ante Imágenes Dañadas
- Detección de errores en `downloadAsBase64()`: rechazo de SVG, validación de tamaño mínimo y magic bytes.

### 🔧 CAMBIO 3: Modal de Preview para Imágenes Subidas
- Reemplazo de apertura en pestaña nueva por un modal interno con puntuación estética y análisis visual.

### 🔧 CAMBIO 4: Funcionalidad "Añadir Conocimientos"
- Implementación de subida de imágenes de marca con aplicación automática de tags (`user_uploaded`, `reference`).

### 🔧 CAMBIO 5: Modos Creativo y Apegado al Referente
- Sincronización de protocolos de prompt diferenciados por modo.
- Toggle visual en `ImageGenerator` y soporte en herramientas de chat.

---

## 📁 Lista de Archivos Modificados (Acumulado)

| Módulo | Archivos Clave |
|---|---|
| **AI Services** | `image-analyzer.ts`, `image-generator/helpers.ts`, `image-generator/providers.ts`, `routes.ts` |
| **Chat IA** | `stream.ts`, `chat/api/chat.ts`, `MessageBubble.tsx`, `image-tools.ts` |
| **Content/Nexo** | `AssetUploader.tsx`, `VisualContract.tsx`, `NexoIdeasSection.tsx`, `ImageGenerator.tsx` |
| **Memory/Brand** | `BrandTab.tsx`, `WelcomeModal.tsx` |

---
*Última actualización: 27 de abril de 2026*
