import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { t } from '@core/i18n';

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
    label: t('Business POS'),
    shortLabel: t('POS'),
    description: t('Inventory, Sales, Customers & Reports'),
    rootPath: '/dashboard',
  },
  marketplace: {
    id: 'marketplace',
    label: t('Nafaa Market'),
    shortLabel: t('Market'),
    description: t('Market par dukaan, online products aur customers'),
    rootPath: '/market',
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
  if (pathname === '/market' || pathname.startsWith('/market/')) return 'marketplace';
  return 'pos';
}
