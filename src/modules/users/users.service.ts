import { UsersRepository } from './users.repository';
import { NotFoundError } from '../../shared/errors/not-found.error';
import type { UpdateProfileInput } from './users.schemas';

export class UsersService {
  private repo = new UsersRepository();

  async getMe(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError('User', userId);
    return user;
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError('User', userId);
    return this.repo.updateProfile(userId, input);
  }

  async deleteAccount(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError('User', userId);
    await this.repo.softDelete(userId);
    // TODO: enqueue DataPurgeJob with 30-day delay
  }

  async getLatestScore(userId: string) {
    return this.repo.getLatestScore(userId);
  }

  async getScoreHistory(userId: string, limit: number, skip = 0) {
    return this.repo.getScoreHistory(userId, limit, skip);
  }
}
