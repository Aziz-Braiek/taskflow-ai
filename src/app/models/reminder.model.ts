export interface Reminder {
  id: number;
  taskId: number;
  reminderTime: string; // ISO date string
  reminderType: 'before' | 'at' | 'after';
  reminderOffset?: number; // minutes before/after
  notified: boolean;
  createdAt: string;
}

