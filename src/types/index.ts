export interface Checkpoint {
  id: string | number;
  text: string;
  done: boolean;
}

export interface Task {
  id: string | number;
  title: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  order: number;
  checkpoints: Checkpoint[];
  createdAt: any;
  completedAt: any | null; // Дата завершения задачи
  postponeCount: number; // Счётчик переносов задачи
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface TaskRepository {
  getTasksByDate(date: string): Promise<Task[]>;
  addTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<string | number>;
  updateTask(id: string | number, data: Partial<Task>): Promise<void>;
  deleteTask(id: string | number): Promise<void>;
  reorderTasks(dateKey: string, orderedIds: string[]): Promise<void>;
  onTasksChange(date: string, callback: (tasks: Task[]) => void): () => void;
  getTasksForMonth(year: number, month: number): Promise<Task[]>;
  getAllTasks(): Promise<Task[]>;
  /**
   * Подписывается на изменения задач за весь месяц в реальном времени.
   * Возвращает функцию для отписки.
   */
  onTasksForMonthChange(year: number, month: number, callback: (tasks: Task[]) => void): () => void;
}
