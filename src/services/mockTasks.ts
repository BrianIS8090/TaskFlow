import type { Task, TaskRepository } from '../types';

// Initial data from prototype
const initialTasks: Record<string, Task[]> = {
  '2026-02-02': [
    { 
      id: 1, 
      title: 'Подготовить презентацию для клиента', 
      date: '2026-02-02',
      completed: false, 
      order: 1,
      createdAt: new Date(),
      checkpoints: [
        { id: 1, text: 'Собрать данные', done: true },
        { id: 2, text: 'Сделать слайды', done: false },
        { id: 3, text: 'Отправить на ревью', done: false }
      ]
    },
    { 
      id: 2, 
      title: 'Созвон с командой в 15:00', 
      date: '2026-02-02',
      completed: true, 
      order: 2,
      createdAt: new Date(),
      checkpoints: [] 
    },
    { 
      id: 3, 
      title: 'Оплатить счета за хостинг', 
      date: '2026-02-02',
      completed: false, 
      order: 3,
      createdAt: new Date(),
      checkpoints: [] 
    },
  ],
  '2026-02-03': [
    { 
      id: 4, 
      title: 'Код-ревью pull request #142', 
      date: '2026-02-03',
      completed: false, 
      order: 1,
      createdAt: new Date(),
      checkpoints: [] 
    },
    { 
      id: 5, 
      title: 'Написать документацию API', 
      date: '2026-02-03',
      completed: false, 
      order: 2,
      createdAt: new Date(),
      checkpoints: [
        { id: 1, text: 'Endpoints', done: false },
        { id: 2, text: 'Примеры запросов', done: false }
      ]
    },
  ],
  '2026-02-05': [
    { 
      id: 6, 
      title: 'Встреча с заказчиком', 
      date: '2026-02-05',
      completed: false, 
      order: 1,
      createdAt: new Date(),
      checkpoints: [] 
    },
  ]
};

class MockTaskRepository implements TaskRepository {
  private tasks = { ...initialTasks };
  private listeners: Record<string, ((tasks: Task[]) => void)[]> = {};

  async getTasksByDate(date: string): Promise<Task[]> {
    return this.tasks[date] || [];
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
          this.notify(date);
          this.notify(data.date);
        } else {
          this.tasks[date][index] = updatedTask;
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
        this.notify(date);
        return;
      }
    }
  }

  onTasksChange(date: string, callback: (tasks: Task[]) => void): () => void {
    if (!this.listeners[date]) this.listeners[date] = [];
    this.listeners[date].push(callback);
    callback(this.tasks[date] || []);
    
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

  private notify(date: string) {
    if (this.listeners[date]) {
      const tasks = this.tasks[date] || [];
      this.listeners[date].forEach(callback => callback([...tasks]));
    }
  }
}

export const mockTaskRepository = new MockTaskRepository();