import type { Task, TaskRepository } from '../types';

class MockTaskRepository implements TaskRepository {
  private tasks: Record<string, Task[]> = {};
  private listeners: Record<string, ((tasks: Task[]) => void)[]> = {};

  async getTasksByDate(date: string): Promise<Task[]> {
    return this.getSortedTasks(date);
  }

  async addTask(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<string | number> {
    const id = Date.now();
    const newTask: Task = {
      ...taskData,
      id,
      createdAt: new Date()
    };
    
    if (!this.tasks[taskData.date]) {
      this.tasks[taskData.date] = [];
    }
    this.tasks[taskData.date].push(newTask);
    this.sortTasks(taskData.date);
    this.notify(taskData.date);
    return id;
  }

  async updateTask(id: string | number, data: Partial<Task>): Promise<void> {
    for (const date in this.tasks) {
      const index = this.tasks[date].findIndex(t => t.id === id);
      if (index !== -1) {
        const oldTask = this.tasks[date][index];
        const updatedTask = { ...oldTask, ...data };
        
        // Handle date change (move task)
        if (data.date && data.date !== date) {
          this.tasks[date].splice(index, 1);
          if (!this.tasks[data.date]) this.tasks[data.date] = [];
          this.tasks[data.date].push(updatedTask);
          this.sortTasks(date);
          this.sortTasks(data.date);
          this.notify(date);
          this.notify(data.date);
        } else {
          this.tasks[date][index] = updatedTask;
          this.sortTasks(date);
          this.notify(date);
        }
        return;
      }
    }
  }

  async deleteTask(id: string | number): Promise<void> {
    for (const date in this.tasks) {
      const index = this.tasks[date].findIndex(t => t.id === id);
      if (index !== -1) {
        this.tasks[date].splice(index, 1);
        this.sortTasks(date);
        this.notify(date);
        return;
      }
    }
  }

  async reorderTasks(dateKey: string, orderedIds: string[]): Promise<void> {
    if (!this.tasks[dateKey]) {
      return;
    }

    const taskMap = new Map(this.tasks[dateKey].map(task => [String(task.id), task]));
    const reordered: Task[] = [];

    orderedIds.forEach((id, index) => {
      const task = taskMap.get(id);
      if (task) {
        reordered.push({ ...task, order: index + 1 });
        taskMap.delete(id);
      }
    });

    const remaining = Array.from(taskMap.values()).map((task, index) => ({
      ...task,
      order: reordered.length + index + 1
    }));

    this.tasks[dateKey] = [...reordered, ...remaining];
    this.notify(dateKey);
  }

  onTasksChange(date: string, callback: (tasks: Task[]) => void): () => void {
    if (!this.listeners[date]) this.listeners[date] = [];
    this.listeners[date].push(callback);
    callback(this.getSortedTasks(date));
    
    return () => {
      this.listeners[date] = this.listeners[date].filter(l => l !== callback);
    };
  }

  async getTasksForMonth(year: number, month: number): Promise<Task[]> {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`;
    
    const result: Task[] = [];
    for (const date in this.tasks) {
      if (date >= startDate && date <= endDate) {
        result.push(...this.tasks[date]);
      }
    }
    return result;
  }

  /**
   * Подписывается на изменения задач за весь месяц.
   * Для mock репозитория подписываемся на все даты месяца.
   */
  onTasksForMonthChange(year: number, month: number, callback: (tasks: Task[]) => void): () => void {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`;
    
    // Подписываемся на все даты месяца
    const unsubscribes: (() => void)[] = [];
    
    for (const date in this.tasks) {
      if (date >= startDate && date <= endDate) {
        const unsubscribe = this.onTasksChange(date, () => {
          // Пересчитываем все задачи месяца при любом изменении
          const monthTasks: Task[] = [];
          for (const d in this.tasks) {
            if (d >= startDate && d <= endDate) {
              monthTasks.push(...this.tasks[d]);
            }
          }
          callback(monthTasks);
        });
        unsubscribes.push(unsubscribe);
      }
    }
    
    // Отправляем начальные данные
    const initialTasks: Task[] = [];
    for (const date in this.tasks) {
      if (date >= startDate && date <= endDate) {
        initialTasks.push(...this.tasks[date]);
      }
    }
    callback(initialTasks);
    
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }

  async getAllTasks(): Promise<Task[]> {
    const result: Task[] = [];
    for (const date in this.tasks) {
      result.push(...this.tasks[date]);
    }
    return result.sort((a, b) => b.date.localeCompare(a.date));
  }

  private notify(date: string) {
    if (this.listeners[date]) {
      const tasks = this.getSortedTasks(date);
      this.listeners[date].forEach(callback => callback([...tasks]));
    }
  }

  private getSortedTasks(date: string): Task[] {
    const tasks = this.tasks[date] || [];
    return [...tasks].sort((a, b) => a.order - b.order);
  }

  private sortTasks(date: string) {
    if (this.tasks[date]) {
      this.tasks[date].sort((a, b) => a.order - b.order);
    }
  }
}

export const mockTaskRepository = new MockTaskRepository();
