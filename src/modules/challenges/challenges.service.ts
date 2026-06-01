import { ChallengesRepository } from './challenges.repository';
import { NotFoundError } from '../../shared/errors/not-found.error';
import { ConflictError } from '../../shared/errors/conflict.error';
import { ForbiddenError } from '../../shared/errors/forbidden.error';

export class ChallengesService {
  private repo = new ChallengesRepository();

  async listAvailable() {
    return this.repo.listAvailable();
  }

  async getChallenge(challengeId: string) {
    const challenge = await this.repo.findById(challengeId);
    if (!challenge) throw new NotFoundError('Challenge', challengeId);
    return challenge;
  }

  async getActive(userId: string) {
    return this.repo.listUserChallenges(userId, 'active');
  }

  async joinChallenge(userId: string, challengeId: string) {
    const challenge = await this.repo.findById(challengeId);
    if (!challenge) throw new NotFoundError('Challenge', challengeId);

    const active = await this.repo.listUserChallenges(userId, 'active');
    const alreadyJoined = active.find((uc) => uc.challengeId === challengeId);
    if (alreadyJoined) throw new ConflictError('Already enrolled in this challenge');

    return this.repo.join(userId, challengeId, challenge.durationDays);
  }

  async getHistory(userId: string, limit: number, skip: number) {
    return this.repo.getHistory(userId, limit, skip);
  }

  async abandonChallenge(userId: string, userChallengeId: string) {
    const uc = await this.repo.findUserChallenge(userChallengeId, userId);
    if (!uc) throw new NotFoundError('UserChallenge', userChallengeId);
    if (uc.userId !== userId) throw new ForbiddenError();
    return this.repo.abandon(userChallengeId);
  }
}
