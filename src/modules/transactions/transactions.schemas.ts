import { z } from 'zod';

export const createTransactionSchema = z.object({
  financialAccountId: z.string().uuid().optional(),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3).default('USD'),
  merchantName: z.string().max(255).optional(),
  categoryId: z.string().uuid().optional(),
  transactionDate: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

export const updateTransactionSchema = z.object({
  categoryId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
  merchantName: z.string().max(255).optional(),
  isRecurring: z.boolean().optional(),
});

export const listTransactionsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  amountMin: z.coerce.number().optional(),
  amountMax: z.coerce.number().optional(),
  search: z.string().max(100).optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsSchema>;
