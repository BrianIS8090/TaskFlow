import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Task, TaskRepository } from '../types';
import { BACKLOG_DATE } from '../types';

class FirebaseTaskRepository implements TaskRepository {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private getCollection() {
    return collection(db, 'users', this.userId, 'tasks');
  }

  async getTasksByDate(date: string): Promise<Task[]> {
    const q = query(
      this.getCollection(),
      where('date', '==', date),
      orderBy('order', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));
  }

  async addTask(taskData: Omit<Task, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(this.getCollection(), {
      ...taskData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  }

  async updateTask(id: string, data: Partial<Task>): Promise<void> {
    const docRef = doc(this.getCollection(), String(id));
    await updateDoc(docRef, data);
  }

  async deleteTask(id: string): Promise<void> {
    const docRef = doc(this.getCollection(), String(id));
    await deleteDoc(docRef);
  }

  onTasksChange(date: string, callback: (tasks: Task[]) => void): () => void {
    const q = query(
      this.getCollection(),
      where('date', '==', date),
      orderBy('order', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Task));
      callback(tasks);
    });
  }

  async getTasksForMonth(year: number, month: number): Promise<Task[]> {
    // month is 0-indexed (0 = Jan)
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`;

    const q = query(
      this.getCollection(),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));
  }

  onTasksForMonthChange(year: number, month: number, callback: (tasks: Task[]) => void): () => void {
    // month is 0-indexed (0 = Jan)
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`;

    const q = query(
      this.getCollection(),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );

    return onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Task));
      callback(tasks);
    });
  }

  onBacklogTasksChange(callback: (tasks: Task[]) => void): () => void {
    const q = query(
      this.getCollection(),
      where('date', '==', BACKLOG_DATE),
      orderBy('order', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const tasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Task));
      callback(tasks);
    });
  }

  async getAllTasks(): Promise<Task[]> {
    const q = query(this.getCollection(), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));
  }
}

export const createFirebaseRepository = (userId: string) => new FirebaseTaskRepository(userId);