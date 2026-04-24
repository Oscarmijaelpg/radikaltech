import { PrismaClient } from '../../node_modules/.pnpm/@prisma+client@6.3.1_prisma@6.3.1/node_modules/@prisma/client/index.js';

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
