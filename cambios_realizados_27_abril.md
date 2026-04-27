# Cambios Realizados — 25 de Abril 2026
## Sesión de Desarrollo: Optimización del Módulo Nexo AI

---

## 📌 Contexto General

Esta sesión tuvo como objetivo principal **migrar y mejorar las funcionalidades del módulo de generación de imágenes** desde la plataforma anterior (`version anterior/`) hacia la plataforma nueva (`24abrilPlataforma/`). Se trabajó en tres grandes áreas:

1. **Funcionalidad "Añadir Conocimientos"** → Subida de imágenes de referencia por el usuario
2. **Mejoras de calidad visual** → Prompts avanzados con modos Creativo y Apegado al referente
3. **Sincronización de todas las secciones de generación** → Chat, Generar con IA y Nexo Ideas

---

## 🗂️ Plataformas Involucradas

| Plataforma | Ruta | Rol |
|---|---|---|
| **Plataforma Nueva** | `apps/web` (puerto 5174) | Frontend React/Vite |
| **API Backend** | `apps/api` (puerto 3004) | Hono.js + Prisma + Supabase |
| **Plataforma Anterior** | `version anterior/src` | Referencia de comportamiento esperado |
| **Proveedor IA** | OpenRouter + Google Gemini + DALL-E | Generación de imágenes |
| **Storage** | Supabase Storage (bucket `assets`) | Almacenamiento de imágenes |

---

## 🔧 CAMBIO 1: Multi-Selección de Referencias (hasta 3)

### Intención
Antes solo se podía seleccionar UNA imagen de referencia en el Contrato Visual de Nexo Ideas. Se migró el comportamiento de la plataforma anterior que permitía múltiples referencias.

### Archivo Modificado
```
apps/web/src/features/content/components/nexo-ideas/VisualContract.tsx
```

### Cambios Clave
- Se cambió `selectedRef: string | null` → `selectedRefs: Set<string>` para soporte multi-selección
- Se implementó lógica de toggle: clic para agregar/quitar, máximo 3 referencias
- Se añadió un **badge numérico de orden** (1, 2, 3) en la esquina de cada imagen seleccionada (ámbar)
- Cuando ya hay 3 seleccionadas, las demás se vuelven semitransparentes y no clicables
- Se añadió un contador dinámico **"X/3 seleccionadas"** en verde en el header de la sección
- El botón de generar en modo Referente requiere `selectedRefs.size > 0` en lugar de `selectedRef !== null`
- `handleClose` resetea `new Set()` en vez del string nulo anterior

### Paso a Paso de Funcionamiento
1. El usuario abre el Contrato Visual desde una tarjeta de idea
2. En la sección "Referencias Sira", hace clic en imágenes
3. Aparece un badge numérico (orden de selección) en cada imagen activa
4. Al llegar a 3, las demás se bloquean visualmente
5. Al generar, los IDs de todas las refs seleccionadas se envían al backend como `reference_asset_ids: string[]`

---

## 🔧 CAMBIO 2: Backend Robusto ante Imágenes Dañadas

### Intención
Si una URL de imagen de referencia estaba rota, era SVG, era demasiado pequeña o el servidor devolvía error HTTP, el proceso anterior **se quedaba colgado o generaba sin la referencia silenciosamente**. Se implementó detección de errores explícita.

### Archivo Modificado
```
apps/api/src/modules/ai-services/image-generator/providers.ts
```

### Cambios en `downloadAsBase64()`
- **Rechazo de SVG**: Si el `content-type` incluye `svg`, se devuelve `undefined` y se loguea
- **Tamaño mínimo**: Si el buffer resultante es < 1024 bytes, se considera imagen corrupta y se descarta
- **Detección por magic bytes**: Se verifica el formato real del archivo leyendo los primeros bytes (PNG: `0x89 0x50`, JPEG: `0xFF 0xD8`, GIF: `0x47 0x49`, WebP: `0x52 0x49`) — no solo el Content-Type del servidor
- **Error HTTP**: Si el servidor devuelve status != 200, se loguea y se omite esa referencia
- **Excepción de red**: Si `fetch` falla (timeout, CORS, etc.) se captura y se continúa

### Archivo Modificado (Orquestador)
```
apps/api/src/modules/ai-services/image-generator/index.ts
```

