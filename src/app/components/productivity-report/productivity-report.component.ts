import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { AnalyticsService } from '../../services/analytics.service';
import { AuthService } from '../../services/auth.service';
import { Task } from '../../models/task.model';
import { ProductivityMetrics, TrendData } from '../../services/analytics.service';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

@Component({
  selector: 'app-productivity-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productivity-report.component.html',
  styleUrl: './productivity-report.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductivityReportComponent implements OnInit {
  tasks = signal<Task[]>([]);
  loading = signal<boolean>(false);
  metrics = signal<ProductivityMetrics | null>(null);
  trends = signal<TrendData[]>([]);
  reportPeriod = signal<ReportPeriod>('weekly');
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);

  constructor(
    private taskService: TaskService,
    private analyticsService: AnalyticsService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.taskService.getAllTasks().subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        const userId = this.authService.getCurrentUser()?.id || 1;
        const metrics = this.analyticsService.calculateMetrics(tasks, userId);
        this.metrics.set(metrics);
        
        const days = this.reportPeriod() === 'daily' ? 1 : 
                    this.reportPeriod() === 'weekly' ? 7 : 30;
        const trends = this.analyticsService.generateTrends(tasks, days);
        this.trends.set(trends);
        
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  onPeriodChange(): void {
    this.loadData();
  }

  exportAsCSV(): void {
    if (!this.metrics()) return;

    const period = this.reportPeriod();
    const date = new Date(this.selectedDate()).toLocaleDateString();
    const filename = `productivity-report-${period}-${date}.csv`;

    const rows: string[] = [];
    rows.push('Productivity Report');
    rows.push(`Period: ${period}`);
    rows.push(`Date: ${date}`);
    rows.push('');
    rows.push('Metric,Value');
    rows.push(`Productivity Score,${this.metrics()!.productivityScore.toFixed(2)}`);
    rows.push(`Completion Rate,${this.metrics()!.completionRate.toFixed(2)}%`);
    rows.push(`On-Time Completion,${this.metrics()!.onTimeCompletionRate.toFixed(2)}%`);
    rows.push(`Task Velocity,${this.metrics()!.taskVelocity.toFixed(2)} tasks/day`);
    rows.push(`Average Task Duration,${this.formatTime(this.metrics()!.averageTaskDuration)}`);
    rows.push('');
    rows.push('Category Performance');
    rows.push('Category,Completed,Total,Rate');
    
    for (const [category, stats] of Object.entries(this.metrics()!.categoryRates)) {
      rows.push(`${category},${stats.completed},${stats.total},${stats.rate.toFixed(2)}%`);
    }

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  exportAsJSON(): void {
    if (!this.metrics()) return;

    const period = this.reportPeriod();
    const date = new Date(this.selectedDate()).toLocaleDateString();
    const filename = `productivity-report-${period}-${date}.json`;

    const report = {
      period,
      date,
      metrics: this.metrics(),
      trends: this.trends(),
      tasks: this.tasks()
    };

    const jsonContent = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  formatTime(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  getPeriodTasks(): Task[] {
    const period = this.reportPeriod();
    const selectedDate = new Date(this.selectedDate());
    const tasks = this.tasks();

    if (period === 'daily') {
      const dateStr = selectedDate.toISOString().split('T')[0];
      return tasks.filter(t => {
        const taskDate = t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : null;
        return taskDate === dateStr;
      });
    } else if (period === 'weekly') {
      const weekStart = new Date(selectedDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      return tasks.filter(t => {
        const taskDate = t.createdAt ? new Date(t.createdAt) : null;
        return taskDate && taskDate >= weekStart && taskDate <= weekEnd;
      });
    } else {
      const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

      return tasks.filter(t => {
        const taskDate = t.createdAt ? new Date(t.createdAt) : null;
        return taskDate && taskDate >= monthStart && taskDate <= monthEnd;
      });
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getCompletedTasksCount(): number {
    return this.tasks().filter(t => t.status === 'completed').length;
  }

  getCategoryKeys(): string[] {
    if (!this.metrics()) return [];
    return Object.keys(this.metrics()!.categoryRates);
  }

  getPeakHoursFormatted(): string {
    if (!this.metrics() || this.metrics()!.peakProductivityHours.length === 0) return '';
    return this.metrics()!.peakProductivityHours.map(h => h + ':00').join(', ');
  }
}

