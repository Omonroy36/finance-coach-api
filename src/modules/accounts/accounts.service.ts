import { AccountsRepository } from './accounts.repository';
import { NotFoundError } from '../../shared/errors/not-found.error';
import { ForbiddenError } from '../../shared/errors/forbidden.error';
import { encrypt } from '../../shared/utils/crypto.util';
import type { CreateAccountInput, UpdateAccountInput, CreateCategoryInput } from './accounts.schemas';
import { getQueue, QUEUE_NAMES } from '../../config/queue';
import type { AccountSyncJobData } from '../../config/queue';
import * as fintoc from '../../shared/utils/fintoc.client';

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

  // ─── Fintoc Integrations ───────────────────────────────────────────────────

  async listConnections(userId: string) {
    return this.repo.listConnections(userId);
  }

  /**
   * Step 1: Create a Fintoc Link Intent → returns widget_token for the frontend.
   */
  async createLinkIntent(options?: { country?: 'cl' | 'mx'; holderType?: 'individual' | 'business' }) {
    const linkIntent = await fintoc.createLinkIntent({
      country: options?.country,
      holder_type: options?.holderType,
    });
    return { widgetToken: linkIntent.widget_token, linkIntentId: linkIntent.id };
  }

  /**
   * Step 2: Exchange the temporary token from widget onSuccess → stores the link_token.
   */
  async exchangeFintocToken(userId: string, exchangeToken: string) {
    const link = await fintoc.exchangeToken(exchangeToken);

    const encryptedAccessToken = encrypt(link.link_token);

    const connection = await this.repo.createConnection({
      userId,
      providerType: 'fintoc',
      encryptedAccessToken,
      metadata: {
        linkId: link.id,
        institutionId: link.institution.id,
        institutionName: link.institution.name,
        country: link.institution.country,
        holderType: link.holder_type,
        lastSyncedAt: null,
      },
    });

    // Create FinancialAccount records for each bank account in the link
    for (const acc of link.accounts ?? []) {
      await this.repo.create(userId, {
        type: mapFintocAccountType(acc.type),
        providerName: link.institution.name,
        lastFour: acc.number.slice(-4),
        nickname: acc.name,
      });
    }

    // Trigger initial sync of movements
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

    // Revoke link at Fintoc
    try {
      const { decrypt } = await import('../../shared/utils/crypto.util');
      const linkToken = decrypt(connection.encryptedAccessToken);
      await fintoc.deleteLink(linkToken);
    } catch {
      // Best-effort — still revoke locally even if Fintoc call fails
    }

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

  // ─── Categories ─────────────────────────────────────────────────────────────

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

function mapFintocAccountType(fintocType: string): 'checking' | 'savings' | 'credit' | 'investment' {
  switch (fintocType) {
    case 'checking_account':
    case 'sight_account':
      return 'checking';
    case 'savings_account':
      return 'savings';
    case 'credit_card':
    case 'line_of_credit':
      return 'credit';
    default:
      return 'checking';
  }
}
