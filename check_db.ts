import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.profile.findMany();
  console.log('Profiles:', JSON.stringify(profiles, null, 2));
  const projects = await prisma.project.findMany();
  console.log('Projects:', JSON.stringify(projects, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
