import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableContainerProps {
  id: string;
  className?: string;
  children: React.ReactNode;
}

export const DroppableContainer: React.FC<DroppableContainerProps> = ({
  id,
  className = '',
  children
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  const overClassName = isOver ? ' ring-2 ring-blue-400/30' : '';

  return (
    <div ref={setNodeRef} className={`${className}${overClassName}`}>
      {children}
    </div>
  );
};
