import { useEffect, useMemo, useState } from 'react';
import type { Checkpoint, Task } from '../types';
import { mockTaskRepository } from '../services/mockTasks';
import { createFirebaseRepository } from '../services/firebaseTasks';
import { useAuth } from '../context/AuthContext';
import { endOfWeek, format, startOfWeek } from 'date-fns';

export function useTasksForWeek(anchorDate: Date) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthTasks, setMonthTasks] = useState<Record<string, Task[]>>({});
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

  useEffect(() => {
    setLoading(true);
    setMonthTasks({});
    const monthKeys = new Set<string>();
    const months = [weekStart, weekEnd].map((date) => ({
      year: date.getFullYear(),
      month: date.getMonth()
    }));

    const uniqueMonths = months.filter((entry) => {
      const key = `${entry.year}-${entry.month}`;
      if (monthKeys.has(key)) {
        return false;
      }
      monthKeys.add(key);
      return true;
    });

    const unsubscribes = uniqueMonths.map(({ year, month }) => {
      const key = `${year}-${month}`;
      return repository.onTasksForMonthChange(year, month, (updatedTasks) => {
        setMonthTasks((prev) => {
          const next = { ...prev, [key]: updatedTasks };
          const allLoaded = Array.from(monthKeys).every((monthKey) => monthKey in next);
          setLoading(!allLoaded);
          return next;
        });
      });
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [repository, weekEnd, weekStart]);

  useEffect(() => {
    const startKey = format(weekStart, 'yyyy-MM-dd');
    const endKey = format(weekEnd, 'yyyy-MM-dd');
    const nextTasks = Object.values(monthTasks)
      .flat()
      .filter((task) => task.date >= startKey && task.date <= endKey)
      .sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);
    setTasks(nextTasks);
  }, [monthTasks, weekEnd, weekStart]);

  const updateTask = async (taskId: string | number, data: Partial<Task>) => {
    await repository.updateTask(taskId, data);
  };

  const toggleTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      if (!task.completed && task.checkpoints.some((cp) => !cp.done)) {
        return;
      }
      const newCompleted = !task.completed;
      await repository.updateTask(taskId, {
        completed: newCompleted,
        completedAt: newCompleted ? new Date() : null
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    await repository.deleteTask(taskId);
  };

  const updateTaskTitle = async (taskId: string, title: string) => {
    await repository.updateTask(taskId, { title });
  };

  const moveTaskToTomorrow = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const currentDate = new Date(task.date);
      currentDate.setDate(currentDate.getDate() + 1);
      const nextDate = currentDate.toISOString().split('T')[0];
      await repository.updateTask(taskId, {
        date: nextDate,
        postponeCount: (task.postponeCount || 0) + 1
      });
    }
  };

  const moveTaskToYesterday = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const currentDate = new Date(task.date);
      currentDate.setDate(currentDate.getDate() - 1);
      const prevDate = currentDate.toISOString().split('T')[0];
      await repository.updateTask(taskId, {
        date: prevDate,
        postponeCount: Math.max((task.postponeCount || 0) - 1, 0)
      });
    }
  };

  const addCheckpoint = async (taskId: string, text: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const newCheckpoint: Checkpoint = {
        id: Date.now(),
        text,
        done: false
      };
      await repository.updateTask(taskId, {
        checkpoints: [...task.checkpoints, newCheckpoint]
      });
    }
  };

  const toggleCheckpoint = async (taskId: string, checkpointId: string | number) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const updatedCheckpoints = task.checkpoints.map((cp) =>
        cp.id === checkpointId ? { ...cp, done: !cp.done } : cp
      );
      await repository.updateTask(taskId, { checkpoints: updatedCheckpoints });
    }
  };

  const deleteCheckpoint = async (taskId: string, checkpointId: string | number) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const updatedCheckpoints = task.checkpoints.filter((cp) => cp.id !== checkpointId);
      await repository.updateTask(taskId, { checkpoints: updatedCheckpoints });
    }
  };

  const updateCheckpoint = async (
    taskId: string,
    checkpointId: string | number,
    text: string
  ) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const updatedCheckpoints = task.checkpoints.map((cp) =>
        cp.id === checkpointId ? { ...cp, text: text.trim() } : cp
      );
      await repository.updateTask(taskId, { checkpoints: updatedCheckpoints });
    }
  };

  return {
    tasks,
    loading,
    weekStart,
    weekEnd,
    updateTask,
    toggleTask,
    deleteTask,
    updateTaskTitle,
    moveTaskToTomorrow,
    moveTaskToYesterday,
    addCheckpoint,
    toggleCheckpoint,
    deleteCheckpoint,
    updateCheckpoint
  };
}
