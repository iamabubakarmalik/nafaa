import { useMemo } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { canDo } from '@/lib/access';
import { visibleWorkspaces, workspaceForPath, type AdminWorkspace } from './nav-config';

/** Workspaces, menu items and the current workspace, limited to what the admin may see. */
export function useVisibleNav(pathname: string) {
  const user = useAuthStore((s) => s.user);
  const workspaces = useMemo(() => visibleWorkspaces((p) => canDo(user, p)), [user]);
  const items = useMemo(
    () => workspaces.flatMap((ws) => ws.groups.flatMap((g) => g.items.map((item) => ({ ...item, workspace: ws, group: g })))),
    [workspaces],
  );
  const full = workspaceForPath(pathname);
  const current: AdminWorkspace = workspaces.find((w) => w.id === full.id) ?? { ...full, groups: [] };
  return { workspaces, items, current };
}
