# Guía de Deploy

Esta guía cubre el despliegue de producción recomendado: **Supabase** (DB/Auth/Storage) + **Vercel** (web) + **EasyPanel** (API en tu VPS).

## Índice

1. [Supabase — base de datos, auth y storage](#1-supabase)
2. [Vercel — frontend](#2-vercel--frontend)
3. [EasyPanel — backend API](#3-easypanel--backend-api)
4. [Conectar front ↔ back](#4-conectar-front--back)
5. [Monitoreo y troubleshooting](#5-monitoreo-y-troubleshooting)

---

## 1. Supabase

### Crear el proyecto

1. Entra a [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Elige región cerca de tus usuarios (Sao Paulo para LATAM).
3. Guarda de **Settings → API**:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY` (también `VITE_SUPABASE_ANON_KEY`)
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (¡secreto!)
4. Guarda de **Settings → Database → Connection string**:
   - Pooler "Transaction" → `DATABASE_URL`
   - Directa "Session" → `DIRECT_URL`

### Aplicar el schema

Desde tu máquina local, con un `.env` apuntando al proyecto de producción:

```bash
pnpm --filter @radikal/db exec prisma db push
```

### Crear el bucket de Storage

1. Dashboard → **Storage** → **Create bucket**.
2. Nombre: `assets`. **Public bucket: ✓**.
3. No necesitas políticas especiales — el API usa `SUPABASE_SERVICE_ROLE_KEY` que hace bypass de RLS.

---

## 2. Vercel — Frontend

### Paso 1: Import

1. Entra a [vercel.com/new](https://vercel.com/new).
2. **Import Git Repository** → selecciona `Oscarmijaelpg/radikaltech`.
3. En **Configure Project**:
   - **Root Directory**: `apps/web` (click en "Edit" y pega).
   - **Framework Preset**: Vite (se detecta automático).
   - **Build Command**: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @radikal/web build`
   - **Output Directory**: `dist`
   - **Install Command**: `echo "Installed in build step"`

> Vercel detecta `pnpm-workspace.yaml` y maneja workspaces nativamente; la línea del build forza el install desde la raíz para que pnpm resuelva bien el monorepo.

### Paso 2: Environment Variables

Añade estas tres en **Environment Variables** → todas los 3 ambientes (Production/Preview/Development):

```
VITE_SUPABASE_URL        = https://your-ref.supabase.co
VITE_SUPABASE_ANON_KEY   = eyJhbGciOiJIUzI1NiIs...
VITE_API_URL             = https://api.tudominio.com/api/v1
```

> `VITE_API_URL` debes ponerla DESPUÉS del deploy del API (paso 3). Puedes dejarla con un valor placeholder primero y editarla luego.

### Paso 3: Deploy

Click **Deploy**. Primera build tarda ~3-5 min. Obtendrás un dominio tipo `radikaltech.vercel.app`.

### Paso 4: Dominio custom (opcional)

**Project Settings → Domains** → añade `app.tudominio.com`. Vercel te da los CNAME/A records para tu DNS.

---

## 3. EasyPanel — Backend API

### Prerrequisitos

- Tu VPS con EasyPanel instalado y accesible.
- Tu repo ya subido a GitHub con:
  - `apps/api/Dockerfile` ✓ (creado)
  - `.dockerignore` ✓ (creado)

### Paso 1: Crear el servicio

1. En EasyPanel → elige tu proyecto (o créalo con **+ Project**).
2. **+ Service** → **App**.
3. **Source**:
   - **GitHub**: conecta tu cuenta si no lo hiciste antes.
   - **Repository**: `Oscarmijaelpg/radikaltech`
   - **Branch**: `main`
4. **Build**:
   - **Build Method**: **Dockerfile**
   - **Dockerfile Path**: `apps/api/Dockerfile`
   - **Build Context**: `.` (raíz del repo — el Dockerfile necesita ver todo el workspace)
5. **Deploy**:
   - **Port**: `3001` (o el que pongas en `PORT`)

### Paso 2: Environment Variables

En la pestaña **Environment** pega todas estas (valores reales de tu Supabase + API keys):

```env
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Web URL — necesario para CORS (apunta al dominio de Vercel)
WEB_URL=https://app.tudominio.com

# Supabase
SUPABASE_URL=https://your-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Database
DATABASE_URL=postgresql://postgres:[PASS]@...pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres:[PASS]@db.your-ref.supabase.co:5432/postgres

# Proveedores de IA
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
GEMINI_API_KEY=...
FIRECRAWL_API_KEY=fc-...
APIFY_API_KEY=apify_api_...
TAVILY_API_KEY=tvly-...
```

### Paso 3: Dominio

En EasyPanel → **Domains** del servicio:

1. **+ Add Domain**
2. Pon `api.tudominio.com`
3. **Port**: `3001`
4. Activa **HTTPS** (Let's Encrypt automático con Traefik).

Configura en tu DNS: `api.tudominio.com` → `A` record hacia la IP de tu VPS.

### Paso 4: Health check

EasyPanel te muestra el estado. Verifica con:

```bash
curl https://api.tudominio.com/api/v1/health
# { "status": "ok", "db": "connected", "timestamp": "..." }
```

El Dockerfile ya incluye un `HEALTHCHECK` que EasyPanel lee automáticamente.

### Paso 5: Resources (opcional pero recomendado)

Para 100-200 usuarios:
- **Memory**: 512 MB (mínimo) — 1 GB (cómodo).
- **CPU**: 0.5 vCPU (mínimo) — 1 vCPU (cómodo).
- **Restart Policy**: `unless-stopped`.

Configúralo en **Service Settings → Resources**.

### Paso 6: Auto-deploy en git push

**Settings → Deploy** → **Enable auto-deploy**. Cada `git push origin main` disparará un rebuild.

---

## 4. Conectar front ↔ back

Una vez ambos estén arriba:

1. **Vercel** → Project → Settings → Environment Variables → edita:
   ```
   VITE_API_URL = https://api.tudominio.com/api/v1
   ```
2. **Vercel** → Deployments → **Redeploy** la última (necesita rebuild con la nueva env var).
3. **EasyPanel** → edita env:
   ```
   WEB_URL = https://app.tudominio.com
   ```
4. EasyPanel → **Restart** el servicio API.

Prueba el flujo completo: login → onboarding → creación de proyecto.

---

## 5. Monitoreo y troubleshooting

### Logs

- **Vercel**: Dashboard → Deployments → Function Logs (para el SSR) y Runtime Logs.
- **EasyPanel**: Service → **Logs** tab. Streaming en vivo + histórico.
- **Supabase**: Dashboard → Logs (API, Database, Auth).

### Problemas comunes

| Error                                                      | Causa                                                               | Solución                                                          |
| ---------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Frontend `Network Error`                                   | `VITE_API_URL` incorrecto o CORS bloquea                            | Verifica que `WEB_URL` del API coincida con el dominio del web    |
| API 500 al arrancar                                        | `SUPABASE_SERVICE_ROLE_KEY` faltante o mal                          | Revisa env en EasyPanel                                           |
| `Prisma client not generated`                              | Falló `prisma generate` en el build                                 | Revisa logs del build, verifica `DATABASE_URL`                    |
| SSE del chat se corta                                      | Reverse proxy cerrando conexión idle                                | EasyPanel usa Traefik que soporta SSE OK; si sigue, aumenta timeout en settings |
| Build en EasyPanel OOM                                     | VPS con poca RAM                                                    | Dale al menos 1 GB al contenedor build-time, o usa swap           |
| Docker build tarda mucho                                   | No hay cache layers válidos                                         | Normal la primera vez (~5-8 min). Cambios de código siguientes 1-2 min |
| `EACCES: permission denied` en storage                     | Bucket `assets` no creado o no público                              | Verifica paso 1.3                                                 |
| `oklch` colors roto en PDF export                          | Plugin personalizado del Toaster ya lo maneja                       | Asegúrate de actualizar el frontend tras commits                  |

### Escalado a 500+ usuarios

Cuando te acerques a ese volumen:

1. **Supabase Pro** ($25/mes) si estás en Free.
2. **Separar workers**: saca los scrapers a un servicio EasyPanel separado que consuma un queue. No urgente hasta 1000 DAU.
3. **Redis** para rate-limiting distribuido (hoy es in-memory).
4. **Sentry** para tracking de errores en producción.
5. **Connection pooling**: ya usamos el pooler de Supabase (`DATABASE_URL` con `pgbouncer`), perfecto.

---

## Alternativas al setup recomendado

Si prefieres TODO en Vercel, ver la versión anterior de esta guía en el historial de git — funciona pero el chat SSE con reportes largos se cortará a los 60s (límite de Vercel serverless).

Si prefieres Railway en lugar de EasyPanel, la config es idéntica: mismo Dockerfile, mismas env vars, solo cambia la UI del panel.
