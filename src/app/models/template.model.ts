export interface TaskTemplate {
  id: number;
  name: string;
  description: string;
  title: string;
  defaultDescription: string;
  defaultCategory: string;
  defaultPriority: 'low' | 'medium' | 'high';
  defaultEstimatedTime: number;
  defaultDifficulty: 'easy' | 'medium' | 'hard';
  defaultEnergyLevel: 'low' | 'medium' | 'high';
  tags: string[];
  subtasks: string[]; // Array of subtask titles
  isPublic: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

