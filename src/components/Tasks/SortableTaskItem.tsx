import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import type { Task } from '../../types';
import { TaskItem, type TaskItemProps } from './TaskItem';

interface SortableTaskItemProps extends TaskItemProps {
  task: Task;
  isDragDisabled?: boolean;
}

export const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  isDragDisabled = false,
  ...props
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: `task-${task.id}`,
    disabled: isDragDisabled
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'touch-manipulation',
        isDragging && 'opacity-70'
      )}
      {...attributes}
      {...listeners}
    >
      <div className={clsx(!isDragDisabled && 'cursor-grab active:cursor-grabbing')}>
        <TaskItem task={task} {...props} />
      </div>
    </div>
  );
};
