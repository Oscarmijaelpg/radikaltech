import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/env.js', () => ({
  env: { NODE_ENV: 'test', WEB_URL: 'http://localhost:3000', LOG_LEVEL: 'silent' },
}));

interface MockAccount {
  userId: string;
  balance: number;
}

interface MockTransaction {
  id: string;
  userId: string;
  kind: string;
  amount: number;
  balanceAfter: number;
  actionKey?: string | null;
  reason?: string | null;
  actorId?: string | null;
  metadata?: unknown;
}

interface MockPrice {
  key: string;
  label: string;
  monedas: number;
  enabled: boolean;
}

// In-memory DB mock so tests exercise the real transactional logic shape.
const accounts = new Map<string, MockAccount>();
const transactions: MockTransaction[] = [];
const prices = new Map<string, MockPrice>();
const systemConfig = new Map<string, unknown>();
let txIdSeq = 0;

function mkPrisma() {
  const runTransaction = async <T>(fn: (tx: typeof mock) => Promise<T>): Promise<T> => fn(mock);

  const mock = {
    $transaction: runTransaction,
    creditAccount: {
      findUnique: vi.fn(async ({ where: { userId } }: { where: { userId: string } }) => {
        const acc = accounts.get(userId);
        return acc ? { ...acc, createdAt: new Date(), updatedAt: new Date() } : null;
      }),
      findUniqueOrThrow: vi.fn(async ({ where: { userId } }: { where: { userId: string } }) => {
        const acc = accounts.get(userId);
        if (!acc) throw new Error('Not found');
        return { ...acc, createdAt: new Date(), updatedAt: new Date() };
      }),
      create: vi.fn(async ({ data }: { data: MockAccount }) => {
        if (accounts.has(data.userId)) {
          const err = new Error('Unique constraint');
          (err as { code?: string }).code = 'P2002';
          throw err;
        }
        accounts.set(data.userId, { userId: data.userId, balance: data.balance });
        return { ...data, createdAt: new Date(), updatedAt: new Date() };
      }),
      update: vi.fn(
        async ({
          where: { userId },
          data,
        }: {
          where: { userId: string };
          data: { balance?: number | { increment?: number; decrement?: number } };
        }) => {
          const acc = accounts.get(userId);
          if (!acc) throw new Error('Not found');
          if (typeof data.balance === 'number') {
            acc.balance = data.balance;
          } else if (data.balance && typeof data.balance === 'object') {
            if (typeof data.balance.increment === 'number') acc.balance += data.balance.increment;
            if (typeof data.balance.decrement === 'number') acc.balance -= data.balance.decrement;
          }
          return { ...acc, createdAt: new Date(), updatedAt: new Date() };
        },
      ),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { userId: string; balance?: { gte?: number } };
          data: { balance?: { decrement?: number } };
        }) => {
          const acc = accounts.get(where.userId);
          if (!acc) return { count: 0 };
          const minBalance = where.balance?.gte ?? -Infinity;
          if (acc.balance < minBalance) return { count: 0 };
          if (data.balance?.decrement != null) acc.balance -= data.balance.decrement;
          return { count: 1 };
        },
      ),
    },
    creditTransaction: {
      create: vi.fn(async ({ data }: { data: Omit<MockTransaction, 'id'> }) => {
        const tx: MockTransaction = { id: `tx-${++txIdSeq}`, ...data };
        transactions.push(tx);
        return tx;
      }),
      findUnique: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        return transactions.find((t) => t.id === id) ?? null;
      }),
      findFirst: vi.fn(
        async ({
          where,
        }: {
          where: {
            userId: string;
            kind: string;
            metadata?: { path?: string[]; equals?: unknown };
          };
        }) => {
          return (
            transactions.find(
              (t) =>
                t.userId === where.userId &&
                t.kind === where.kind &&
                typeof t.metadata === 'object' &&
                t.metadata !== null &&
                (t.metadata as Record<string, unknown>).refundOf === where.metadata?.equals,
            ) ?? null
          );
        },
      ),
    },
    actionPrice: {
      findUnique: vi.fn(async ({ where: { key } }: { where: { key: string } }) => {
        return prices.get(key) ?? null;
      }),
    },
    systemConfig: {
      findUnique: vi.fn(async ({ where: { key } }: { where: { key: string } }) => {
        if (!systemConfig.has(key)) return null;
        return { key, value: systemConfig.get(key), updatedAt: new Date() };
      }),
    },
  };

  return mock;
}

const prismaMock = mkPrisma();

vi.mock('@radikal/db', () => ({
  prisma: prismaMock,
  Prisma: {
    JsonNull: null,
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      constructor(msg: string, opts: { code: string }) {
        super(msg);
        this.code = opts.code;
      }
    },
  },
}));

