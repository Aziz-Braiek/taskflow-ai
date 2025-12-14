export interface Achievement {
  id: number;
  userId: number;
  achievementType: AchievementType;
  achievementName: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
  progress: number; // 0-100
  target: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpReward: number;
}

export type AchievementType =
  | 'completion' // Task completion milestones
  | 'streak' // Streak-based achievements
  | 'category' // Category-specific achievements
  | 'time' // Time-based achievements
  | 'speed' // Fast completion achievements
  | 'consistency' // Consistency achievements
  | 'mastery'; // Mastery achievements

export interface AchievementDefinition {
  id: string;
  type: AchievementType;
  name: string;
  description: string;
  icon: string;
  target: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpReward: number;
  checkProgress: (userStats: any, tasks: any[]) => number;
}

