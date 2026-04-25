# CLAUDE.md

Contexto del proyecto para agentes (Claude Code / Cursor / Windsurf). Claude Code lee este archivo automáticamente al abrir el repo. Léelo completo antes de proponer cambios.

Para onboarding humano ver [README.md](./README.md). Para arquitectura profunda ver [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

---

## Qué es este repo

**Radikal** — plataforma SaaS de inteligencia de marca. Monorepo pnpm con 2 apps (`apps/web` Vite+React, `apps/api` Hono) + 3 packages (`shared`, `ui`, `db`). Backend conecta con Supabase (Postgres+Auth+Storage) y orquesta varios LLMs y scrapers para enriquecer proyectos automáticamente.

## Comandos frecuentes

```bash
pnpm dev                                     # web + api en paralelo
pnpm typecheck                               # obligatorio antes de commit
pnpm --filter @radikal/api test              # Vitest (99 tests)
pnpm --filter @radikal/api tsx --env-file=.env scripts/e2e-test.ts   # E2E contra Supabase real
pnpm db:generate                             # tras tocar schema.prisma
pnpm db:push                                 # sync schema → Supabase (dev)
```

Puertos por defecto: web `:5173` (o `:5174`), api `:3001` (o `:3002`).

## Reglas duras del codebase

1. **No añadir comentarios triviales.** Si un identificador se explica solo, no pongas comentario. Reserva comentarios para el *por qué* (invariantes, workarounds, decisiones no-obvias).
2. **Sin `any`.** Usa `unknown` + refinamiento con zod o type guards explícitos.
3. **Errores esperados del API**: lanza subclases de `lib/errors.ts` (`BadRequest`, `Forbidden`, `NotFound`, `Conflict`). NO uses `throw new Error(...)` en paths esperados — eso convierte a 500 genérico.
4. **camelCase en API JSON (estándar de facto).** Prisma emite camelCase nativo y la mayoría de módulos lo exponen directo. Tipos compartidos en `@radikal/shared` están en camelCase. **Excepción legacy** (snake_case con serializer): `projects`, `memory`, `content`, `competitors`, `users`, `scheduler`. Nuevos módulos usan camelCase — no añadas serializers snake_case salvo que toques uno de los legacy.
5. **No comitees `.env`.** `.gitignore` los cubre. Usa `.env.example` para documentar variables nuevas.
6. **No mockear DB en integration tests.** Aprendimos por dolor que los mocks divergen del código. Para unit tests usa `vi.mock('@radikal/db')` pero verifica que cubre todos los accesos del módulo.
7. **Jobs > 3s → patrón fire-and-forget con `AiJob`** (ver sección abajo). Nunca bloquees la respuesta HTTP esperando scraping/LLM pesado.
8. **No duplicar packages/shared en front o back.** Los tipos y schemas Zod viven ahí. Si los necesitas en ambos lados, amplía `packages/shared/src/`.
9. **Regenera Prisma después de tocar `schema.prisma`**: `pnpm db:generate`. El cliente NO va al repo (gitignored).
10. **TypeScript estricto en todo el monorepo.** `strict: true` heredado desde `tsconfig.base.json`.

## Patrones específicos del proyecto

### Fire-and-forget con `AiJob` + notificaciones

Cualquier operación lenta (scraping, LLM, imagen) sigue este patrón:

```ts
// dentro del service que dispara el job
void (async () => {
  try {
    await websiteAnalyzer.analyze({ url, userId, projectId });
  } catch (err) {
    logger.warn({ err }, 'auto-analyze failed');
  }
})();
return projectCreated;  // respuesta HTTP inmediata
```

`websiteAnalyzer.analyze` (y todos los services análogos) internamente:

1. `prisma.aiJob.create({ kind, status: 'running', ... })`
2. Ejecuta el pipeline.
3. Al éxito: `aiJob.update({ status: 'succeeded', output })`.
4. Al fallo: `aiJob.update({ status: 'failed', error })` **+ `notificationService.jobFailed({...})`**.
5. Propaga el error (throw) para que el caller lo capture si le importa.

El frontend polea `/jobs/active` cada 3s mientras haya jobs → pinta banner global. Fallos llegan como notificación → campana + toast watcher.

**Al añadir un nuevo job kind**:
- Agregar entrada en `apps/api/src/modules/notifications/service.ts` → `JOB_FAILURE_META`.
- Agregar entrada en `apps/web/src/shared/layout/GlobalJobsBanner.tsx` → `JOB_LABELS`.
- Agregar entrada en `apps/web/src/features/onboarding/components/OnboardingLayout.tsx` → `ONBOARDING_JOB_LABELS` (si aplica al onboarding).

### Chat streaming SSE

`POST /chats/:id/messages/stream` emite eventos:

- `agent_turn`, `tool_call`, `tool_result`, `token`, `done`, `error`.

En el frontend (`apps/web/src/features/chat/pages/ChatPage.tsx`) se mapean a handlers. **Regla crítica**: cuando un tool devuelve `data`, los cards (`ToolResultCard`) deben hidratarse desde `tool_result.data`, NO depender de `onToken` (el LLM puede no re-imprimir los datos).

### Componentes custom en ReactMarkdown

`@tailwindcss/typography` está instalado pero los reportes usan components custom por tag para estilos finos y consistentes. Ver `ReportReader.tsx` y `ReportPanel.tsx` como referencia.

### Error handling en endpoints síncronos vs async

- **Endpoint síncrono del API** (`POST /ai-services/analyze-website` llamado por el WebsiteStep del onboarding): debe lanzar `BadRequest` con mensaje legible. No lanzar `Error` genérico → se convertiría en 500.
- **Fire-and-forget** (p.ej. disparado por `POST /projects` con website): el catch debe notificar vía `notificationService.jobFailed`.

El mismo service (`websiteAnalyzer`) sirve ambos. Por eso lanza `BadRequest` internamente — es amigable a los dos modos.

### Prisma field casing

El schema Prisma usa camelCase (es lo nativo):
```prisma
model Project {
  userId    String
  websiteUrl String?
  companyName String?
}
```

**Módulos nuevos (camelCase extremo-a-extremo):**
1. Prisma schema en camelCase.
2. Service retorna Prisma raw (sin serializer).
3. Zod schema en `routes.ts` en camelCase.
4. Tipo compartido en `packages/shared/src/schemas/` en camelCase.
5. Frontend importa de `@radikal/shared`.

**Módulos legacy que mantienen snake_case** (`projects`, `memory`, `content`, `competitors`, `users`, `scheduler`): respeta sus serializers existentes (`mapXxxInput`, `serializeXxx`) si tocas campos. No introduzcas nuevos serializers en módulos camelCase.

### URLs y modelos LLM

NO hardcodees URLs de proveedores (OpenAI, OpenRouter, Tavily, Firecrawl, Gemini, Apify) ni nombres de modelos (`gpt-4o-mini`, `dall-e-3`, etc.) en los services. Todo está centralizado en `apps/api/src/config/providers.ts`:
- `PROVIDER_URLS.openai.chatCompletions`, `PROVIDER_URLS.tavily.search`, etc.
- `LLM_MODELS.chat.openai`, `LLM_MODELS.image.dalle3`, etc.
- Helpers `preferredChatEndpoint()` / `preferredChatModel()` para el patrón "usa OpenRouter si está, si no OpenAI".
- `APIFY_ACTORS.instagram` / `.tiktok` para los IDs de actors.

## Integraciones externas y sus env vars

| Proveedor     | Var requerida                       | Uso                                             |
| ------------- | ----------------------------------- | ----------------------------------------------- |
| Supabase      | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | DB/Auth/Storage |
| OpenAI        | `OPENAI_API_KEY`                    | LLM texto principal (gpt-4o-mini) + embeddings  |
| OpenRouter    | `OPENROUTER_API_KEY`                | Fallback LLM + reportes (más barato)            |
| Gemini        | `GEMINI_API_KEY`                    | Visión (logo/color) + generación imagen         |
| Moonshot      | `MOONSHOT_API_KEY`, `MOONSHOT_MODEL` | Kimi K2 con builtin `$web_search` para detección de competidores y agregación de noticias. Default model: `kimi-k2-0905-preview`. |
| Firecrawl     | `FIRECRAWL_API_KEY`                 | Scraping del sitio del usuario                  |
| Apify         | `APIFY_API_KEY`                     | Scrapers Instagram (`dSCLg0C3YEZ83HzYX`) y TikTok (`OtzYfK1ndEGdwWFKQ`) |
| Tavily        | `TAVILY_API_KEY`                    | Legacy / no usado por defecto. Reemplazado por Moonshot Kimi K2. |

Si un proveedor está vacío, el service debería **degradar con gracia** (no crashear): devolver resultado vacío o throw `BadRequest` claro. Revisar `websiteAnalyzer.ts` línea ~370 como ejemplo.

## Qué archivos / carpetas tocas frecuentemente

- Rutas API: `apps/api/src/modules/<recurso>/routes.ts`
- Services API: `apps/api/src/modules/<recurso>/service.ts`
- Hooks cliente: `apps/web/src/features/<modulo>/api/*`
- Páginas: `apps/web/src/features/<modulo>/pages/*`
- Tipos compartidos: `packages/shared/src/`
- UI atómica: `packages/ui/src/`
- Schema DB: `packages/db/prisma/schema.prisma`

## Checklist antes de abrir PR

```bash
pnpm typecheck                    # OBLIGATORIO
pnpm --filter @radikal/api test   # OBLIGATORIO
pnpm lint                         # RECOMENDADO
```

Y verificar:
- [ ] Nada en `.env.example` tiene valores reales.
- [ ] Si tocaste `schema.prisma`, regeneraste con `pnpm db:generate`.
- [ ] Si añadiste un nuevo `AiJob.kind`, agregaste label en frontend y meta de fallo en backend.
- [ ] Si añadiste una var de entorno, la documentaste en `.env.example` y en `README.md`.

## Cosas que NO debes hacer sin preguntar

- `git push --force` a main.
- `git reset --hard` sobre trabajo no comiteado.
- Modificar `schema.prisma` en producción sin coordinar.
- Cambiar `SUPABASE_SERVICE_ROLE_KEY` en cualquier `.env.example` — es secreto.
- `pnpm install` con `--no-frozen-lockfile` si no entiendes qué deps cambias.

## Dudas comunes

**¿Dónde agrego una nueva "tool" al chat?**
`apps/api/src/modules/chats/tools.ts`. Define la tool spec (JSON schema para el LLM), implementa el handler en `executeTool()`, y si devuelve `data` estructurada, crea un card en `apps/web/src/features/chat/components/ToolResultCard.tsx`.

**¿Cómo testeo un flujo end-to-end?**
`pnpm --filter @radikal/api tsx --env-file=.env scripts/e2e-test.ts`. El script crea un usuario temporal vía Supabase Admin, corre escenarios reales contra el API, y borra el usuario al final. Agrega un nuevo `scenarioXxx()` para tu flujo.

**¿Por qué los tests unitarios mockean `@radikal/db` pero otros no?**
Unit tests de services puros → mock DB. Pruebas que tocan `supabaseAdmin` (auth, storage) requieren mockear también `lib/supabase.js`. Ver `tests/modules/users.test.ts` como ejemplo.

**¿Qué hago si un scraper externo (Apify/Firecrawl) cambia su schema de respuesta?**
Actualizar las interfaces `ApifyXxxItem` o `FirecrawlScrapeResponse` en el service correspondiente. Los tests con fixtures mockeados también hay que actualizarlos (`tests/services/instagram-scraper.test.ts` tiene ejemplo con `latestPosts`).
