import { z } from 'zod';
import { DateSchema, IdSchema } from './common.js';

export const CreditTransactionKindSchema = z.enum([
  'grant',
  'spend',
  'refund',
  'adjustment',
]);
export type CreditTransactionKind = z.infer<typeof CreditTransactionKindSchema>;

export const CreditAccountSchema = z.object({
  userId: IdSchema,
  balance: z.number().int().nonnegative(),
  createdAt: DateSchema,
  updatedAt: DateSchema,
});
export type CreditAccount = z.infer<typeof CreditAccountSchema>;

export const CreditTransactionSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  kind: CreditTransactionKindSchema,
  amount: z.number().int(),
  balanceAfter: z.number().int().nonnegative(),
  actionKey: z.string().nullable(),
  reason: z.string().nullable(),
  actorId: IdSchema.nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: DateSchema,
});
export type CreditTransaction = z.infer<typeof CreditTransactionSchema>;

export const ActionPriceSchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  description: z.string().nullable(),
  monedas: z.number().int().nonnegative(),
  enabled: z.boolean(),
  createdAt: DateSchema,
  updatedAt: DateSchema,
});
export type ActionPrice = z.infer<typeof ActionPriceSchema>;

export const ActionPricePatchSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  monedas: z.number().int().nonnegative().optional(),
  enabled: z.boolean().optional(),
});
export type ActionPricePatch = z.infer<typeof ActionPricePatchSchema>;

export const SystemConfigEntrySchema = z.object({
  key: z.string(),
  value: z.unknown(),
  updatedAt: DateSchema,
});
export type SystemConfigEntry = z.infer<typeof SystemConfigEntrySchema>;

export const CreditAdjustmentSchema = z.object({
  amount: z.number().int().refine((n) => n !== 0, 'El monto no puede ser 0'),
  reason: z.string().min(1).max(500),
});
export type CreditAdjustment = z.infer<typeof CreditAdjustmentSchema>;
