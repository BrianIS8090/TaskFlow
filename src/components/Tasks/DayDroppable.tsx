import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';

interface DayDroppableProps {
  id: string;
  className?: string;
  children: React.ReactNode;
}

export const DayDroppable: React.FC<DayDroppableProps> = ({ id, className, children }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        className,
        'transition-shadow',
        isOver && 'ring-2 ring-blue-500/40'
      )}
    >
      {children}
    </div>
  );
};
