const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const comps = await prisma.competitor.findMany({
    include: { socialAccounts: true, socialPosts: true }
  });
  console.log(JSON.stringify(comps.map(c => ({
    name: c.name,
    accounts: c.socialAccounts.length,
    posts: c.socialPosts.length
  })), null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
