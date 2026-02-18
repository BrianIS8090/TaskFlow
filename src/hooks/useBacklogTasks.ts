import { useState, useEffect, useMemo } from 'react';
import type { Task, Checkpoint } from '../types';
import { BACKLOG_DATE } from '../types';
import { mockTaskRepository } from '../services/mockTasks';
import { createFirebaseRepository } from '../services/firebaseTasks';
import { useAuth } from '../context/useAuth';

export function useBacklogTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const { user } = useAuth();

  const repository = useMemo(() => {
    if (user) {
      return createFirebaseRepository(user.uid);
    }
    return mockTaskRepository;
  }, [user]);

  useEffect(() => {
    const unsubscribe = repository.onBacklogTasksChange((updatedTasks) => {
      setTasks(updatedTasks);
      setLoaded(true);
    });
    return () => unsubscribe();
  }, [repository]);

  // Добавить задачу в бэклог
  const addBacklogTask = async (title: string) => {
    await repository.addTask({
      title,
      date: BACKLOG_DATE,
      completed: false,
      order: tasks.length + 1,
      checkpoints: [],
      completedAt: null,
      postponeCount: 0
    });
  };

  // Переместить существующую задачу в бэклог
  const moveToBacklog = async (task: Task) => {
    await repository.updateTask(String(task.id), {
      date: BACKLOG_DATE,
      postponeCount: 0
    });
  };

  const toggleTask = async (task: Task) => {
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

  const reorderTasks = async (orderedTasks: Task[]) => {
    const updates = orderedTasks
      .map((task, index) => {
        const nextOrder = index + 1;
        const needsOrderChange = task.order !== nextOrder;
        const needsDateChange = task.date !== BACKLOG_DATE;
        if (!needsOrderChange && !needsDateChange) return null;
        const updateData: Partial<Task> = { order: nextOrder };
        // При перемещении из дня в бэклог — обновляем date
        if (needsDateChange) {
          updateData.date = BACKLOG_DATE;
          updateData.postponeCount = 0;
        }
        return repository.updateTask(String(task.id), updateData);
      })
      .filter((promise): promise is Promise<void> => promise !== null);

    if (updates.length > 0) {
      await Promise.all(updates);
    }
  };

  return {
    tasks,
    loading: !loaded,
    addBacklogTask,
    moveToBacklog,
    toggleTask,
    deleteTask,
    updateTaskTitle,
    addCheckpoint,
    toggleCheckpoint,
    deleteCheckpoint,
    updateCheckpoint,
    reorderTasks
  };
}
