export interface SubTask {
  id: number;
  title: string;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  order: number;
}

