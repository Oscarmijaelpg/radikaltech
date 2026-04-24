import { PrismaClient } from '@radikal/db';

const prisma = new PrismaClient();

async function main() {
  const prices = await prisma.actionPrice.findMany();
  console.log('Action Prices:', JSON.stringify(prices, null, 2));
  
  const accounts = await prisma.creditAccount.findMany();
  console.log('Credit Accounts:', JSON.stringify(accounts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