### Cambios en el orquestador
- Se **limita a 3 referencias máximas** con `refIds.slice(0, 3)` antes de procesar
- Se contabiliza `skipped` para logging
- Si **TODAS las referencias fallan**, el proceso continúa con el prompt enriquecido sin referencias visuales (no lanza error)

---

## 🔧 CAMBIO 3: Modal de Preview para Imágenes Subidas por el Usuario

### Intención
Las imágenes subidas en la sección "Mi Marca" antes abrían una nueva pestaña del navegador. Se reemplazó por un modal interno que muestra el análisis de IA tal como lo hacía la plataforma anterior.

### Archivo Modificado
```
apps/web/src/features/memory/components/brand/BrandTab.tsx
```

### Cambios
- Se añadió estado `previewAsset: ContentAssetLite | null`
- Las miniaturas de la galería de "Imágenes subidas por el usuario" son ahora botones (`<button>`) que abren el modal
- Se muestra directamente la **puntuación estética** (ej. `8.4`) en un badge verde sobre la miniatura
- El modal muestra:
  - **Panel izquierdo oscuro**: La imagen en alta resolución con `object-contain`
  - **Panel derecho blanco**: 
    - Puntuación IA (tipografía grande, ej. `8.4 / 10`)
    - Análisis visual descriptivo en recuadro gris
    - Etiquetas detectadas como chips violeta (se filtra la etiqueta `user_uploaded`)
    - Botón de descarga del original

---

## 🔧 CAMBIO 4: Funcionalidad "Añadir Conocimientos"

### Intención
Implementar la funcionalidad completa de subida de imágenes de marca por parte del usuario, tanto desde la sección "Mi Marca" como desde el Contrato Visual al generar imágenes.

### Archivos Modificados

#### `apps/web/src/features/content/components/AssetUploader.tsx`
**Antes**: Componente sin soporte de tags ni callbacks.
**Después**:
- Acepta prop `tags?: string[]` — aplica esas etiquetas a cada imagen subida via `PATCH /content/:id`
- Acepta prop `onUploadComplete?: (assets: ContentAsset[]) => void` — callback cuando termina la subida
- `handleOneFile` retorna `ContentAsset | null` en lugar de `void`
- Se usa `Promise.all` para procesar múltiples archivos y notificar al callback con todos los assets exitosos
- Se importó `useUpdateAsset` para poder etiquetar los assets recién creados

#### `apps/web/src/features/memory/components/brand/BrandTab.tsx`
**Nuevo: Sección "Imágenes subidas por el usuario"**
- Se filtra `userUploads = assets?.filter(a => a.tags?.includes('user_uploaded'))` del array general de assets
- Se muestra la galería en grid responsivo (2 cols mobile → 4 → 6 en desktop)
- Botón **"Añadir conocimientos"** en el header abre un `Dialog` con `AssetUploader`
- Tags aplicados automáticamente: `['user_uploaded', 'reference', 'social_auto']`
- Cuando termina la subida, el modal se cierra y el query cache se invalida (aparecen de inmediato)

#### `apps/web/src/features/content/components/nexo-ideas/VisualContract.tsx`
- Botón **"Añadir imágenes"** junto al título de la sección de Referencias
- Abre un segundo `Dialog` con `AssetUploader` aplicando los mismos tags
- Las imágenes subidas aparecen de inmediato en la lista de referencias seleccionables (ya que se filtran por tag `reference`)

### Flujo Completo de Análisis Automático
1. Usuario sube imagen → se sube a Supabase Storage (bucket `assets`)
2. Se crea registro en BD (`content_assets`) via `POST /content`
3. Se aplican tags via `PATCH /content/:id` → `['user_uploaded', 'reference', 'social_auto']`
4. Se dispara análisis de IA via `POST /content/:id/evaluate` (evaluador visual)
5. El evaluador analiza la imagen y escribe: `aesthetic_score`, `ai_description`, `marketing_feedback`, `tags` detectados
6. La imagen ya es visible en:
   - Galería "Subidas por el usuario" en Mi Marca
   - Lista de referencias seleccionables en el Contrato Visual de Nexo Ideas

---

## 🔧 CAMBIO 5: Modos Creativo y Apegado al Referente en Todas las Secciones

### Intención
El campo `mode` existía en los tipos del backend pero **nunca se pasaba correctamente desde el frontend ni se diferenciaba en el prompt**. Se sincronizó el comportamiento de la plataforma anterior donde cada modo generaba instrucciones completamente distintas para el modelo de IA.

### Archivos Modificados

