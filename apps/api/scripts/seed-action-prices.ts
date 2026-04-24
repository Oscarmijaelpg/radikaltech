/**
 * Seed de action_prices con precio default de 10 monedas para todas las
 * acciones definidas en ACTION_KEYS.
 *
 * USO:
 *   cd apps/api
 *   pnpm tsx --env-file=.env scripts/seed-action-prices.ts
 *
 * Idempotente: usa upsert, no borra ni modifica precios existentes más allá
 * de asegurarse que estén presentes con el precio default (si ya están
 * seteados distinto, los deja igual — solo crea los que faltan).
 *
 * Variables opcionales:
 *   DEFAULT_PRICE (default: 10)
 *   FORCE_RESET=true → actualiza todos los prices al valor default aunque
 *                      ya existan. Útil después de un wipe.
 */

import { PrismaClient } from '@radikal/db';

const prisma = new PrismaClient();

const DEFAULT_PRICE = Number(process.env.DEFAULT_PRICE) || 10;
const FORCE_RESET = process.env.FORCE_RESET === 'true';

// Lista de action keys que deben existir en action_prices.
// Mantener en sync con ACTION_KEYS en apps/api/src/lib/credits.ts.
const ACTIONS: Array<{ key: string; label: string; description?: string }> = [
  { key: 'chat.message', label: 'Mensaje al chat IA' },
  { key: 'embeddings.generate', label: 'Generar embeddings' },
  { key: 'caption.generate', label: 'Generar caption / copy' },
  { key: 'brand.synthesize', label: 'Síntesis de marca' },
  { key: 'recommendations.generate', label: 'Generar recomendaciones' },
  { key: 'auto_competitor.detect', label: 'Detector automático de competidores' },
  { key: 'market.detect', label: 'Detectar mercados del proyecto' },
  { key: 'image.analyze', label: 'Análisis visual de imagen' },
  { key: 'content.evaluate', label: 'Evaluar contenido' },
  { key: 'news.aggregate', label: 'Agregador de noticias' },
  { key: 'trends.detect', label: 'Detector de tendencias' },
  { key: 'competitor.analyze', label: 'Analizar competidor' },
  { key: 'website.analyze', label: 'Analizar sitio web' },
  { key: 'image.generate', label: 'Generar imagen con IA' },
  { key: 'image.edit', label: 'Editar imagen con IA' },
  { key: 'brand.analyze', label: 'Analizar marca (pipeline completo)' },
  { key: 'tiktok.scrape', label: 'Scrape TikTok' },
  { key: 'instagram.scrape', label: 'Scrape Instagram' },
];

async function main() {
  console.log(
    `Seeding ${ACTIONS.length} actions (price=${DEFAULT_PRICE}, force=${FORCE_RESET})...`,
  );
  for (const a of ACTIONS) {
    const result = await prisma.actionPrice.upsert({
      where: { key: a.key },
      update: FORCE_RESET
        ? { label: a.label, description: a.description ?? null, monedas: DEFAULT_PRICE, enabled: true }
        : {},
      create: {
        key: a.key,
        label: a.label,
        description: a.description ?? null,
        monedas: DEFAULT_PRICE,
        enabled: true,
      },
    });
    console.log(`  ✓ ${result.key.padEnd(28)} ${result.monedas} monedas (${result.enabled ? 'enabled' : 'disabled'})`);
  }
  const total = await prisma.actionPrice.count();
  console.log(`\nTotal action_prices en DB: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
