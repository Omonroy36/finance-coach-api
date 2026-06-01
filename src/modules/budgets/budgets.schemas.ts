import { z } from 'zod';

export const createBudgetSchema = z.object({
  categoryId: z.string().uuid().optional(),
  amount: z.coerce.number().positive(),
  periodType: z.enum(['monthly', 'weekly', 'custom']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
});

export const updateBudgetSchema = createBudgetSchema.partial();

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
