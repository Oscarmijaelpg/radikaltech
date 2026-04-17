/* eslint-disable no-console */
/**
 * Prueba end-to-end del flujo de onboarding + creación de proyecto + análisis.
 * Crea un usuario temporal en Supabase, corre los flujos y limpia.
 *
 * Uso: pnpm tsx scripts/e2e-test.ts
 */
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const API_URL = process.env.API_URL ?? 'http://localhost:3002/api/v1';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error('Missing env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface TestContext {
  userId: string;
  email: string;
  token: string;
}

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};
function log(kind: 'ok' | 'fail' | 'info' | 'warn', msg: string) {
  const c =
    kind === 'ok'
      ? COLORS.green
      : kind === 'fail'
      ? COLORS.red
      : kind === 'warn'
      ? COLORS.yellow
      : COLORS.cyan;
  const tag =
    kind === 'ok' ? '✓' : kind === 'fail' ? '✗' : kind === 'warn' ? '!' : '·';
  console.log(`${c}${tag}${COLORS.reset} ${msg}`);
}

async function apiFetch<T = unknown>(
  path: string,
  ctx: TestContext,
  opts: RequestInit = {},
): Promise<T> {
  const headers = new Headers(opts.headers);
  headers.set('Authorization', `Bearer ${ctx.token}`);
  headers.set('Content-Type', 'application/json');
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `${opts.method ?? 'GET'} ${path} → ${res.status}: ${JSON.stringify(body)}`,
    );
  }
  return body as T;
}

async function createTestUser(): Promise<TestContext> {
  const email = `e2e-${Date.now()}-${randomUUID().slice(0, 6)}@test.radikal.local`;
  const password = `P@ss${randomUUID().slice(0, 10)}!`;
  log('info', `Creando usuario ${email}...`);
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) throw new Error(`createUser: ${createErr?.message}`);

  const { data: sess, error: sessErr } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  if (sessErr || !sess.session) throw new Error(`signIn: ${sessErr?.message}`);
  log('ok', `Usuario creado, userId=${created.user.id.slice(0, 8)}...`);
  return {
    userId: created.user.id,
    email,
    token: sess.session.access_token,
  };
}

async function cleanupUser(ctx: TestContext) {
  try {
    await admin.auth.admin.deleteUser(ctx.userId);
    log('info', `Usuario limpiado`);
  } catch (e) {
    log('warn', `No se pudo limpiar usuario: ${(e as Error).message}`);
  }
}

// =============================================================================

interface AiJob {
  id: string;
  kind: string;
  status: string;
  project_id: string | null;
  error?: string | null;
  created_at: string;
  finished_at: string | null;
}

async function waitForJob(
  ctx: TestContext,
  kind: string,
  projectId: string,
  timeoutMs = 90_000,
): Promise<AiJob | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const recent = await apiFetch<{ data: AiJob[] }>(
      `/jobs/recent?project_id=${projectId}&limit=20`,
      ctx,
    );
    const job = recent.data.find((j) => j.kind === kind);
    if (job && (job.status === 'succeeded' || job.status === 'failed')) return job;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

async function listNotifications(ctx: TestContext) {
  return apiFetch<{ data: { items: { id: string; kind: string; title: string; body: string | null }[]; unread_count: number } }>(
    `/notifications?limit=30`,
    ctx,
  );
}

// =============================================================================
// CASOS DE PRUEBA
// =============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  detail?: string;
}

