import { z } from 'zod';

export const createAccountSchema = z.object({
  type: z.enum(['checking', 'savings', 'credit', 'investment']),
  providerName: z.string().max(100).optional(),
  lastFour: z.string().length(4).optional(),
  nickname: z.string().max(100).optional(),
});

export const updateAccountSchema = z.object({
  nickname: z.string().max(100).optional(),
  type: z.enum(['checking', 'savings', 'credit', 'investment']).optional(),
});

export const fintocCreateLinkIntentSchema = z.object({
  country: z.enum(['cl', 'mx']).default('cl'),
  holderType: z.enum(['individual', 'business']).default('individual'),
});

export const fintocExchangeSchema = z.object({
  exchangeToken: z.string().min(1),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  parentCategoryId: z.string().uuid().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type FintocCreateLinkIntentInput = z.infer<typeof fintocCreateLinkIntentSchema>;
export type FintocExchangeInput = z.infer<typeof fintocExchangeSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
