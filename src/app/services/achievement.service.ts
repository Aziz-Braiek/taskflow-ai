import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, of } from 'rxjs';
import { Achievement, AchievementDefinition } from '../models/achievement.model';
import { Task } from '../models/task.model';
import { UserStats } from '../models/user-stats.model';

@Injectable({
  providedIn: 'root'
})
export class AchievementService {
  private apiUrl = 'http://localhost:3000/achievements';
  
  // Achievement definitions
  private achievementDefinitions: AchievementDefinition[] = [
    {
      id: 'first_task',
      type: 'completion',
      name: 'Getting Started',
      description: 'Complete your first task',
      icon: '🎯',
      target: 1,
      rarity: 'common',
      xpReward: 10,
      checkProgress: (userStats, tasks) => {
        return tasks.filter(t => t.status === 'completed').length;
      }
    },
    {
      id: 'task_master_10',
      type: 'completion',
      name: 'Task Master',
      description: 'Complete 10 tasks',
      icon: '⭐',
      target: 10,
      rarity: 'common',
      xpReward: 50,
      checkProgress: (userStats, tasks) => {
        return tasks.filter(t => t.status === 'completed').length;
      }
    },
    {
      id: 'task_master_50',
      type: 'completion',
      name: 'Task Master Pro',
      description: 'Complete 50 tasks',
      icon: '🏆',
      target: 50,
      rarity: 'rare',
      xpReward: 200,
      checkProgress: (userStats, tasks) => {
        return tasks.filter(t => t.status === 'completed').length;
      }
    },
    {
      id: 'early_bird',
      type: 'time',
      name: 'Early Bird',
      description: 'Complete a task before 9 AM',
      icon: '🌅',
      target: 1,
      rarity: 'common',
      xpReward: 25,
      checkProgress: (userStats, tasks) => {
        return tasks.filter(t => {
          if (!t.completedAt) return false;
          const hour = new Date(t.completedAt).getHours();
          return hour < 9;
        }).length;
      }
    },
    {
      id: 'streak_7',
      type: 'streak',
      name: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      icon: '🔥',
      target: 7,
      rarity: 'rare',
      xpReward: 100,
      checkProgress: (userStats, tasks) => {
        // This would come from userStats
        return userStats?.currentStreak || 0;
      }
    },
    {
      id: 'streak_30',
      type: 'streak',
      name: 'Consistency King',
      description: 'Maintain a 30-day streak',
      icon: '👑',
      target: 30,
      rarity: 'epic',
      xpReward: 500,
      checkProgress: (userStats, tasks) => {
        return userStats?.currentStreak || 0;
      }
    },
    {
      id: 'speed_demon',
      type: 'speed',
      name: 'Speed Demon',
      description: 'Complete a task in less than estimated time',
      icon: '⚡',
      target: 1,
      rarity: 'common',
      xpReward: 30,
      checkProgress: (userStats, tasks) => {
        return tasks.filter(t => {
          if (!t.estimatedTime || !t.actualTime) return false;
          return t.actualTime < t.estimatedTime;
        }).length;
      }
    },
    {
      id: 'work_warrior',
      type: 'category',
      name: 'Work Warrior',
      description: 'Complete 20 Work category tasks',
      icon: '💼',
      target: 20,
      rarity: 'rare',
      xpReward: 150,
      checkProgress: (userStats, tasks) => {
        return tasks.filter(t => t.category === 'Work' && t.status === 'completed').length;
      }
    },
    {
      id: 'school_star',
      type: 'category',
      name: 'School Star',
      description: 'Complete 20 School category tasks',
      icon: '📚',
      target: 20,
      rarity: 'rare',
      xpReward: 150,
      checkProgress: (userStats, tasks) => {
        return tasks.filter(t => t.category === 'School' && t.status === 'completed').length;
      }
    }
  ];

  constructor(private http: HttpClient) {}

  /**
   * Get all achievement definitions
   */
  getAchievementDefinitions(): AchievementDefinition[] {
    return this.achievementDefinitions;
  }

  /**
   * Check and unlock achievements
   */
  checkAchievements(
    userId: number,
    tasks: Task[],
    userStats?: UserStats
  ): Observable<Achievement[]> {
    const unlocked: Achievement[] = [];

    for (const definition of this.achievementDefinitions) {
      const progress = definition.checkProgress(userStats, tasks);
      const progressPercent = (progress / definition.target) * 100;

      // Check if achievement should be unlocked
      if (progress >= definition.target) {
        const achievement: Achievement = {
          id: 0, // Will be assigned by backend
          userId,
          achievementType: definition.type,
          achievementName: definition.name,
          description: definition.description,
          icon: definition.icon,
          unlockedAt: new Date().toISOString(),
          progress: 100,
          target: definition.target,
          rarity: definition.rarity,
          xpReward: definition.xpReward
        };
        unlocked.push(achievement);
      }
    }

    // Save unlocked achievements
    if (unlocked.length > 0) {
      unlocked.forEach(achievement => {
        this.saveAchievement(achievement).subscribe();
      });
    }

    return of(unlocked);
  }

  /**
   * Get user achievements
   */
  getUserAchievements(userId: number): Observable<Achievement[]> {
    return this.http.get<Achievement[]>(`${this.apiUrl}?userId=${userId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get achievement progress for user
   */
  getAchievementProgress(
    userId: number,
    tasks: Task[],
    userStats?: UserStats
  ): Achievement[] {
    const achievements: Achievement[] = [];

    for (const definition of this.achievementDefinitions) {
      const progress = definition.checkProgress(userStats, tasks);
      const progressPercent = Math.min(100, (progress / definition.target) * 100);

      achievements.push({
        id: 0,
        userId,
        achievementType: definition.type,
        achievementName: definition.name,
        description: definition.description,
        icon: definition.icon,
        unlockedAt: progress >= definition.target ? new Date().toISOString() : null,
        progress: progressPercent,
        target: definition.target,
        rarity: definition.rarity,
        xpReward: definition.xpReward
      });
    }

    return achievements;
  }

  /**
   * Save achievement
   */
  private saveAchievement(achievement: Achievement): Observable<Achievement> {
    return this.http.post<Achievement>(this.apiUrl, achievement).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Calculate total XP from achievements
   */
  calculateTotalXP(achievements: Achievement[]): number {
    return achievements
      .filter(a => a.unlockedAt !== null)
      .reduce((sum, a) => sum + a.xpReward, 0);
  }

  private handleError(error: any): Observable<never> {
    console.error('Achievement service error:', error);
    return throwError(() => new Error('Failed to process achievement request.'));
  }
}

