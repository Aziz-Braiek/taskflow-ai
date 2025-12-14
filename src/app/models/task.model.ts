import { SubTask } from './subtask.model';
import { Attachment } from './attachment.model';
import { Reminder } from './reminder.model';

export interface Task {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  
  // Enhanced fields
  tags: string[];
  estimatedTime: number; // Estimated duration in minutes
  actualTime: number; // Actual time spent in minutes
  subtasks: SubTask[];
  parentTaskId: number | null; // For subtask relationships
  dependencies: number[]; // Array of task IDs this depends on
  templateId: number | null; // If created from template
  completedAt: string | null; // Completion timestamp
  difficulty: 'easy' | 'medium' | 'hard'; // Task difficulty
  energyLevel: 'low' | 'medium' | 'high'; // Required energy level
  location: string | null; // Location for task
  attachments: Attachment[]; // File attachments
  notes: string; // Rich text notes
  reminders: Reminder[]; // Multiple reminders
  userId: number; // User who owns the task
}

