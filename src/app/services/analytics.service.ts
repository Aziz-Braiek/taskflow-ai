import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Task } from '../models/task.model';
import { UserStats } from '../models/user-stats.model';
import { ProductivityInsight } from '../models/insight.model';
import {
  calculateProductivityScore,
  calculateTaskVelocity,
  findPeakProductivityHours,
  calculateCategoryCompletionRates,
  detectBurnoutRisk
} from '../utils/productivity-calculator.util';

export interface ProductivityMetrics {
  productivityScore: number;
  completionRate: number;
  onTimeCompletionRate: number;
  taskVelocity: number;
  averageTaskDuration: number;
  peakProductivityHours: number[];
  categoryRates: { [category: string]: { completed: number; total: number; rate: number } };
  burnoutRisk: {
    riskLevel: 'low' | 'medium' | 'high';
    message: string;
    recommendations: string[];
  };
}

export interface TrendData {
  date: string;
  productivityScore: number;
  tasksCompleted: number;
  tasksCreated: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private apiUrl = 'http://localhost:3000';
  private statsUrl = `${this.apiUrl}/userStats`;
  private insightsUrl = `${this.apiUrl}/insights`;

  constructor(private http: HttpClient) {}

  /**
   * Calculate comprehensive productivity metrics
   */
  calculateMetrics(tasks: Task[], userId: number, userStats?: UserStats[]): ProductivityMetrics {
    const productivityScore = calculateProductivityScore(tasks, userStats);
    const taskVelocity = calculateTaskVelocity(tasks, 7);
    const peakHours = findPeakProductivityHours(tasks, userStats);
    const categoryRates = calculateCategoryCompletionRates(tasks);
    const burnoutRisk = detectBurnoutRisk(tasks);

    // Calculate completion rates
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

    // Calculate on-time completion rate
    const tasksWithDueDates = tasks.filter(t => t.dueDate && t.status === 'completed');
    const onTimeTasks = tasksWithDueDates.filter(t => {
      if (!t.completedAt || !t.dueDate) return false;
      return new Date(t.completedAt) <= new Date(t.dueDate);
    }).length;
    const onTimeCompletionRate = tasksWithDueDates.length > 0
      ? (onTimeTasks / tasksWithDueDates.length) * 100
      : 0;

    // Calculate average task duration
    const tasksWithTime = tasks.filter(t => t.actualTime > 0);
    const averageTaskDuration = tasksWithTime.length > 0
      ? tasksWithTime.reduce((sum, t) => sum + t.actualTime, 0) / tasksWithTime.length
      : 0;

    return {
      productivityScore,
      completionRate,
      onTimeCompletionRate,
      taskVelocity,
      averageTaskDuration,
      peakProductivityHours: peakHours,
      categoryRates,
      burnoutRisk
    };
  }

  /**
   * Generate productivity trends
   */
  generateTrends(tasks: Task[], days: number = 30): TrendData[] {
    const trends: TrendData[] = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayTasks = tasks.filter(t => {
        const taskDate = t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : null;
        return taskDate === dateStr;
      });

      const completedOnDay = tasks.filter(t => {
        if (!t.completedAt) return false;
        const completedDate = new Date(t.completedAt).toISOString().split('T')[0];
        return completedDate === dateStr;
      });

      const dayMetrics = this.calculateMetrics(dayTasks, 1);
      
      trends.push({
        date: dateStr,
        productivityScore: dayMetrics.productivityScore,
        tasksCompleted: completedOnDay.length,
        tasksCreated: dayTasks.length
      });
    }

