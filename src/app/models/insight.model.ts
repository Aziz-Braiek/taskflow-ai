export interface ProductivityInsight {
  id: number;
  userId: number;
  type: InsightType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'success' | 'error';
  actionable: boolean;
  actionText?: string;
  actionUrl?: string;
  data?: any; // Additional insight data
  createdAt: string;
  read: boolean;
  readAt: string | null;
}

export type InsightType =
  | 'productivity_trend'
  | 'peak_hours'
  | 'category_performance'
  | 'completion_rate'
  | 'workload_balance'
  | 'burnout_risk'
  | 'achievement_unlocked'
  | 'streak_milestone'
  | 'goal_progress'
  | 'time_management'
  | 'priority_distribution'
  | 'task_velocity';

