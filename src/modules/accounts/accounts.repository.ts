import { prisma } from '../../config/database';
import type { CreateAccountInput } from './accounts.schemas';

export class AccountsRepository {
  async listByUser(userId: string) {
    return prisma.financialAccount.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string, userId: string) {
    return prisma.financialAccount.findFirst({ where: { id, userId, deletedAt: null } });
  }

  async create(userId: string, data: CreateAccountInput) {
    return prisma.financialAccount.create({ data: { userId, ...data } });
  }

  async update(id: string, data: Partial<{ nickname: string; type: string }>) {
    return prisma.financialAccount.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return prisma.financialAccount.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // Integration Connections
  async listConnections(userId: string) {
    return prisma.integrationConnection.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findConnection(id: string, userId: string) {
    return prisma.integrationConnection.findFirst({ where: { id, userId, deletedAt: null } });
  }

  async createConnection(data: {
    userId: string;
    providerType: string;
    encryptedAccessToken: string;
    metadata: object;
  }) {
    return prisma.integrationConnection.create({ data });
  }

  async softDeleteConnection(id: string) {
    return prisma.integrationConnection.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'revoked' },
    });
  }

  // Categories
  async listCategories(userId: string) {
    return prisma.transactionCategory.findMany({
      where: { OR: [{ isSystem: true }, { userId }], deletedAt: null },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  async createCategory(userId: string, data: { name: string; icon?: string; color?: string; parentCategoryId?: string }) {
    return prisma.transactionCategory.create({ data: { userId, ...data } });
  }

  async updateCategory(id: string, data: Partial<{ name: string; icon: string; color: string }>) {
    return prisma.transactionCategory.update({ where: { id }, data });
  }

  async softDeleteCategory(id: string) {
    return prisma.transactionCategory.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
