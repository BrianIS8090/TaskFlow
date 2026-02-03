import React, { useState } from 'react';
import { Check, ChevronRight, Pencil, ArrowRight, Trash2, X } from 'lucide-react';
import type { Task } from '../../types';
import { CheckpointsList } from './CheckpointsList';
import { ConfirmDialog } from '../UI/ConfirmDialog';

interface TaskItemProps {
  task: Task;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
  onMoveToTomorrow: () => void;
  onUpdateTitle: (title: string) => void;
  onAddCheckpoint: (text: string) => void;
  onToggleCheckpoint: (id: string | number) => void;
  onDeleteCheckpoint: (id: string | number) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  isExpanded,
  onToggleExpand,
  onToggleComplete,
  onDelete,
  onMoveToTomorrow,
  onUpdateTitle,
  onAddCheckpoint,
  onToggleCheckpoint,
  onDeleteCheckpoint
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    if (editValue.trim()) {
      onUpdateTitle(editValue.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(task.title);
    setIsEditing(false);
  };

  const hasIncompleteCheckpoints = task.checkpoints.some(cp => !cp.done);

  const handleToggleAttempt = () => {
    if (!task.completed && hasIncompleteCheckpoints) {
      alert('Сначала выполните все чекпоинты!');
      return;
    }
    onToggleComplete();
  };

  return (
    <div className="glass rounded-2xl overflow-hidden transition-all hover:bg-white/[0.07]">
      <div className="p-4 flex items-start gap-4">
        <button
          onClick={handleToggleAttempt}
          className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0
            ${task.completed 
              ? 'bg-green-500/20 border-green-500' 
              : hasIncompleteCheckpoints 
                ? 'border-white/10 cursor-not-allowed opacity-50' 
                : 'border-white/30 hover:border-blue-500'}`}
        >
          {task.completed && <Check className="w-4 h-4 text-green-500" />}
        </button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
                autoFocus
                className="w-full bg-white/10 text-white font-medium px-3 py-2 rounded-lg outline-none border border-white/20 focus:border-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Сохранить
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 bg-white/10 text-white/70 text-sm rounded-lg hover:bg-white/15 transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={onToggleExpand}
              className="text-left w-full"
            >
              <div className={`font-medium ${task.completed ? 'text-white/40 line-through' : 'text-white'}`}>
                {task.title}
              </div>
              <div className="text-white/50 text-sm mt-1 flex items-center gap-2">
                {task.checkpoints.length > 0 ? (
                  <span>{task.checkpoints.filter(c => c.done).length} / {task.checkpoints.length} чекпоинтов</span>
                ) : (
                  <span className="text-white/30">Нажмите чтобы добавить чекпоинты</span>
                )}
                <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </div>
            </button>
          )}

          {isExpanded && !isEditing && (
            <CheckpointsList 
              checkpoints={task.checkpoints}
              onAdd={onAddCheckpoint}
              onToggle={onToggleCheckpoint}
              onDelete={onDeleteCheckpoint}
            />
          )}
        </div>

        <div className="flex gap-2">
          {!task.completed && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/50 hover:text-blue-400 hover:bg-blue-500/20 transition-all"
                title="Редактировать"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={onMoveToTomorrow}
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/50 hover:text-orange-400 hover:bg-orange-500/20 transition-all"
                title="Перенести на завтра"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/50 hover:text-red-400 hover:bg-red-500/20 transition-all"
            title="Удалить"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Удалить задачу?"
        message={`Задача "${task.title}" будет удалена безвозвратно.`}
        confirmText="Удалить"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDelete();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};