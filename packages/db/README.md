# @radikal/db

Prisma client singleton for the Radikal monorepo, targeting Supabase Postgres.

## Env vars

Set these in the consuming app (or root `.env`):

- `DATABASE_URL` — pooled connection (pgbouncer) used at runtime.
- `DIRECT_URL` — direct connection used by `prisma db push` / migrations.

## Scripts

```bash
pnpm --filter @radikal/db generate   # prisma generate
pnpm --filter @radikal/db push       # prisma db push (sync schema)
pnpm --filter @radikal/db studio     # prisma studio
```

## Usage

```ts
import { prisma } from '@radikal/db';

const profile = await prisma.profile.findUnique({ where: { id: userId } });
```

The schema mirrors the tables already provisioned in Supabase. The `Profile.id`
maps to `auth.users.id` via a Postgres trigger (not modeled in Prisma).
