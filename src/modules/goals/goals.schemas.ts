import { z } from 'zod';

export const createGoalSchema = z.object({
  type: z.enum(['savings', 'debt_payoff', 'investment', 'emergency_fund']),
  title: z.string().min(1).max(200),
  targetAmount: z.coerce.number().positive(),
  targetDate: z.string().datetime().optional(),
});

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  targetAmount: z.coerce.number().positive().optional(),
  targetDate: z.string().datetime().optional(),
  status: z.enum(['active', 'completed', 'paused', 'abandoned']).optional(),
});

export const addContributionSchema = z.object({
  amount: z.coerce.number().positive(),
  notes: z.string().max(500).optional(),
  contributedAt: z.string().datetime().optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type AddContributionInput = z.infer<typeof addContributionSchema>;
