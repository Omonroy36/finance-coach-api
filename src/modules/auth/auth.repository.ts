import { prisma } from '../../config/database';
import type { User } from '@prisma/client';

export class AuthRepository {
  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { email, deletedAt: null } });
  }

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findFirst({ where: { id, deletedAt: null } });
  }

  async createUser(data: {
    email: string;
    passwordHash?: string;
    authProvider: string;
    firstName: string;
    lastName: string;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        authProvider: data.authProvider,
        profile: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
          },
        },
        userXp: {
          create: { totalXp: 0, currentLevel: 1 },
        },
      },
    });
  }

  async createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    deviceInfo?: string;
  }) {
    return prisma.refreshToken.create({ data });
  }

  async findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  async revokeRefreshToken(id: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserRefreshTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async listUserRefreshTokens(userId: string) {
    return prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteExpiredRefreshTokens() {
    return prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }

  async markEmailVerified(userId: string) {
    return prisma.user.update({ where: { id: userId }, data: { isVerified: true } });
  }

  async updatePassword(userId: string, passwordHash: string) {
    return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }
}
