import { useState, useCallback, useMemo } from 'react';
import type { Task, Checkpoint } from '../types';
import { createFirebaseRepository } from '../services/firebaseTasks';
import { useAuth } from '../context/AuthContext';

export interface SearchResult {
  type: 'task' | 'checkpoint';
  task: Task;
  checkpoint?: Checkpoint;
  matchText: string;
}

export function useSearch() {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const { user } = useAuth();

  // Загрузка всех задач
  const loadTasks = useCallback(async () => {
    if (!user || isLoaded) return;
    
    setLoading(true);
    try {
      const repository = createFirebaseRepository(user.uid);
      const tasks = await repository.getAllTasks();
      setAllTasks(tasks);
      setIsLoaded(true);
    } catch (error) {
      console.error('Ошибка загрузки задач для поиска:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isLoaded]);

  // Фильтрация результатов
  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase().trim();
    const searchResults: SearchResult[] = [];

    allTasks.forEach(task => {
      // Поиск по названию задачи
      if (task.title.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          type: 'task',
          task,
          matchText: task.title
        });
      }

      // Поиск по чекпоинтам
      task.checkpoints.forEach(cp => {
        if (cp.text.toLowerCase().includes(lowerQuery)) {
          searchResults.push({
            type: 'checkpoint',
            task,
            checkpoint: cp,
            matchText: cp.text
          });
        }
      });
    });

    return searchResults.slice(0, 20); // Ограничиваем количество результатов
  }, [query, allTasks]);

  const reset = useCallback(() => {
    setQuery('');
  }, []);

  return {
    query,
    setQuery,
    results,
    loading,
    loadTasks,
    reset,
    isLoaded
  };
}
