import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-form.component.html',
  styleUrl: './task-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskFormComponent implements OnInit {
  taskForm: FormGroup;
  isEditMode = false;
  taskId: number | null = null;
  loading = false;
  error: string | null = null;
  submitting = false;

  priorities: Task['priority'][] = ['low', 'medium', 'high'];
  statuses: Task['status'][] = ['pending', 'in-progress', 'completed'];
  categories: string[] = ['School', 'Work', 'Personal', 'Health', 'Other'];

  constructor(
    private fb: FormBuilder,
    private taskService: TaskService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      dueDate: ['', [Validators.required]],
      priority: ['medium', [Validators.required]],
      category: ['', [Validators.required]],
      status: ['pending', [Validators.required]]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.taskId = +id;
      this.loadTask();
    }
  }

  loadTask(): void {
    if (!this.taskId) return;

    this.loading = true;
    this.error = null;
    this.taskService.getTaskById(this.taskId).subscribe({
      next: (task) => {
        // Format date for input field (YYYY-MM-DD)
        const dueDate = new Date(task.dueDate).toISOString().split('T')[0];
        
        this.taskForm.patchValue({
          title: task.title,
          description: task.description,
          dueDate: dueDate,
          priority: task.priority,
          category: task.category,
          status: task.status
        });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = err.message || 'Failed to load task. Please try again.';
        this.loading = false;
        this.cdr.markForCheck();
        console.error('Error loading task:', err);
      }
    });
  }

  onSubmit(): void {
    if (this.taskForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.submitting = true;
    this.error = null;

    const formValue = this.taskForm.value;
    const taskData = {
      title: formValue.title,
      description: formValue.description,
      dueDate: formValue.dueDate,
      priority: formValue.priority,
      category: formValue.category,
      status: formValue.status
    };

    if (this.isEditMode && this.taskId) {
      this.taskService.updateTask(this.taskId, taskData).subscribe({
        next: () => {
          this.router.navigate(['/tasks', this.taskId]);
        },
        error: (err) => {
          this.error = 'Failed to update task. Please try again.';
          this.submitting = false;
          this.cdr.markForCheck();
          console.error(err);
        }
      });
    } else {
      this.taskService.createTask(taskData).subscribe({
        next: () => {
          this.router.navigate(['/tasks']);
        },
        error: (err) => {
          this.error = 'Failed to create task. Please try again.';
          this.submitting = false;
          this.cdr.markForCheck();
          console.error(err);
        }
      });
    }
  }

  onCancel(): void {
    if (this.isEditMode && this.taskId) {
      this.router.navigate(['/tasks', this.taskId]);
    } else {
      this.router.navigate(['/tasks']);
    }
  }

  markFormGroupTouched(): void {
    Object.keys(this.taskForm.controls).forEach(key => {
      const control = this.taskForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.taskForm.get(fieldName);
    if (field?.hasError('required') && field?.touched) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (field?.hasError('minlength') && field?.touched) {
      const minLength = field.errors?.['minlength'].requiredLength;
      return `${this.getFieldLabel(fieldName)} must be at least ${minLength} characters`;
    }
    return '';
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      title: 'Title',
      description: 'Description',
      dueDate: 'Due Date',
      priority: 'Priority',
      category: 'Category',
      status: 'Status'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.taskForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }
}

