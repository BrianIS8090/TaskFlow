import type { ReactNode } from 'react';
import clsx from 'clsx';

type TaskDropZoneProps = {
  id: string;
  className?: string;
  children: ReactNode;
  isOver?: boolean;
};

export function TaskDropZone({ id, className, children, isOver }: TaskDropZoneProps) {
  return (
    <div
      data-day={id}
      className={clsx(
        className,
        'transition-all',
        isOver && 'ring-2 ring-blue-400/40 dark:ring-blue-400/30 bg-blue-500/5'
      )}
    >
      {children}
    </div>
  );
}
