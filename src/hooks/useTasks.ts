import { useState, useEffect, useMemo } from 'react';
import type { Task, Checkpoint } from '../types';
import { mockTaskRepository } from '../services/mockTasks';
import { createFirebaseRepository } from '../services/firebaseTasks';
import { useAuth } from '../context/AuthContext';

export function useTasks(date: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  // Decide which repository to use based on auth state
  const repository = useMemo(() => {
    // If user is logged in, use Firebase
    if (user) {
      return createFirebaseRepository(user.uid);
    }

    // Default to mock (should not be reached in production if auth guarded)
    return mockTaskRepository;
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = repository.onTasksChange(date, (updatedTasks) => {
      setTasks(updatedTasks);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [date, repository]); // Re-subscribe if repository changes

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

  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      // Prevent completing if there are incomplete checkpoints
      if (!task.completed && task.checkpoints.some(cp => !cp.done)) {
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
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const currentDate = new Date(date);
      currentDate.setDate(currentDate.getDate() + 1);
      const nextDate = currentDate.toISOString().split('T')[0];
      await repository.updateTask(taskId, {
        date: nextDate,
        postponeCount: (task.postponeCount || 0) + 1
      });
    }
  };

  const moveTaskToYesterday = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const currentDate = new Date(date);
      currentDate.setDate(currentDate.getDate() - 1);
      const prevDate = currentDate.toISOString().split('T')[0];
      await repository.updateTask(taskId, {
        date: prevDate,
        postponeCount: Math.max((task.postponeCount || 0) - 1, 0)
      });
    }
  };

  const addCheckpoint = async (taskId: string, text: string) => {
    const task = tasks.find(t => t.id === taskId);
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
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const updatedCheckpoints = task.checkpoints.map(cp => 
        cp.id === checkpointId ? { ...cp, done: !cp.done } : cp
      );
      await repository.updateTask(taskId, { checkpoints: updatedCheckpoints });
    }
  };

  const deleteCheckpoint = async (taskId: string, checkpointId: string | number) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const updatedCheckpoints = task.checkpoints.filter(cp => cp.id !== checkpointId);
      await repository.updateTask(taskId, { checkpoints: updatedCheckpoints });
    }
  };

  const updateCheckpoint = async (taskId: string, checkpointId: string | number, text: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const updatedCheckpoints = task.checkpoints.map(cp =>
        cp.id === checkpointId ? { ...cp, text: text.trim() } : cp
      );
      await repository.updateTask(taskId, { checkpoints: updatedCheckpoints });
    }
  };

  return {
    tasks,
    loading,
    addTask,
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
