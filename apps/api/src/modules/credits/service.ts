import { prisma, Prisma } from '@radikal/db';
import { BadRequest, NotFound, PaymentRequired } from '../../lib/errors.js';

const DEFAULT_SIGNUP_BONUS = 1000;

async function readSignupBonus(): Promise<number> {
  const cfg = await prisma.systemConfig.findUnique({ where: { key: 'signup_bonus' } });
  if (!cfg) return DEFAULT_SIGNUP_BONUS;
  const raw = cfg.value;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return Math.floor(raw);
  return DEFAULT_SIGNUP_BONUS;
}

// Lazy-create the credit account on first access. Idempotent under races via onConflict-style retry.
async function ensureAccount(userId: string): Promise<void> {
  const existing = await prisma.creditAccount.findUnique({ where: { userId } });
  if (existing) return;

  const bonus = await readSignupBonus();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.creditAccount.create({ data: { userId, balance: bonus } });
      if (bonus > 0) {
        await tx.creditTransaction.create({
          data: {
            userId,
            kind: 'grant',
            amount: bonus,
            balanceAfter: bonus,
            reason: 'Signup bonus',
          },
        });
      }
    });
  } catch (err) {
    // Race: otro request creó la cuenta primero. Swallow solo si efectivamente existe ahora.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const retry = await prisma.creditAccount.findUnique({ where: { userId } });
      if (retry) return;
    }
    throw err;
  }
}

async function getBalance(userId: string): Promise<number> {
  await ensureAccount(userId);
  const acc = await prisma.creditAccount.findUniqueOrThrow({ where: { userId } });
  return acc.balance;
}

export interface ChargeInput {
  userId: string;
  actionKey: string;
  metadata?: Record<string, unknown>;
}

export interface ChargeResult {
  balance: number;
  charged: number;
  transactionId: string;
}

async function charge({ userId, actionKey, metadata }: ChargeInput): Promise<ChargeResult> {
  const price = await prisma.actionPrice.findUnique({ where: { key: actionKey } });
  if (!price) throw new BadRequest(`Acción desconocida: ${actionKey}`);
  if (!price.enabled) throw new BadRequest(`Acción deshabilitada: ${actionKey}`);

  await ensureAccount(userId);
  const cost = price.monedas;

  // CAS atómico: el update no afecta filas si balance < cost.
  return prisma.$transaction(async (tx) => {
    if (cost > 0) {
      const res = await tx.creditAccount.updateMany({
        where: { userId, balance: { gte: cost } },
        data: { balance: { decrement: cost } },
      });
      if (res.count === 0) {
        const acc = await tx.creditAccount.findUniqueOrThrow({ where: { userId } });
        throw new PaymentRequired(
          `Saldo insuficiente. Necesitas ${cost} monedas; tienes ${acc.balance}.`,
          { required: cost, balance: acc.balance, actionKey },
        );
      }
    }
    const acc = await tx.creditAccount.findUniqueOrThrow({ where: { userId } });
    const transaction = await tx.creditTransaction.create({
      data: {
        userId,
        kind: 'spend',
        amount: -cost,
        balanceAfter: acc.balance,
        actionKey,
        metadata: (metadata as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
      },
    });
    return { balance: acc.balance, charged: cost, transactionId: transaction.id };
  });
}

export interface RefundInput {
  transactionId: string;
  reason?: string;
}

export interface RefundResult {
  balance: number;
  refunded: number;
  transactionId: string;
}

async function refund({ transactionId, reason }: RefundInput): Promise<RefundResult> {
  const original = await prisma.creditTransaction.findUnique({ where: { id: transactionId } });
  if (!original) throw new NotFound('Transacción no encontrada');
  if (original.kind !== 'spend' || original.amount >= 0) {
    throw new BadRequest('Solo se pueden reembolsar cargos válidos');
  }

  const alreadyRefunded = await prisma.creditTransaction.findFirst({
    where: {
      userId: original.userId,
      kind: 'refund',
      metadata: { path: ['refundOf'], equals: transactionId },
    },
  });
  if (alreadyRefunded) throw new BadRequest('Esta transacción ya fue reembolsada');

  const amount = -original.amount;

  return prisma.$transaction(async (tx) => {
    await tx.creditAccount.update({
      where: { userId: original.userId },
      data: { balance: { increment: amount } },
    });
    const acc = await tx.creditAccount.findUniqueOrThrow({ where: { userId: original.userId } });
    const refundTx = await tx.creditTransaction.create({
      data: {
        userId: original.userId,
        kind: 'refund',
        amount,
        balanceAfter: acc.balance,
        actionKey: original.actionKey,
        reason: reason ?? 'Acción fallida',
        metadata: { refundOf: transactionId },
      },
    });
    return { balance: acc.balance, refunded: amount, transactionId: refundTx.id };
  });
}

export interface GrantInput {
  userId: string;
  amount: number;
  reason: string;
  actorId?: string;
  kind?: 'grant' | 'adjustment';
}

// amount puede ser negativo (penalización/corrección). Nunca baja de 0.
async function grant({
  userId,
  amount,
  reason,
  actorId,
  kind = 'adjustment',
}: GrantInput): Promise<{ balance: number; applied: number }> {
  if (amount === 0) throw new BadRequest('El monto no puede ser 0');
  await ensureAccount(userId);

  return prisma.$transaction(async (tx) => {
    const before = await tx.creditAccount.findUniqueOrThrow({ where: { userId } });
    const targetBalance = Math.max(0, before.balance + amount);
    const applied = targetBalance - before.balance;
    if (applied === 0) {
      throw new BadRequest('El ajuste no cambia el saldo (ya está en 0)');
    }
    await tx.creditAccount.update({ where: { userId }, data: { balance: targetBalance } });
    await tx.creditTransaction.create({
      data: {
        userId,
        kind,
        amount: applied,
        balanceAfter: targetBalance,
        reason,
        actorId,
      },
    });
    return { balance: targetBalance, applied };
  });
}

async function listTransactions(
  userId: string,
  opts: { limit?: number } = {},
): Promise<Prisma.CreditTransactionGetPayload<object>[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  return prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export const creditService = {
  ensureAccount,
  getBalance,
  charge,
  refund,
  grant,
  listTransactions,
};
