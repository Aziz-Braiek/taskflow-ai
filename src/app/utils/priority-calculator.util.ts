/**
 * Priority calculation utilities
 */

import { Task } from '../models/task.model';

export interface PriorityFactors {
  dueDateProximity: number; // 0-1, higher = closer deadline
  workload: number; // 0-1, higher = more tasks
  categoryImportance: number; // 0-1, based on user patterns
  difficulty: number; // 0-1, higher = harder
  dependencies: number; // 0-1, higher = more dependencies
}

/**
 * Calculate priority score for a task
 */
export function calculatePriorityScore(
  task: Partial<Task>,
  allTasks: Task[],
  userStats?: any
): number {
  const factors: PriorityFactors = {
    dueDateProximity: calculateDueDateProximity(task.dueDate),
    workload: calculateWorkload(allTasks),
    categoryImportance: calculateCategoryImportance(task.category, userStats),
    difficulty: calculateDifficultyScore(task.difficulty),
    dependencies: calculateDependencyScore(task.dependencies || [])
  };

  // Weighted priority calculation
  const weights = {
    dueDateProximity: 0.35,
    workload: 0.20,
    categoryImportance: 0.15,
    difficulty: 0.15,
    dependencies: 0.15
  };

  let score = 0;
  score += factors.dueDateProximity * weights.dueDateProximity;
  score += factors.workload * weights.workload;
  score += factors.categoryImportance * weights.categoryImportance;
  score += factors.difficulty * weights.difficulty;
  score += factors.dependencies * weights.dependencies;

  return Math.min(1, Math.max(0, score));
}

/**
 * Convert priority score to priority level
 */
export function scoreToPriority(score: number): 'low' | 'medium' | 'high' {
  if (score >= 0.7) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

/**
 * Calculate due date proximity factor
 */
function calculateDueDateProximity(dueDate?: string): number {
  if (!dueDate) return 0.5; // No due date = medium priority

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 1.0; // Overdue = highest priority
  if (diffDays === 0) return 0.95; // Today
  if (diffDays === 1) return 0.85; // Tomorrow
  if (diffDays <= 3) return 0.70; // This week
  if (diffDays <= 7) return 0.50; // Next week
  if (diffDays <= 14) return 0.30; // Next 2 weeks
  return 0.10; // Far future
}

/**
 * Calculate workload factor
 */
function calculateWorkload(tasks: Task[]): number {
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
  const totalTasks = tasks.length;

  if (totalTasks === 0) return 0.5;

  const workloadRatio = pendingTasks / totalTasks;
  return Math.min(1, workloadRatio * 2); // Scale to 0-1
}

/**
 * Calculate category importance based on user patterns
 */
function calculateCategoryImportance(category?: string, userStats?: any): number {
  if (!category || !userStats) return 0.5;

  // If user has stats, prioritize categories with higher completion rates
  if (userStats?.categoryStats?.[category]) {
    const stats = userStats.categoryStats[category];
    const completionRate = stats.total > 0 ? stats.completed / stats.total : 0;
    return completionRate; // Higher completion = more important
  }

  return 0.5; // Default
}

/**
 * Calculate difficulty score
 */
function calculateDifficultyScore(difficulty?: 'easy' | 'medium' | 'hard'): number {
  switch (difficulty) {
    case 'hard': return 0.8;
    case 'medium': return 0.5;
    case 'easy': return 0.2;
    default: return 0.5;
  }
}

/**
 * Calculate dependency score
 */
function calculateDependencyScore(dependencies: number[]): number {
  if (dependencies.length === 0) return 0.3; // No dependencies = lower priority
  if (dependencies.length === 1) return 0.6;
  if (dependencies.length >= 2) return 0.9; // Many dependencies = higher priority
  return 0.5;
}

/**
 * Auto-adjust priority based on approaching deadline
 */
export function autoAdjustPriority(
  task: Task,
  currentPriority: 'low' | 'medium' | 'high'
): 'low' | 'medium' | 'high' {
  const proximity = calculateDueDateProximity(task.dueDate);
  
  // If deadline is very close and priority is low/medium, boost it
  if (proximity >= 0.8 && currentPriority === 'low') {
    return 'medium';
  }
  if (proximity >= 0.9 && currentPriority === 'medium') {
    return 'high';
  }
  if (proximity >= 0.95 && currentPriority !== 'high') {
    return 'high';
  }

  return currentPriority;
}

