import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { TimeTrackingService } from '../../services/time-tracking.service';
import { Task } from '../../models/task.model';

export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

@Component({
  selector: 'app-focus-mode',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './focus-mode.component.html',
  styleUrl: './focus-mode.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FocusModeComponent implements OnInit, OnDestroy {
  currentTask = signal<Task | null>(null);
  tasks = signal<Task[]>([]);
  loading = signal<boolean>(false);

  // Pomodoro timer
  phase = signal<PomodoroPhase>('work');
  timeLeft = signal<number>(25 * 60); // 25 minutes in seconds
  isRunning = signal<boolean>(false);
  pomodoroCount = signal<number>(0);
  
  private intervalId: any = null;
  private workDuration = 25 * 60; // 25 minutes
  private shortBreakDuration = 5 * 60; // 5 minutes
  private longBreakDuration = 15 * 60; // 15 minutes

  constructor(
    private taskService: TaskService,
    private timeTrackingService: TimeTrackingService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  loadTasks(): void {
    this.loading.set(true);
    this.taskService.getAllTasks().subscribe({
      next: (tasks) => {
        const pendingTasks = tasks.filter(t => t.status !== 'completed');
        this.tasks.set(pendingTasks);
        if (pendingTasks.length > 0 && !this.currentTask()) {
          this.selectTask(pendingTasks[0]);
        }
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading tasks:', err);
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  selectTask(task: Task): void {
    this.currentTask.set(task);
    this.stopTimer();
    this.timeLeft.set(this.workDuration);
    this.phase.set('work');
    this.cdr.markForCheck();
  }

  onTaskChange(taskId: string): void {
    const task = this.tasks().find(t => t.id === +taskId);
    if (task) {
      this.selectTask(task);
    }
  }

  navigateToNewTask(): void {
    this.router.navigate(['/tasks/new']);
  }

  startTimer(): void {
    if (this.timeLeft() <= 0) return;

    this.isRunning.set(true);
    this.intervalId = setInterval(() => {
      const current = this.timeLeft();
      if (current <= 1) {
        this.completePhase();
      } else {
        this.timeLeft.set(current - 1);
        this.cdr.markForCheck();
      }
    }, 1000);

    // Start time tracking if task is selected
    if (this.currentTask()) {
      this.timeTrackingService.startTracking(this.currentTask()!.id);
    }
  }

  pauseTimer(): void {
    this.isRunning.set(false);
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.timeTrackingService.pauseTracking();
  }

  stopTimer(): void {
    this.isRunning.set(false);
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.timeTrackingService.stopTracking();
  }

  resetTimer(): void {
    this.stopTimer();
    const currentPhase = this.phase();
    if (currentPhase === 'work') {
      this.timeLeft.set(this.workDuration);
    } else if (currentPhase === 'shortBreak') {
      this.timeLeft.set(this.shortBreakDuration);
    } else {
      this.timeLeft.set(this.longBreakDuration);
    }
    this.cdr.markForCheck();
  }

  completePhase(): void {
    this.stopTimer();
    
    if (this.phase() === 'work') {
      this.pomodoroCount.set(this.pomodoroCount() + 1);
      
      // Mark task as in-progress if it was pending
      if (this.currentTask() && this.currentTask()!.status === 'pending') {
        this.taskService.updateTask(this.currentTask()!.id, { status: 'in-progress' }).subscribe({
          next: (updatedTask) => {
            this.currentTask.set(updatedTask);
            this.cdr.markForCheck();
          }
        });
      }

      // Save tracked time
      const trackedSeconds = this.timeTrackingService.getTrackingState().elapsedTime;
      if (this.currentTask() && trackedSeconds > 0) {
        const currentActualTime = this.currentTask()!.actualTime || 0;
        const additionalMinutes = Math.floor(trackedSeconds / 60);
        this.taskService.updateTask(this.currentTask()!.id, {
          actualTime: currentActualTime + additionalMinutes
        }).subscribe();
      }

      // Show completion notification
      this.showNotification('Pomodoro Complete! Take a break.');

      // Switch to break
      if (this.pomodoroCount() % 4 === 0) {
        this.phase.set('longBreak');
        this.timeLeft.set(this.longBreakDuration);
      } else {
        this.phase.set('shortBreak');
        this.timeLeft.set(this.shortBreakDuration);
      }
    } else {
      // Break is over, return to work
      this.phase.set('work');
      this.timeLeft.set(this.workDuration);
      this.showNotification('Break over! Ready to focus?');
    }

    this.cdr.markForCheck();
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  getPhaseLabel(): string {
    switch (this.phase()) {
      case 'work': return 'Focus Time';
      case 'shortBreak': return 'Short Break';
      case 'longBreak': return 'Long Break';
    }
  }

  exitFocusMode(): void {
    this.stopTimer();
    this.router.navigate(['/tasks']);
  }

  completeTask(): void {
    if (!this.currentTask()) return;

    this.taskService.updateTask(this.currentTask()!.id, {
      status: 'completed',
      completedAt: new Date().toISOString()
    }).subscribe({
      next: () => {
        this.loadTasks();
        this.showNotification('Task completed! Great work!');
      }
    });
  }

  private showNotification(message: string): void {
    // Simple notification - could be enhanced with a toast service
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(message);
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(message);
        }
      });
    }
  }
}

