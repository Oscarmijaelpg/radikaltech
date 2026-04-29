# Contribuir a Radikal

¡Gracias por querer contribuir! Este documento resume las convenciones del proyecto.

## Requisitos

- Node.js 20+
- pnpm 10+
- Una cuenta de Supabase para desarrollo

## Flujo de trabajo

1. Crear una rama desde `dev`:
   ```
   git checkout -b feat/mi-feature    # features
   git checkout -b fix/mi-bug         # bugfixes
   git checkout -b chore/mi-tarea     # tareas sin cambios funcionales
   ```
2. Implementar el cambio.
3. Asegurar que `pnpm typecheck` y `pnpm test` pasen en tu máquina.
4. Commit siguiendo las convenciones de abajo.
5. Push y abrir PR contra `dev`. CI corre typecheck + tests + build.
6. Una vez aprobado, squash merge a `dev`. `main` se actualiza sólo en releases.

## Convenciones de commit

Usamos un estilo conciso de *conventional commits* en español:

```
<tipo>: <descripción corta en imperativo>

Cuerpo opcional con más detalle (máx. 72 chars por línea).
```

Tipos válidos:

| Tipo      | Cuándo usarlo                                                      |
| --------- | ------------------------------------------------------------------ |
| `feat`    | Una nueva funcionalidad visible al usuario                         |
| `fix`     | Un bugfix                                                          |
| `refactor`| Reestructuración sin cambio de comportamiento                       |
| `docs`    | Solo documentación                                                 |
| `test`    | Agregar/arreglar tests                                             |
| `chore`   | Build, deps, CI, tooling                                           |
| `perf`    | Mejora de rendimiento                                              |
| `style`   | Formato, espacios (sin cambios lógicos)                            |

Ejemplos:

```
feat: dispara websiteAnalyzer al crear proyecto nuevo
fix: markdown crudo en ReportReader por falta de typography plugin
chore: actualizar README con endpoints y troubleshooting
```

## Convenciones de código

- **TypeScript estricto**. Los `any` se evitan.
- **No añadir comentarios triviales**. Si el nombre del identificador lo explica, no escribas comentario. Reserva comentarios para el *por qué* (invariantes, workarounds).
- **No hardcodear secretos**. Nunca comitees un `.env`.
- **Respeta los límites de módulos**:
  - Código compartido front↔back → `packages/shared`.
  - Componentes reutilizables → `packages/ui`.
  - Tipos Prisma → `packages/db`.
- **Errores del API**: lanza clases de `lib/errors.ts` (`BadRequest`, `Forbidden`, `NotFound`…). El `errorHandler` las convierte al JSON correcto.
- **Jobs lentos (>3s)**: patrón fire-and-forget con `AiJob` + notificación en catch.

## Tests

- **Unit/integration**: Vitest. Los mocks de Prisma y Supabase viven inline en cada test con `vi.mock`.
- **E2E API**: `apps/api/scripts/e2e-test.ts` — crea usuario temporal, corre flujos reales contra Supabase, borra usuario al final.
- **E2E Web**: Playwright. Los tests viven en `apps/web/tests/e2e`.

Antes de abrir PR:

```bash
pnpm typecheck    # obligatorio
pnpm test         # obligatorio
pnpm lint         # recomendado
```

## Estructura de una feature típica

Cuando añadas un nuevo recurso al API:

```
apps/api/src/modules/<recurso>/
├─ routes.ts        Hono router + validación Zod
├─ service.ts       Lógica de dominio (una responsabilidad clara)
└─ (opcional) schemas.ts  Si los schemas son no triviales
```

Y su equivalente en web:

```
apps/web/src/features/<recurso>/
├─ api/             Hooks TanStack Query (useXxx, useCreateXxx…)
├─ components/      UI específica del feature
├─ pages/           Páginas React Router
└─ (opcional) hooks/ Custom hooks del feature
```

Tipos y schemas compartidos van en `packages/shared/src/`.

## Seguridad

- Nunca comitees claves, tokens, ni archivos `.env`.
- Si sospechas de un leak histórico, avisa en privado y rota las claves primero.
- Reporta vulnerabilidades siguiendo [SECURITY.md](./SECURITY.md) (si existe) o abriendo un issue privado.

## Dudas

Si algo no encaja con lo documentado, abre un issue antes de implementar.
