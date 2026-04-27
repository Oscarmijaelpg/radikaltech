# Cambios Realizados — 27 de Abril 2026
## Sesión de Desarrollo: Estabilización de Análisis Visual y Chat IA

---

## 📌 Resumen de la Sesión
Esta sesión se centró en restaurar la paridad funcional con la plataforma anterior respecto al **análisis automático de imágenes** y corregir un error crítico de legibilidad en el **streaming del chat**.

---

## 🔧 CAMBIO 1: Restauración del Motor de Análisis Visual (Gemini 2.5 Flash)

### Intención
Las imágenes subidas por el usuario no estaban mostrando el análisis narrativo rico ("CATEGORÍA: Sujeto. Análisis técnico...") que existía en la plataforma anterior. Se detectó que el modelo configurado era obsoleto y los resultados no se persistían en el campo correcto de la base de datos.

### Archivos Modificados
- `apps/api/src/modules/ai-services/image-analyzer.ts` (Motor principal)
- `apps/api/src/modules/ai-services/routes.ts` (Endpoint backend)
- `apps/web/src/features/content/api/content.ts` (API frontend)
- `apps/web/src/features/content/components/AssetUploader.tsx` (Flujo de subida)

### Mejoras Implementadas
- **Migración a OpenRouter**: Se configuró `google/gemini-2.5-flash` como proveedor de visión principal por su alta capacidad de análisis estético y descriptivo.
- **Prompt de Dirección de Arte**: Se restauró el prompt original que actúa como un Director de Arte, generando un objeto JSON con colores dominantes, iluminación, mood, composición y una **narrativa completa de 80-120 palabras**.
- **Persistencia Dual**: 
    - Se guarda el JSON estructurado en `metadata.visual_analysis`.
    - Se guarda la narrativa textual directamente en `ai_description` (campo `aiDescription` en BD) para que el modal de **BrandTab** lo muestre de inmediato sin procesamiento adicional.
- **Automatización en la Subida**: Se integró la llamada a `analyzeImage` en el componente `AssetUploader`. Ahora, cada vez que un usuario sube una imagen, el sistema dispara en paralelo:
    1. **Evaluación de Marketing** (Puntuación estética).
    2. **Análisis Visual** (Descripción técnica de arte).
- **UI Feedback**: El badge de estado en el uploader ahora dice **"Analizando con IA"** para reflejar ambos procesos.

---

## 🔧 CAMBIO 2: Corrección de Espaciado en el Chat (SSE Parsing)

### Intención
Los mensajes del chat aparecían con todas las **palabras pegadas (sin espacios)** durante el streaming, dificultando totalmente la lectura. Esto ocurría porque el sistema de parseo de eventos (SSE) estaba eliminando los espacios iniciales de cada token enviado por la IA.

### Archivos Modificados
- `apps/web/src/features/chat/api/chat.ts` (Frontend parser)
- `apps/api/src/modules/chats/stream.ts` (Backend proxy)

### Solución Técnica
- **Error**: Se estaba usando `.trim()` sobre el payload de datos del evento SSE. En el streaming de LLMs, los espacios suelen ser el primer carácter de un token (ej: `" hola"`). Al hacer `trim()`, el espacio desaparecía.
- **Corrección**: Se implementó el parseo estricto según la especificación SSE. Solo se elimina **exactamente un espacio** después de la etiqueta `data: ` (el separador de protocolo), preservando cualquier espacio adicional que sea parte del contenido del mensaje.
- **Resultado**: El chat ahora fluye con espaciado natural y legibilidad perfecta.

---

## 📁 Lista de Archivos Actualizados (27 de Abril)

| Componente | Archivo | Cambio realizado |
28: | **API (Visión)** | `image-analyzer.ts` | Rewrite completo para Gemini 2.5 Flash vía OpenRouter |
| **API (Rutas)** | `ai-services/routes.ts` | Persistencia en campo `aiDescription` |
| **API (Chat)** | `chats/stream.ts` | Eliminación de `.trim()` en proxy de tokens |
| **Web (Upload)** | `AssetUploader.tsx` | Disparo automático de análisis visual en paralelo |
| **Web (Chat)** | `chat/api/chat.ts` | Parser SSE corregido para preservar espacios |
| **Web (API)** | `content/api/content.ts` | Añadido hook `useAnalyzeImage` |

---

## ✅ Estado Actual del Sistema
- ✅ Análisis visual automático con Gemini 2.5 Flash al subir assets.
- ✅ Narrativas de dirección de arte visibles en el modal de BrandTab.
- ✅ Streaming de chat con espaciado y legibilidad corregida.
- ✅ Sincronización completa de metadatos en la base de datos (Prisma/Supabase).

---

*Documentado el 27 de abril de 2026 — Sesión de estabilización de IA*
