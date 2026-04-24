import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const assetId = '72425062-90d8-4514-90c0-a2441946e64f';
  const asset = await prisma.contentAsset.findUnique({
    where: { id: assetId },
  });

  console.log(JSON.stringify(asset, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
