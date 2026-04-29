---
name: deploy-github
description: Sube los commits locales a origin siguiendo las prácticas del repo (sync sin merge-commits, gates de calidad, detección de secretos, sin force-push). Invoca cuando el user diga "push", "subir cambios", "deploy a GitHub", "actualiza el repo", "sube esto".
---

# Deploy to GitHub — Radikal

Pusher seguro para trabajo en equipo. El objetivo es **evitar pushes rotos, mezclas de archivos entre devs, y filtrar secretos**.

## Flujo general

Ejecuta las fases en orden. Si alguna falla, detente y reporta — nunca sigas adelante con errores.

### Fase 1 — Inspección (paralelo)

Lanza estos comandos en una sola tool-call de Bash paralelas:

- `git rev-parse --abbrev-ref HEAD` → branch actual
- `git status --porcelain` → cambios no commiteados
- `git fetch origin --quiet` → refresca refs remotos
- `git log --oneline origin/HEAD..HEAD` → commits que faltan por pushear
- `git log --oneline HEAD..origin/HEAD` → commits que me faltan (behind)

Interpreta los resultados antes de continuar.

### Fase 2 — Estado del working tree

Si hay cambios no commiteados:

- Lista al user qué archivos cambiaron.
- **Pregunta** qué hacer:
  - (a) commitearlos ahora (usa el skill de commit estándar del repo)
  - (b) stashearlos (push solo lo commiteado)
  - (c) cancelar
- **NO** commitees ni descartes silenciosamente.

### Fase 3 — Branch policy

- **`main`**: push directo permitido (es como funciona este repo hoy).
- **Cualquier otra branch** (feature, fix, etc.):
  - Es el flujo correcto para trabajo en paralelo.
  - Sube la branch con `git push -u origin <branch>` la primera vez.
  - Después sugiere crear PR con `gh pr create` (pide título y body al user).
- **Nunca** hagas force-push a `main` / `master` / `develop`. Ni con `--force-with-lease`. Si el push falla, rebase → retry, no fuerza.

### Fase 4 — Detección de secretos

Para cada archivo en commits unpushed (`git diff origin/HEAD..HEAD --name-only`):

- **BLOQUEA** si el path matchea:
  - `.env` (cualquiera excepto `.env.example`)
  - `**/*secrets*`, `**/*credentials*`
  - `*.pem`, `*.key`, `*.pfx`, `id_rsa*`
  - `**/service-account*.json`
- **Advierte** si el diff contiene patrones:
  - `sk-` seguido de 20+ chars (OpenAI)
  - `sk-ant-` (Anthropic)
  - `eyJ` al inicio con >40 chars (JWT firmado — excepto anon keys públicas documentadas)
  - `AKIA[0-9A-Z]{16}` (AWS)
  - `ghp_`, `ghs_`, `github_pat_` (GitHub)

Si encuentras secretos: STOP. Muestra ruta + línea. Pide al user confirmar si es un falso positivo antes de continuar.

### Fase 5 — Sync con remoto

Si `HEAD..origin/HEAD` (behind) tiene commits:

- Preserva historia lineal: `git pull --rebase origin <branch>`.
- Si hay conflictos: **STOP**. Muestra los archivos, pide al user resolverlos. No hagas `--abort` ni `--skip`.
- Si el rebase rewrite-oa commits que ya publicaste en otra rama, avisa y pregunta.

### Fase 6 — Gates de calidad

Lanza en paralelo:

- `pnpm --filter @radikal/web typecheck`
- `pnpm --filter @radikal/api typecheck`
- `pnpm --filter @radikal/api test`

Reglas:

- **Typecheck de ambos**: obligatorio.
- **Tests del api**: obligatorio (está escrito en CLAUDE.md checklist de PR).
- **Build del web**: NO por defecto (Vercel compila en el push). Solo si el user lo pide con "verifica build" o si tocaste `vite.config`, `tsconfig*`, o dependencias.

Si algún gate falla: detente, muestra el error, pregunta si quiere arreglarlo antes de seguir.

### Fase 7 — Resumen y confirmación

Antes de pushear, muestra:

```
Branch: <current> → origin/<current>
N commit(s) a subir:
  <sha> <subject>
  …
K archivo(s) tocado(s)
Typecheck: ✓   Tests api: 99/99 ✓
```

Pide confirmación explícita si cualquiera de:

- Son >5 commits
- Cualquier commit toca `CLAUDE.md`, `packages/db/prisma/schema.prisma`, `apps/api/Dockerfile`, `vercel.json`, `.github/`
- La branch es `main`

### Fase 8 — Push

`git push origin <branch>`.

Si falla con `non-fast-forward` o `fetch first`:

1. `git fetch origin`
2. `git pull --rebase origin <branch>`
3. Si rebase limpio, retry push **una vez**.
4. Si sigue fallando, STOP y reporta. Nunca `--force`.

### Fase 9 — Post-deploy

Al terminar, muestra:

- Confirmación: `<sha-old>..<sha-new> → origin/<branch>`
- URL de compare (si no es main): `https://github.com/Oscarmijaelpg/radikaltech/compare/main...<branch>`
- Recordatorio breve:
  - **Frontend**: Vercel auto-deploya desde `main` (proyecto `radikaltech-ai`, alias `radikaltech-ai-sepia.vercel.app`). Puede tardar ~1-2 min.
  - **Backend**: EasyPanel — según config, puede ser auto (webhook) o requiere trigger manual desde el dashboard.
  - Si tocaste `.env.example`, recuérdale documentar la var nueva y configurarla en Vercel / EasyPanel.

## Lo que este skill NUNCA debe hacer

- `git push --force` ni `--force-with-lease` sin autorización explícita del user
- `git reset --hard` sobre work sin commitear
- Commitear cambios sin revisarlos con el user
- Amend commits ya pusheados
- Skipear pre-commit hooks con `--no-verify`
- Adjuntar `.env` o similares al commit
- Cambiar `vercel.json`, `Dockerfile` o config de CI sin avisar explícitamente
- Hacer deploy si los tests del api fallaron

## Patrones de trabajo en equipo

- **Ramas por tarea**: siempre que sea posible, trabaja en `feat/<nombre-corto>` o `fix/<nombre-corto>` y abre PR. `main` se reserva para hotfixes rápidos.
- **Rebase antes de push en ramas propias**: mantiene historia lineal legible.
- **Un PR = un foco**: si un PR tiene 30+ archivos tocando muchas features, sugiere dividirlo.
- **Conflict detection temprana**: si detectas que alguien tocó los mismos archivos en `main` desde tu último pull, avísalo antes del rebase.

## Resolución rápida de errores comunes

- **"Updates were rejected"** → alguien pusheó primero. `git pull --rebase` y retry.
- **"refusing to merge unrelated histories"** → el user tiene HEAD en un estado raro. STOP, investiga, no fuerces.
- **Pre-commit hook fail** → muestra el output al user. No uses `--no-verify`. Si es un linter, sugiere arreglar y commitear de nuevo.
- **Secret detectado que es falso positivo** → pide al user confirmar explícitamente el path antes de seguir. Si es un `.env.example` con placeholders, está OK.
- **Tests fallando que no rompió este cambio** → no es tu culpa, pero no cubras el fallo. Reporta y espera instrucciones.
