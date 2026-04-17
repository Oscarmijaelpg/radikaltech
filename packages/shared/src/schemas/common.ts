import { z } from 'zod';

export const IdSchema = z.string().uuid();

export const DateSchema = z.union([z.string().datetime({ offset: true }), z.date()]);

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof PaginationSchema>;