#### `apps/api/src/modules/ai-services/image-generator/helpers.ts`
**Función `buildBrandContext()` actualizada:**
- Acepta nuevo parámetro `mode: 'creative' | 'referential' = 'creative'`
- **Modo Referential**: Inyecta el protocolo `IMAGE-COMPOSITION PROTOCOL: COHESIVE INTEGRATION` con reglas estrictas:
  - No collages planos
  - Mantener identidad exacta del producto/sujeto
  - Respetar logo sin deformar tipografía ni color
  - Usar SOLO colores de las referencias
- **Modo Creative**: Inyecta `BRAND-CENTRIC CREATIVE MODE` con reglas de libertad creativa pero respetando ADN:
  - Usar paleta de colores exacta
  - Logo siempre legible y sin alteraciones
  - Escena nueva de lifestyle o estudio de alta gama
  - Calidad editorial 4K

#### `apps/api/src/modules/ai-services/routes.ts`
- El endpoint `POST /ai-services/generate-image` ahora acepta `mode: z.enum(['creative', 'referential']).optional().default('creative')`
- El `mode` se extrae del body y se pasa a `imageGenerator.generate()`

#### `apps/api/src/modules/ai-services/image-generator/index.ts`
- El orquestador pasa `input.mode ?? 'creative'` a `buildBrandContext()`

#### `apps/web/src/features/content/components/ImageGenerator.tsx` (sección "Generar con IA")
- Se añadió `useState<'creative' | 'referential'>('creative')` para el modo
- Se añadió el **toggle visual** (pill de dos botones) entre la sección de referencias y el textarea:
  - `✦ Creativo` — Fondo blanco con sombra cuando activo
  - `◎ Apegado al referente` — Idem
  - Cuando está en modo referente, aparece aviso ámbar explicando el comportamiento
- El `mode` se envía en cada llamada `generate.mutateAsync({ ..., mode })`
- El tipo de `style` se auto-ajusta: `mode === 'creative' ? 'vivid' : 'natural'`

#### `apps/api/src/modules/chats/tools/image-tools.ts` (herramienta del agente de Chat)
- El tool `generate_image` ahora acepta parámetro `mode` (el agente de IA puede elegirlo según contexto)
- Se añadió `useBrandPalette: true` para que el chat también aplique la paleta de marca
- Descripciones enriquecidas en el schema para guiar mejor al modelo de lenguaje
- El label del tool pasó de `'Generando imagen'` a `'Generando imagen con IA'`

---

## 📁 Lista Completa de Archivos Modificados

### Frontend (`apps/web/src/`)
| Archivo | Tipo de Cambio |
|---|---|
| `features/content/components/AssetUploader.tsx` | Tags, callback, retorno de asset |
| `features/content/components/ImageGenerator.tsx` | Toggle modo, envío de mode a API |
| `features/content/components/nexo-ideas/VisualContract.tsx` | Multi-select refs, botón upload, modal upload |
| `features/memory/components/brand/BrandTab.tsx` | Sección user_uploads, modal preview con análisis, modal upload |

### Backend (`apps/api/src/`)
| Archivo | Tipo de Cambio |
|---|---|
| `modules/ai-services/image-generator/helpers.ts` | Parámetro mode, protocolos diferenciados por modo |
| `modules/ai-services/image-generator/index.ts` | Límite 3 refs, skip refs dañadas, pasa mode |
| `modules/ai-services/image-generator/providers.ts` | downloadAsBase64 robusto: SVG/tamaño/magic bytes |
| `modules/ai-services/routes.ts` | Acepta mode en schema Zod, lo pasa al generador |
| `modules/chats/tools/image-tools.ts` | mode, useBrandPalette, descripciones mejoradas |

---

## 🔄 Flujo General de Generación de Imágenes (Estado Actual)

