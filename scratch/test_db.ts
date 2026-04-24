import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const projects = await prisma.project.findMany({ take: 1 });
    console.log('Successfully queried projects table');
    console.log('Project keys:', Object.keys(projects[0] || {}));
  } catch (error) {
    console.error('Error querying projects table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
