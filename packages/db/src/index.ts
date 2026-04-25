import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __radikalPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__radikalPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__radikalPrisma = prisma;
}

export { PrismaClient, Prisma } from '@prisma/client';
export * from './types.js';
export default prisma;
