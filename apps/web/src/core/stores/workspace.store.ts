import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WorkspaceId = 'pos' | 'marketplace';

export interface Workspace {
  id: WorkspaceId;
  label: string;
  shortLabel: string;
  description: string;
  rootPath: string;
}

export const WORKSPACES: Record<WorkspaceId, Workspace> = {
  pos: {
    id: 'pos',
    label: 'Business POS',
    shortLabel: 'POS',
    description: 'Inventory, Sales, Customers & Reports',
    rootPath: '/dashboard',
  },
  marketplace: {
    id: 'marketplace',
    label: 'Nafaa Marketplace',
    shortLabel: 'Marketplace',
    description: 'Public storefront, orders & customer growth',
    rootPath: '/marketplace/dashboard',
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
