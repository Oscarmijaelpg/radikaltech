/**
 * Wipe total de la BD + crea un usuario admin limpio.
 *
 * USO:
 *   pnpm --filter @radikal/api tsx --env-file=.env scripts/wipe-and-seed-admin.ts
 *
 * Variables de entorno opcionales:
 *   ADMIN_EMAIL    (default: admin@radikaltech.com)
 *   ADMIN_PASSWORD (default: Radikal225.)
 *
 * DESTRUCTIVO. Borra:
 *   - Todos los usuarios de auth.users
 *   - Todos los registros de todas las tablas public del schema
 *
 * Después crea el admin con rol 'admin' en profiles + app_metadata.
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@radikal/db';

const env = process.env;
const SUPABASE_URL = env.SUPABASE_URL;
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error('SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son obligatorias');
}

const ADMIN_EMAIL = env.ADMIN_EMAIL || 'admin@radikaltech.com';
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || 'Radikal225.';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const prisma = new PrismaClient();

async function deleteAllAuthUsers() {
  console.log('[auth] listando usuarios...');
  let page = 1;
  let total = 0;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data.users;
    if (users.length === 0) break;
    console.log(`[auth] page ${page} → ${users.length} usuarios`);
    for (const u of users) {
      const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
      if (delErr) {
        console.warn(`[auth] no pude borrar ${u.email ?? u.id}: ${delErr.message}`);
      } else {
        total++;
      }
    }
    if (users.length < 200) break;
    page++;
  }
  console.log(`[auth] ${total} usuarios borrados`);
}

async function truncateAllPublicTables() {
  const tables = [
    'notifications',
    'scheduled_reports',
    'recommendations',
    'token_usage',
    'scheduled_posts',
    'ai_jobs',
    'project_folders',
    'messages',
    'chats',
    'memories',
    'reports',
    'content_assets',
    'social_posts',
    'competitors',
    'objectives',
    'brand_history',
    'brand_profiles',
    'social_accounts',
    'projects',
    'credit_transactions',
    'credit_accounts',
    'admin_audit_log',
    'feature_flags',
    'action_prices',
    'system_config',
    'profiles',
  ];

  const sql = `TRUNCATE TABLE ${tables
    .map((t) => `public.${t}`)
    .join(', ')} RESTART IDENTITY CASCADE;`;

  console.log(`[db] truncando ${tables.length} tablas...`);
  await prisma.$executeRawUnsafe(sql);
  console.log('[db] OK');
}

async function createAdminUser() {
  console.log(`[seed] creando admin ${ADMIN_EMAIL}...`);
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    app_metadata: { role: 'admin' },
    user_metadata: { full_name: 'Admin Radikal' },
  });
  if (createErr || !created.user) {
    throw createErr ?? new Error('auth.admin.createUser no devolvió usuario');
  }
  const userId = created.user.id;
  console.log(`[seed] auth user creado: ${userId}`);

  await prisma.profile.upsert({
    where: { id: userId },
    update: {
      role: 'admin',
      email: ADMIN_EMAIL,
      fullName: 'Admin Radikal',
      onboardingCompleted: true,
    },
    create: {
      id: userId,
      email: ADMIN_EMAIL,
      fullName: 'Admin Radikal',
      role: 'admin',
      onboardingCompleted: true,
      onboardingStep: 'completed',
    },
  });
  console.log(`[seed] profile admin creado`);
  return userId;
}

async function main() {
  console.log('==============================================');
  console.log('WIPE TOTAL + SEED ADMIN');
  console.log('==============================================');
  console.log(`Target: ${SUPABASE_URL}`);
  console.log(`Admin:  ${ADMIN_EMAIL}`);
  console.log('');

  await deleteAllAuthUsers();
  await truncateAllPublicTables();
  const adminId = await createAdminUser();

  console.log('');
  console.log('==============================================');
  console.log('LISTO');
  console.log('==============================================');
  console.log(`  Admin ID:    ${adminId}`);
  console.log(`  Admin email: ${ADMIN_EMAIL}`);
  console.log(`  Admin pass:  ${ADMIN_PASSWORD}`);
  console.log('==============================================');
}

main()
  .catch((err) => {
    console.error('[FAIL]', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
