import { GamificationRepository } from './gamification.repository';

const XP_LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 4000, 7000, 11000, 16000, 25000];

export function xpToLevel(totalXp: number): { level: number; nextThreshold: number | null; progress: number } {
  let level = 1;
  for (let i = XP_LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= (XP_LEVEL_THRESHOLDS[i] ?? 0)) {
      level = i + 1;
      break;
    }
  }
  const nextThreshold = XP_LEVEL_THRESHOLDS[level] ?? null;
  const currentThreshold = XP_LEVEL_THRESHOLDS[level - 1] ?? 0;
  const progress = nextThreshold
    ? Math.min(((totalXp - currentThreshold) / (nextThreshold - currentThreshold)) * 100, 100)
    : 100;
  return { level, nextThreshold, progress };
}

export class GamificationService {
  private repo = new GamificationRepository();

  async getXp(userId: string) {
    const xpRow = await this.repo.getUserXp(userId);
    const totalXp = xpRow?.totalXp ?? 0;
    const { level, nextThreshold, progress } = xpToLevel(totalXp);
    return { totalXp, currentLevel: level, nextLevelThreshold: nextThreshold, levelProgress: progress };
  }

  async getStreaks(userId: string) {
    return this.repo.getStreaks(userId);
  }

  async getStreak(userId: string, type: string) {
    return this.repo.getStreak(userId, type);
  }

  async getAchievements(userId: string) {
    const [all, unlocked] = await Promise.all([
      this.repo.getAllAchievements(),
      this.repo.getUserAchievements(userId),
    ]);
    const unlockedIds = new Set(unlocked.map((u) => u.achievementId));
    return all.map((a) => ({
      ...a,
      unlocked: unlockedIds.has(a.id),
      unlockedAt: unlocked.find((u) => u.achievementId === a.id)?.unlockedAt ?? null,
    }));
  }

  async getUnlockedAchievements(userId: string) {
    return this.repo.getUserAchievements(userId);
  }

  async getLeaderboard(limit = 10) {
    return this.repo.getLeaderboard(limit);
  }
}
