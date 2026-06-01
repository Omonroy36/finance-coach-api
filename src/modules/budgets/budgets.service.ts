import { BudgetsRepository } from './budgets.repository';
import { NotFoundError } from '../../shared/errors/not-found.error';
import type { CreateBudgetInput, UpdateBudgetInput } from './budgets.schemas';

export class BudgetsService {
  private repo = new BudgetsRepository();

  async listBudgets(userId: string) {
    return this.repo.listActive(userId);
  }

  async getBudget(userId: string, budgetId: string) {
    const budget = await this.repo.findById(budgetId, userId);
    if (!budget) throw new NotFoundError('Budget', budgetId);
    return budget;
  }

  async createBudget(userId: string, input: CreateBudgetInput) {
    return this.repo.create(userId, input);
  }

  async updateBudget(userId: string, budgetId: string, input: UpdateBudgetInput) {
    const budget = await this.repo.findById(budgetId, userId);
    if (!budget) throw new NotFoundError('Budget', budgetId);
    return this.repo.update(budgetId, {
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.periodType && { periodType: input.periodType }),
      ...(input.startDate && { startDate: new Date(input.startDate) }),
      ...(input.endDate && { endDate: new Date(input.endDate) }),
    });
  }

  async deleteBudget(userId: string, budgetId: string) {
    const budget = await this.repo.findById(budgetId, userId);
    if (!budget) throw new NotFoundError('Budget', budgetId);
    await this.repo.softDelete(budgetId);
  }

  async getSnapshots(userId: string, budgetId: string, limit: number, skip = 0) {
    const budget = await this.repo.findById(budgetId, userId);
    if (!budget) throw new NotFoundError('Budget', budgetId);
    return this.repo.getSnapshots(budgetId, limit, skip);
  }
}