async function scenarioOnboardingCompany(ctx: TestContext): Promise<TestResult[]> {
  const r: TestResult[] = [];
  log('info', 'Escenario: onboarding con empresa real (stripe.com)');

  try {
    await apiFetch('/onboarding/step', ctx, {
      method: 'POST',
      body: JSON.stringify({
        step: 'company',
        data: {
          company_name: 'Stripe Test',
          industry: 'fintech',
          website_source: 'url',
          website_url: 'https://stripe.com',
        },
      }),
    });
    r.push({ name: 'POST /onboarding/step company', passed: true });
  } catch (e) {
    r.push({ name: 'POST /onboarding/step company', passed: false, detail: (e as Error).message });
    return r;
  }

  // Obtener proyecto creado
  const projects = await apiFetch<{ data: Array<{ id: string; name: string }> }>(
    '/projects',
    ctx,
  );
  const projectId = projects.data[0]?.id;
  if (!projectId) {
    r.push({ name: 'proyecto default creado', passed: false });
    return r;
  }
  r.push({ name: 'proyecto default creado', passed: true, detail: projectId });

  // Esperar website_analyze
  log('info', 'Esperando website_analyze (hasta 90s)...');
  const job = await waitForJob(ctx, 'website_analyze', projectId);
  if (!job) {
    r.push({
      name: 'website_analyze completa en 90s',
      passed: false,
      detail: 'timeout',
    });
  } else if (job.status === 'succeeded') {
    r.push({
      name: 'website_analyze succeeded',
      passed: true,
      detail: `jobId=${job.id.slice(0, 8)}`,
    });
  } else {
    r.push({
      name: 'website_analyze succeeded',
      passed: false,
      detail: `status=${job.status} error=${job.error?.slice(0, 100)}`,
    });
    // Verificar que notificación de fallo se creó
    await new Promise((res) => setTimeout(res, 1500));
    const nots = await listNotifications(ctx);
    const has = nots.data.items.some((n) => n.kind === 'job_failed');
    r.push({ name: 'notificación job_failed creada tras fallo', passed: has });
  }

  return r;
}

async function scenarioCreateProjectWithWebsite(ctx: TestContext): Promise<TestResult[]> {
  const r: TestResult[] = [];
  log('info', 'Escenario: crear nuevo proyecto con website + instagram');

  let projectId = '';
  try {
    const res = await apiFetch<{ data: { id: string } }>('/projects', ctx, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Proyecto E2E Web+IG',
        website: 'https://vercel.com',
        instagram_url: 'https://www.instagram.com/vercel/',
      }),
    });
    projectId = res.data.id;
    r.push({ name: 'POST /projects con website+ig', passed: true, detail: projectId });
  } catch (e) {
    r.push({ name: 'POST /projects con website+ig', passed: false, detail: (e as Error).message });
    return r;
  }

  // Verificar que se disparan ambos jobs
  await new Promise((res) => setTimeout(res, 3000));
  const active = await apiFetch<{ data: AiJob[] }>(
    `/jobs/active?project_id=${projectId}`,
    ctx,
  );
  const kinds = active.data.map((j) => j.kind);
  r.push({
    name: 'jobs activos incluyen website_analyze',
    passed: kinds.includes('website_analyze'),
    detail: `kinds=[${kinds.join(',')}]`,
  });
  r.push({
    name: 'jobs activos incluyen instagram_scrape',
    passed: kinds.includes('instagram_scrape'),
  });

  return r;
}

async function scenarioWebsiteFailure(ctx: TestContext): Promise<TestResult[]> {
  const r: TestResult[] = [];
  log('info', 'Escenario: proyecto con website inválido debe fallar y notificar');

  let projectId = '';
  try {
    const res = await apiFetch<{ data: { id: string } }>('/projects', ctx, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Proyecto E2E Fail',
        website: 'https://this-domain-surely-does-not-exist-radikal-e2e-12345.invalid',
      }),
    });
    projectId = res.data.id;
    r.push({ name: 'POST /projects con URL inválida', passed: true });
  } catch (e) {
    r.push({ name: 'POST /projects con URL inválida', passed: false, detail: (e as Error).message });
    return r;
  }

  log('info', 'Esperando que website_analyze falle...');
  const job = await waitForJob(ctx, 'website_analyze', projectId, 60_000);
  if (!job) {
    r.push({ name: 'website_analyze resuelve en 60s', passed: false });
    return r;
  }
  r.push({
    name: 'website_analyze marca failed',
    passed: job.status === 'failed',
    detail: `status=${job.status} err=${job.error?.slice(0, 80)}`,
  });

  // Verificar notificación
  await new Promise((res) => setTimeout(res, 1500));
  const nots = await listNotifications(ctx);
  const failNots = nots.data.items.filter((n) => n.kind === 'job_failed');
  r.push({
    name: 'notificación job_failed creada',
    passed: failNots.length > 0,
    detail: failNots[0]?.title,
  });

  return r;
}

