import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Task } from '../models/task.model';
import { UserStats } from '../models/user-stats.model';
import { suggestOptimalTime } from '../utils/time-estimator.util';
import { findPeakProductivityHours } from '../utils/productivity-calculator.util';

export interface ScheduleSuggestion {
  taskId: number;
  suggestedTime: { hour: number; label: string };
  reason: string;
  confidence: number;
}

@Injectable({
  providedIn: 'root'
})
export class SchedulingService {
  /**
   * Suggest optimal time to work on a task
   */
  suggestOptimalTime(
    task: Task,
    allTasks: Task[],
    userStats?: UserStats[]
  ): ScheduleSuggestion {
    // Find user's peak productivity hours
    const peakHours = findPeakProductivityHours(allTasks, userStats);
    
    // Get suggestion based on energy level
    const timeSuggestion = suggestOptimalTime(task.energyLevel || 'medium', {
      peakHours
    });

    // Calculate confidence based on how well task energy matches peak hours
    const isPeakHour = peakHours.includes(timeSuggestion.hour);
    const confidence = isPeakHour ? 0.9 : 0.6;

    let reason = `Matches your ${task.energyLevel || 'medium'} energy requirement`;
    if (isPeakHour) {
      reason += ' and aligns with your peak productivity hours';
    }

    return {
      taskId: task.id,
      suggestedTime: timeSuggestion,
      reason,
      confidence
    };
  }

  /**
   * Suggest focus time slots for the day
   */
  suggestFocusTimes(
    tasks: Task[],
    userStats?: UserStats[]
  ): Array<{ start: string; end: string; tasks: Task[] }> {
    const pendingTasks = tasks.filter(t => t.status !== 'completed');
    const peakHours = findPeakProductivityHours(tasks, userStats);
    
    // Group tasks by energy level
    const highEnergyTasks = pendingTasks.filter(t => t.energyLevel === 'high');
    const mediumEnergyTasks = pendingTasks.filter(t => t.energyLevel === 'medium' || !t.energyLevel);
    const lowEnergyTasks = pendingTasks.filter(t => t.energyLevel === 'low');

    const focusSlots: Array<{ start: string; end: string; tasks: Task[] }> = [];

    // Morning slot (9-12) for high energy tasks
    if (highEnergyTasks.length > 0 && peakHours.some(h => h >= 9 && h <= 11)) {
      focusSlots.push({
        start: '09:00',
        end: '12:00',
        tasks: highEnergyTasks.slice(0, 3)
      });
    }

    // Afternoon slot (14-17) for medium energy tasks
    if (mediumEnergyTasks.length > 0 && peakHours.some(h => h >= 14 && h <= 16)) {
      focusSlots.push({
        start: '14:00',
        end: '17:00',
        tasks: mediumEnergyTasks.slice(0, 3)
      });
    }

    // Evening slot (18-20) for low energy tasks
    if (lowEnergyTasks.length > 0) {
      focusSlots.push({
        start: '18:00',
        end: '20:00',
        tasks: lowEnergyTasks.slice(0, 2)
      });
    }

    return focusSlots;
  }

  /**
   * Check if current time is optimal for a task
   */
  isOptimalTime(task: Task, currentHour: number, peakHours: number[]): boolean {
    const taskEnergy = task.energyLevel || 'medium';
    
    // High energy tasks work best in morning (9-12)
    if (taskEnergy === 'high' && currentHour >= 9 && currentHour <= 12) {
      return peakHours.includes(currentHour);
    }
    
    // Medium energy tasks work best in afternoon (14-17)
    if (taskEnergy === 'medium' && currentHour >= 14 && currentHour <= 17) {
      return peakHours.includes(currentHour);
    }
    
    // Low energy tasks work best in evening (18-20)
    if (taskEnergy === 'low' && currentHour >= 18 && currentHour <= 20) {
      return true;
    }

    return false;
  }

  /**
   * Get workload distribution for the day
   */
  getWorkloadDistribution(tasks: Task[]): {
    hour: number;
    taskCount: number;
    totalEstimatedTime: number;
  }[] {
    const distribution: { [hour: number]: { count: number; time: number } } = {};

    tasks
      .filter(t => t.status !== 'completed' && t.dueDate)
      .forEach(task => {
        const dueDate = new Date(task.dueDate);
        const hour = dueDate.getHours();
        
        if (!distribution[hour]) {
          distribution[hour] = { count: 0, time: 0 };
        }
        
        distribution[hour].count++;
        distribution[hour].time += task.estimatedTime || 0;
      });

    return Object.entries(distribution)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        taskCount: data.count,
        totalEstimatedTime: data.time
      }))
      .sort((a, b) => a.hour - b.hour);
  }
}

