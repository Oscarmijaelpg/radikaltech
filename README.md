<div align="center">
  <img src="apps/web/src/media/radikal-logo.png" alt="Radikal" width="120" />

  # Radikal 

  **Plataforma de inteligencia de marca con IA — análisis competitivo, generación visual y agentes inteligentes orquestados.**

  ![Node](https://img.shields.io/badge/Node-20-339933?logo=node.js&logoColor=white)
  ![pnpm](https://img.shields.io/badge/pnpm-10.33-F69220?logo=pnpm&logoColor=white)
  ![Turbo](https://img.shields.io/badge/Turbo-2.x-EF4444?logo=turborepo&logoColor=white)
  ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
  ![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
  ![Hono](https://img.shields.io/badge/Hono-4-E36002?logo=hono&logoColor=white)
  ![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)
  ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)
  ![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
</div>

---

## ¿Qué es Radikal?

Radikal es una plataforma de **inteligencia de marca** que orquesta varios agentes de IA para ayudar a equipos de marketing y fundadores a: 

- **Mapear su marca automáticamente** a partir de su sitio web e Instagram (logo, paleta, tono, propuesta de valor).
- **Analizar competidores** con scraping de Instagram/TikTok, análisis visual y detección automática.
- **Generar contenido estratégico** (reportes, recomendaciones, imágenes, posts).
- **Programar publicaciones** y trabajar con un chat multi-agente especializado (Ankor, Sira, Nexo, Kronos, Indexa).
- **Detectar tendencias y noticias** relevantes del sector.

Toda la ejecución de IA corre de forma asíncrona con *fire-and-forget* + notificaciones en tiempo real vía SSE y polling.

## Stack

| Capa             | Tecnologías                                                                |
| ---------------- | -------------------------------------------------------------------------- |
| **Frontend**     | Vite, React 19, TanStack Query, React Router, Zustand, React Hook Form, Zod |
| **UI**           | Tailwind 3 + `@tailwindcss/typography`, Radix Primitives, CVA, `lucide-react` |
| **Backend**      | Hono, `@hono/zod-validator`, Pino logger, SSE (streaming de chat)          |
| **Database**     | Supabase Postgres + Prisma 5                                               |
| **Auth**         | Supabase Auth (JWT verificado server-side con `@supabase/supabase-js`)     |
| **Storage**      | Supabase Storage (bucket `assets`)                                         |
| **IA**           | OpenAI / OpenRouter (texto), Gemini (visión), Apify (scrapers sociales), Firecrawl (web scraping), Tavily (búsqueda web) |
| **Tests**        | Vitest (unit/integration), Playwright (E2E web), scripts E2E API vs Supabase real |
| **CI/CD**        | GitHub Actions (typecheck + tests + build)                                 |
| **Deploy target**| Vercel (web + api), Supabase Cloud (DB/Auth/Storage)                       |

## Estructura del monorepo

```
radikal/
├─ apps/
│  ├─ web/                 Frontend Vite + React 19
│  │  ├─ src/features/     Módulos por dominio (chat, reports, memory, onboarding…)
│  │  ├─ src/shared/       Layout, UI, hooks y utils compartidos
│  │  └─ src/providers/    Auth, Project, Theme, QueryClient
│  └─ api/                 Backend Hono
│     ├─ src/modules/      Un directorio por recurso (projects, chats, reports…)
│     ├─ src/middleware/   auth, error-handler, request-id, rate-limit
│     ├─ src/lib/          supabase client, errors, logger, storage
│     └─ scripts/          e2e-test.ts (pruebas contra API real)
├─ packages/
│  ├─ shared/              Tipos + schemas Zod compartidos front↔back
│  ├─ ui/                  Design system (Radix + CVA + Tailwind preset)
│  └─ db/                  Cliente Prisma + schema.prisma
├─ .github/workflows/      CI (ci.yml) + audit (security.yml)
├─ turbo.json              Pipeline de tareas (build, typecheck, test…)
└─ pnpm-workspace.yaml
```

## Arquitectura en alto nivel

```
                  ┌──────────────────────────────────────────────────────┐
                  │                      Supabase                         │
                  │  Postgres  ·  Auth (JWT)  ·  Storage (bucket assets)  │
                  └────────────────▲─────────────────▲────────────────────┘
                                   │ Prisma           │ admin client
                                   │                  │
           ┌───────────────────────┴─────┐   ┌────────┴──────────────────────┐
           │        apps/api             │   │       apps/web                │
           │  Hono 4 + Zod               │   │  Vite + React 19              │
           │  REST /api/v1/*             │◄──┤  TanStack Query               │
           │  SSE /chats/:id/stream      │   │  React Router                 │
           │  Fire-and-forget jobs       │   │  SSE consumer                 │
           │  Notifications + AiJobs     │   │  Polling de /jobs/active      │
           └──────┬───────────▲──────────┘   └───────────────────────────────┘
                  │           │
                  │           │  notifica fallos ──► NotificationsBell + Toast
                  ▼           │
  ┌───────────────────────────┴─────────────────────────────────────────────┐
  │  Integraciones externas                                                 │
  │  ─────────────────────                                                  │
  │  • OpenAI / OpenRouter  → LLMs texto (chat, reportes, síntesis)         │
  │  • Gemini               → análisis visual + paleta                       │
  │  • Firecrawl            → scraping del sitio del usuario                │
  │  • Apify (actors IG/TT) → scraping de posts Instagram/TikTok             │
  │  • Tavily               → búsqueda web (noticias, competidores)          │
  └─────────────────────────────────────────────────────────────────────────┘
```

**Patrón clave**: operaciones lentas (website scrape, social scrape, generación de reportes) NO bloquean la respuesta HTTP. El backend crea un registro `AiJob` con status `running`, responde, y ejecuta en background. El frontend polea `GET /jobs/active` cada 3s para pintar un banner global de progreso; cuando un job termina en `failed`, se crea una `Notification` que activa un toast *error* clickeable y queda persistida en la campana.

## Features principales

- **Onboarding guiado** (welcome → empresa → sitio web → redes → marca → objetivos) que dispara análisis automático tras cada paso.
- **Chat multi-agente con streaming SSE**: cinco personajes especializados (Ankor, Sira, Nexo, Kronos, Indexa). El router decide cuál responde según la intención. Herramientas disponibles al LLM: `generate_report`, `generate_image`, `search_news`, `find_trends`, `get_competitor_data`, `get_brand_profile`, `evaluate_content`, `analyze_website`, `detect_markets`.
- **Reportes estratégicos**: 5 tipos (estrategia de marca, auditoría mensual, competencia, noticias, análisis 360°). Se renderizan con ReactMarkdown y se exportan a PDF/Word client-side. Panel lateral abre sobre el chat en streaming.
- **Scrapers con notificaciones de fallo**: website-analyzer, instagram-scraper, tiktok-scraper, brand-orchestrator, news-aggregator, competitor-analyzer, recommendations-generate, image-generate/edit. Cada fallo crea notificación persistente.
- **Moodboard automático** construido a partir de imágenes del sitio + posts de Instagram.
- **Detección automática de competidores** con Tavily + síntesis OpenRouter.
- **Memory / Brand profile** consolidado (paleta, tono, valores, audiencia).
- **Notifications Bell** con polling 60s + watcher de fallos (8s) para feedback inmediato.

## Setup local

```bash
# 1. Requisitos
#    - Node.js 20+
#    - pnpm 10+  (npm i -g pnpm)

# 2. Clonar e instalar
git clone <tu-repo> radikal
cd radikal
pnpm install

# 3. Configurar .env (ver sección "Variables de entorno")
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
# ...y rellena tus claves

# 4. Generar cliente Prisma
pnpm db:generate

# 5. Sincronizar el schema a tu Supabase (primer deploy)
pnpm db:push

# 6. Levantar web + api
pnpm dev
```

- Web: http://localhost:5173 (o 5174 si usas el puerto configurado)
- API: http://localhost:3001 (o el que definas en `API_PORT`)

## Variables de entorno

Cada app tiene su propio `.env`. Los archivos `.env.example` en la raíz y en cada `apps/*` documentan todas las variables.

### Imprescindibles

| Variable                          | App          | Descripción                                     |
| --------------------------------- | ------------ | ----------------------------------------------- |
| `SUPABASE_URL`                    | api          | URL pública de tu proyecto Supabase             |
| `SUPABASE_ANON_KEY`               | api, web     | Anon key de Supabase                            |
| `SUPABASE_SERVICE_ROLE_KEY`       | api          | Service role (admin, ¡secreto!)                 |
| `DATABASE_URL` + `DIRECT_URL`     | api          | Conexiones Postgres (pooler + directo)          |
| `VITE_SUPABASE_URL`               | web          | Igual que `SUPABASE_URL`                        |
| `VITE_SUPABASE_ANON_KEY`          | web          | Igual que `SUPABASE_ANON_KEY`                   |
| `VITE_API_URL`                    | web          | Base URL del API (incl. `/api/v1`)              |
| `OPENAI_API_KEY` / `OPENROUTER_API_KEY` | api    | Al menos uno obligatorio (LLMs)                 |

### Opcionales (habilitan features)

| Variable            | Habilita                                             |
| ------------------- | ---------------------------------------------------- |
| `GEMINI_API_KEY`    | Análisis visual de logos/imágenes + generación       |
| `FIRECRAWL_API_KEY` | Scraping de sitios web en análisis                   |
| `APIFY_API_KEY`     | Scraping de Instagram y TikTok                       |
| `TAVILY_API_KEY`    | Búsqueda web (noticias, detección competidores)      |
| `GOOGLE_*`          | Vertex AI / imágenes avanzadas                       |

## Scripts disponibles

| Script                                 | Descripción                                              |
| -------------------------------------- | -------------------------------------------------------- |
| `pnpm dev`                             | Levanta web + api en paralelo (Turbo)                    |
| `pnpm build`                           | Build de producción de todos los paquetes                |
| `pnpm lint`                            | Lint en todo el monorepo                                 |
| `pnpm typecheck`                       | Typecheck de todos los paquetes                          |
| `pnpm test`                            | Vitest en todos los paquetes                             |
| `pnpm db:generate`                     | Regenera el cliente Prisma                               |
| `pnpm db:push`                         | Sincroniza `schema.prisma` a Supabase (sin migración)    |
| `pnpm --filter @radikal/web test:e2e`  | Playwright E2E del web                                   |
| `pnpm --filter @radikal/api tsx scripts/e2e-test.ts` | Prueba E2E del API contra Supabase real   |

## Endpoints principales (API)

Todos bajo `/api/v1/*`. Auth: `Authorization: Bearer <supabase_jwt>` (salvo `/health`).

| Recurso             | Métodos principales                                                       |
| ------------------- | ------------------------------------------------------------------------- |
| `/health`           | `GET` — ping + `db:connected`                                             |
| `/users/me`         | `GET`, `PATCH` — perfil actual                                            |
| `/projects`         | `GET`, `POST`, `PATCH`, `DELETE` — CRUD de proyectos (dispara enrichment) |
| `/onboarding/step`  | `POST` — guarda cada step (company/socials/brand/objectives)              |
| `/onboarding/complete` | `POST` — marca `onboarding_completed`                                  |
| `/chats`            | CRUD + `POST /:id/messages/stream` (SSE)                                  |
| `/ai-services/*`    | `analyze-website`, `scrape-instagram`, `scrape-tiktok`, `generate-image`… |
| `/reports`          | `GET`, `POST`, `DELETE` — reportes persistidos                            |
| `/recommendations`  | `GET`, `POST /generate`, `PATCH /:id`                                     |
| `/jobs/active`      | `GET` — jobs en curso (para banner global de progreso)                    |
| `/jobs/recent`      | `GET` — histórico de jobs                                                 |
| `/notifications`    | `GET`, `PATCH /:id/read`, `POST /mark-all-read`                           |
| `/competitors`      | `GET`, `POST`, `POST /detect`, `POST /:id/analyze`                        |
| `/memory`           | `GET`, `POST`, `DELETE` — memoria libre del proyecto                      |
| `/brand`            | `GET`, `PATCH` — brand profile (tono, paleta, valores…)                   |
| `/content`          | `GET`, `POST`, `DELETE` — content assets (imágenes, moodboard)            |
| `/stats`            | `GET` — stats agregados del proyecto                                      |
| `/scheduled-posts`  | CRUD de publicaciones programadas                                         |
| `/scheduled-reports`| CRUD de reportes recurrentes                                              |

Documentación más a fondo en [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Tests

```bash
# Unit / integration (Vitest) — 99 tests API
pnpm --filter @radikal/api test

# E2E del API contra Supabase real (crea usuario temporal, prueba flujos críticos,
# y verifica que los fallos generan notificaciones)
pnpm --filter @radikal/api tsx --env-file=.env scripts/e2e-test.ts

# E2E Web (Playwright)
pnpm --filter @radikal/web test:e2e
```

## Deploy

Ver guía paso a paso en [`docs/DEPLOY.md`](./docs/DEPLOY.md).

**Resumen:**

1. **Supabase**: crea proyecto, copia URL + keys, ejecuta `pnpm db:push`, crea el bucket `assets` (público).
2. **Vercel**:
   - Proyecto 1 (`apps/web`): framework preset **Vite**, root dir `apps/web`, build `pnpm --filter @radikal/web build`, output `dist`. Env vars: `VITE_*`.
   - Proyecto 2 (`apps/api`): **Node** runtime, root dir `apps/api`, build `pnpm --filter @radikal/api build`. Env vars: `SUPABASE_*`, `DATABASE_URL`, proveedores de IA.
3. **CI/CD**: GitHub Actions corre typecheck + tests + build en cada push/PR a `main` y `dev`.

## Troubleshooting

| Síntoma                                                | Solución                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `supabaseUrl is required`                              | Falta `SUPABASE_URL` en el `.env` de la app que se ejecuta                                 |
| Tests de `projects.test.ts` fallan con supabase error  | Asegúrate de haber hecho `pnpm install` después del último pull                            |
| Markdown de reportes se ve crudo (`**`, `#`)           | `@tailwindcss/typography` no cargó — verifica `packages/ui/tailwind.preset.js`             |
| `EADDRINUSE :::3002` al levantar API                   | Otro proceso ocupa el puerto — cambia `PORT` en `apps/api/.env` o mata el proceso          |
| Jobs activos nunca aparecen en el banner               | Espera 1-2s — el banner polea cada 3s. Si persiste, revisa logs del API                    |
| Prisma `client not found`                              | Corre `pnpm db:generate` para regenerar el cliente                                         |

## Contribuir

Ver [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Trabajar con agentes de IA (Claude Code, Cursor…)

Si usas Claude Code, Cursor o Windsurf para desarrollar, este repo incluye:

- [`CLAUDE.md`](./CLAUDE.md) — contexto denso del proyecto (convenciones, patrones, gotchas) que Claude Code lee automáticamente al abrir el repo.
- [`.claude/settings.json`](./.claude/settings.json) — permisos compartidos del equipo (comandos rutinarios pre-aprobados, denegaciones de operaciones destructivas).

Cada dev puede tener su propio `.claude/settings.local.json` (ignorado por git) para overrides personales.

## Licencia

Propietario — © Radikal. Todos los derechos reservados.
