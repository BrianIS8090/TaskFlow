import React, { useCallback, useState } from 'react';
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
  const [isInteractionLocked, setIsInteractionLocked] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { containerId },
    disabled: isInteractionLocked,
    animateLayoutChanges: (args) => {
      if (args.isSorting || args.wasDragging) {
        return true;
      }
      return defaultAnimateLayoutChanges(args);
    }
  });
  const handleInteractionChange = useCallback((isInteracting: boolean) => {
    setIsInteractionLocked(isInteracting);
  }, []);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    touchAction: isDragging ? 'none' as const : 'pan-y' as const
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
      className={`transition-shadow will-change-transform ${isDragging ? 'opacity-45' : ''}`}
    >
      <TaskItem
        {...props}
        className={itemClassName}
        onInteractionChange={handleInteractionChange}
      />
    </div>
  );
};
