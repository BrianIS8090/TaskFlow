import React from 'react';
import { defaultAnimateLayoutChanges, useSortable } from '@dnd-kit/sortable';
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
    data: { containerId },
    animateLayoutChanges: (args) => {
      if (args.isSorting || args.wasDragging) {
        return true;
      }
      return defaultAnimateLayoutChanges(args);
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? 'transform 180ms ease'
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
      className={`transition-shadow will-change-transform ${isDragging ? 'opacity-0' : ''}`}
    >
      <TaskItem {...props} className={itemClassName} />
    </div>
  );
};
