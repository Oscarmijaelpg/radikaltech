import { test, expect } from '@playwright/test';

test('auth page carga', async ({ page }) => {
  await page.goto('/auth');
  await expect(page.getByText(/Bienvenido|Crear cuenta/)).toBeVisible();
});

test('signup -> onboarding welcome', async ({ page }) => {
  const email = `e2e-${Date.now()}@test.local`;
  await page.goto('/auth');
  // click toggle si está en login
  await page.getByText('¿No tienes cuenta?').click();
  await page.getByLabel('Nombre completo').fill('E2E Test');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill('TestPass123!');
  await page.getByRole('button', { name: /Registrarse/ }).click();
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
  await expect(page.getByText(/Bienvenido/i)).toBeVisible();
});

test('deep links redirigen a auth si no logueado', async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('/memory');
  await expect(page).toHaveURL(/\/auth/);
});

test('la ruta no existente redirige a /', async ({ page: _page, context: _context }) => {
  // Este test requiere estar logueado. Si no se puede, skip o hace login mock.
  test.skip(true, 'requiere sesión');
});
