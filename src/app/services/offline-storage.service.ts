import { Injectable } from '@angular/core';
import { Task } from '../models/task.model';
import { Observable, from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OfflineStorageService {
  private dbName = 'TaskFlowDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: false });
          taskStore.createIndex('status', 'status', { unique: false });
          taskStore.createIndex('category', 'category', { unique: false });
          taskStore.createIndex('priority', 'priority', { unique: false });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('userStats')) {
          db.createObjectStore('userStats', { keyPath: 'id', autoIncrement: false });
        }
      };
    });
  }

  /**
   * Save tasks to IndexedDB
   */
  async saveTasks(tasks: Task[]): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['tasks'], 'readwrite');
    const store = transaction.objectStore('tasks');

    // Clear existing tasks
    await store.clear();

    // Add all tasks
    for (const task of tasks) {
      await new Promise<void>((resolve, reject) => {
        const request = store.add(task);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  /**
   * Get tasks from IndexedDB
   */
  async getTasks(): Promise<Task[]> {
    if (!this.db) await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['tasks'], 'readonly');
      const store = transaction.objectStore('tasks');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Add task to sync queue
   */
  async addToSyncQueue(action: 'create' | 'update' | 'delete', task: Task | { id: number }): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const syncItem = {
        action,
        task,
        timestamp: Date.now()
      };
      const request = store.add(syncItem);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get sync queue
   */
  async getSyncQueue(): Promise<any[]> {
    if (!this.db) await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Clear sync queue
   */
  async clearSyncQueue(): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Remove item from sync queue
   */
  async removeFromSyncQueue(id: number): Promise<void> {
    if (!this.db) await this.initDB();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Get online status observable
   */
  getOnlineStatus(): Observable<boolean> {
    return new Observable(observer => {
      observer.next(navigator.onLine);

      const onlineHandler = () => observer.next(true);
      const offlineHandler = () => observer.next(false);

      window.addEventListener('online', onlineHandler);
      window.addEventListener('offline', offlineHandler);

      return () => {
        window.removeEventListener('online', onlineHandler);
        window.removeEventListener('offline', offlineHandler);
      };
    });
  }
}

