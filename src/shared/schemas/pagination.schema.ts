import { z } from 'zod';

export const cursorQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const offsetQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type CursorQuery = z.infer<typeof cursorQuerySchema>;
export type OffsetQuery = z.infer<typeof offsetQuerySchema>;