describe('creditService', () => {
  beforeEach(() => {
    accounts.clear();
    transactions.length = 0;
    prices.clear();
    systemConfig.clear();
    txIdSeq = 0;
    vi.clearAllMocks();
  });

  it('ensureAccount creates account with configured signup bonus + grant transaction', async () => {
    systemConfig.set('signup_bonus', 500);
    const { creditService } = await import('../../src/modules/credits/service.js');

    await creditService.ensureAccount('u1');

    expect(accounts.get('u1')?.balance).toBe(500);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      userId: 'u1',
      kind: 'grant',
      amount: 500,
      balanceAfter: 500,
      reason: 'Signup bonus',
    });
  });

  it('ensureAccount uses default 1000 when no config exists', async () => {
    const { creditService } = await import('../../src/modules/credits/service.js');
    await creditService.ensureAccount('u2');
    expect(accounts.get('u2')?.balance).toBe(1000);
  });

  it('ensureAccount is idempotent', async () => {
    systemConfig.set('signup_bonus', 100);
    const { creditService } = await import('../../src/modules/credits/service.js');
    await creditService.ensureAccount('u3');
    await creditService.ensureAccount('u3');
    expect(accounts.get('u3')?.balance).toBe(100);
    expect(transactions.filter((t) => t.kind === 'grant')).toHaveLength(1);
  });

  it('charge decrements balance and records spend transaction', async () => {
    systemConfig.set('signup_bonus', 100);
    prices.set('chat.message', { key: 'chat.message', label: 'Chat', monedas: 10, enabled: true });
    const { creditService } = await import('../../src/modules/credits/service.js');

    const result = await creditService.charge({ userId: 'u1', actionKey: 'chat.message' });

    expect(result.balance).toBe(90);
    expect(result.charged).toBe(10);
    expect(accounts.get('u1')?.balance).toBe(90);
    const spend = transactions.find((t) => t.kind === 'spend');
    expect(spend).toMatchObject({ amount: -10, balanceAfter: 90, actionKey: 'chat.message' });
  });

  it('charge throws PaymentRequired (402) with no balance change when insufficient', async () => {
    systemConfig.set('signup_bonus', 5);
    prices.set('image.generate', {
      key: 'image.generate',
      label: 'Imagen',
      monedas: 200,
      enabled: true,
    });
    const { creditService } = await import('../../src/modules/credits/service.js');
    const { PaymentRequired } = await import('../../src/lib/errors.js');

    await expect(
      creditService.charge({ userId: 'u1', actionKey: 'image.generate' }),
    ).rejects.toBeInstanceOf(PaymentRequired);

    expect(accounts.get('u1')?.balance).toBe(5);
    expect(transactions.find((t) => t.kind === 'spend')).toBeUndefined();
  });

  it('charge rejects unknown action with BadRequest', async () => {
    systemConfig.set('signup_bonus', 1000);
    const { creditService } = await import('../../src/modules/credits/service.js');
    const { BadRequest } = await import('../../src/lib/errors.js');

    await expect(
      creditService.charge({ userId: 'u1', actionKey: 'does.not.exist' }),
    ).rejects.toBeInstanceOf(BadRequest);
  });

  it('refund credits back the charged amount and marks refund metadata', async () => {
    systemConfig.set('signup_bonus', 100);
    prices.set('chat.message', { key: 'chat.message', label: 'Chat', monedas: 10, enabled: true });
    const { creditService } = await import('../../src/modules/credits/service.js');

    const spend = await creditService.charge({ userId: 'u1', actionKey: 'chat.message' });
    const refund = await creditService.refund({ transactionId: spend.transactionId });

    expect(refund.balance).toBe(100);
    expect(refund.refunded).toBe(10);
    const refundTx = transactions.find((t) => t.kind === 'refund');
    expect(refundTx?.metadata).toEqual({ refundOf: spend.transactionId });
  });

  it('refund fails if already refunded', async () => {
    systemConfig.set('signup_bonus', 100);
    prices.set('chat.message', { key: 'chat.message', label: 'Chat', monedas: 10, enabled: true });
    const { creditService } = await import('../../src/modules/credits/service.js');
    const { BadRequest } = await import('../../src/lib/errors.js');

    const spend = await creditService.charge({ userId: 'u1', actionKey: 'chat.message' });
    await creditService.refund({ transactionId: spend.transactionId });

    await expect(
      creditService.refund({ transactionId: spend.transactionId }),
    ).rejects.toBeInstanceOf(BadRequest);
  });

  it('grant with negative amount never drops balance below 0', async () => {
    systemConfig.set('signup_bonus', 50);
    const { creditService } = await import('../../src/modules/credits/service.js');

    const result = await creditService.grant({
      userId: 'u1',
      amount: -200,
      reason: 'test',
      actorId: 'admin1',
    });

    expect(result.balance).toBe(0);
    expect(result.applied).toBe(-50);
    expect(accounts.get('u1')?.balance).toBe(0);
  });

  it('grant with positive amount increases balance and logs transaction with actor', async () => {
    systemConfig.set('signup_bonus', 100);
    const { creditService } = await import('../../src/modules/credits/service.js');

    const result = await creditService.grant({
      userId: 'u1',
      amount: 500,
      reason: 'compensación',
      actorId: 'admin1',
    });

    expect(result.balance).toBe(600);
    expect(result.applied).toBe(500);
    const adj = transactions.find((t) => t.kind === 'adjustment');
    expect(adj).toMatchObject({ amount: 500, balanceAfter: 600, actorId: 'admin1' });
  });
});
