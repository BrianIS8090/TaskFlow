import React from 'react';
import { useDndContext } from './core';

type DndId = string | number;

type UseSortableArgs = {
  id: DndId;
  disabled?: boolean;
};

export const SortableContext: React.FC<{
  items: Array<DndId>;
  strategy?: unknown;
  children: React.ReactNode;
}> = ({ children }) => <>{children}</>;

export const verticalListSortingStrategy = () => null;

export const arrayMove = <T,>(array: T[], from: number, to: number) => {
  const copy = [...array];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
};

export const useSortable = ({ id, disabled }: UseSortableArgs) => {
  const context = useDndContext();
  const isDragging = context.activeId === id;
  const transform = isDragging ? { x: context.delta.x, y: context.delta.y, scaleX: 1, scaleY: 1 } : undefined;
  const transition = 'transform 200ms ease';

  const setNodeRef = (node: HTMLElement | null) => {
    context.setDraggableNode(id, node);
    if (node) {
      node.setAttribute('data-dnd-draggable-id', String(id));
    }
  };

  const listeners = disabled
    ? {}
    : {
        onPointerDown: (event: React.PointerEvent) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest('button, input, textarea, select, a')) {
            return;
          }
          event.preventDefault();
          context.startDrag(id, { x: event.clientX, y: event.clientY });
        }
      };

  const attributes = {
    role: 'button',
    tabIndex: disabled ? -1 : 0
  };

  return {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  };
};
