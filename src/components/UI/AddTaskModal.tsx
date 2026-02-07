import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface AddTaskModalProps {
  isOpen: boolean;
  date: Date;
  onClose: () => void;
  onConfirm: (title: string) => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  date,
  onClose,
  onConfirm
}) => {
  const [title, setTitle] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!title.trim()) return;
    onConfirm(title.trim());
    setTitle('');
  };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center">
      {/* Затемнение фона */}
      <div 
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Модалка */}
      <div className="relative glass rounded-2xl p-6 max-w-sm w-full mx-4 animate-fade-in shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-white/15 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Новая задача</h3>
        <p className="text-sm text-slate-500 dark:text-white/50 mb-4">
          {format(date, 'd MMMM yyyy', { locale: ru })}
        </p>

        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleConfirm()}
          placeholder="Введите название задачи"
          className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 outline-none text-base border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5"
          autoFocus
        />

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/70 rounded-xl hover:bg-slate-300 dark:hover:bg-white/15 transition-colors text-sm font-medium"
          >
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 px-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            Добавить
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
