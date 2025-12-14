export interface UserStats {
  id: number;
  userId: number;
  date: string; // YYYY-MM-DD
  
  // Daily stats
  tasksCompleted: number;
  tasksCreated: number;
  tasksDeleted: number;
  totalTimeSpent: number; // in minutes
  averageTaskDuration: number; // in minutes
  
  // Productivity metrics
  productivityScore: number; // 0-100
  completionRate: number; // 0-100
  onTimeCompletionRate: number; // 0-100
  
  // Category breakdown
  categoryStats: {
    [category: string]: {
      completed: number;
      total: number;
      averageTime: number;
    };
  };
  
  // Priority breakdown
  priorityStats: {
    high: { completed: number; total: number };
    medium: { completed: number; total: number };
    low: { completed: number; total: number };
  };
  
  // Time-based stats
  peakProductivityHour: number; // 0-23
  tasksByHour: { [hour: string]: number };
  
  // Streak info
  currentStreak: number;
  longestStreak: number;
  
  createdAt: string;
  updatedAt: string;
}

