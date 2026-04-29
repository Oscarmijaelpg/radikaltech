import { PrismaClient } from '@radikal/db';
const prisma = new PrismaClient();

async function main() {
  const assets = await prisma.contentAsset.findMany({
    where: { tags: { has: 'instagram' } }
  });
  
  let updated = 0;
  for (const a of assets) {
    const meta = a.metadata as any;
    if (!meta || meta.source !== 'instagram_scrape' || !meta.handle) continue;
    
    // Check if the handle belongs to a competitor in this project
    const isComp = await prisma.competitor.findFirst({
      where: {
        projectId: a.projectId,
        engagementStats: { path: ['handle'], equals: meta.handle }
      }
    });
    
    if (isComp && !a.tags.includes('competitor')) {
      await prisma.contentAsset.update({
        where: { id: a.id },
        data: { tags: { push: 'competitor' } }
      });
      updated++;
    }
  }
  console.log(`Updated ${updated} legacy competitor assets to add 'competitor' tag.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
