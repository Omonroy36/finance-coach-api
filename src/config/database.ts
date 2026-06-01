import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Soft-delete middleware: automatically filter out deleted records
prisma.$use(async (params, next) => {
  const softDeleteModels = [
    'User',
    'FinancialAccount',
    'IntegrationConnection',
    'Transaction',
    'TransactionCategory',
    'Budget',
    'Goal',
  ];

  if (params.model && softDeleteModels.includes(params.model)) {
    if (params.action === 'findUnique' || params.action === 'findFirst') {
      params.action = 'findFirst';
      params.args = params.args ?? {};
      params.args['where'] = {
        ...((params.args['where'] as object) ?? {}),
        deletedAt: null,
      };
    }

    if (params.action === 'findMany') {
      params.args = params.args ?? {};
      if (params.args['where']) {
        if ((params.args['where'] as Record<string, unknown>)['deletedAt'] === undefined) {
          (params.args['where'] as Record<string, unknown>)['deletedAt'] = null;
        }
      } else {
        params.args['where'] = { deletedAt: null };
      }
    }
  }

  return next(params);
});
