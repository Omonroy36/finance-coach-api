import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  preferredCurrency: z.string().length(3).optional(),
  locale: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
