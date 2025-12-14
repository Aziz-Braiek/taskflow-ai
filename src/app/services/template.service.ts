import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { TaskTemplate } from '../models/template.model';
import { Task } from '../models/task.model';
import { SubTask } from '../models/subtask.model';

@Injectable({
  providedIn: 'root'
})
export class TemplateService {
  private apiUrl = 'http://localhost:3000/templates';

  constructor(private http: HttpClient) {}

  /**
   * Get all templates
   */
  getAllTemplates(): Observable<TaskTemplate[]> {
    return this.http.get<TaskTemplate[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get template by ID
   */
  getTemplateById(id: number): Observable<TaskTemplate> {
    return this.http.get<TaskTemplate>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Create template from task
   */
  createTemplateFromTask(task: Task, name: string, description: string): Observable<TaskTemplate> {
    const template: Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'> = {
      name,
      description,
      title: task.title,
      defaultDescription: task.description,
      defaultCategory: task.category,
      defaultPriority: task.priority,
      defaultEstimatedTime: task.estimatedTime || 0,
      defaultDifficulty: task.difficulty || 'medium',
      defaultEnergyLevel: task.energyLevel || 'medium',
      tags: task.tags || [],
      subtasks: task.subtasks.map(st => st.title),
      isPublic: false
    };

    return this.http.post<TaskTemplate>(this.apiUrl, {
      ...template,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Create new template
   */
  createTemplate(template: Omit<TaskTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Observable<TaskTemplate> {
    return this.http.post<TaskTemplate>(this.apiUrl, {
      ...template,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update template
   */
  updateTemplate(id: number, template: Partial<TaskTemplate>): Observable<TaskTemplate> {
    return this.http.patch<TaskTemplate>(`${this.apiUrl}/${id}`, {
      ...template,
      updatedAt: new Date().toISOString()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Delete template
   */
  deleteTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Apply template to create a task
   */
  applyTemplate(template: TaskTemplate, customizations?: Partial<Task>): Task {
    const now = new Date().toISOString();
    let taskId = 0; // Will be assigned by backend

    // Convert template subtasks to SubTask objects
    const subtasks: SubTask[] = template.subtasks.map((title, index) => ({
      id: index + 1,
      title,
      completed: false,
      completedAt: null,
      createdAt: now,
      order: index
    }));

    const task: Omit<Task, 'id'> = {
      title: customizations?.title || template.title,
      description: customizations?.description || template.defaultDescription,
      dueDate: customizations?.dueDate || '',
      priority: customizations?.priority || template.defaultPriority,
      category: customizations?.category || template.defaultCategory,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      tags: customizations?.tags || template.tags || [],
      estimatedTime: customizations?.estimatedTime || template.defaultEstimatedTime,
      actualTime: 0,
      subtasks,
      parentTaskId: null,
      dependencies: customizations?.dependencies || [],
      templateId: template.id,
      completedAt: null,
      difficulty: customizations?.difficulty || template.defaultDifficulty,
      energyLevel: customizations?.energyLevel || template.defaultEnergyLevel,
      location: customizations?.location || null,
      attachments: [],
      notes: '',
      reminders: [],
      userId: customizations?.userId || 1
    };

    // Increment template usage count
    this.updateTemplate(template.id, { usageCount: template.usageCount + 1 }).subscribe();

    return task as Task;
  }

  /**
   * Get popular templates
   */
  getPopularTemplates(limit: number = 5): Observable<TaskTemplate[]> {
    return this.http.get<TaskTemplate[]>(`${this.apiUrl}?_sort=usageCount&_order=desc&_limit=${limit}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get public templates
   */
  getPublicTemplates(): Observable<TaskTemplate[]> {
    return this.http.get<TaskTemplate[]>(`${this.apiUrl}?isPublic=true`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('Template service error:', error);
    return throwError(() => new Error('Failed to process template request.'));
  }
}

