const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bata = await prisma.competitor.findFirst({
    where: { name: { contains: 'Bata' } }
  });
  console.log("Competitor Bata:", JSON.stringify(bata, null, 2));

  if (bata) {
    const posts = await prisma.socialPost.findMany({
      where: { competitorId: bata.id }
    });
    console.log(`Bata has ${posts.length} posts.`);

    const accounts = await prisma.socialAccount.findMany({
      where: { competitorId: bata.id }
    });
    console.log(`Bata has ${accounts.length} accounts.`);
  }

  const allComps = await prisma.competitor.findMany({ select: { name: true, id: true, socialLinks: true }});
  console.log("All competitors:", JSON.stringify(allComps, null, 2));

  const myPosts = await prisma.socialPost.findMany({
    where: { competitorId: null }
  });
  console.log(`My brand has ${myPosts.length} posts.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
