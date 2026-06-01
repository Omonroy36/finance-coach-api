import { GoalsRepository } from './goals.repository';
import { NotFoundError } from '../../shared/errors/not-found.error';
import { getQueue, QUEUE_NAMES } from '../../config/queue';
import type { GoalSnapshotJobData } from '../../config/queue';
import type { CreateGoalInput, UpdateGoalInput, AddContributionInput } from './goals.schemas';

export class GoalsService {
  private repo = new GoalsRepository();

  async listGoals(userId: string, status?: string) {
    return this.repo.list(userId, status);
  }

  async getGoal(userId: string, goalId: string) {
    const goal = await this.repo.findById(goalId, userId);
    if (!goal) throw new NotFoundError('Goal', goalId);
    return goal;
  }

  async createGoal(userId: string, input: CreateGoalInput) {
    return this.repo.create(userId, input);
  }

  async updateGoal(userId: string, goalId: string, input: UpdateGoalInput) {
    const goal = await this.repo.findById(goalId, userId);
    if (!goal) throw new NotFoundError('Goal', goalId);
    return this.repo.update(goalId, {
      ...(input.title && { title: input.title }),
      ...(input.targetAmount !== undefined && { targetAmount: input.targetAmount }),
      ...(input.targetDate && { targetDate: new Date(input.targetDate) }),
      ...(input.status && { status: input.status }),
    });
  }

  async deleteGoal(userId: string, goalId: string) {
    const goal = await this.repo.findById(goalId, userId);
    if (!goal) throw new NotFoundError('Goal', goalId);
    await this.repo.softDelete(goalId);
  }

  async addContribution(userId: string, goalId: string, input: AddContributionInput) {
    const goal = await this.repo.findById(goalId, userId);
    if (!goal) throw new NotFoundError('Goal', goalId);

    const contribution = await this.repo.addContribution(goalId, input.amount, input.notes, input.contributedAt);

    // Trigger snapshot recalculation
    const queue = getQueue(QUEUE_NAMES.GOAL_SNAPSHOT);
    await queue.add('goal-snapshot', { goalId, userId } satisfies GoalSnapshotJobData);

    return contribution;
  }

  async getContributions(userId: string, goalId: string, limit: number, skip = 0) {
    const goal = await this.repo.findById(goalId, userId);
    if (!goal) throw new NotFoundError('Goal', goalId);
    return this.repo.getContributions(goalId, limit, skip);
  }

  async getSnapshots(userId: string, goalId: string, limit: number, skip = 0) {
    const goal = await this.repo.findById(goalId, userId);
    if (!goal) throw new NotFoundError('Goal', goalId);
    return this.repo.getSnapshots(goalId, limit, skip);
  }
}
