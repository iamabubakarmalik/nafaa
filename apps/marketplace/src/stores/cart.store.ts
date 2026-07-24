import { create } from 'zustand';

interface CartState {
  totalItems: number;
  isOpen: boolean;
  setTotalItems: (n: number) => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  totalItems: 0,
  isOpen: false,
  setTotalItems: (n) => set({ totalItems: n }),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));
