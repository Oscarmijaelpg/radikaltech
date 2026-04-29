import { PrismaClient } from '@radikal/db';
const prisma = new PrismaClient();
async function main() {
  // Check the aiDescription of the reference images used in the last job
  const ids = [
    '13295e58-70e2-4a6c-a3cb-15b49db2bbda', // logo
    '58a62ff2-e6cd-4453-800d-7678286026ae',
    'e7117452-ac00-4283-8310-71bef020b418',
  ];
  const assets = await prisma.contentAsset.findMany({
    where: { id: { in: ids } },
    select: { id: true, tags: true, aiDescription: true, marketingFeedback: true, assetUrl: true },
  });
  console.dir(assets, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
