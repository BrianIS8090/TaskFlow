import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskItem } from './TaskItem';
import type { TaskItemProps } from './TaskItem';

interface SortableTaskItemProps extends TaskItemProps {
  id: string | number;
  containerId: string;
}

export const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  id,
  containerId,
  className,
  ...props
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { containerId }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const itemClassName = [className, isDragging ? 'shadow-xl ring-2 ring-blue-400/30' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`transition-shadow ${isDragging ? 'opacity-50' : ''}`}
    >
      <TaskItem {...props} className={itemClassName} />
    </div>
  );
};
