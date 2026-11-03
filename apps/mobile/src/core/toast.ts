/**
 * Toast queue used by core code and screens. The <ToastHost> in the design
 * kit renders it. Import `toast` from '@/design' in screens.
 */

import { create } from 'zustand';

export type ToastTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

export interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
  duration: number;
}

interface ToastState {
  items: ToastItem[];
}

export const useToastStore = create<ToastState>(() => ({ items: [] }));

let nextId = 1;

export function showToast(input: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }): number {
  const id = nextId++;
  const item: ToastItem = { duration: input.tone === 'danger' ? 4500 : 3000, ...input, id };
  useToastStore.setState((s) => ({ items: [...s.items.filter((x) => x.title !== item.title), item].slice(-3) }));
  return id;
}

export function dismissToast(id: number) {
  useToastStore.setState((s) => ({ items: s.items.filter((x) => x.id !== id) }));
}
