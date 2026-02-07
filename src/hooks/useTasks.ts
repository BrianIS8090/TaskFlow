import { useState, useEffect, useMemo } from 'react';
import { differenceInCalendarDays, format } from 'date-fns';
import type { Task, Checkpoint } from '../types';
import { mockTaskRepository } from '../services/mockTasks';
import { createFirebaseRepository } from '../services/firebaseTasks';
import { useAuth } from '../context/useAuth';

export function useTasks(date: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadedDate, setLoadedDate] = useState('');
  const { user } = useAuth();
  
  // Выбираем репозиторий в зависимости от статуса авторизации
  const repository = useMemo(() => {
    // Если пользователь авторизован, используем Firebase
    if (user) {
      return createFirebaseRepository(user.uid);
    }

    // По умолчанию используем mock (в проде сюда не должны попадать при защите авторизации)
    return mockTaskRepository;
  }, [user]);

  useEffect(() => {
    const unsubscribe = repository.onTasksChange(date, (updatedTasks) => {
      setTasks(updatedTasks);
      setLoadedDate(date);
    });

    return () => unsubscribe();
  }, [date, repository]); // Повторная подписка при смене репозитория

  const addTask = async (title: string) => {
    await repository.addTask({
      title,
      date,
      completed: false,
      order: tasks.length + 1,
      checkpoints: [],
      completedAt: null,
      postponeCount: 0
    });
  };

  const addTaskToDate = async (title: string, targetDate: Date | string) => {
    const normalizedDate = typeof targetDate === 'string'
      ? targetDate
      : format(targetDate, 'yyyy-MM-dd');
    await repository.addTask({
      title,
      date: normalizedDate,
      completed: false,
      order: tasks.length + 1,
      checkpoints: [],
      completedAt: null,
      postponeCount: 0
    });
  };

  const toggleTask = async (task: Task) => {
    // Запрещаем завершение, если есть незакрытые чекпоинты
    if (!task.completed && task.checkpoints.some(cp => !cp.done)) {
      return;
    }
    const newCompleted = !task.completed;
    await repository.updateTask(String(task.id), { 
      completed: newCompleted,
      completedAt: newCompleted ? new Date() : null
    });
  };

  const deleteTask = async (taskId: string) => {
    await repository.deleteTask(taskId);
  };

  const updateTaskTitle = async (taskId: string, title: string) => {
    await repository.updateTask(taskId, { title });
  };

  const moveTaskToTomorrow = async (task: Task) => {
    const currentDate = task.date ? new Date(task.date) : new Date(date);
    currentDate.setDate(currentDate.getDate() + 1);
    const nextDate = currentDate.toISOString().split('T')[0];
    await repository.updateTask(String(task.id), {
      date: nextDate,
      postponeCount: (task.postponeCount || 0) + 1
    });
  };

  const moveTaskToYesterday = async (task: Task) => {
    const currentDate = task.date ? new Date(task.date) : new Date(date);
    currentDate.setDate(currentDate.getDate() - 1);
    const prevDate = currentDate.toISOString().split('T')[0];
    await repository.updateTask(String(task.id), {
      date: prevDate,
      postponeCount: Math.max((task.postponeCount || 0) - 1, 0)
    });
  };

  const moveTaskToDate = async (task: Task, targetDate: Date | string) => {
    const currentDate = task.date ? new Date(task.date) : new Date(date);
    const normalizedTarget = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
    const dayDiff = differenceInCalendarDays(normalizedTarget, currentDate);
    const currentPostpone = task.postponeCount || 0;
    const nextPostpone = Math.max(currentPostpone + dayDiff, 0);
    await repository.updateTask(String(task.id), {
      date: format(normalizedTarget, 'yyyy-MM-dd'),
      postponeCount: nextPostpone
    });
  };

  const addCheckpoint = async (task: Task, text: string) => {
    const newCheckpoint: Checkpoint = {
      id: Date.now(),
      text,
      done: false
    };
    await repository.updateTask(String(task.id), {
      checkpoints: [...task.checkpoints, newCheckpoint]
    });
  };

  const toggleCheckpoint = async (task: Task, checkpointId: string | number) => {
    const updatedCheckpoints = task.checkpoints.map(cp => 
      cp.id === checkpointId ? { ...cp, done: !cp.done } : cp
    );
    await repository.updateTask(String(task.id), { checkpoints: updatedCheckpoints });
  };

  const deleteCheckpoint = async (task: Task, checkpointId: string | number) => {
    const updatedCheckpoints = task.checkpoints.filter(cp => cp.id !== checkpointId);
    await repository.updateTask(String(task.id), { checkpoints: updatedCheckpoints });
  };

  const updateCheckpoint = async (task: Task, checkpointId: string | number, text: string) => {
    const updatedCheckpoints = task.checkpoints.map(cp =>
      cp.id === checkpointId ? { ...cp, text: text.trim() } : cp
    );
    await repository.updateTask(String(task.id), { checkpoints: updatedCheckpoints });
  };

  return {
    tasks,
    loading: loadedDate !== date,
    addTask,
    addTaskToDate,
    toggleTask,
    deleteTask,
    updateTaskTitle,
    moveTaskToTomorrow,
    moveTaskToYesterday,
    moveTaskToDate,
    addCheckpoint,
    toggleCheckpoint,
    deleteCheckpoint,
    updateCheckpoint
  };
}
