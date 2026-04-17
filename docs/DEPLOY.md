# Guía de Deploy

Esta guía cubre el despliegue de producción recomendado: **Supabase** (DB/Auth/Storage) + **Vercel** (web + api).

## 1. Supabase

### Crear el proyecto

1. Ir a [supabase.com/dashboard](https://supabase.com/dashboard) → "New project".
2. Elegir región cerca de tus usuarios.
3. Guardar **Project URL**, **anon public key** y **service role key** (Settings → API).
4. Guardar la **connection string** del pooler (Settings → Database → Connection string → "Transaction"). Será tu `DATABASE_URL`.
5. Guardar también la **connection string directa** (pestaña "Session"). Será tu `DIRECT_URL`.

### Aplicar el schema

En local, con `.env` apuntando al proyecto de producción:

```bash
pnpm --filter @radikal/db exec prisma db push
```

> ⚠️ `db push` aplica el schema sin migraciones. Para producción "grown up" considera usar `prisma migrate`.

### Crear el bucket de Storage

1. Dashboard → Storage → "Create bucket" → nombre `assets`, **público**.
2. Políticas:
   - **SELECT** (read) público: `true`.
   - **INSERT** (write) solo con service role: se hace desde el API con `SUPABASE_SERVICE_ROLE_KEY`, no necesitas política para clientes.

### Row Level Security (RLS)

Radikal usa el pattern de **"service role desde API"**: todas las queries de usuario pasan por el API que ya valida `userId`. Por eso no dependemos de RLS cliente-a-Postgres. Aun así, es buena práctica dejar RLS **habilitado** en todas las tablas sensibles (el API usa service role que hace bypass).

## 2. Vercel — Web (frontend)

1. "New Project" → importar el repo de GitHub.
2. **Root directory**: `apps/web`.
3. **Framework Preset**: Vite.
4. **Build command**: `cd ../.. && pnpm --filter @radikal/web build`.
5. **Output directory**: `apps/web/dist`.
6. **Install command**: `cd ../.. && pnpm install --frozen-lockfile`.
7. **Environment variables**:
   ```
   VITE_SUPABASE_URL=https://...
   VITE_SUPABASE_ANON_KEY=...
   VITE_API_URL=https://api.tudominio.com/api/v1
   ```
8. Deploy. Obtendrás una URL tipo `radikal-web.vercel.app`.

## 3. Vercel — API (backend)

> Alternativas: Railway, Fly.io, Render. Los pasos son similares.

1. "New Project" → mismo repo, otro proyecto.
2. **Root directory**: `apps/api`.
3. **Framework Preset**: Other.
4. **Build command**: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @radikal/db exec prisma generate && pnpm --filter @radikal/api build`.
5. **Output directory**: `apps/api/dist` (si builds a dist/; de lo contrario usa un serverless function).
6. **Environment variables**: todas las que salen en [`apps/api/.env.example`](../apps/api/.env.example).
7. **Asegura CORS**: el API aplica CORS desde `WEB_URL`. Pon tu dominio web allí (`WEB_URL=https://radikal-web.vercel.app`).

### Alternativa: Railway / Fly.io

Si prefieres un runtime Node persistente (mejor para los SSE del chat):

```bash
# Railway
railway login
railway link <tu-proyecto>
railway up --filter @radikal/api
```

Asegúrate de que el servicio exponga el puerto `PORT` (env) y tenga healthcheck en `/api/v1/health`.

## 4. CI/CD (GitHub Actions)

El workflow en `.github/workflows/ci.yml` ya corre en cada push/PR:

- `pnpm install --frozen-lockfile`
- `prisma generate`
- Typecheck de todos los packages
- Tests del API (Vitest)
- Build del Web

Para deploy automático tras merge a `main`:

- Vercel: activa "Auto-deploy on push to main" en Project Settings.
- Railway: `railway up` en un step adicional.

## 5. Dominios personalizados

1. En Vercel → Project → Domains → añade `app.tudominio.com` (web) y `api.tudominio.com` (api).
2. Ajusta `VITE_API_URL` en el proyecto web con el dominio del API.
3. Ajusta `WEB_URL` en el proyecto API con el dominio del web.

## 6. Primeros usuarios

- Supabase Auth soporta **email + password** listo para usar. Activa magic links / OAuth si quieres en Auth → Providers.
- La primera cuenta no es admin automáticamente. Para hacerla admin:
  ```sql
  -- en el SQL Editor de Supabase
  update auth.users
  set raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data, '{}'), '{role}', '"admin"')
  where email = 'tu@email.com';
  ```

## 7. Monitoreo recomendado

- **Sentry** para el web y el api (no está integrado aún — si quieres lo sumamos).
- **Logflare** o **Axiom** para logs de Pino en producción.
- **Supabase Dashboard** para Postgres, Auth y Storage.

## 8. Costos aproximados (referencia)

- **Supabase**: Free tier para arrancar. $25/mes a partir de Pro.
- **Vercel Hobby**: gratis para web + api pequeño. Pro ($20/mes) si pasas límites.
- **OpenAI / OpenRouter**: pay-as-you-go, ~$5-50/mes según uso.
- **Apify**: $49/mes plan Starter cubre scraping razonable.
- **Firecrawl**: $19/mes Hobby (250 páginas).
- **Tavily**: free tier 1000 queries.
- **Gemini**: cuota gratuita generosa.

## 9. Troubleshooting deploy

| Error                                              | Causa probable                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| Vercel build OOM                                   | Turbopack grande — sube plan o excluye `node_modules` con `.vercelignore` |
| `Prisma client not generated`                      | Falta `prisma generate` en build command                           |
| API 500 sin logs                                   | `SUPABASE_SERVICE_ROLE_KEY` mal o faltante                         |
| Web no conecta al API (CORS)                       | `WEB_URL` en el API no coincide con el dominio del frontend        |
| SSE se cae cada N segundos                         | Vercel corta conexiones largas — usa Railway/Fly para el API       |
