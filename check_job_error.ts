import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const latestJob = await prisma.aiJob.findFirst({
    where: { kind: 'image_generate' },
    orderBy: { createdAt: 'desc' },
  });

  console.log(JSON.stringify(latestJob, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
