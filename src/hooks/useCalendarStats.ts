import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/useAuth';
import { createFirebaseRepository } from '../services/firebaseTasks';
import { mockTaskRepository } from '../services/mockTasks';
import type { Task } from '../types';

export function useCalendarStats(year: number, month: number) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { user } = useAuth();

  // Выбираем репозиторий один раз
  const repository = useMemo(() => {
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      return mockTaskRepository;
    } else if (user) {
      return createFirebaseRepository(user.uid);
    } else {
      return mockTaskRepository;
    }
  }, [user]);

  // Подписываемся на изменения задач за месяц в реальном времени
  useEffect(() => {
    const unsubscribe = repository.onTasksForMonthChange(year, month, (monthTasks) => {
      setTasks(monthTasks);
    });

    // Очистка подписки при размонтировании или смене месяца
    return () => unsubscribe();
  }, [year, month, repository]);

  const getDayStats = (dateStr: string) => {
    const dayTasks = tasks.filter(t => t.date === dateStr);
    if (dayTasks.length === 0) return null;
    
    const incomplete = dayTasks.filter(t => !t.completed).length;
    
    // Проверяем, что завершены все задачи и все чекпоинты
    const allTasksCompleted = incomplete === 0;
    const allCheckpointsCompleted = dayTasks.every(task => 
      task.checkpoints.length === 0 || task.checkpoints.every(cp => cp.done)
    );
    
    return {
      total: dayTasks.length,
      incomplete,
      allCompleted: allTasksCompleted && allCheckpointsCompleted
    };
  };

  return { getDayStats };
}
