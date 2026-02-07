import { useEffect, useMemo, useState } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import type { Task } from '../types';
import { mockTaskRepository } from '../services/mockTasks';
import { createFirebaseRepository } from '../services/firebaseTasks';
import { useAuth } from '../context/AuthContext';

type MonthKey = {
  year: number;
  month: number;
};

export function useWeekTasks(anchorDate: Date) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadedRange, setLoadedRange] = useState('');
  const { user } = useAuth();

  const repository = useMemo(() => {
    if (user) {
      return createFirebaseRepository(user.uid);
    }
    return mockTaskRepository;
  }, [user]);

  const weekStart = useMemo(
    () => startOfWeek(anchorDate, { weekStartsOn: 1 }),
    [anchorDate]
  );
  const weekEnd = useMemo(
    () => endOfWeek(anchorDate, { weekStartsOn: 1 }),
    [anchorDate]
  );

  const rangeStart = format(weekStart, 'yyyy-MM-dd');
  const rangeEnd = format(weekEnd, 'yyyy-MM-dd');

  const monthsToLoad = useMemo<MonthKey[]>(() => {
    const startMonth = { year: weekStart.getFullYear(), month: weekStart.getMonth() };
    const endMonth = { year: weekEnd.getFullYear(), month: weekEnd.getMonth() };
    if (startMonth.year === endMonth.year && startMonth.month === endMonth.month) {
      return [startMonth];
    }
    return [startMonth, endMonth];
  }, [weekStart, weekEnd]);

  useEffect(() => {
    const monthlyTasks = new Map<string, Task[]>();

    const unsubscribes = monthsToLoad.map(({ year, month }) =>
      repository.onTasksForMonthChange(year, month, (monthTasks) => {
        monthlyTasks.set(`${year}-${month}`, monthTasks);
        const combined = Array.from(monthlyTasks.values()).flat();
        const filtered = combined
          .filter(task => task.date >= rangeStart && task.date <= rangeEnd)
          .sort((a, b) => {
            if (a.date === b.date) {
              return (a.order || 0) - (b.order || 0);
            }
            return a.date.localeCompare(b.date);
          });
        setTasks(filtered);
        setLoadedRange(`${rangeStart}:${rangeEnd}`);
      })
    );

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [monthsToLoad, rangeStart, rangeEnd, repository]);

  return {
    tasks,
    loading: loadedRange !== `${rangeStart}:${rangeEnd}`,
    weekStart,
    weekEnd
  };
}
