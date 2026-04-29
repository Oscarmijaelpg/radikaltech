import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@radikal/db';

const env = process.env;
const supabase = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const prisma = new PrismaClient();

async function main() {
  const email = 'admin@radikaltech.com';
  console.log(`[check] buscando auth user ${email}...`);
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 10 });
  if (error) throw error;
  const u = data.users.find((x) => x.email === email);
  if (!u) {
    console.log('  ❌ no encontrado en auth.users');
  } else {
    console.log('  ✅ auth.users encontrado');
    console.log(`     id:              ${u.id}`);
    console.log(`     email_confirmed: ${u.email_confirmed_at ?? 'NO'}`);
    console.log(`     app_metadata:    ${JSON.stringify(u.app_metadata)}`);
    console.log(`     last_sign_in:    ${u.last_sign_in_at ?? 'never'}`);

    const p = await prisma.profile.findUnique({ where: { id: u.id } });
    if (!p) console.log('  ❌ NO hay profile en public.profiles');
    else {
      console.log('  ✅ profile en public.profiles');
      console.log(`     role: ${p.role}`);
      console.log(`     email: ${p.email}`);
    }

    console.log(`\n[check] test login con password 'Radikal225.'...`);
    const anon = createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });
    const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({
      email,
      password: 'Radikal225.',
    });
    if (signInErr) {
      console.log(`  ❌ login falló: ${signInErr.message}`);
    } else {
      console.log(`  ✅ login OK, session token length: ${signIn.session?.access_token.length}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
