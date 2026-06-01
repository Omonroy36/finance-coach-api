import { InsightsRepository } from './insights.repository';
import { NotFoundError } from '../../shared/errors/not-found.error';
import { ForbiddenError } from '../../shared/errors/forbidden.error';

export class InsightsService {
  private repo = new InsightsRepository();

  async list(userId: string, query: { type?: string; severity?: string; isRead?: string; limit: number; skip: number }) {
    return this.repo.list(userId, {
      type: query.type,
      severity: query.severity,
      isRead: query.isRead !== undefined ? query.isRead === 'true' : undefined,
      limit: query.limit,
      skip: query.skip,
    });
  }

  async getInsight(userId: string, insightId: string) {
    const insight = await this.repo.findById(insightId, userId);
    if (!insight) throw new NotFoundError('Insight', insightId);
    if (insight.userId !== userId) throw new ForbiddenError();
    return insight;
  }

  async markRead(userId: string, insightId: string) {
    const insight = await this.repo.findById(insightId, userId);
    if (!insight) throw new NotFoundError('Insight', insightId);
    return this.repo.markRead(insightId);
  }

  async markAllRead(userId: string) {
    await this.repo.markAllRead(userId);
  }

  async dismiss(userId: string, insightId: string) {
    const insight = await this.repo.findById(insightId, userId);
    if (!insight) throw new NotFoundError('Insight', insightId);
    if (insight.userId !== userId) throw new ForbiddenError();
    await this.repo.delete(insightId);
  }
}
