/**
 * Time estimation utilities
 */

import { Task } from '../models/task.model';

/**
 * Estimate task duration based on various factors
 */
export function estimateTaskTime(
  task: Partial<Task>,
  historicalData?: Array<{ difficulty: string; estimatedTime: number; actualTime: number }>
): number {
  // Base estimates by difficulty
  const baseEstimates = {
    easy: 30, // 30 minutes
    medium: 120, // 2 hours
    hard: 480 // 8 hours
  };

  let estimate = baseEstimates[task.difficulty || 'medium'];

  // Adjust based on category
  const categoryMultipliers: { [key: string]: number } = {
    'Work': 1.2,
    'School': 1.5,
    'Personal': 0.8,
    'Health': 0.7
  };
  if (task.category) {
    estimate *= categoryMultipliers[task.category] || 1.0;
  }

  // Adjust based on priority (high priority tasks might take longer due to complexity)
  if (task.priority === 'high') {
    estimate *= 1.3;
  } else if (task.priority === 'low') {
    estimate *= 0.7;
  }

  // Use historical data if available
  if (historicalData && historicalData.length > 0) {
    const similarTasks = historicalData.filter(
      t => t.difficulty === (task.difficulty || 'medium')
    );

    if (similarTasks.length > 0) {
      const avgActualTime = similarTasks.reduce((sum, t) => sum + t.actualTime, 0) / similarTasks.length;
      // Blend historical average with base estimate (70% historical, 30% base)
      estimate = avgActualTime * 0.7 + estimate * 0.3;
    }
  }

  // Round to nearest 15 minutes
  return Math.round(estimate / 15) * 15;
}

/**
 * Calculate time efficiency (estimated vs actual)
 */
export function calculateTimeEfficiency(estimatedTime: number, actualTime: number): number {
  if (estimatedTime === 0) return 1.0;
  if (actualTime === 0) return 0.5; // Not started

  const ratio = actualTime / estimatedTime;
  
  // Efficiency score: 1.0 = perfect, >1.0 = took longer, <1.0 = finished faster
  // Convert to 0-1 scale where 1.0 is perfect
  if (ratio <= 1.0) {
    return 1.0 - (1.0 - ratio) * 0.5; // Bonus for finishing early
  } else {
    return Math.max(0, 1.0 - (ratio - 1.0) * 0.3); // Penalty for going over
  }
}

/**
 * Suggest optimal time to work on task based on energy level
 */
export function suggestOptimalTime(
  energyLevel: 'low' | 'medium' | 'high',
  userPatterns?: { peakHours: number[] }
): { hour: number; label: string } {
  // Default peak hours by energy level
  const defaultPeakHours = {
    high: [9, 10, 11, 14, 15], // Morning and early afternoon
    medium: [8, 12, 13, 16, 17],
    low: [18, 19, 20] // Evening
  };

  const peakHours = userPatterns?.peakHours || defaultPeakHours[energyLevel];
  const suggestedHour = peakHours[Math.floor(peakHours.length / 2)];

  const hourLabels: { [key: number]: string } = {
    8: '8:00 AM',
    9: '9:00 AM',
    10: '10:00 AM',
    11: '11:00 AM',
    12: '12:00 PM',
    13: '1:00 PM',
    14: '2:00 PM',
    15: '3:00 PM',
    16: '4:00 PM',
    17: '5:00 PM',
    18: '6:00 PM',
    19: '7:00 PM',
    20: '8:00 PM'
  };

  return {
    hour: suggestedHour,
    label: hourLabels[suggestedHour] || `${suggestedHour}:00`
  };
}

