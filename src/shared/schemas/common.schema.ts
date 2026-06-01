import { z } from 'zod';

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export const dateRangeSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const periodQuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
});
