import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createFirebaseRepository } from '../services/firebaseTasks';
import { mockTaskRepository } from '../services/mockTasks';
import type { Task } from '../types';

export function useCalendarStats(year: number, month: number) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const loadStats = async () => {
      let repository;
      
      if (import.meta.env.VITE_USE_MOCK === 'true') {
        repository = mockTaskRepository;
      } else if (user) {
        repository = createFirebaseRepository(user.uid);
      } else {
        repository = mockTaskRepository;
      }

      try {
        const monthTasks = await repository.getTasksForMonth(year, month);
        setTasks(monthTasks);
      } catch (error) {
        console.error('Failed to load calendar stats:', error);
      }
    };

    loadStats();
  }, [year, month, user]);

  const getDayStats = (dateStr: string) => {
    const dayTasks = tasks.filter(t => t.date === dateStr);
    if (dayTasks.length === 0) return null;
    
    const incomplete = dayTasks.filter(t => !t.completed).length;
    return {
      total: dayTasks.length,
      incomplete,
      allCompleted: dayTasks.length > 0 && incomplete === 0
    };
  };

  return { getDayStats };
}
