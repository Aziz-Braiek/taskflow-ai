import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TaskService } from './task.service';
import { OfflineStorageService } from './offline-storage.service';
import { Task } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private apiUrl = 'http://localhost:3000/tasks';
  private isSyncing = false;

  constructor(
    private http: HttpClient,
    private taskService: TaskService,
    private offlineStorage: OfflineStorageService
  ) {
    // Listen for online events and sync
    this.offlineStorage.getOnlineStatus().subscribe(isOnline => {
      if (isOnline && !this.isSyncing) {
        this.syncPendingChanges();
      }
    });
  }

  /**
   * Sync pending changes when coming back online
   */
  async syncPendingChanges(): Promise<void> {
    if (this.isSyncing || !this.offlineStorage.isOnline()) {
      return;
    }

    this.isSyncing = true;
    const queue = await this.offlineStorage.getSyncQueue();

    if (queue.length === 0) {
      this.isSyncing = false;
      return;
    }

    try {
      for (const item of queue) {
        try {
          switch (item.action) {
            case 'create':
              await this.syncCreate(item.task as Task);
              break;
            case 'update':
              await this.syncUpdate(item.task as Task);
              break;
            case 'delete':
              await this.syncDelete(item.task.id);
              break;
          }
          await this.offlineStorage.removeFromSyncQueue(item.id);
        } catch (error) {
          // Failed to sync item, will retry on next sync
          // Continue with next item
        }
      }

      // Reload tasks after sync
      this.taskService.getAllTasks().subscribe();
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncCreate(task: Task): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.post<Task>(this.apiUrl, task).subscribe({
        next: (createdTask) => {
          // Update local cache with server-assigned ID
          this.offlineStorage.getTasks().then(tasks => {
            const index = tasks.findIndex(t => t.id === task.id);
            if (index !== -1) {
              tasks[index] = createdTask;
              this.offlineStorage.saveTasks(tasks);
            }
          });
          resolve();
        },
        error: reject
      });
    });
  }

  private async syncUpdate(task: Task): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.patch<Task>(`${this.apiUrl}/${task.id}`, task).subscribe({
        next: () => resolve(),
        error: reject
      });
    });
  }

  private async syncDelete(taskId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.delete<void>(`${this.apiUrl}/${taskId}`).subscribe({
        next: () => resolve(),
        error: reject
      });
    });
  }

  /**
   * Manual sync trigger
   */
  async manualSync(): Promise<void> {
    await this.syncPendingChanges();
  }
}

