import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type DndId = string | number;

export type DragEndEvent = {
  active: { id: DndId };
  over: { id: DndId } | null;
};

type DragState = {
  activeId: DndId | null;
  overId: DndId | null;
  delta: { x: number; y: number };
};

type DndContextValue = DragState & {
  startDrag: (id: DndId, point: { x: number; y: number }) => void;
  endDrag: () => void;
  setOverId: (id: DndId | null) => void;
  setDraggableNode: (id: DndId, node: HTMLElement | null) => void;
  setDroppableNode: (id: DndId, node: HTMLElement | null) => void;
};

const DndInternalContext = createContext<DndContextValue | null>(null);

const getClosestDndElementId = (element: Element | null) => {
  if (!element) return null;
  const draggable = element.closest('[data-dnd-draggable-id]');
  if (draggable) {
    return draggable.getAttribute('data-dnd-draggable-id');
  }
  const droppable = element.closest('[data-dnd-droppable-id]');
  if (droppable) {
    return droppable.getAttribute('data-dnd-droppable-id');
  }
  return null;
};

export const DndContext: React.FC<{
  children: React.ReactNode;
  sensors?: unknown;
  onDragEnd?: (event: DragEndEvent) => void;
}> = ({ children, onDragEnd }) => {
  const [state, setState] = useState<DragState>({
    activeId: null,
    overId: null,
    delta: { x: 0, y: 0 }
  });
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const dragActiveRef = useRef<DndId | null>(null);
  const droppableNodes = useRef(new Map<DndId, HTMLElement | null>());
  const draggableNodes = useRef(new Map<DndId, HTMLElement | null>());

  const startDrag = useCallback((id: DndId, point: { x: number; y: number }) => {
    dragActiveRef.current = id;
    startPointRef.current = point;
    setState({
      activeId: id,
      overId: null,
      delta: { x: 0, y: 0 }
    });
  }, []);

  const endDrag = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeId: null,
      overId: null,
      delta: { x: 0, y: 0 }
    }));
    dragActiveRef.current = null;
    startPointRef.current = null;
  }, []);

  const setOverId = useCallback((id: DndId | null) => {
    setState((prev) => ({ ...prev, overId: id }));
  }, []);

  const setDraggableNode = useCallback((id: DndId, node: HTMLElement | null) => {
    draggableNodes.current.set(id, node);
  }, []);

  const setDroppableNode = useCallback((id: DndId, node: HTMLElement | null) => {
    droppableNodes.current.set(id, node);
  }, []);

  useEffect(() => {
    if (!state.activeId) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragActiveRef.current || !startPointRef.current) return;
      const delta = {
        x: event.clientX - startPointRef.current.x,
        y: event.clientY - startPointRef.current.y
      };
      setState((prev) => ({ ...prev, delta }));

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const overId = getClosestDndElementId(element);
      setState((prev) => ({ ...prev, overId }));
    };

    const handlePointerUp = () => {
      const activeId = dragActiveRef.current;
      if (activeId) {
        onDragEnd?.({
          active: { id: activeId },
          over: state.overId ? { id: state.overId } : null
        });
      }
      endDrag();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [endDrag, onDragEnd, state.activeId, state.overId]);

  const value = useMemo(
    () => ({
      ...state,
      startDrag,
      endDrag,
      setOverId,
      setDraggableNode,
      setDroppableNode
    }),
    [endDrag, setDroppableNode, setDraggableNode, setOverId, startDrag, state]
  );

  return <DndInternalContext.Provider value={value}>{children}</DndInternalContext.Provider>;
};

export class PointerSensor {
  options?: unknown;

  constructor(options?: unknown) {
    this.options = options;
  }
}

export class TouchSensor {
  options?: unknown;

  constructor(options?: unknown) {
    this.options = options;
  }
}

export const useSensor = <T,>(sensor: T, _options?: unknown) => sensor;

export const useSensors = (...sensors: unknown[]) => sensors;

export const useDroppable = ({ id }: { id: DndId }) => {
  const context = useContext(DndInternalContext);

  const setNodeRef = useCallback(
    (node: HTMLElement | null) => {
      if (!context) return;
      context.setDroppableNode(id, node);
      if (node) {
        node.setAttribute('data-dnd-droppable-id', String(id));
      }
    },
    [context, id]
  );

  const isOver = context?.overId === id;

  return { setNodeRef, isOver: !!isOver };
};

export const useDndContext = () => {
  const context = useContext(DndInternalContext);
  if (!context) {
    throw new Error('useDndContext должен использоваться внутри DndContext');
  }
  return context;
};
