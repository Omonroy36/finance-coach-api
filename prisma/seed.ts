import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SYSTEM_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍽️', color: '#FF6B6B' },
  { name: 'Transportation', icon: '🚗', color: '#4ECDC4' },
  { name: 'Shopping', icon: '🛍️', color: '#45B7D1' },
  { name: 'Entertainment', icon: '🎬', color: '#96CEB4' },
  { name: 'Healthcare', icon: '🏥', color: '#FFEAA7' },
  { name: 'Housing', icon: '🏠', color: '#DDA0DD' },
  { name: 'Utilities', icon: '⚡', color: '#98D8C8' },
  { name: 'Education', icon: '📚', color: '#F7DC6F' },
  { name: 'Travel', icon: '✈️', color: '#82E0AA' },
  { name: 'Personal Care', icon: '💅', color: '#F1948A' },
  { name: 'Insurance', icon: '🛡️', color: '#85C1E9' },
  { name: 'Investments', icon: '📈', color: '#A9DFBF' },
  { name: 'Subscriptions', icon: '📱', color: '#F9E79F' },
  { name: 'Other', icon: '📦', color: '#D5DBDB' },
];

const ACHIEVEMENTS = [
  { code: 'FIRST_TRANSACTION', title: 'First Steps', description: 'Added your first transaction', xpReward: 50 },
  { code: 'FIRST_BUDGET', title: 'Budget Setter', description: 'Created your first budget', xpReward: 100 },
  { code: 'FIRST_GOAL', title: 'Goal Getter', description: 'Set your first savings goal', xpReward: 100 },
  { code: 'STREAK_7', title: 'Week Warrior', description: 'Maintained a 7-day streak', xpReward: 150 },
  { code: 'STREAK_30', title: 'Monthly Champion', description: 'Maintained a 30-day streak', xpReward: 500 },
  { code: 'STREAK_90', title: 'Quarter Legend', description: 'Maintained a 90-day streak', xpReward: 2000 },
  { code: 'GOAL_COMPLETE', title: 'Goal Crusher', description: 'Completed a savings goal', xpReward: 500 },
  { code: 'BUDGET_ADHERENCE_MONTH', title: 'Budget Master', description: 'Stayed within all budgets for a full month', xpReward: 300 },
  { code: 'SCORE_700', title: 'Financial Elite', description: 'Reached a financial health score of 700+', xpReward: 1000 },
  { code: 'FIRST_INTEGRATION', title: 'Connected', description: 'Linked your first bank account', xpReward: 200 },
];

const CHALLENGES = [
  {
    title: 'No Dining Out Week',
    description: 'Avoid all restaurant and dining expenses for 7 days',
    criteriaJson: { metric: 'no_dining_out', threshold: 0, comparator: 'lte', period: 'week' },
    xpReward: 200,
    durationDays: 7,
  },
  {
    title: 'Coffee Savings Challenge',
    description: 'Spend less than $20 on coffee this week',
    criteriaJson: { metric: 'coffee_spend', threshold: 20, comparator: 'lte', period: 'week' },
    xpReward: 100,
    durationDays: 7,
  },
  {
    title: 'Zero Impulse Month',
    description: 'No unplanned shopping purchases over $50 for 30 days',
    criteriaJson: { metric: 'impulse_purchase', threshold: 50, comparator: 'lte', period: 'month' },
    xpReward: 500,
    durationDays: 30,
  },
];

const MERCHANT_MAPPINGS = [
  { rawMerchantName: 'STARBUCKS', normalizedMerchant: 'Starbucks' },
  { rawMerchantName: 'MCDONALDS', normalizedMerchant: "McDonald's" },
  { rawMerchantName: 'AMAZON.COM', normalizedMerchant: 'Amazon' },
  { rawMerchantName: 'UBER*TRIP', normalizedMerchant: 'Uber' },
  { rawMerchantName: 'NETFLIX.COM', normalizedMerchant: 'Netflix' },
  { rawMerchantName: 'SPOTIFY USA', normalizedMerchant: 'Spotify' },
  { rawMerchantName: 'APPLE.COM/BILL', normalizedMerchant: 'Apple' },
  { rawMerchantName: 'WHOLE FOODS MKT', normalizedMerchant: 'Whole Foods' },
  { rawMerchantName: 'TRADER JOE', normalizedMerchant: "Trader Joe's" },
  { rawMerchantName: 'COSTCO WHSE', normalizedMerchant: 'Costco' },
];

async function main() {
  console.log('Seeding database...');

  // System categories
  for (const cat of SYSTEM_CATEGORIES) {
    await prisma.transactionCategory.upsert({
      where: { id: cat.name }, // we use a stable id approach below
      create: { name: cat.name, icon: cat.icon, color: cat.color, isSystem: true },
      update: { icon: cat.icon, color: cat.color },
    }).catch(async () => {
      // Upsert by name if no unique constraint on name
      const existing = await prisma.transactionCategory.findFirst({ where: { name: cat.name, isSystem: true } });
      if (!existing) {
        await prisma.transactionCategory.create({ data: { name: cat.name, icon: cat.icon, color: cat.color, isSystem: true } });
      }
    });
  }

  // Achievements
  for (const ach of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: ach.code },
      create: ach,
      update: { title: ach.title, description: ach.description, xpReward: ach.xpReward },
    });
  }

  // Challenges
  for (const ch of CHALLENGES) {
    const existing = await prisma.challenge.findFirst({ where: { title: ch.title } });
    if (!existing) {
      await prisma.challenge.create({ data: ch });
    }
  }

  // Merchant mappings
  for (const mm of MERCHANT_MAPPINGS) {
    await prisma.merchantMapping.upsert({
      where: { rawMerchantName: mm.rawMerchantName },
      create: { rawMerchantName: mm.rawMerchantName, normalizedMerchant: mm.normalizedMerchant },
      update: { normalizedMerchant: mm.normalizedMerchant },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch(console.error)
  .finally(() => void prisma.$disconnect());
