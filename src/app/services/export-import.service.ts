import { Injectable } from '@angular/core';
import { Task } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class ExportImportService {
  /**
   * Export tasks as JSON
   */
  exportAsJSON(tasks: Task[], filename: string = 'tasks-export.json'): void {
    const dataStr = JSON.stringify(tasks, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    this.downloadFile(blob, filename);
  }

  /**
   * Export tasks as CSV
   */
  exportAsCSV(tasks: Task[], filename: string = 'tasks-export.csv'): void {
    const headers = ['ID', 'Title', 'Description', 'Status', 'Priority', 'Category', 'Due Date', 'Created At', 'Tags'];
    const rows = tasks.map(task => [
      task.id.toString(),
      this.escapeCSV(task.title),
      this.escapeCSV(task.description),
      task.status,
      task.priority,
      task.category,
      task.dueDate,
      task.createdAt,
      (task.tags || []).join('; ')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    this.downloadFile(blob, filename);
  }

  /**
   * Import tasks from JSON file
   */
  async importFromJSON(file: File): Promise<Task[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const tasks = JSON.parse(content) as Task[];
          resolve(tasks);
        } catch (error) {
          reject(new Error('Invalid JSON file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Import tasks from CSV file
   */
  async importFromCSV(file: File): Promise<Task[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const lines = content.split('\n').filter(line => line.trim());
          const headers = lines[0].split(',').map(h => h.trim());
          
          const tasks: Task[] = lines.slice(1).map((line, index) => {
            const values = this.parseCSVLine(line);
            const now = new Date().toISOString();
            
            return {
              id: parseInt(values[0]) || index + 1,
              title: values[1] || 'Imported Task',
              description: values[2] || '',
              status: (values[3] as Task['status']) || 'pending',
              priority: (values[4] as Task['priority']) || 'medium',
              category: values[5] || 'Personal',
              dueDate: values[6] || '',
              createdAt: values[7] || now,
              updatedAt: now,
              tags: values[8] ? values[8].split(';').map(t => t.trim()) : [],
              estimatedTime: 0,
              actualTime: 0,
              subtasks: [],
              parentTaskId: null,
              dependencies: [],
              templateId: null,
              completedAt: null,
              difficulty: 'medium',
              energyLevel: 'medium',
              location: null,
              attachments: [],
              notes: '',
              reminders: [],
              userId: 1
            };
          });

          resolve(tasks);
        } catch (error) {
          reject(new Error('Invalid CSV file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Download file
   */
  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Escape CSV value
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Parse CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }
}