```
[Usuario selecciona idea en Nexo Ideas]
         ↓
[Abre Contrato Visual (VisualContract.tsx)]
         ↓
[Elige modo: Creativo / Apegado al referente]
         ↓
[Selecciona hasta 3 referencias (multi-select)]
  (puede subir nuevas con "Añadir imágenes")
         ↓
[Hace clic en GENERAR PIEZA]
         ↓
[POST /ai-services/generate-image]
  { prompt, size, style, mode, reference_asset_ids[], project_id }
         ↓
[Backend: buildBrandContext()]
  - Carga perfil de marca del proyecto
  - Carga descripciones IA de las referencias
  - Aplica protocolo según mode (Referential/Creative)
  - Retorna prompt enriquecido
         ↓
[Backend: downloadAsBase64() para cada ref]
  - Rechaza SVG, imágenes < 1KB, URLs rotas
  - Detecta formato real por magic bytes
  - Si todas fallan → continúa sin refs visuales
         ↓
[OpenRouter → google/gemini-2.0-flash-exp:free]
  Con imágenes de referencia en base64 + prompt enriquecido
  Fallback → Gemini directo → DALL-E 3
         ↓
[Imagen generada → Supabase Storage]
         ↓
[Asset creado en BD → Análisis de calidad automático]
         ↓
[Frontend muestra resultado en modal]
```

---

## 🎨 Convención de Tags en Assets

| Tag | Significado |
|---|---|
| `logo` | Logo oficial de la marca |
| `instagram` | Captura de perfil/posts de Instagram |
| `moodboard` | Imagen del tablero de inspiración |
| `reference` | Disponible como referencia en el Contrato Visual |
| `user_uploaded` | Subida directamente por el usuario desde el dispositivo |
| `social_auto` | Etiqueta de análisis de redes sociales automático |
| `generated` | Imagen generada con IA |
| `ai` | Procesada/generada con inteligencia artificial |
| `selected` | Variante marcada como favorita por el usuario |

---

## 🌐 Endpoints Relevantes

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/ai-services/generate-image` | Genera imagen con modo, referencias y contexto de marca |
| `GET` | `/content?project_id=&type=image` | Lista assets de imagen del proyecto |
| `POST` | `/content` | Crea nuevo asset en la BD |
| `PATCH` | `/content/:id` | Actualiza tags/descripción de un asset |
| `POST` | `/content/:id/evaluate` | Dispara análisis de IA sobre un asset |

---

## ✅ Estado Final del Sistema

- ✅ Selección múltiple de referencias (hasta 3) con numeración de orden
- ✅ Referencias inválidas (SVG, rotas, muy pequeñas) se saltan sin bloquear el proceso
- ✅ Modal de preview de imágenes subidas con análisis de IA integrado
- ✅ Sección "Imágenes subidas por el usuario" en Mi Marca con análisis automático
- ✅ Botón "Añadir conocimientos" en Mi Marca
- ✅ Botón "Añadir imágenes de marca" durante la generación (en el Contrato Visual)
- ✅ Modos Creativo y Apegado al referente funcionando en las 3 secciones de generación
- ✅ Protocolo de composición diferenciado por modo en el backend
- ✅ Chat de IA también usa paleta de marca y acepta modo al generar imágenes

---

---

## 📅 27 de Abril 2026: Estabilización de Motor de Análisis Visual

### 🔧 CAMBIO 1: Restauración del Motor de Análisis Visual (Gemini 2.5 Flash)
- **Motor principal**: Migración a `google/gemini-2.5-flash` vía OpenRouter, permitiendo análisis de alta fidelidad estética.
- **Persistencia en aiDescription**: Se actualizó el endpoint `/analyze-image` para guardar la narrativa de arte directamente en el campo `aiDescription` (antes solo se guardaba en el JSON de metadatos), permitiendo que el modal de la galería lo muestre de inmediato.
- **Automatización en Uploader**: Se integró el hook `useAnalyzeImage` en `AssetUploader.tsx`. Ahora, el análisis visual se dispara automáticamente en paralelo con la evaluación de marketing al subir cualquier imagen.

### 🔧 CAMBIO 2: Unificación de Visualización de Imágenes (Modal Premium)
- **Componente Único**: Creación de `ImageAnalysisDialog.tsx` para centralizar la visualización de análisis de IA.
- **Eliminación de Links Directos**: Se corrigió el comportamiento donde algunas imágenes abrían la URL de Supabase al hacer clic. Ahora todas abren el modal enriquecido.
- **Secciones Actualizadas**:
    - **Chat**: Las imágenes enviadas tanto por herramientas como por Markdown/Links ahora son clicables y muestran su análisis. Se ha corregido el comportamiento donde solo aparecía el link de texto; ahora se muestra una previsualización interactiva.
    - **Biblioteca**: Unificación del modal de detalles con el estilo de "Nexo Ideas".
    - **Mi Marca**: El Moodboard y las subidas de usuario ahora comparten la misma experiencia visual premium.

---
*Última actualización: 27 de abril de 2026*

