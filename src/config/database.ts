import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env['NODE_ENV'] === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function withDeletedAtNull(args: unknown): Record<string, unknown> {
  const safeArgs = isRecord(args) ? args : {};
  const currentWhere = isRecord(safeArgs['where']) ? safeArgs['where'] : {};

  return {
    ...safeArgs,
    where: {
      ...currentWhere,
      deletedAt: null,
    },
  };
}

function ensureDeletedAtNullWhenMissing(args: unknown): Record<string, unknown> {
  const safeArgs = isRecord(args) ? args : {};
  const currentWhere = isRecord(safeArgs['where']) ? safeArgs['where'] : {};

  if (currentWhere['deletedAt'] !== undefined) {
    return {
      ...safeArgs,
      where: currentWhere,
    };
  }

  return {
    ...safeArgs,
    where: {
      ...currentWhere,
      deletedAt: null,
    },
  };
}

// Soft-delete middleware: automatically filter out deleted records
prisma.$use(async (params: Prisma.MiddlewareParams, next: Prisma.MiddlewareNext): Promise<unknown> => {
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
      params.args = withDeletedAtNull(params.args);
    }

    if (params.action === 'findMany') {
      params.args = ensureDeletedAtNullWhenMissing(params.args);
    }
  }

  const result = await next(params);
  return result as unknown;
});
