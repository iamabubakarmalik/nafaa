/** Open state for the shell's sheets, so any screen can open them. */

import { create } from 'zustand';
import { kv } from '@/core/storage/kv';
import type { WorkspaceId } from '../navigation/nav-config';

type SheetId = 'create' | 'profile' | 'shop' | 'workspace' | 'sync' | null;

interface ShellUi {
  sheet: SheetId;
  workspace: WorkspaceId;
  open: (sheet: Exclude<SheetId, null>) => void;
  close: () => void;
  setWorkspace: (id: WorkspaceId) => void;
}

export const useShellUi = create<ShellUi>((set) => ({
  sheet: null,
  workspace: kv.get<WorkspaceId>('nafaa.workspace', 'pos'),
  open: (sheet) => set({ sheet }),
  close: () => set({ sheet: null }),
  setWorkspace: (workspace) => {
    kv.set('nafaa.workspace', workspace);
    set({ workspace });
  },
}));
