import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { AnalyticsService, ProductivityMetrics, TrendData } from '../../services/analytics.service';
import { AuthService } from '../../services/auth.service';
import { Task } from '../../models/task.model';
import { ChartConfiguration, ChartData, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-insights-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './insights-dashboard.component.html',
  styleUrl: './insights-dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InsightsDashboardComponent implements OnInit {
  tasks = signal<Task[]>([]);
  loading = signal<boolean>(false);
  metrics = signal<ProductivityMetrics | null>(null);
  trends = signal<TrendData[]>([]);
  dateRange = signal<'7' | '30' | '90' | 'all'>('30');

  // Chart data
  productivityChartData: ChartData<'line'> = {
    labels: [],
    datasets: [{
      label: 'Productivity Score',
      data: [],
      borderColor: 'rgb(102, 126, 234)',
      backgroundColor: 'rgba(102, 126, 234, 0.1)',
      tension: 0.4
    }]
  };

  completionChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [
        'rgba(39, 174, 96, 0.8)',
        'rgba(52, 152, 219, 0.8)',
        'rgba(241, 196, 15, 0.8)',
        'rgba(231, 76, 60, 0.8)'
      ]
    }]
  };

  categoryChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [{
      label: 'Completion Rate (%)',
      data: [],
      backgroundColor: 'rgba(102, 126, 234, 0.8)'
    }]
  };

  chartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      }
    }
  };

  lineChartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100
      }
    }
  };

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
        
        const trends = this.analyticsService.generateTrends(tasks, parseInt(this.dateRange()));
        this.trends.set(trends);
        
        this.updateCharts(metrics, trends);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  updateCharts(metrics: ProductivityMetrics, trends: TrendData[]): void {
    // Productivity trend chart
    this.productivityChartData = {
      labels: trends.map(t => {
        const date = new Date(t.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [{
        label: 'Productivity Score',
        data: trends.map(t => t.productivityScore),
        borderColor: 'rgb(102, 126, 234)',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };

    // Completion status chart
    const completed = this.tasks().filter(t => t.status === 'completed').length;
    const pending = this.tasks().filter(t => t.status === 'pending').length;
    const inProgress = this.tasks().filter(t => t.status === 'in-progress').length;

    this.completionChartData = {
      labels: ['Completed', 'In Progress', 'Pending'],
      datasets: [{
        data: [completed, inProgress, pending],
        backgroundColor: [
          'rgba(39, 174, 96, 0.8)',
          'rgba(52, 152, 219, 0.8)',
          'rgba(241, 196, 15, 0.8)'
        ]
      }]
    };

    // Category completion chart
    const categories = Object.keys(metrics.categoryRates);
    this.categoryChartData = {
      labels: categories,
      datasets: [{
        label: 'Completion Rate (%)',
        data: categories.map(cat => metrics.categoryRates[cat].rate),
        backgroundColor: 'rgba(102, 126, 234, 0.8)'
      }]
    };
  }

  onDateRangeChange(): void {
    this.loadData();
  }

  formatTime(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  getCategoryKeys(metrics: ProductivityMetrics): string[] {
    return Object.keys(metrics.categoryRates);
  }
}

