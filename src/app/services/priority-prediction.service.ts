import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Task } from '../models/task.model';
import { UserStats } from '../models/user-stats.model';
import {
  calculatePriorityScore,
  scoreToPriority,
  autoAdjustPriority
} from '../utils/priority-calculator.util';

@Injectable({
  providedIn: 'root'
})
export class PriorityPredictionService {
  /**
   * Predict optimal priority for a task
   */
  predictPriority(
    task: Partial<Task>,
    allTasks: Task[],
    userStats?: UserStats
  ): 'low' | 'medium' | 'high' {
    const score = calculatePriorityScore(task, allTasks, userStats);
    return scoreToPriority(score);
  }

  /**
   * Auto-adjust priorities for all tasks based on current state
   */
  autoAdjustPriorities(tasks: Task[]): Task[] {
    return tasks.map(task => {
      if (task.status === 'completed') return task; // Don't adjust completed tasks

      const newPriority = autoAdjustPriority(task, task.priority);
      
      if (newPriority !== task.priority) {
        return {
          ...task,
          priority: newPriority,
          updatedAt: new Date().toISOString()
        };
      }
      
      return task;
    });
  }

  /**
   * Get priority recommendations for a task
   */
  getPriorityRecommendation(
    task: Partial<Task>,
    allTasks: Task[]
  ): {
    recommended: 'low' | 'medium' | 'high';
    reasons: string[];
    score: number;
  } {
    const score = calculatePriorityScore(task, allTasks);
    const recommended = scoreToPriority(score);
    const reasons: string[] = [];

    // Generate reasons
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const today = new Date();
      const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil < 0) {
        reasons.push('Task is overdue');
      } else if (daysUntil === 0) {
        reasons.push('Due today');
      } else if (daysUntil <= 2) {
        reasons.push(`Due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`);
      }
    }

    if (task.difficulty === 'hard') {
      reasons.push('High difficulty task');
    }

    if (task.dependencies && task.dependencies.length > 0) {
      reasons.push(`Has ${task.dependencies.length} dependenc${task.dependencies.length > 1 ? 'ies' : 'y'}`);
    }

    const pendingCount = allTasks.filter(t => t.status !== 'completed').length;
    if (pendingCount > 15) {
      reasons.push('High workload - prioritize carefully');
    }

    if (reasons.length === 0) {
      reasons.push('Based on current workload and deadlines');
    }

    return {
      recommended,
      reasons,
      score
    };
  }
}

