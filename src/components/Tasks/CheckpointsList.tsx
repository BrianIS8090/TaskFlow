import React, { useState } from 'react';
import { Check, Trash2, Plus } from 'lucide-react';
import type { Checkpoint } from '../../types';

interface CheckpointsListProps {
  checkpoints: Checkpoint[];
  onToggle: (id: string | number) => void;
  onDelete: (id: string | number) => void;
  onAdd: (text: string) => void;
}

export const CheckpointsList: React.FC<CheckpointsListProps> = ({
  checkpoints,
  onToggle,
  onDelete,
  onAdd
}) => {
  const [newText, setNewText] = useState('');

  const handleAdd = () => {
    if (newText.trim()) {
      onAdd(newText.trim());
      setNewText('');
    }
  };

  return (
    <div className="mt-4 space-y-2 pl-2 border-l-2 border-white/10">
      {checkpoints.map(cp => (
        <div
          key={cp.id}
          className="flex items-start gap-3 w-full group"
        >
          <button
            onClick={() => onToggle(cp.id)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 
              ${cp.done ? 'bg-green-500 border-green-500' : 'border-white/30 hover:border-green-500'}`}
          >
            {cp.done && <Check className="w-3 h-3 text-white" />}
          </button>
          <span className={`flex-1 text-sm break-words ${cp.done ? 'text-white/40 line-through' : 'text-white/70'}`} style={{ overflowWrap: 'anywhere' }}>
            {cp.text}
          </span>
          <button
            onClick={() => {
              if (window.confirm('Удалить чекпоинт?')) {
                onDelete(cp.id);
              }
            }}
            className="w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
      
      {/* Add Checkpoint Input */}
      <div className="flex items-center gap-3 pt-2">
        <div className="w-5 h-5 rounded-md border-2 border-dashed border-white/20 flex items-center justify-center flex-shrink-0">
          <Plus className="w-3 h-3 text-white/30" />
        </div>
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Добавить чекпоинт..."
          className="flex-1 bg-transparent text-sm text-white/70 placeholder-white/30 outline-none"
        />
      </div>
    </div>
  );
};
