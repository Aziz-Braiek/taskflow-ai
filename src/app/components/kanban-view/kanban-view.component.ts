import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-kanban-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './kanban-view.component.html',
  styleUrl: './kanban-view.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KanbanViewComponent implements OnInit {
  tasks = signal<Task[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  columns = [
    { id: 'pending', title: 'Pending', status: 'pending' as Task['status'] },
    { id: 'in-progress', title: 'In Progress', status: 'in-progress' as Task['status'] },
    { id: 'completed', title: 'Completed', status: 'completed' as Task['status'] }
  ];

  tasksByColumn = computed(() => {
    const tasks = this.tasks();
    return this.columns.map(column => ({
      ...column,
      tasks: tasks.filter(t => t.status === column.status)
    }));
  });

  constructor(
    private taskService: TaskService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.loading.set(true);
    this.error.set(null);
    this.taskService.getAllTasks().subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load tasks');
        this.loading.set(false);
        this.cdr.markForCheck();
      }
    });
  }

  onStatusChange(taskId: number, newStatus: Task['status']): void {
    this.taskService.updateTask(taskId, { status: newStatus }).subscribe({
      next: () => {
        this.loadTasks();
      },
      error: (err) => {
        console.error('Error updating task:', err);
      }
    });
  }

  getPriorityClass(priority: Task['priority']): string {
    return `priority-${priority}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  isOverdue(task: Task): boolean {
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today && task.status !== 'completed';
  }
}

