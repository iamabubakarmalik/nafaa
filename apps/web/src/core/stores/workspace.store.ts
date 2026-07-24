import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WorkspaceId = 'pos' | 'marketplace';

export interface Workspace {
  id: WorkspaceId;
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
  gradient: string;
  accent: string;
  accentBg: string;
  accentText: string;
  ringColor: string;
  rootPath: string;
  urlPrefix: string;
}

export const WORKSPACES: Record<WorkspaceId, Workspace> = {
  pos: {
    id: 'pos',
    label: 'Business POS',
    shortLabel: 'POS',
    emoji: '🏪',
    description: 'Inventory, Sales, Customers & Reports',
    gradient: 'from-emerald-600 via-teal-600 to-green-700',
    accent: 'emerald',
    accentBg: 'bg-emerald-500',
    accentText: 'text-emerald-600',
    ringColor: 'ring-emerald-500/30',
    rootPath: '/dashboard',
    urlPrefix: '',
  },
  marketplace: {
    id: 'marketplace',
    label: 'Nafaa Marketplace',
    shortLabel: 'Marketplace',
    emoji: '🛍️',
    description: 'Public storefront, orders & customer growth',
    gradient: 'from-purple-600 via-pink-600 to-rose-700',
    accent: 'purple',
    accentBg: 'bg-purple-500',
    accentText: 'text-purple-600',
    ringColor: 'ring-purple-500/30',
    rootPath: '/marketplace/dashboard',
    urlPrefix: '/marketplace',
  },
};

interface WorkspaceState {
  activeWorkspace: WorkspaceId;
  setWorkspace: (id: WorkspaceId) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeWorkspace: 'pos',
      setWorkspace: (id) => set({ activeWorkspace: id }),
    }),
    { name: 'nafaa-workspace' },
  ),
);

// Auto-detect from URL
export function detectWorkspaceFromPath(pathname: string): WorkspaceId {
  if (pathname.startsWith('/marketplace')) return 'marketplace';
  return 'pos';
}
