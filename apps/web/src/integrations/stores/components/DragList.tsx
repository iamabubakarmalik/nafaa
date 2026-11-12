/**
 * A vertical list whose rows can be dragged into a new order (sections,
 * blocks, menu items, products in a collection). Uses the browser's own
 * drag and drop, so it needs no extra library; each row also gets up/down
 * buttons through `moveBy` for keyboard and touch users.
 */

import { useState, type ReactNode } from 'react';
import { cn } from '@core/lib/cn';

export function move<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

export function DragList<T>({ items, getKey, onReorder, renderItem, className }: {
  items: T[];
  getKey: (item: T) => string;
  onReorder: (next: T[]) => void;
  renderItem: (item: T, index: number, h: { dragging: boolean; moveBy: (delta: number) => void }) => ReactNode;
  className?: string;
}) {
  const [from, setFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  return (
    <ul className={cn('space-y-1', className)}>
      {items.map((item, i) => (
        <li key={getKey(item)}
          draggable
          onDragStart={(e) => { setFrom(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }}
          onDragOver={(e) => { if (from === null) return; e.preventDefault(); if (over !== i) setOver(i); }}
          onDrop={(e) => { e.preventDefault(); if (from !== null && over !== null) onReorder(move(items, from, over)); setFrom(null); setOver(null); }}
          onDragEnd={() => { setFrom(null); setOver(null); }}
          className={cn('relative', from === i && 'opacity-40',
            over === i && from !== null && from !== i && (from < i ? 'after:absolute after:inset-x-1 after:-bottom-0.5 after:h-0.5 after:rounded after:bg-brand-500' : 'before:absolute before:inset-x-1 before:-top-0.5 before:h-0.5 before:rounded before:bg-brand-500'))}>
          {renderItem(item, i, { dragging: from === i, moveBy: (d) => onReorder(move(items, i, i + d)) })}
        </li>
      ))}
    </ul>
  );
}