    return trends;
  }

  /**
   * Get or create user stats for a date
   */
  getUserStats(userId: number, date: string): Observable<UserStats | null> {
    return this.http.get<UserStats[]>(`${this.statsUrl}?userId=${userId}&date=${date}`).pipe(
      switchMap((stats: UserStats[]) => of(stats && stats.length > 0 ? stats[0] : null)),
      catchError(this.handleError)
    );
  }

  /**
   * Save user stats
   */
  saveUserStats(stats: Omit<UserStats, 'id'>): Observable<UserStats> {
    return this.http.post<UserStats>(this.statsUrl, {
      ...stats,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update user stats
   */
  updateUserStats(id: number, stats: Partial<UserStats>): Observable<UserStats> {
    return this.http.patch<UserStats>(`${this.statsUrl}/${id}`, {
      ...stats,
      updatedAt: new Date().toISOString()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Generate insights based on current data
   */
  generateInsights(tasks: Task[], metrics: ProductivityMetrics, userId: number): ProductivityInsight[] {
    const insights: ProductivityInsight[] = [];
    const now = new Date().toISOString();

    // Productivity trend insight
    if (metrics.productivityScore >= 80) {
      insights.push({
        id: 0, // Will be assigned by backend
        userId,
        type: 'productivity_trend',
        title: 'Great Productivity!',
        message: `Your productivity score is ${metrics.productivityScore.toFixed(0)}. Keep up the excellent work!`,
        severity: 'success',
        actionable: false,
        data: { score: metrics.productivityScore },
        createdAt: now,
        read: false,
        readAt: null
      });
    } else if (metrics.productivityScore < 50) {
      insights.push({
        id: 0,
        userId,
        type: 'productivity_trend',
        title: 'Productivity Needs Improvement',
        message: `Your productivity score is ${metrics.productivityScore.toFixed(0)}. Try focusing on completing tasks on time.`,
        severity: 'warning',
        actionable: true,
        actionText: 'View Tips',
        actionUrl: '/insights',
        data: { score: metrics.productivityScore },
        createdAt: now,
        read: false,
        readAt: null
      });
    }

    // Peak hours insight
    if (metrics.peakProductivityHours.length > 0) {
      const peakHour = metrics.peakProductivityHours[0];
      insights.push({
        id: 0,
        userId,
        type: 'peak_hours',
        title: 'Peak Productivity Time',
        message: `You're most productive around ${peakHour}:00. Schedule important tasks during this time.`,
        severity: 'info',
        actionable: false,
        data: { peakHours: metrics.peakProductivityHours },
        createdAt: now,
        read: false,
        readAt: null
      });
    }

    // Burnout risk insight
    if (metrics.burnoutRisk.riskLevel === 'high') {
      insights.push({
        id: 0,
        userId,
        type: 'burnout_risk',
        title: 'High Workload Alert',
        message: metrics.burnoutRisk.message,
        severity: 'error',
        actionable: true,
        actionText: 'View Recommendations',
        actionUrl: '/insights',
        data: { recommendations: metrics.burnoutRisk.recommendations },
        createdAt: now,
        read: false,
        readAt: null
      });
    }

    // Category performance insights
    for (const [category, stats] of Object.entries(metrics.categoryRates)) {
      if (stats.total >= 5) {
        if (stats.rate >= 80) {
          insights.push({
            id: 0,
            userId,
            type: 'category_performance',
            title: `Excellent ${category} Performance`,
            message: `You've completed ${stats.completed} out of ${stats.total} ${category} tasks (${stats.rate.toFixed(0)}% completion rate).`,
            severity: 'success',
            actionable: false,
            data: { category, stats },
            createdAt: now,
            read: false,
            readAt: null
          });
        } else if (stats.rate < 50) {
          insights.push({
            id: 0,
            userId,
            type: 'category_performance',
            title: `${category} Tasks Need Attention`,
            message: `You've only completed ${stats.rate.toFixed(0)}% of ${category} tasks. Consider prioritizing them.`,
            severity: 'warning',
            actionable: true,
            actionText: 'View Tasks',
            actionUrl: `/tasks?category=${category}`,
            data: { category, stats },
            createdAt: now,
            read: false,
            readAt: null
          });
        }
      }
    }

    return insights;
  }

  /**
   * Save insights
   */
  saveInsights(insights: ProductivityInsight[]): Observable<ProductivityInsight[]> {
    const observables = insights.map(insight =>
      this.http.post<ProductivityInsight>(this.insightsUrl, insight)
    );
    
    // For now, return empty array (would need to combine observables properly)
    return of([]);
  }

  /**
   * Get insights for user
   */
  getUserInsights(userId: number): Observable<ProductivityInsight[]> {
    return this.http.get<ProductivityInsight[]>(`${this.insightsUrl}?userId=${userId}&read=false`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Mark insight as read
   */
  markInsightAsRead(insightId: number): Observable<ProductivityInsight> {
    return this.http.patch<ProductivityInsight>(`${this.insightsUrl}/${insightId}`, {
      read: true,
      readAt: new Date().toISOString()
    }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('Analytics service error:', error);
    return throwError(() => new Error('Failed to process analytics request.'));
  }
}

