import { AccountsRepository } from './accounts.repository';
import { NotFoundError } from '../../shared/errors/not-found.error';
import { ForbiddenError } from '../../shared/errors/forbidden.error';
import { encrypt } from '../../shared/utils/crypto.util';
import type { CreateAccountInput, UpdateAccountInput, CreateCategoryInput } from './accounts.schemas';
import { getQueue, QUEUE_NAMES } from '../../config/queue';
import type { AccountSyncJobData } from '../../config/queue';

export class AccountsService {
  private repo = new AccountsRepository();

  async listAccounts(userId: string) {
    return this.repo.listByUser(userId);
  }

  async getAccount(userId: string, accountId: string) {
    const account = await this.repo.findById(accountId, userId);
    if (!account) throw new NotFoundError('FinancialAccount', accountId);
    return account;
  }

  async createAccount(userId: string, input: CreateAccountInput) {
    return this.repo.create(userId, input);
  }

  async updateAccount(userId: string, accountId: string, input: UpdateAccountInput) {
    const account = await this.repo.findById(accountId, userId);
    if (!account) throw new NotFoundError('FinancialAccount', accountId);
    return this.repo.update(accountId, input);
  }

  async deleteAccount(userId: string, accountId: string) {
    const account = await this.repo.findById(accountId, userId);
    if (!account) throw new NotFoundError('FinancialAccount', accountId);
    await this.repo.softDelete(accountId);
  }

  // Integrations
  async listConnections(userId: string) {
    return this.repo.listConnections(userId);
  }

  async exchangePlaidToken(
    userId: string,
    publicToken: string,
    meta: { institutionId?: string; institutionName?: string },
  ) {
    // TODO: call Plaid /item/public_token/exchange → get access_token
    const mockAccessToken = `access-sandbox-${publicToken}`;
    const encryptedAccessToken = encrypt(mockAccessToken);

    const connection = await this.repo.createConnection({
      userId,
      providerType: 'plaid',
      encryptedAccessToken,
      metadata: {
        institutionId: meta.institutionId,
        institutionName: meta.institutionName,
        syncCursor: null,
      },
    });

    // Trigger initial sync
    const queue = getQueue(QUEUE_NAMES.ACCOUNT_SYNC);
    await queue.add('account-sync', {
      integrationConnectionId: connection.id,
      userId,
    } satisfies AccountSyncJobData);

    return connection;
  }

  async deleteConnection(userId: string, connectionId: string) {
    const connection = await this.repo.findConnection(connectionId, userId);
    if (!connection) throw new NotFoundError('IntegrationConnection', connectionId);
    await this.repo.softDeleteConnection(connectionId);
  }

  async triggerSync(userId: string, connectionId: string) {
    const connection = await this.repo.findConnection(connectionId, userId);
    if (!connection) throw new NotFoundError('IntegrationConnection', connectionId);

    const queue = getQueue(QUEUE_NAMES.ACCOUNT_SYNC);
    const job = await queue.add('account-sync', {
      integrationConnectionId: connectionId,
      userId,
    } satisfies AccountSyncJobData);

    return { jobId: job.id };
  }

  // Categories
  async listCategories(userId: string) {
    return this.repo.listCategories(userId);
  }

  async createCategory(userId: string, input: CreateCategoryInput) {
    return this.repo.createCategory(userId, input);
  }

  async updateCategory(userId: string, categoryId: string, input: Partial<CreateCategoryInput>) {
    return this.repo.updateCategory(categoryId, input);
  }

  async deleteCategory(userId: string, categoryId: string) {
    const cats = await this.repo.listCategories(userId);
    const cat = cats.find((c) => c.id === categoryId);
    if (!cat) throw new NotFoundError('TransactionCategory', categoryId);
    if (cat.isSystem) throw new ForbiddenError('Cannot delete system categories');
    await this.repo.softDeleteCategory(categoryId);
  }
}
