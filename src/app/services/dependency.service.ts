import { Injectable } from '@angular/core';
import { Task } from '../models/task.model';

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface DependencyNode {
  id: number;
  label: string;
  status: Task['status'];
  priority: Task['priority'];
}

export interface DependencyEdge {
  from: number;
  to: number;
  type: 'blocks' | 'depends_on';
}

@Injectable({
  providedIn: 'root'
})
export class DependencyService {
  /**
   * Validate dependencies and check for circular references
   */
  validateDependencies(taskId: number, dependencies: number[], allTasks: Task[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check if task depends on itself
    if (dependencies.includes(taskId)) {
      errors.push('Task cannot depend on itself');
      return { valid: false, errors };
    }

    // Check for circular dependencies
    if (this.hasCircularDependency(taskId, dependencies, allTasks)) {
      errors.push('Circular dependency detected');
      return { valid: false, errors };
    }

    // Check if all dependency IDs exist
    for (const depId of dependencies) {
      const depTask = allTasks.find(t => t.id === depId);
      if (!depTask) {
        errors.push(`Dependency task ${depId} not found`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check for circular dependencies using DFS
   */
  private hasCircularDependency(
    taskId: number,
    dependencies: number[],
    allTasks: Task[]
  ): boolean {
    const visited = new Set<number>();
    const recursionStack = new Set<number>();

    const dfs = (currentId: number): boolean => {
      visited.add(currentId);
      recursionStack.add(currentId);

      const task = allTasks.find(t => t.id === currentId);
      if (task && task.dependencies) {
        for (const depId of task.dependencies) {
          if (depId === taskId) {
            return true; // Circular dependency found
          }
          if (!visited.has(depId)) {
            if (dfs(depId)) {
              return true;
            }
          } else if (recursionStack.has(depId)) {
            return true; // Back edge found
          }
        }
      }

      recursionStack.delete(currentId);
      return false;
    };

    for (const depId of dependencies) {
      if (dfs(depId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all tasks that block the given task
   */
  getBlockingTasks(taskId: number, allTasks: Task[]): Task[] {
    const task = allTasks.find(t => t.id === taskId);
    if (!task || !task.dependencies || task.dependencies.length === 0) {
      return [];
    }

    return allTasks.filter(t => task.dependencies!.includes(t.id));
  }

  /**
   * Get all tasks that depend on the given task
   */
  getDependentTasks(taskId: number, allTasks: Task[]): Task[] {
    return allTasks.filter(t => t.dependencies && t.dependencies.includes(taskId));
  }

  /**
   * Check if a task can be completed (all dependencies are completed)
   */
  canCompleteTask(task: Task, allTasks: Task[]): {
    canComplete: boolean;
    blockingTasks: Task[];
  } {
    if (!task.dependencies || task.dependencies.length === 0) {
      return { canComplete: true, blockingTasks: [] };
    }

    const blockingTasks = this.getBlockingTasks(task.id, allTasks);
    const incompleteDependencies = blockingTasks.filter(
      t => t.status !== 'completed'
    );

    return {
      canComplete: incompleteDependencies.length === 0,
      blockingTasks: incompleteDependencies
    };
  }

  /**
   * Build dependency graph for visualization
   */
  buildDependencyGraph(tasks: Task[]): DependencyGraph {
    const nodes: DependencyNode[] = tasks.map(task => ({
      id: task.id,
      label: task.title,
      status: task.status,
      priority: task.priority
    }));

    const edges: DependencyEdge[] = [];
    tasks.forEach(task => {
      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach(depId => {
          edges.push({
            from: depId,
            to: task.id,
            type: 'depends_on'
          });
        });
      }
    });

    return { nodes, edges };
  }

  /**
   * Get dependency chain (all tasks in the dependency path)
   */
  getDependencyChain(taskId: number, allTasks: Task[]): Task[] {
    const chain: Task[] = [];
    const visited = new Set<number>();

    const collectDependencies = (id: number) => {
      if (visited.has(id)) return;
      visited.add(id);

      const task = allTasks.find(t => t.id === id);
      if (!task) return;

      if (task.dependencies && task.dependencies.length > 0) {
        task.dependencies.forEach(depId => {
          collectDependencies(depId);
        });
      }

      chain.push(task);
    };

    collectDependencies(taskId);
    return chain;
  }
}

