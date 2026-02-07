import clsx from 'clsx';
import type { PointerEvent } from 'react';
import type { Task } from '../../types';
import { TaskItem } from './TaskItem';

type DraggableTaskItemProps = {
  task: Task;
  isExpanded: boolean;
  isDragging: boolean;
  isOver: boolean;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onToggleExpand: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
  onMoveToTomorrow: () => void;
  onMoveToYesterday: () => void;
  onMoveToDate: () => void;
  onUpdateTitle: (title: string) => void;
  onAddCheckpoint: (text: string) => void;
  onToggleCheckpoint: (cpId: string | number) => void;
  onDeleteCheckpoint: (cpId: string | number) => void;
  onUpdateCheckpoint: (cpId: string | number, text: string) => void;
  wrapperClassName?: string;
};

export function DraggableTaskItem({
  task,
  isExpanded,
  isDragging,
  isOver,
  onPointerDown,
  onToggleExpand,
  onToggleComplete,
  onDelete,
  onMoveToTomorrow,
  onMoveToYesterday,
  onMoveToDate,
  onUpdateTitle,
  onAddCheckpoint,
  onToggleCheckpoint,
  onDeleteCheckpoint,
  onUpdateCheckpoint,
  wrapperClassName
}: DraggableTaskItemProps) {
  return (
    <div
      data-task-id={String(task.id)}
      onPointerDown={onPointerDown}
      className={clsx(
        'touch-manipulation',
        'cursor-grab active:cursor-grabbing',
        'transition-all',
        isDragging && 'opacity-70 scale-[0.99] shadow-xl shadow-blue-500/15',
        isOver && 'ring-2 ring-blue-400/30 dark:ring-blue-400/25',
        wrapperClassName
      )}
    >
      <TaskItem
        task={task}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        onToggleComplete={onToggleComplete}
        onDelete={onDelete}
        onMoveToTomorrow={onMoveToTomorrow}
        onMoveToYesterday={onMoveToYesterday}
        onMoveToDate={onMoveToDate}
        onUpdateTitle={onUpdateTitle}
        onAddCheckpoint={onAddCheckpoint}
        onToggleCheckpoint={onToggleCheckpoint}
        onDeleteCheckpoint={onDeleteCheckpoint}
        onUpdateCheckpoint={onUpdateCheckpoint}
      />
    </div>
  );
}
