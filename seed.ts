import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. System Config
  const configs = [
    { key: 'signup_bonus', value: 1000 },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: { key: config.key, value: config.value },
    });
  }
  console.log('SystemConfig seeded.');

  // 2. Action Prices
  const prices = [
    { key: 'brand.analyze', label: 'Análisis Profundo de Marca', description: 'Escaneo completo de sitio web y redes sociales', monedas: 500 },
    { key: 'image.generate', label: 'Generación de Imagen', description: 'Creación de imagen con DALL-E 3 o Gemini', monedas: 100 },
    { key: 'image.edit', label: 'Edición de Imagen', description: 'Edición de imagen existente con IA', monedas: 50 },
    { key: 'caption.generate', label: 'Generación de Copy', description: 'Creación de textos persuasivos para redes', monedas: 25 },
    { key: 'auto_competitor.detect', label: 'Detección de Competencia', description: 'Búsqueda automática de competidores directos', monedas: 150 },
    { key: 'market.detect', label: 'Detección de Mercados', description: 'Análisis de presencia geográfica', monedas: 100 },
    { key: 'chat.message', label: 'Mensaje de Chat', description: 'Interacción con el asistente IA', monedas: 10 },
    { key: 'website.analyze', label: 'Análisis de Sitio Web', description: 'Extracción de datos de una URL', monedas: 50 },
    { key: 'competitor.analyze', label: 'Análisis de Competidor', description: 'Deep dive en un competidor específico', monedas: 150 },
    { key: 'instagram.scrape', label: 'Scraping de Instagram', description: 'Obtención de posts y métricas de IG', monedas: 75 },
    { key: 'tiktok.scrape', label: 'Scraping de TikTok', description: 'Obtención de posts y métricas de TikTok', monedas: 75 },
  ];

  for (const price of prices) {
    await prisma.actionPrice.upsert({
      where: { key: price.key },
      update: { label: price.label, description: price.description, monedas: price.monedas },
      create: { ...price, enabled: true },
    });
  }
  console.log('ActionPrices seeded.');

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
