import React, { useEffect, useRef } from 'react';
import { Search, X, FileText, CheckSquare, Calendar } from 'lucide-react';
import { useSearch } from '../../hooks/useSearch';
import type { SearchResult } from '../../hooks/useSearch';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectDate
}) => {
  const { query, setQuery, results, loading, loadTasks, reset } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadTasks();
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      reset();
    }
  }, [isOpen, loadTasks, reset]);

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleResultClick = (result: SearchResult) => {
    const taskDate = new Date(result.task.date);
    onSelectDate(taskDate);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative glass rounded-2xl w-full max-w-lg overflow-hidden animate-fade-in">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <Search className="w-5 h-5 text-white/40" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск задач и чекпоинтов..."
            className="flex-1 bg-transparent text-white placeholder-white/40 outline-none text-lg"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="w-6 h-6 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-white/50">
              <div className="animate-pulse">Загрузка...</div>
            </div>
          ) : query && results.length === 0 ? (
            <div className="p-8 text-center text-white/50">
              Ничего не найдено
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result, idx) => (
                <button
                  key={`${result.task.id}-${result.checkpoint?.id || 'task'}-${idx}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-start gap-3"
                >
                  <div className="mt-0.5">
                    {result.type === 'task' ? (
                      <FileText className="w-4 h-4 text-blue-400" />
                    ) : (
                      <CheckSquare className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">
                      {result.type === 'checkpoint' ? (
                        <>
                          <span className="text-white/50">{result.task.title} → </span>
                          {result.checkpoint?.text}
                        </>
                      ) : (
                        result.task.title
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-white/40 mt-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(result.task.date), 'd MMMM yyyy', { locale: ru })}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-white/40 text-sm">
              Начните вводить для поиска
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
