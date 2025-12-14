import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { DependencyService } from '../../services/dependency.service';
import { Task } from '../../models/task.model';
import { SubTask } from '../../models/subtask.model';
import { SubtaskListComponent } from '../subtask-list/subtask-list.component';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, SubtaskListComponent, RouterLink],
  templateUrl: './task-detail.component.html',
  styleUrl: './task-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskDetailComponent implements OnInit {
  task: Task | null = null;
  loading = false;
  error: string | null = null;
  deleting = false;
  showDeleteConfirm = false;

  allTasks: Task[] = [];
  blockingTasks: Task[] = [];
  dependentTasks: Task[] = [];

  constructor(
    private taskService: TaskService,
    private dependencyService: DependencyService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const taskId = +id;
      if (isNaN(taskId) || taskId <= 0) {
        this.error = 'Invalid task ID.';
        this.loading = false;
        this.cdr.markForCheck();
        // Redirect to task list after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/tasks']);
        }, 2000);
        return;
      }
      this.loadTask(taskId);
    } else {
      this.error = 'No task ID provided.';
      this.loading = false;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.router.navigate(['/tasks']);
      }, 2000);
    }
  }

  loadTask(id: number): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();
    
    this.taskService.getTaskById(id).subscribe({
      next: (task) => {
        if (!task || !task.id) {
          this.error = 'Task not found.';
          this.loading = false;
          this.cdr.markForCheck();
          setTimeout(() => {
            this.router.navigate(['/tasks']);
          }, 2000);
          return;
        }
        this.task = task;
        this.error = null; // Clear any previous errors
        this.loading = false;
        this.loadDependencies(); // Load dependencies after task is loaded
        this.cdr.markForCheck();
      },
      error: (err) => {
        let errorMessage = 'Failed to load task. Please try again.';
        
        if (err.message) {
          errorMessage = err.message;
        } else if (err.status === 404 || err.status === 0) {
          errorMessage = 'Task not found. The task may have been deleted or the server is not running.';
        } else if (err.status === 0) {
          errorMessage = 'Cannot connect to server. Please make sure JSON Server is running on port 3000.';
        }
        
        this.error = errorMessage;
        this.loading = false;
        this.cdr.markForCheck();
        
        // If task not found, redirect to task list after showing error
        if (err.status === 404 || errorMessage.toLowerCase().includes('not found')) {
          setTimeout(() => {
            this.router.navigate(['/tasks']);
          }, 3000);
        }
      }
    });
  }

  onEdit(): void {
    if (this.task) {
      this.router.navigate(['/tasks', this.task.id, 'edit']);
    }
  }

  onDelete(): void {
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    if (!this.task) return;

    this.deleting = true;
    this.taskService.deleteTask(this.task.id).subscribe({
      next: () => {
        this.router.navigate(['/tasks']);
      },
      error: (err) => {
        this.error = 'Failed to delete task. Please try again.';
        this.deleting = false;
        this.showDeleteConfirm = false;
        this.cdr.markForCheck();
        console.error(err);
      }
    });
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  onBack(): void {
    this.router.navigate(['/tasks']);
  }

  toggleStatus(): void {
    if (!this.task) return;

    // Check if task can be completed (dependencies must be done)
    if (this.task.status !== 'completed') {
      const canComplete = this.canComplete();
      if (!canComplete && this.blockingTasks.length > 0) {
        const incompleteTasks = this.blockingTasks.filter(t => t.status !== 'completed');
        this.error = `Cannot complete this task. Please complete the following dependencies first: ${incompleteTasks.map(t => t.title).join(', ')}`;
        this.cdr.markForCheck();
        setTimeout(() => {
          this.error = null;
          this.cdr.markForCheck();
        }, 5000);
        return;
      }
    }

    const newStatus: Task['status'] = 
      this.task.status === 'completed' ? 'pending' :
      this.task.status === 'pending' ? 'in-progress' : 'completed';

    // Optimistically update the UI
    const previousStatus = this.task.status;
    const previousTask = { ...this.task };
    this.task = { ...this.task, status: newStatus };
    if (newStatus === 'completed' && !this.task.completedAt) {
      this.task.completedAt = new Date().toISOString();
    } else if (newStatus !== 'completed') {
      this.task.completedAt = null;
    }
    this.cdr.markForCheck();

    this.taskService.updateTask(this.task.id, { 
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : null
    }).subscribe({
      next: (updatedTask) => {
        this.task = updatedTask;
        this.error = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        // Revert optimistic update on error
        this.task = previousTask;
        
        let errorMessage = 'Failed to update status. Please try again.';
        if (err.status === 404) {
          errorMessage = 'Task not found. It may have been deleted.';
          setTimeout(() => {
            this.router.navigate(['/tasks']);
          }, 2000);
        } else if (err.status === 0) {
          errorMessage = 'Cannot connect to server. Please check your connection.';
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        this.error = errorMessage;
        this.cdr.markForCheck();
        
        // Clear error after 5 seconds
        setTimeout(() => {
          this.error = null;
          this.cdr.markForCheck();
        }, 5000);
      }
    });
  }

  getPriorityClass(priority: Task['priority']): string {
    return `priority-${priority}`;
  }

  getStatusClass(status: Task['status']): string {
    return `status-${status}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isOverdue(): boolean {
    if (!this.task) return false;
    const dueDate = new Date(this.task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today && this.task.status !== 'completed';
  }

  onAddSubtask(title: string): void {
    if (!this.task) return;

    const newSubtask: SubTask = {
      id: Date.now(), // Temporary ID
      title,
      completed: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
      order: this.task.subtasks.length
    };

    const updatedSubtasks = [...(this.task.subtasks || []), newSubtask];
    this.taskService.updateTask(this.task.id, { subtasks: updatedSubtasks }).subscribe({
      next: (updatedTask) => {
        this.task = updatedTask;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error adding subtask:', err);
      }
    });
  }

  onToggleSubtask(subtaskId: number): void {
    if (!this.task) return;

    const updatedSubtasks = this.task.subtasks.map(st => {
      if (st.id === subtaskId) {
        return {
          ...st,
          completed: !st.completed,
          completedAt: !st.completed ? new Date().toISOString() : null
        };
      }
      return st;
    });

    this.taskService.updateTask(this.task.id, { subtasks: updatedSubtasks }).subscribe({
      next: (updatedTask) => {
        this.task = updatedTask;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error toggling subtask:', err);
      }
    });
  }

  onDeleteSubtask(subtaskId: number): void {
    if (!this.task) return;

    const updatedSubtasks = this.task.subtasks.filter(st => st.id !== subtaskId);
    this.taskService.updateTask(this.task.id, { subtasks: updatedSubtasks }).subscribe({
      next: (updatedTask) => {
        this.task = updatedTask;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error deleting subtask:', err);
      }
    });
  }

  getSubtaskProgress(): number {
    if (!this.task || !this.task.subtasks || this.task.subtasks.length === 0) return 0;
    const completed = this.task.subtasks.filter(st => st.completed).length;
    return (completed / this.task.subtasks.length) * 100;
  }

  loadDependencies(): void {
    if (!this.task) return;
    
    this.taskService.getAllTasks().subscribe({
      next: (tasks) => {
        this.allTasks = tasks;
        if (this.task) {
          this.blockingTasks = this.dependencyService.getBlockingTasks(this.task.id, tasks);
          this.dependentTasks = this.dependencyService.getDependentTasks(this.task.id, tasks);
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading dependencies:', err);
        this.cdr.markForCheck();
      }
    });
  }

  canComplete(): boolean {
    if (!this.task) return false;
    const result = this.dependencyService.canCompleteTask(this.task, this.allTasks);
    return result.canComplete;
  }

  addDependency(depId: number): void {
    if (!this.task) return;

    const currentDeps = this.task.dependencies || [];
    if (currentDeps.includes(depId)) return;

    const validation = this.dependencyService.validateDependencies(
      this.task.id,
      [...currentDeps, depId],
      this.allTasks
    );

    if (!validation.valid) {
      alert('Cannot add dependency: ' + validation.errors.join(', '));
      return;
    }

    this.taskService.updateTask(this.task.id, {
      dependencies: [...currentDeps, depId]
    }).subscribe({
      next: (updatedTask) => {
        this.task = updatedTask;
        this.loadDependencies();
        this.cdr.markForCheck();
      }
    });
  }

  removeDependency(depId: number): void {
    if (!this.task) return;

    const currentDeps = this.task.dependencies || [];
    const updatedDeps = currentDeps.filter(id => id !== depId);

    this.taskService.updateTask(this.task.id, {
      dependencies: updatedDeps
    }).subscribe({
      next: (updatedTask) => {
        this.task = updatedTask;
        this.loadDependencies();
        this.cdr.markForCheck();
      }
    });
  }

  getAvailableTasksForDependency(): Task[] {
    if (!this.task) return [];
    return this.allTasks.filter(t => 
      t.id !== this.task!.id && 
      !this.task!.dependencies?.includes(t.id)
    );
  }

  getIncompleteBlockingTasks(): Task[] {
    return this.blockingTasks.filter(t => t.status !== 'completed');
  }
}

