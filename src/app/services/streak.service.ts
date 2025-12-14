import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Task } from '../models/task.model';
import { UserStats } from '../models/user-stats.model';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  streakStartDate: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class StreakService {
  private apiUrl = 'http://localhost:3000/userStats';

  constructor(private http: HttpClient) {}

  /**
   * Calculate current streak from tasks
   */
  calculateStreak(tasks: Task[]): StreakData {
    const completedTasks = tasks
      .filter(t => t.status === 'completed' && t.completedAt)
      .map(t => ({
        date: new Date(t.completedAt!).toISOString().split('T')[0],
        timestamp: new Date(t.completedAt!).getTime()
      }))
      .sort((a, b) => b.timestamp - a.timestamp);

    if (completedTasks.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        streakStartDate: null
      };
    }

    // Get unique dates
    const uniqueDates = Array.from(new Set(completedTasks.map(t => t.date))).sort().reverse();

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Check if there's activity today or yesterday
    if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
      let checkDate = uniqueDates.includes(today) ? today : yesterday;
      let streakDate = new Date(checkDate);
      currentStreak = 1;

      // Count consecutive days backwards
      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(streakDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];

        if (uniqueDates.includes(prevDateStr)) {
          currentStreak++;
          streakDate = prevDate;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 1;
    let tempStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const currentDate = new Date(uniqueDates[i]);
      const prevDate = new Date(uniqueDates[i - 1]);
      const diffDays = Math.floor(
        (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    return {
      currentStreak,
      longestStreak,
      lastActivityDate: uniqueDates[0] || null,
      streakStartDate: currentStreak > 0 ? uniqueDates[uniqueDates.length - currentStreak] : null
    };
  }

  /**
   * Update streak in user stats
   */
  updateStreak(userId: number, date: string, streakData: StreakData): Observable<UserStats> {
    // Get or create user stats for the date
    return this.http.get<UserStats[]>(`${this.apiUrl}?userId=${userId}&date=${date}`).pipe(
      switchMap((stats: UserStats[]) => {
        if (stats && stats.length > 0) {
          // Update existing stats
          const existingStat = stats[0];
          return this.http.patch<UserStats>(`${this.apiUrl}/${existingStat.id}`, {
            currentStreak: streakData.currentStreak,
            longestStreak: streakData.longestStreak,
            updatedAt: new Date().toISOString()
          });
        } else {
          // Create new stats if doesn't exist
          const newStats: Omit<UserStats, 'id'> = {
            userId,
            date,
            tasksCompleted: 0,
            tasksCreated: 0,
            tasksDeleted: 0,
            totalTimeSpent: 0,
            averageTaskDuration: 0,
            productivityScore: 0,
            completionRate: 0,
            onTimeCompletionRate: 0,
            categoryStats: {},
            priorityStats: {
              high: { completed: 0, total: 0 },
              medium: { completed: 0, total: 0 },
              low: { completed: 0, total: 0 }
            },
            peakProductivityHour: 0,
            tasksByHour: {},
            currentStreak: streakData.currentStreak,
            longestStreak: streakData.longestStreak,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          return this.http.post<UserStats>(this.apiUrl, newStats);
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get streak milestones
   */
  getStreakMilestones(): number[] {
    return [3, 7, 14, 30, 60, 100, 365];
  }

  /**
   * Check if streak milestone reached
   */
  checkMilestone(streak: number): number | null {
    const milestones = this.getStreakMilestones();
    return milestones.find(m => streak >= m && streak < m + 1) || null;
  }

  /**
   * Get streak recovery days (grace period)
   */
  getRecoveryDays(): number {
    return 1; // 1 day grace period
  }

  /**
   * Check if streak can be recovered
   */
  canRecoverStreak(lastActivityDate: string | null): boolean {
    if (!lastActivityDate) return false;

    const lastDate = new Date(lastActivityDate);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    return diffDays <= this.getRecoveryDays() + 1;
  }

  private handleError(error: any): Observable<never> {
    console.error('Streak service error:', error);
    return throwError(() => new Error('Failed to process streak request.'));
  }
}