async function scenarioInstagramInvalidHandle(ctx: TestContext): Promise<TestResult[]> {
  const r: TestResult[] = [];
  log('info', 'Escenario: instagram con handle inexistente');

  let projectId = '';
  try {
    const res = await apiFetch<{ data: { id: string } }>('/projects', ctx, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Proyecto E2E IG-Fail',
        instagram_url: 'https://www.instagram.com/usuarioinexistente_radikal_test_12345/',
      }),
    });
    projectId = res.data.id;
    r.push({ name: 'POST /projects con IG inválido', passed: true });
  } catch (e) {
    r.push({ name: 'POST /projects con IG inválido', passed: false, detail: (e as Error).message });
    return r;
  }

  log('info', 'Esperando IG scrape (hasta 60s)...');
  const job = await waitForJob(ctx, 'instagram_scrape', projectId, 60_000);
  if (!job) {
    r.push({ name: 'instagram_scrape resuelve', passed: false });
    return r;
  }
  // Ojo: Apify puede devolver array vacío sin fallar. Aceptamos cualquier estado terminal.
  r.push({
    name: 'instagram_scrape termina (succeeded o failed)',
    passed: job.status === 'succeeded' || job.status === 'failed',
    detail: `status=${job.status}`,
  });

  return r;
}

async function scenarioJobsEndpoints(ctx: TestContext): Promise<TestResult[]> {
  const r: TestResult[] = [];
  log('info', 'Escenario: endpoints /jobs');
  try {
    const active = await apiFetch<{ data: AiJob[] }>('/jobs/active', ctx);
    r.push({
      name: 'GET /jobs/active (sin project_id) responde 200',
      passed: Array.isArray(active.data),
      detail: `n=${active.data.length}`,
    });
  } catch (e) {
    r.push({ name: 'GET /jobs/active', passed: false, detail: (e as Error).message });
  }
  try {
    const recent = await apiFetch<{ data: AiJob[] }>('/jobs/recent?limit=5', ctx);
    r.push({
      name: 'GET /jobs/recent responde 200',
      passed: Array.isArray(recent.data),
      detail: `n=${recent.data.length}`,
    });
  } catch (e) {
    r.push({ name: 'GET /jobs/recent', passed: false, detail: (e as Error).message });
  }
  return r;
}

async function scenarioNotificationsEndpoint(ctx: TestContext): Promise<TestResult[]> {
  const r: TestResult[] = [];
  log('info', 'Escenario: endpoint /notifications');
  try {
    const nots = await apiFetch<{ data: { items: unknown[]; unread_count: number } }>(
      '/notifications?unread_only=true&limit=20',
      ctx,
    );
    r.push({
      name: 'GET /notifications?unread_only=true',
      passed: Array.isArray(nots.data.items),
      detail: `unread=${nots.data.unread_count} items=${nots.data.items.length}`,
    });
  } catch (e) {
    r.push({ name: 'GET /notifications', passed: false, detail: (e as Error).message });
  }
  return r;
}

// =============================================================================

async function main() {
  console.log(`${COLORS.bold}${COLORS.cyan}Radikal E2E backend test${COLORS.reset}`);
  console.log(`API: ${API_URL}\n`);

  const ctx = await createTestUser();

  const allResults: TestResult[] = [];

  try {
    allResults.push(...(await scenarioJobsEndpoints(ctx)));
    allResults.push(...(await scenarioNotificationsEndpoint(ctx)));
    allResults.push(...(await scenarioOnboardingCompany(ctx)));
    allResults.push(...(await scenarioCreateProjectWithWebsite(ctx)));
    allResults.push(...(await scenarioWebsiteFailure(ctx)));
    allResults.push(...(await scenarioInstagramInvalidHandle(ctx)));
  } catch (e) {
    log('fail', `Aborted: ${(e as Error).message}`);
  } finally {
    await cleanupUser(ctx);
  }

  console.log(`\n${COLORS.bold}--- RESULTADOS ---${COLORS.reset}`);
  for (const r of allResults) {
    if (r.passed) log('ok', `${r.name}${r.detail ? ` ${COLORS.dim}(${r.detail})${COLORS.reset}` : ''}`);
    else log('fail', `${r.name}${r.detail ? ` ${COLORS.dim}(${r.detail})${COLORS.reset}` : ''}`);
  }

  const passed = allResults.filter((r) => r.passed).length;
  const failed = allResults.length - passed;
  console.log(
    `\n${COLORS.bold}${passed}/${allResults.length} passed${COLORS.reset}${failed ? ` — ${COLORS.red}${failed} failed${COLORS.reset}` : ''}`,
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  log('fail', `Fatal: ${(e as Error).message}`);
  process.exit(1);
});
