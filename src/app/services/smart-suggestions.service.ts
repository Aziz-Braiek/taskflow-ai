import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TaskService } from './task.service';
import { Task } from '../models/task.model';
import { parseTaskInput, detectDuplicate, suggestCategory } from '../utils/nlp-parser.util';

export interface TaskSuggestion {
  title: string;
  description?: string;
  dueDate?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  confidence: number;
}

@Injectable({
  providedIn: 'root'
})
export class SmartSuggestionsService {
  constructor(private taskService: TaskService) {}

  /**
   * Parse natural language input and suggest task properties
   */
  parseAndSuggest(input: string, existingTasks: Task[]): TaskSuggestion {
    const parsed = parseTaskInput(input);
    
    // Check for duplicates
    const duplicateCheck = detectDuplicate(
      { title: parsed.title, description: parsed.description },
      existingTasks
    );

    if (duplicateCheck.isDuplicate) {
      return {
        ...parsed,
        confidence: 1 - duplicateCheck.similarity, // Lower confidence if duplicate
        description: parsed.description || `Similar to: ${duplicateCheck.similarTask?.title}`
      };
    }

    // Suggest category if not provided
    if (!parsed.category) {
      parsed.category = suggestCategory(parsed.title, parsed.description);
    }

    // Calculate confidence based on how much we could parse
    let confidence = 0.5;
    if (parsed.dueDate) confidence += 0.2;
    if (parsed.category) confidence += 0.15;
    if (parsed.priority) confidence += 0.1;
    if (parsed.tags && parsed.tags.length > 0) confidence += 0.05;

    return {
      ...parsed,
      confidence: Math.min(1, confidence)
    };
  }

  /**
   * Suggest related tasks based on current task
   */
  suggestRelatedTasks(currentTask: Task, allTasks: Task[]): Task[] {
    const related: Task[] = [];

    // Same category
    const sameCategory = allTasks.filter(
      t => t.id !== currentTask.id && 
      t.category === currentTask.category &&
      t.status !== 'completed'
    );
    related.push(...sameCategory.slice(0, 3));

    // Similar tags
    if (currentTask.tags && currentTask.tags.length > 0) {
      const withSimilarTags = allTasks.filter(
        t => t.id !== currentTask.id &&
        t.tags && t.tags.some(tag => currentTask.tags.includes(tag)) &&
        t.status !== 'completed'
      );
      related.push(...withSimilarTags.slice(0, 2));
    }

    // Remove duplicates
    const uniqueRelated = related.filter((task, index, self) =>
      index === self.findIndex(t => t.id === task.id)
    );

    return uniqueRelated.slice(0, 5);
  }

  /**
   * Suggest optimal task order based on priority and dependencies
   */
  suggestTaskOrder(tasks: Task[]): Task[] {
    const pending = tasks.filter(t => t.status !== 'completed');
    
    // Sort by:
    // 1. Dependencies (tasks with no dependencies first)
    // 2. Priority (high first)
    // 3. Due date (earliest first)
    
    return pending.sort((a, b) => {
      // Dependencies first
      if (a.dependencies.length === 0 && b.dependencies.length > 0) return -1;
      if (a.dependencies.length > 0 && b.dependencies.length === 0) return 1;
      
      // Then priority
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      
      // Then due date
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      
      return 0;
    });
  }

  /**
   * Suggest tags based on task content
   */
  suggestTags(title: string, description?: string): string[] {
    const content = `${title} ${description || ''}`.toLowerCase();
    const suggestedTags: string[] = [];

    const tagKeywords: { [tag: string]: string[] } = {
      'urgent': ['urgent', 'asap', 'immediately', 'critical'],
      'important': ['important', 'priority', 'critical'],
      'meeting': ['meeting', 'call', 'conference'],
      'deadline': ['deadline', 'due', 'submit'],
      'review': ['review', 'check', 'verify'],
      'create': ['create', 'make', 'build', 'develop'],
      'study': ['study', 'learn', 'read', 'review'],
      'shopping': ['buy', 'purchase', 'shop', 'grocery']
    };

    for (const [tag, keywords] of Object.entries(tagKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        suggestedTags.push(tag);
      }
    }

    return suggestedTags;
  }
}

