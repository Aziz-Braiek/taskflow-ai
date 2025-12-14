/**
 * Productivity calculation utilities
 */

import { Task } from '../models/task.model';
import { UserStats } from '../models/user-stats.model';

/**
 * Calculate productivity score (0-100)
 */
export function calculateProductivityScore(
  tasks: Task[],
  userStats?: UserStats[]
): number {
  if (tasks.length === 0) return 50; // Neutral score for no tasks

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const completionRate = (completedTasks / tasks.length) * 100;

  // Calculate on-time completion rate
  const tasksWithDueDates = tasks.filter(t => t.dueDate && t.status === 'completed');
  const onTimeTasks = tasksWithDueDates.filter(t => {
    if (!t.completedAt || !t.dueDate) return false;
    return new Date(t.completedAt) <= new Date(t.dueDate);
  }).length;
  const onTimeRate = tasksWithDueDates.length > 0
    ? (onTimeTasks / tasksWithDueDates.length) * 100
    : 50;

  // Calculate efficiency (estimated vs actual time)
  const tasksWithTime = tasks.filter(t => t.estimatedTime > 0 && t.actualTime > 0);
  let efficiencyScore = 50;
  if (tasksWithTime.length > 0) {
    const avgEfficiency = tasksWithTime.reduce((sum, t) => {
      const efficiency = t.actualTime <= t.estimatedTime ? 100 : 50;
      return sum + efficiency;
    }, 0) / tasksWithTime.length;
    efficiencyScore = avgEfficiency;
  }

  // Weighted average
  const score = (
    completionRate * 0.4 +
    onTimeRate * 0.3 +
    efficiencyScore * 0.3
  );

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Calculate task velocity (tasks completed per day)
 */
export function calculateTaskVelocity(tasks: Task[], days: number = 7): number {
  const recentTasks = tasks.filter(t => {
    if (!t.completedAt) return false;
    const completedDate = new Date(t.completedAt);
    const daysAgo = (Date.now() - completedDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= days;
  });

  return days > 0 ? recentTasks.length / days : 0;
}

/**
 * Find peak productivity hours
 */
export function findPeakProductivityHours(
  tasks: Task[],
  userStats?: UserStats[]
): number[] {
  // Analyze completed tasks by hour
  const hourCounts: { [hour: number]: number } = {};

  tasks
    .filter(t => t.status === 'completed' && t.completedAt)
    .forEach(t => {
      const completedDate = new Date(t.completedAt!);
      const hour = completedDate.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

  // Get top 3 hours
  const sortedHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));

  return sortedHours.length > 0 ? sortedHours : [9, 10, 11]; // Default morning hours
}

/**
 * Calculate completion rate by category
 */
export function calculateCategoryCompletionRates(tasks: Task[]): {
  [category: string]: { completed: number; total: number; rate: number }
} {
  const categoryStats: { [category: string]: { completed: number; total: number } } = {};

  tasks.forEach(task => {
    if (!categoryStats[task.category]) {
      categoryStats[task.category] = { completed: 0, total: 0 };
    }
    categoryStats[task.category].total++;
    if (task.status === 'completed') {
      categoryStats[task.category].completed++;
    }
  });

  const result: { [category: string]: { completed: number; total: number; rate: number } } = {};

  for (const [category, stats] of Object.entries(categoryStats)) {
    result[category] = {
      ...stats,
      rate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
    };
  }

  return result;
}

/**
 * Detect burnout risk
 */
export function detectBurnoutRisk(tasks: Task[]): {
  riskLevel: 'low' | 'medium' | 'high';
  message: string;
  recommendations: string[];
} {
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const overdueTasks = pendingTasks.filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  });

  const highPriorityPending = pendingTasks.filter(t => t.priority === 'high').length;
  const totalPending = pendingTasks.length;

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  const recommendations: string[] = [];

  // High risk indicators
  if (overdueTasks.length > 5) {
    riskLevel = 'high';
    recommendations.push('You have many overdue tasks. Consider rescheduling or delegating some.');
  } else if (overdueTasks.length > 2) {
    riskLevel = 'medium';
    recommendations.push('You have some overdue tasks. Try to complete them or update their due dates.');
  }

  if (highPriorityPending > 10) {
    riskLevel = 'high';
    recommendations.push('Too many high-priority tasks. Consider breaking them down or prioritizing.');
  } else if (highPriorityPending > 5) {
    if (riskLevel === 'low') riskLevel = 'medium';
    recommendations.push('You have several high-priority tasks. Focus on the most urgent ones first.');
  }

  if (totalPending > 20) {
    riskLevel = riskLevel === 'low' ? 'medium' : 'high';
    recommendations.push('You have a lot of pending tasks. Consider organizing them better or delegating.');
  }

  let message = 'Your workload looks manageable.';
  if (riskLevel === 'high') {
    message = 'You may be at risk of burnout. Consider taking a break and reorganizing your tasks.';
  } else if (riskLevel === 'medium') {
    message = 'Your workload is getting heavy. Stay organized and take breaks.';
  }

  return { riskLevel, message, recommendations };
}

