# Arquitectura de Radikal

Este documento explica las decisiones de diseño, los flujos críticos y las invariantes del sistema. Para el overview rápido, ver el [README](../README.md).

## Índice

1. [Monorepo](#monorepo)
2. [Capa de datos](#capa-de-datos)
3. [Autenticación](#autenticación)
4. [Jobs asíncronos y notificaciones](#jobs-asíncronos-y-notificaciones)
5. [Chat multi-agente + streaming SSE](#chat-multi-agente--streaming-sse)
6. [Flujos de enriquecimiento (scrapers)](#flujos-de-enriquecimiento-scrapers)
7. [Generación y visualización de reportes](#generación-y-visualización-de-reportes)
8. [Convenciones transversales](#convenciones-transversales)

---

## Monorepo

- Gestor: **pnpm workspaces** + **Turborepo** (pipeline en `turbo.json`).
- 2 apps (`apps/web`, `apps/api`) + 3 packages (`shared`, `ui`, `db`).
- Cada package expone un `package.json` con `"exports"` o entry directo para consumo en apps.

### Por qué monorepo

- Tipos y schemas Zod compartidos entre front y back (`packages/shared`) evitan drift contrato.
- El design system vive en `packages/ui` con su propio `tailwind.preset.js` que los apps consumen.
- Prisma client generado sólo en `packages/db`; apps importan `@radikal/db`.

## Capa de datos

- **Postgres** en Supabase + **Prisma** (5.x).
- Schema en `packages/db/prisma/schema.prisma`.
- Tablas clave:
  - `Profile` — espejo de `auth.users` con campos de onboarding.
  - `Project` — una marca por usuario. Contiene `websiteUrl`, `websiteSource`, snake_case de business.
  - `BrandProfile` — tono, valores, paleta, moodboard (JSON).
  - `ContentAsset` — imágenes (logo, moodboard, instagram). Tags + metadata.
  - `SocialAccount`, `Competitor`, `SocialPost` — redes propias y de competidores.
  - `AiJob` — registro de jobs async (kind + status + input/output/error).
  - `Notification` — notificaciones en-app (campana + toasts).
  - `Report`, `Recommendation`, `ScheduledPost`, `ScheduledReport`, `Message`, `Chat`, `MemoryItem`.
- `DATABASE_URL` apunta al **pooler** de Supabase (conexiones largas-vivas); `DIRECT_URL` es directo (para migrate).

## Autenticación

- **Supabase Auth** emite JWT al cliente.
- El frontend guarda la sesión vía `supabase-js` y adjunta `Authorization: Bearer <token>` a cada request al API (`lib/api.ts`).
- El API valida cada request con `middleware/auth.ts` → llama `supabaseAdmin.auth.getUser(token)` y extrae `user.id` y `role` (`app_metadata.role`).
- El `user` queda disponible en `c.get('user')` de Hono.

## Jobs asíncronos y notificaciones

La mayoría de operaciones de IA son lentas (10-90s). No pueden bloquear la respuesta HTTP. Patrón:

```
Usuario pulsa "Analizar"
        │
        ▼
API responde 200 con proyecto creado
        │
        └─► void (async) { websiteAnalyzer.analyze(...) }
                 │
                 ├─ crea AiJob { status: 'running' }
                 ├─ ejecuta pipeline (Firecrawl → OpenAI → Gemini → logo → colors)
                 ├─ al éxito: update AiJob { status: 'succeeded', output }
                 └─ al fallo: update AiJob { status: 'failed', error }
                             + notificationService.jobFailed(...)
```

El frontend polea `GET /jobs/active` con un `refetchInterval` de 3s mientras `data.length > 0`. Cuando la lista pasa de >0 a 0, invalida caches (`projects`, `memory/brand`, `content`). Un componente `GlobalJobsBanner` pinta el progreso arriba del layout.

### Notificaciones de fallo

- Cada scraper/analyzer llama `notificationService.jobFailed(...)` en su `catch`, con textos por `kind`.
- El frontend tiene dos consumers:
  - **Campana** (`NotificationsBell`): polea `/notifications` cada 60s, muestra histórico, clickable.
  - **Toast watcher** (`JobFailureToasts`): polea `/notifications?unread_only=true` cada 8s y dispara toast *error* clickeable al primer fallo nuevo visto en la sesión.
- La notificación es **la única fuente de verdad** de que algo falló — no usamos mensajes en `Message.metadata` para errores.

## Chat multi-agente + streaming SSE

Endpoint: `POST /chats/:id/messages/stream` (`Content-Type: text/event-stream`).

Cinco agentes: **Ankor** (onboarding/empresa), **Sira** (sitio web/IA), **Nexo** (redes), **Kronos** (voz de marca), **Indexa** (objetivos/KPIs). El router (un LLM ligero) elige qué agente responde según la intención de cada turno.

### Eventos del stream

| event          | data                                                                       |
| -------------- | -------------------------------------------------------------------------- |
| `agent_turn`   | `{ agent_id, router, reason }` — quién está hablando                       |
| `tool_call`    | `{ name, label, args, status: 'started' }` — el LLM llama una herramienta   |
| `tool_result`  | `{ name, label, result_summary, status, data }` — resultado de la tool     |
| `token`        | string — chunk de texto del LLM                                            |
| `done`         | `{ messageId, tokensUsed, agent_id }` — fin del turno                      |
| `error`        | `{ message }` — error fatal                                                |

### Herramientas disponibles

Definidas en `apps/api/src/modules/chats/tools.ts`:

- `generate_report` (5 tipos) — genera markdown en backend vía OpenRouter, persiste `Report`, retorna `{ id, title, content, key_insights }`.
- `generate_image` — Gemini 2.5 Flash Image o DALL-E 3.
- `search_news`, `find_trends`, `get_competitor_data`, `get_brand_profile`, `evaluate_content`, `analyze_website`, `detect_markets`.

El frontend mapea cada `tool_result` a un `ToolResultCard` específico (ej. `ReportCreatedCard`, `NewsResultCard`, `BrandProfileCard`). Cada card puede callback al `ChatPage` (por ejemplo para abrir el `ReportPanel`).

## Flujos de enriquecimiento (scrapers)

### Website analyzer (`websiteAnalyzer.analyze`)

1. Scrape con **Firecrawl** (markdown + HTML + metadata).
2. Si `success:false` o markdown `< 40 chars` → throw `BadRequest` → notifica fallo. Evita datos vacíos silenciosos.
3. Extrae info con **OpenAI** o **OpenRouter** (gpt-4o-mini): industry, business_summary, main_products, ideal_customer, unique_value.
4. Detecta logo (score por `<img>` con "logo", og:image, apple-touch-icon, favicon…) y descarga el mejor a Supabase Storage `{userId}/brand/logo-*`.
5. Crea `ContentAsset` con tags `['logo', 'website_auto']`.
6. Si hay Gemini: analiza paleta del logo y guarda como `colorPaletteSuggested`.

### Instagram scraper (`instagramScraper.scrape`)

1. Llama Apify actor `instagram-profile-scraper`, `resultsLimit: 9`.
2. Descarga cada `displayUrl` a Supabase Storage `{userId}/instagram/*`.
3. Crea `ContentAsset` por post con tags `['instagram', 'social_auto']`, caption como `aiDescription`.
4. Si hay `competitorId`: también upsert en `SocialPost` + análisis visual de top 5 con Gemini.

### TikTok scraper

Análogo, pero no descarga imágenes (solo cover) — solo crea `SocialPost` si hay `competitorId`.

### Brand orchestrator

Coordina website + instagram + tiktok + brand synthesizer. Pipeline completo desde `POST /ai-services/analyze-brand`.

### Cuándo se disparan

- **Onboarding step `company`**: si `website_source='url'` y URL cambió.
- **Onboarding step `socials`**: si hay Instagram con `source='url'`.
- **`POST /projects`**: si viene `website` o `instagram_url`. Dynamic import en `projects/service.ts` para no cargar `supabase` en tests unitarios.

## Generación y visualización de reportes

### Backend

`apps/api/src/modules/reports/generators.ts` expone 5 generadores:

- `generateBrandStrategy`, `generateMonthlyAudit`, `generateCompetitionReport`, `generateNewsReport`, `generateUnifiedReport`.

Cada uno arma el contexto (desde `Project`, `BrandProfile`, `Competitor`, `SocialPost`…), llama a OpenRouter con un `system` prompt específico, recibe markdown, persiste en `Report` y crea una notificación `report_ready`.

### Frontend

- **`ReportsPage`**: lista + filtros + botón **"Nuevo reporte"** (dropdown con 5 tipos).
- **`ReportReader`**: renderizado de un reporte individual. Usa `ReactMarkdown` + `remark-gfm` + el plugin `@tailwindcss/typography`. Con `components` custom por tag para estilos finos. Exporta PDF/Word sobre el HTML ya renderizado (no sobre markdown crudo).
- **`ReportPanel`**: panel lateral que se abre desde el chat. Se hidrata con `data.content` del `tool_result` (no depende de `onToken`).

### Herramienta `generate_report` en el chat

- El backend devuelve `data.content` con el markdown completo.
- El prompt del tool instruye al LLM a **no re-imprimir** el markdown, solo confirmar brevemente ("Tu informe está listo — tócalo en el card de abajo").
- `ReportCreatedCard` en el chat ofrece `Abrir informe` (reabre el panel con el content) y `Ver en Reportes`.
- La descarga PDF/Word se hace desde el panel, sobre el HTML renderizado por ReactMarkdown (evita el bug de pasar markdown crudo a jsPDF).

## Convenciones transversales

- **Snake case en API**, **camelCase en BD** (Prisma). Los services mapean en el borde con `mapProjectInput` / `serializeProject`.
- **Zod** valida TODO input del API vía `@hono/zod-validator`. Los errores Zod se convierten a 400 en `error-handler.ts`.
- **AppError** y subclases (`BadRequest`, `Forbidden`, `NotFound`, `Conflict`) para errores esperados. Los no esperados caen a 500 y loggean stack.
- **Rate limiting** básico por IP+user para endpoints costosos (p.ej. `analyze-website`, `analyze-competitor`).
- **Logger Pino** con request_id inyectado por middleware. En tests, `LOG_LEVEL: 'silent'`.
- **Sin `any`**: preferimos `unknown` + refinamiento con zod o checks explícitos.
- **Sin mocks de DB en integration tests** del API — vimos bugs reales cuando mocks divergían del código.
