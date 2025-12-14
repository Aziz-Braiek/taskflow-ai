import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError, from, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { Task } from '../models/task.model';
import { OfflineStorageService } from './offline-storage.service';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private apiUrl = 'http://localhost:3000/tasks';

  constructor(
    private http: HttpClient,
    private offlineStorage: OfflineStorageService
  ) {
    this.initOfflineSupport();
  }

  private async initOfflineSupport(): Promise<void> {
    try {
      await this.offlineStorage.initDB();
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
    }
  }

  getAllTasks(): Observable<Task[]> {
    if (!this.offlineStorage.isOnline()) {
      // Return cached tasks when offline
      return from(this.offlineStorage.getTasks());
    }

    return this.http.get<Task[]>(this.apiUrl).pipe(
      tap(tasks => {
        // Cache tasks when online
        this.offlineStorage.saveTasks(tasks).catch(() => {
          // Silently fail cache update
        });
      }),
      catchError((error) => {
        // If online request fails, try to return cached data
        if (this.offlineStorage.isOnline()) {
          return from(this.offlineStorage.getTasks()).pipe(
            catchError(() => this.handleError(error))
          );
        }
        return this.handleError(error);
      })
    );
  }

  getTaskById(id: number): Observable<Task> {
    const url = `${this.apiUrl}/${id}`;
    
    // First try to get from API if online
    if (this.offlineStorage.isOnline()) {
      return this.http.get<Task>(url).pipe(
        tap(task => {
          // Cache the task when successfully fetched
          if (task && task.id) {
            this.offlineStorage.getTasks().then(tasks => {
              const existingIndex = tasks.findIndex(t => t.id === task.id);
              if (existingIndex >= 0) {
                tasks[existingIndex] = task;
              } else {
                tasks.push(task);
              }
              this.offlineStorage.saveTasks(tasks).catch(() => {
                // Silently fail cache update
              });
            });
          }
        }),
        catchError((error) => {
          
          // If API fails, try to get from cache as fallback
          return from(this.offlineStorage.getTasks()).pipe(
            switchMap(tasks => {
              const cachedTask = tasks.find(t => t.id === id);
              if (cachedTask) {
                return of(cachedTask);
              } else {
                // No cache, return the original error
                return this.handleError(error);
              }
            }),
            catchError(() => this.handleError(error))
          );
        })
      );
    } else {
      // Offline: get from cache only
      return from(this.offlineStorage.getTasks()).pipe(
        switchMap(tasks => {
          const task = tasks.find(t => t.id === id);
          if (task) {
            console.log('Found task in cache (offline):', task);
            return of(task);
          } else {
            return throwError(() => new Error('Task not found. You are offline and the task is not cached.'));
          }
        }),
        catchError(this.handleError)
      );
    }
  }

  createTask(task: Partial<Task> & { title: string; description: string; dueDate: string; priority: Task['priority']; category: string; status: Task['status'] }): Observable<Task> {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: 0, // Will be assigned by backend
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      priority: task.priority,
      category: task.category,
      status: task.status,
      createdAt: now,
      updatedAt: now,
      // Enhanced fields with defaults
      tags: task.tags || [],
      estimatedTime: task.estimatedTime || 0,
      actualTime: task.actualTime || 0,
      subtasks: task.subtasks || [],
      parentTaskId: task.parentTaskId || null,
      dependencies: task.dependencies || [],
      templateId: task.templateId || null,
      completedAt: null,
      difficulty: task.difficulty || 'medium',
      energyLevel: task.energyLevel || 'medium',
      location: task.location || null,
      attachments: task.attachments || [],
      notes: task.notes || '',
      reminders: task.reminders || [],
      userId: task.userId || 1
    };

    if (!this.offlineStorage.isOnline()) {
      // Queue for sync when offline
      const tempId = Date.now();
      const taskWithTempId = { ...newTask, id: tempId };
      return from(this.offlineStorage.addToSyncQueue('create', taskWithTempId)).pipe(
        switchMap(() => {
          // Save to local storage
          return from(this.offlineStorage.getTasks()).pipe(
            switchMap(tasks => {
              tasks.push(taskWithTempId);
              return from(this.offlineStorage.saveTasks(tasks)).pipe(
                switchMap(() => of(taskWithTempId))
              );
            })
          );
        }),
        catchError(this.handleError)
      );
    }

    return this.http.post<Task>(this.apiUrl, newTask).pipe(
      tap(createdTask => {
        // Update cache
        this.offlineStorage.getTasks().then(tasks => {
          tasks.push(createdTask);
          this.offlineStorage.saveTasks(tasks);
        });
      }),
      catchError(this.handleError)
    );
  }

  updateTask(id: number, task: Partial<Task>): Observable<Task> {
    // Use PATCH for partial updates (JSON Server supports this)
    const updatedTask: any = {
      ...task,
      updatedAt: new Date().toISOString()
    };
    
    // Remove undefined values to avoid issues with JSON Server
    Object.keys(updatedTask).forEach(key => {
      if (updatedTask[key] === undefined) {
        delete updatedTask[key];
      }
    });

    if (!this.offlineStorage.isOnline()) {
      // Queue for sync when offline
      return from(this.offlineStorage.getTasks()).pipe(
        switchMap(tasks => {
          const taskIndex = tasks.findIndex(t => t.id === id);
          if (taskIndex === -1) {
            return throwError(() => new Error('Task not found in offline storage'));
          }
          const existingTask = tasks[taskIndex];
          const mergedTask = { ...existingTask, ...updatedTask };
          tasks[taskIndex] = mergedTask;
          
          return from(this.offlineStorage.addToSyncQueue('update', mergedTask)).pipe(
            switchMap(() => from(this.offlineStorage.saveTasks(tasks))),
            switchMap(() => of(mergedTask))
          );
        }),
        catchError(this.handleError)
      );
    }
    
    return this.http.patch<Task>(`${this.apiUrl}/${id}`, updatedTask).pipe(
      catchError((error) => {
        // If API fails, try to update cache and queue for sync
        return from(this.offlineStorage.getTasks()).pipe(
          switchMap(tasks => {
            const taskIndex = tasks.findIndex(t => t.id === id);
            if (taskIndex === -1) {
              // Task not in cache either, return original error
              return this.handleError(error);
            }
            
            // Update cache and queue for sync
            const existingTask = tasks[taskIndex];
            const mergedTask = { ...existingTask, ...updatedTask };
            tasks[taskIndex] = mergedTask;
            
            return from(this.offlineStorage.addToSyncQueue('update', mergedTask)).pipe(
              switchMap(() => from(this.offlineStorage.saveTasks(tasks))),
              switchMap(() => of(mergedTask)),
              catchError(() => this.handleError(error))
            );
          }),
          catchError(() => this.handleError(error))
        );
      }),
      tap(updated => {
        // Update cache on success
        this.offlineStorage.getTasks().then(tasks => {
          const index = tasks.findIndex(t => t.id === id);
          if (index !== -1) {
            tasks[index] = updated;
            this.offlineStorage.saveTasks(tasks);
          } else {
            // Task not in cache, add it
            tasks.push(updated);
            this.offlineStorage.saveTasks(tasks);
          }
        }).catch(() => {
          // Silently fail cache update
        });
      })
    );
  }

  deleteTask(id: number): Observable<void> {
    if (!this.offlineStorage.isOnline()) {
      // Queue for sync when offline
      return from(this.offlineStorage.addToSyncQueue('delete', { id })).pipe(
        switchMap(() => {
          return from(this.offlineStorage.getTasks()).pipe(
            switchMap(tasks => {
              const filtered = tasks.filter(t => t.id !== id);
              return from(this.offlineStorage.saveTasks(filtered)).pipe(
                switchMap(() => of(undefined))
              );
            })
          );
        }),
        catchError(this.handleError)
      );
    }

    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        // Update cache
        this.offlineStorage.getTasks().then(tasks => {
          const filtered = tasks.filter(t => t.id !== id);
          this.offlineStorage.saveTasks(filtered);
        });
      }),
      catchError(this.handleError)
    );
  }

  getTasksByStatus(status: Task['status']): Observable<Task[]> {
    const params = new HttpParams().set('status', status);
    return this.http.get<Task[]>(this.apiUrl, { params }).pipe(
      catchError(this.handleError)
    );
  }

  getTasksByCategory(category: string): Observable<Task[]> {
    const params = new HttpParams().set('category', category);
    return this.http.get<Task[]>(this.apiUrl, { params }).pipe(
      catchError(this.handleError)
    );
  }

  searchTasks(query: string): Observable<Task[]> {
    return this.http.get<Task[]>(this.apiUrl).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred:', error);
    
    let errorMessage = 'Something went wrong. Please try again later.';
    
    if (error.status === 0) {
      errorMessage = 'Cannot connect to server. Please make sure JSON Server is running on port 3000.';
    } else if (error.status === 404) {
      errorMessage = 'Task not found.';
    } else if (error.status === 401) {
      errorMessage = 'Unauthorized. Please login again.';
    } else if (error.status >= 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}

