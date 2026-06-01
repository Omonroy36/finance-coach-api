import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import type { FastifyInstance } from 'fastify';
import { AuthRepository } from './auth.repository';
import { generateSecureToken, hashToken } from '../../shared/utils/crypto.util';
import { UnauthorizedError } from '../../shared/errors/unauthorized.error';
import { ConflictError } from '../../shared/errors/conflict.error';
import { config } from '../../config';
import type { RegisterInput, LoginInput } from './auth.schemas';

const scryptAsync = promisify(scrypt);

const SCRYPT_KEYLEN = 64;

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const key = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer;
  const storedBuf = Buffer.from(hash, 'hex');
  return timingSafeEqual(key, storedBuf);
}

export class AuthService {
  private repo = new AuthRepository();

  constructor(private readonly app: FastifyInstance) {}

  async register(input: RegisterInput) {
    const existing = await this.repo.findUserByEmail(input.email);
    if (existing) throw new ConflictError('Email already registered');

    const passwordHash = await hashPassword(input.password);
    const user = await this.repo.createUser({
      email: input.email,
      passwordHash,
      authProvider: 'local',
      firstName: input.firstName,
      lastName: input.lastName,
    });

    const tokens = await this.issueTokenPair(user.id, user.email);
    return { user: { id: user.id, email: user.email }, ...tokens };
  }

  async login(input: LoginInput) {
    const user = await this.repo.findUserByEmail(input.email);
    if (!user || !user.passwordHash) throw new UnauthorizedError('Invalid credentials');

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    const tokens = await this.issueTokenPair(user.id, user.email, input.deviceInfo);
    return { user: { id: user.id, email: user.email }, ...tokens };
  }

  async refresh(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const stored = await this.repo.findRefreshToken(tokenHash);

    if (!stored) throw new UnauthorizedError('Invalid refresh token');

    if (stored.revokedAt) {
      // Token reuse detected → revoke all sessions for this user
      await this.repo.revokeAllUserRefreshTokens(stored.userId);
      throw new UnauthorizedError('Token reuse detected. All sessions revoked.');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token expired');
    }

    const user = await this.repo.findUserById(stored.userId);
    if (!user) throw new UnauthorizedError('User not found');

    // Rotate: revoke old, issue new
    await this.repo.revokeRefreshToken(stored.id);
    const tokens = await this.issueTokenPair(user.id, user.email, stored.deviceInfo ?? undefined);
    return tokens;
  }

  async logout(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const stored = await this.repo.findRefreshToken(tokenHash);
    if (stored) await this.repo.revokeRefreshToken(stored.id);
  }

  async logoutAll(userId: string) {
    await this.repo.revokeAllUserRefreshTokens(userId);
  }

  async listSessions(userId: string) {
    return this.repo.listUserRefreshTokens(userId);
  }

  async revokeSession(userId: string, sessionId: string) {
    const sessions = await this.repo.listUserRefreshTokens(userId);
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) throw new UnauthorizedError('Session not found');
    await this.repo.revokeRefreshToken(sessionId);
  }

  private async issueTokenPair(userId: string, email: string, deviceInfo?: string) {
    const accessToken = this.app.jwt.sign({ sub: userId, email });

    const rawRefreshToken = generateSecureToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + config.JWT_REFRESH_TOKEN_TTL * 1000);

    await this.repo.createRefreshToken({ userId, tokenHash, expiresAt, deviceInfo });

    return { accessToken, refreshToken: rawRefreshToken, expiresIn: config.JWT_ACCESS_TOKEN_TTL };
  }
}
