import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Task } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class TagService {
  /**
   * Get all unique tags from tasks
   */
  getAllTags(tasks: Task[]): string[] {
    const tagSet = new Set<string>();
    tasks.forEach(task => {
      if (task.tags && task.tags.length > 0) {
        task.tags.forEach(tag => tagSet.add(tag.toLowerCase()));
      }
    });
    return Array.from(tagSet).sort();
  }

  /**
   * Get popular tags (most used)
   */
  getPopularTags(tasks: Task[], limit: number = 10): string[] {
    const tagCounts: { [tag: string]: number } = {};

    tasks.forEach(task => {
      if (task.tags && task.tags.length > 0) {
        task.tags.forEach(tag => {
          const lowerTag = tag.toLowerCase();
          tagCounts[lowerTag] = (tagCounts[lowerTag] || 0) + 1;
        });
      }
    });

    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag]) => tag);
  }

  /**
   * Suggest tags based on input
   */
  suggestTags(input: string, allTags: string[]): string[] {
    if (!input || input.length < 2) return [];

    const lowerInput = input.toLowerCase();
    return allTags
      .filter(tag => tag.toLowerCase().includes(lowerInput))
      .slice(0, 5);
  }

  /**
   * Get tag statistics
   */
  getTagStatistics(tasks: Task[]): { [tag: string]: { count: number; completed: number; rate: number } } {
    const stats: { [tag: string]: { count: number; completed: number } } = {};

    tasks.forEach(task => {
      if (task.tags && task.tags.length > 0) {
        task.tags.forEach(tag => {
          const lowerTag = tag.toLowerCase();
          if (!stats[lowerTag]) {
            stats[lowerTag] = { count: 0, completed: 0 };
          }
          stats[lowerTag].count++;
          if (task.status === 'completed') {
            stats[lowerTag].completed++;
          }
        });
      }
    });

    const result: { [tag: string]: { count: number; completed: number; rate: number } } = {};

    for (const [tag, data] of Object.entries(stats)) {
      result[tag] = {
        ...data,
        rate: data.count > 0 ? (data.completed / data.count) * 100 : 0
      };
    }

    return result;
  }

  /**
   * Filter tasks by tags
   */
  filterTasksByTags(tasks: Task[], tags: string[]): Task[] {
    if (!tags || tags.length === 0) return tasks;

    return tasks.filter(task => {
      if (!task.tags || task.tags.length === 0) return false;
      return tags.some(tag => 
        task.tags!.some(taskTag => taskTag.toLowerCase() === tag.toLowerCase())
      );
    });
  }
}

