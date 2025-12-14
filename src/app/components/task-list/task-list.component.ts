import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { TaskService } from '../../services/task.service';
import { TagService } from '../../services/tag.service';
import { ExportImportService } from '../../services/export-import.service';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskListComponent implements OnInit {
  // Use signals for reactive state
  tasks = signal<Task[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Filter and search properties
  searchQuery = signal<string>('');
  statusFilter = signal<'all' | Task['status']>('all');
  categoryFilter = signal<string>('all');
  priorityFilter = signal<'all' | Task['priority']>('all');

  // Debounced search subject
  private searchSubject = new Subject<string>();

  // Computed filtered tasks
  filteredTasks = computed(() => {
    const tasks = this.tasks();
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();
    const category = this.categoryFilter();
    const priority = this.priorityFilter();

    let filtered = [...tasks];

    // Search filter
    if (query) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.category.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (status !== 'all') {
      filtered = filtered.filter(task => task.status === status);
    }

    // Category filter
    if (category !== 'all') {
      filtered = filtered.filter(task => task.category === category);
    }

    // Priority filter
    if (priority !== 'all') {
      filtered = filtered.filter(task => task.priority === priority);
    }

    // Tag filter
    const selectedTags = this.selectedTags();
    if (selectedTags.length > 0) {
      filtered = this.tagService.filterTasksByTags(filtered, selectedTags);
    }

    return filtered;
  });

  // Computed statistics
  statistics = computed(() => {
    const tasks = this.tasks();
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length
    };
  });

  // Available categories and priorities
  categories = signal<string[]>([]);
  priorities: Task['priority'][] = ['low', 'medium', 'high'];
  statuses: Task['status'][] = ['pending', 'in-progress', 'completed'];
  
  // Tag filtering
  selectedTags = signal<string[]>([]);
  availableTags = signal<string[]>([]);
  tagFilter = signal<string>('');

  constructor(
    private taskService: TaskService,
    private tagService: TagService,
    private exportImportService: ExportImportService,
    private cdr: ChangeDetectorRef
  ) {
    // Setup debounced search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery.set(query);
      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.loading.set(true);
    this.error.set(null);
    this.taskService.getAllTasks().subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.extractCategories();
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        const errorMsg = err.message || 'Failed to load tasks. Please make sure JSON Server is running on port 3000.';
        this.error.set(errorMsg);
        this.loading.set(false);
        this.cdr.markForCheck();
        console.error('Error loading tasks:', err);
      }
    });
  }

  extractCategories(): void {
    const uniqueCategories = new Set(this.tasks().map(t => t.category));
    this.categories.set(Array.from(uniqueCategories).sort());
    
    // Extract available tags
    const tags = this.tagService.getAllTags(this.tasks());
    this.availableTags.set(tags);
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  onStatusFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as 'all' | Task['status'];
    this.statusFilter.set(value);
    this.cdr.markForCheck();
  }

  onCategoryFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.categoryFilter.set(value);
    this.cdr.markForCheck();
  }

  onPriorityFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as 'all' | Task['priority'];
    this.priorityFilter.set(value);
    this.cdr.markForCheck();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.statusFilter.set('all');
    this.categoryFilter.set('all');
    this.priorityFilter.set('all');
    this.selectedTags.set([]);
    this.tagFilter.set('');
    this.cdr.markForCheck();
  }

  toggleTag(tag: string): void {
    const current = this.selectedTags();
    if (current.includes(tag)) {
      this.selectedTags.set(current.filter(t => t !== tag));
    } else {
      this.selectedTags.set([...current, tag]);
    }
    this.cdr.markForCheck();
  }

  getSuggestedTags(): string[] {
    const filter = this.tagFilter();
    if (!filter || filter.length < 2) return [];
    return this.tagService.suggestTags(filter, this.availableTags());
  }

  trackByTaskId(index: number, task: Task): number {
    return task.id;
  }

  exportTasks(format: 'json' | 'csv'): void {
    const tasks = this.tasks();
    const date = new Date().toISOString().split('T')[0];
    const filename = `tasks-export-${date}.${format}`;
    
    if (format === 'json') {
      this.exportImportService.exportAsJSON(tasks, filename);
    } else {
      this.exportImportService.exportAsCSV(tasks, filename);
    }
  }

  async importTasks(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const isCSV = file.name.endsWith('.csv');
      const importedTasks = isCSV
        ? await this.exportImportService.importFromCSV(file)
        : await this.exportImportService.importFromJSON(file);

      // Import tasks one by one
      for (const task of importedTasks) {
        const { id, ...taskWithoutId } = task;
        this.taskService.createTask(taskWithoutId as any).subscribe({
          next: () => {
            this.loadTasks();
          },
          error: (err) => {
            console.error('Error importing task:', err);
          }
        });
      }

      alert(`Successfully imported ${importedTasks.length} tasks`);
      input.value = ''; // Reset input
    } catch (error: any) {
      alert('Error importing tasks: ' + error.message);
      input.value = '';
    }
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

