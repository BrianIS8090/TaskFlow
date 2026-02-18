import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Trash2, Plus, Pencil, X, MoreVertical } from 'lucide-react';
import type { Checkpoint } from '../../types';
import { ConfirmDialog } from '../UI/ConfirmDialog';

interface CheckpointsListProps {
  checkpoints: Checkpoint[];
  onToggle: (id: string | number) => void;
  onDelete: (id: string | number) => void;
  onAdd: (text: string) => void;
  onUpdate?: (id: string | number, text: string) => void;
  onEditingStateChange?: (isEditing: boolean) => void;
  compact?: boolean;
}

export const CheckpointsList: React.FC<CheckpointsListProps> = ({
  checkpoints,
  onToggle,
  onDelete,
  onAdd,
  onUpdate,
  onEditingStateChange,
  compact
}) => {
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; checkpointId: string | number | null; text: string }>({ isOpen: false, checkpointId: null, text: '' });
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | number | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRefs = useRef<Map<string | number, HTMLButtonElement>>(new Map());

  useEffect(() => {
    onEditingStateChange?.(editingId !== null || isInputFocused);
  }, [editingId, isInputFocused, onEditingStateChange]);

  useEffect(() => {
    return () => onEditingStateChange?.(false);
  }, [onEditingStateChange]);

  const handleAdd = () => {
    if (newText.trim()) {
      onAdd(newText.trim());
      setNewText('');
    }
  };

  const handleStartEdit = (cp: Checkpoint) => {
    setEditingId(cp.id);
    setEditValue(cp.text);
  };

  const handleSaveEdit = () => {
    if (editValue.trim() && editingId !== null && onUpdate) {
      onUpdate(editingId, editValue.trim());
      setEditingId(null);
      setEditValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  // Закрытие бургер-меню чекпоинта при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const btn = menuOpenId !== null ? menuButtonRefs.current.get(menuOpenId) : null;
        if (!btn || !btn.contains(event.target as Node)) {
          setMenuOpenId(null);
        }
      }
    };
    if (menuOpenId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpenId]);

  const handleOpenCpMenu = (cpId: string | number) => {
    const btn = menuButtonRefs.current.get(cpId);
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right
      });
    }
    setMenuOpenId(menuOpenId === cpId ? null : cpId);
  };

  return (
    <div className="mt-4 space-y-2 pl-2 border-l-2 border-slate-200 dark:border-white/10">
      {checkpoints.map(cp => (
        <div
          key={cp.id}
          className="flex items-start gap-3 w-full group"
        >
          <button
            onClick={() => onToggle(cp.id)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5
              ${cp.done ? 'bg-green-500 border-green-500' : 'border-slate-300 dark:border-white/30 hover:border-green-500'}`}
          >
            {cp.done && <Check className="w-3 h-3 text-white" />}
          </button>
          
          {editingId === cp.id ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                onMouseDown={(event) => event.stopPropagation()}
                onTouchStart={(event) => event.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                autoFocus
                className="flex-1 bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white text-sm px-2 py-1 rounded outline-none border border-slate-200 dark:border-white/20 focus:border-blue-500"
              />
              <button
                onClick={handleSaveEdit}
                className="w-6 h-6 rounded-md flex items-center justify-center text-green-500 hover:bg-green-500/20 transition-all"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 dark:text-white/50 hover:text-slate-600 dark:hover:text-white/70 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <>
              <span className={`flex-1 text-sm break-words ${cp.done ? 'text-slate-400 dark:text-white/40 line-through' : 'text-slate-600 dark:text-white/70'}`} style={{ overflowWrap: 'anywhere' }}>
                {cp.text}
              </span>
              {compact ? (
                /* Бургер-меню в compact-режиме */
                <div className="flex-shrink-0">
                  <button
                    ref={(el) => { if (el) menuButtonRefs.current.set(cp.id, el); }}
                    onClick={() => handleOpenCpMenu(cp.id)}
                    className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/60 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>
                  {menuOpenId === cp.id && createPortal(
                    <div
                      ref={menuRef}
                      className="fixed z-[100] glass rounded-xl py-1 min-w-[140px] shadow-xl animate-fade-in"
                      style={{ top: menuPosition.top, right: menuPosition.right }}
                    >
                      {onUpdate && (
                        <button
                          onClick={() => {
                            setMenuOpenId(null);
                            handleStartEdit(cp);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-blue-500 flex items-center gap-2 transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          Редактировать
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setMenuOpenId(null);
                          setDeleteConfirm({ isOpen: true, checkpointId: cp.id, text: cp.text });
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-red-500 flex items-center gap-2 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Удалить
                      </button>
                    </div>,
                    document.body
                  )}
                </div>
              ) : (
                /* Inline-кнопки в обычном режиме */
                <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  {onUpdate && (
                    <button
                      onClick={() => handleStartEdit(cp)}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 dark:text-white/30 hover:text-blue-500 hover:bg-blue-500/20 transition-all"
                      title="Редактировать"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteConfirm({ isOpen: true, checkpointId: cp.id, text: cp.text })}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 dark:text-white/30 hover:text-red-500 hover:bg-red-500/20 transition-all"
                    title="Удалить"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
      
      {/* Add Checkpoint Input */}
      <div className="flex items-center gap-3 pt-2">
        <div className="w-5 h-5 rounded-md border-2 border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center flex-shrink-0">
          <Plus className="w-3 h-3 text-slate-400 dark:text-white/30" />
        </div>
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
          onMouseDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Добавить чекпоинт..."
          className="flex-1 bg-transparent text-sm text-slate-600 dark:text-white/70 placeholder-slate-400 dark:placeholder-white/30 outline-none"
        />
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Удалить чекпоинт?"
        message={`Чекпоинт "${deleteConfirm.text}" будет удалён.`}
        confirmText="Удалить"
        onConfirm={() => {
          if (deleteConfirm.checkpointId !== null) {
            onDelete(deleteConfirm.checkpointId);
          }
          setDeleteConfirm({ isOpen: false, checkpointId: null, text: '' });
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, checkpointId: null, text: '' })}
      />
    </div>
  );
};
