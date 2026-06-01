import { RecommendationsRepository } from './recommendations.repository';
import { NotFoundError } from '../../shared/errors/not-found.error';

export class RecommendationsService {
  private repo = new RecommendationsRepository();

  async list(userId: string, status?: string, limit = 20, skip = 0) {
    return this.repo.list(userId, { status, limit, skip });
  }

  async getRecommendation(userId: string, recommendationId: string) {
    const rec = await this.repo.findById(recommendationId, userId);
    if (!rec) throw new NotFoundError('Recommendation', recommendationId);
    return rec;
  }

  async updateStatus(userId: string, recommendationId: string, status: string) {
    const rec = await this.repo.findById(recommendationId, userId);
    if (!rec) throw new NotFoundError('Recommendation', recommendationId);
    return this.repo.updateStatus(recommendationId, status);
  }
}
