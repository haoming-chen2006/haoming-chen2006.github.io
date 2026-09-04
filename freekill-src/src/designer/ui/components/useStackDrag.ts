/**
 * Reordering a stack by dragging it, in pointer events and nothing else.
 *
 * HTML5 drag-and-drop is the wrong instrument here — it cannot be styled, it
 * does not fire on touch without a polyfill, and its drag image is a ghost of
 * the DOM node at the moment the drag started, which for a block whose face
 * contains live `<select>`s is visibly wrong. Pointer events cover mouse, pen
 * and touch in one path, and the whole thing is fifty lines.
 *
 * Two things are deliberate. The midpoints of the siblings are measured ONCE,
 * when the drag starts: doing it per move would read a layout the drag is
 * itself changing, and the insertion point would flicker between two indices
 * under a still finger. And the live drag lives in a ref with React state as a
 * mirror, so the drop can be dispatched from the event handler rather than from
 * inside a state updater — StrictMode invokes an updater twice, which would
 * reorder the stack twice per drag.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface DragState {
  /** Which stack is being dragged in — a lane, keyed by the caller. */
  key: string;
  from: number;
  /** Where it would land if the pointer came up now. */
  to: number;
  /** How far the block has been dragged, for the transform. */
  dy: number;
}

interface Session extends DragState {
  startY: number;
  midpoints: number[];
}

export interface StackDrag {
  drag: DragState | null;
  /** `onPointerDown` for a block's grip. */
  grip: (key: string, index: number) => (event: React.PointerEvent<HTMLElement>) => void;
}

export const useStackDrag = (onDrop: (key: string, from: number, to: number) => void): StackDrag => {
  const [drag, setDrag] = useState<DragState | null>(null);
  const session = useRef<Session | null>(null);
  const drop = useRef(onDrop);
  drop.current = onDrop;

  const grip = useCallback(
    (key: string, index: number) => (event: React.PointerEvent<HTMLElement>) => {
      // Only the primary button, and never the browser's own text selection.
      if (event.button !== 0) return;
      const stack = (event.currentTarget as HTMLElement).closest('[data-stack]');
      if (!stack) return;
      const items = Array.from(stack.querySelectorAll<HTMLElement>('[data-stack-item]'));
      const midpoints = items.map((el) => {
        const box = el.getBoundingClientRect();
        return box.top + box.height / 2;
      });
      session.current = { key, from: index, to: index, dy: 0, startY: event.clientY, midpoints };
      setDrag({ key, from: index, to: index, dy: 0 });
      event.preventDefault();
    },
    [],
  );

  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;

    const move = (event: PointerEvent) => {
      const s = session.current;
      if (!s) return;
      s.dy = event.clientY - s.startY;
      // The first sibling whose midpoint the pointer has not yet passed. Same
      // answer whether the drag is going up or down.
      const found = s.midpoints.findIndex((m) => event.clientY < m);
      s.to = found === -1 ? Math.max(s.midpoints.length - 1, 0) : found;
      setDrag((d) => (d && d.to === s.to && d.dy === s.dy ? d : { key: s.key, from: s.from, to: s.to, dy: s.dy }));
    };

    const up = () => {
      const s = session.current;
      session.current = null;
      setDrag(null);
      if (s && s.from !== s.to) drop.current(s.key, s.from, s.to);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [dragging]);

  return { drag, grip };
};
