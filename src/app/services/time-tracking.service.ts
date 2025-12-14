import { Injectable, signal } from '@angular/core';
import { interval, Observable, BehaviorSubject } from 'rxjs';
import { Task } from '../models/task.model';

export interface TimeTrackingState {
  taskId: number | null;
  startTime: number | null;
  elapsedTime: number; // in seconds
  isRunning: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TimeTrackingService {
  private trackingState = signal<TimeTrackingState>({
    taskId: null,
    startTime: null,
    elapsedTime: 0,
    isRunning: false
  });

  private timer$ = interval(1000); // Update every second
  private timerSubscription: any = null;

  constructor() {}

  /**
   * Get current tracking state
   */
  getTrackingState(): TimeTrackingState {
    return this.trackingState();
  }

  /**
   * Start tracking time for a task
   */
  startTracking(taskId: number): void {
    const currentState = this.trackingState();
    
    // Stop current tracking if different task
    if (currentState.isRunning && currentState.taskId !== taskId) {
      this.stopTracking();
    }

    this.trackingState.set({
      taskId,
      startTime: Date.now(),
      elapsedTime: 0,
      isRunning: true
    });

    // Start timer
    this.timerSubscription = this.timer$.subscribe(() => {
      const state = this.trackingState();
      if (state.isRunning && state.startTime) {
        const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
        this.trackingState.set({
          ...state,
          elapsedTime: elapsed
        });
      }
    });
  }

  /**
   * Stop tracking time
   */
  stopTracking(): number {
    const state = this.trackingState();
    
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }

    const totalTime = state.elapsedTime;
    
    this.trackingState.set({
      taskId: null,
      startTime: null,
      elapsedTime: 0,
      isRunning: false
    });

    return totalTime; // Return elapsed time in seconds
  }

  /**
   * Pause tracking
   */
  pauseTracking(): void {
    const state = this.trackingState();
    if (state.isRunning && this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
      
      this.trackingState.set({
        ...state,
        isRunning: false
      });
    }
  }

  /**
   * Resume tracking
   */
  resumeTracking(): void {
    const state = this.trackingState();
    if (!state.isRunning && state.taskId && state.elapsedTime > 0) {
      this.trackingState.set({
        ...state,
        startTime: Date.now() - (state.elapsedTime * 1000),
        isRunning: true
      });

      this.timerSubscription = this.timer$.subscribe(() => {
        const currentState = this.trackingState();
        if (currentState.isRunning && currentState.startTime) {
          const elapsed = Math.floor((Date.now() - currentState.startTime) / 1000);
          this.trackingState.set({
            ...currentState,
            elapsedTime: elapsed
          });
        }
      });
    }
  }

  /**
   * Reset tracking
   */
  resetTracking(): void {
    this.stopTracking();
    this.trackingState.set({
      taskId: null,
      startTime: null,
      elapsedTime: 0,
      isRunning: false
    });
  }

  /**
   * Format time in seconds to HH:MM:SS
   */
  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Convert seconds to minutes
   */
  secondsToMinutes(seconds: number): number {
    return Math.round(seconds / 60);
  }

  /**
   * Calculate time efficiency
   */
  calculateEfficiency(estimatedMinutes: number, actualMinutes: number): number {
    if (estimatedMinutes === 0) return 1.0;
    const ratio = actualMinutes / estimatedMinutes;
    
    // Efficiency: 1.0 = perfect, >1.0 = took longer, <1.0 = finished faster
    if (ratio <= 1.0) {
      return 1.0 + (1.0 - ratio) * 0.2; // Bonus for finishing early (max 1.2)
    } else {
      return Math.max(0, 1.0 - (ratio - 1.0) * 0.3); // Penalty for going over
    }
  }
}

