import React, { useRef } from 'react';
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

  const pointerStateRef = useRef<{
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);

  const listeners = disabled
    ? {}
    : {
        onPointerDown: (event: React.PointerEvent) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest('input, textarea, select, a, [data-dnd-ignore]')) {
            return;
          }

          pointerStateRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            active: false
          };

          const handlePointerMove = (moveEvent: PointerEvent) => {
            const state = pointerStateRef.current;
            if (!state) return;
            if (state.active) return;
            const deltaX = moveEvent.clientX - state.startX;
            const deltaY = moveEvent.clientY - state.startY;
            const distance = Math.hypot(deltaX, deltaY);
            if (distance < 6) return;

            state.active = true;
            context.startDrag(id, { x: state.startX, y: state.startY });
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
          };

          const handlePointerUp = () => {
            pointerStateRef.current = null;
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
          };

          window.addEventListener('pointermove', handlePointerMove);
          window.addEventListener('pointerup', handlePointerUp);
          window.addEventListener('pointercancel', handlePointerUp);
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
