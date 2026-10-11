/**
 * The user's widget order and hidden widgets.
 *
 * Saved on the server so it follows the user across devices, with a local
 * copy so the dashboard opens with the right layout offline or before the
 * server answers. Widgets added to a config after the user saved a layout
 * appear at the end, visible unless they are `defaultHidden`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { preferencesApi } from '@core/api/preferences.api';
import { useAuthStore } from '@core/stores/auth.store';
import type { DashboardLayout, WidgetDef } from './types';

const QUERY_KEY = ['preferences', 'dashboard'];
const localKey = (userId?: string) => `nafaa-dashboard-layout:${userId ?? 'anon'}`;

function readLocal(userId?: string): DashboardLayout | null {
  try {
    const raw = localStorage.getItem(localKey(userId));
    return raw ? (JSON.parse(raw) as DashboardLayout) : null;
  } catch {
    return null;
  }
}

function writeLocal(userId: string | undefined, layout: DashboardLayout | null) {
  try {
    if (layout) localStorage.setItem(localKey(userId), JSON.stringify(layout));
    else localStorage.removeItem(localKey(userId));
  } catch {
    /* storage unavailable (private window) — server copy still works */
  }
}

export interface ResolvedWidget {
  widget: WidgetDef;
  visible: boolean;
}

export function resolveLayout(widgets: WidgetDef[], layout: DashboardLayout | null): ResolvedWidget[] {
  const byId = new Map(widgets.map((w) => [w.id, w]));
  const saved = layout?.order.filter((id) => byId.has(id)) ?? [];
  const known = new Set(saved);
  const ordered = [...saved.map((id) => byId.get(id)!), ...widgets.filter((w) => !known.has(w.id))];
  const hidden = new Set(layout?.hidden ?? []);
  return ordered.map((widget) => ({
    widget,
    visible: known.has(widget.id) ? !hidden.has(widget.id) : !widget.defaultHidden,
  }));
}

export function useDashboardLayout(widgets: WidgetDef[]) {
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  const [layout, setLayout] = useState<DashboardLayout | null>(() => readLocal(userId));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const server = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => preferencesApi.get<DashboardLayout>('dashboard'),
    staleTime: Infinity,
    retry: false,
  });

  // Server copy wins once it arrives; it is the one shared across devices.
  useEffect(() => {
    if (server.data === undefined) return;
    setLayout(server.data);
    writeLocal(userId, server.data);
  }, [server.data, userId]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const items = useMemo(() => resolveLayout(widgets, layout), [widgets, layout]);

  const commit = useCallback((next: DashboardLayout | null) => {
    setLayout(next);
    writeLocal(userId, next);
    qc.setQueryData(QUERY_KEY, next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      preferencesApi.save('dashboard', next ?? { order: [], hidden: [] }).catch(() => {
        /* offline or older server — the local copy keeps the layout */
      });
    }, 600);
  }, [qc, userId]);

  const toLayout = (list: ResolvedWidget[]): DashboardLayout => ({
    order: list.map((i) => i.widget.id),
    hidden: list.filter((i) => !i.visible).map((i) => i.widget.id),
  });

  const setVisible = useCallback((id: string, visible: boolean) => {
    commit(toLayout(items.map((i) => (i.widget.id === id ? { ...i, visible } : i))));
  }, [items, commit]);

  const move = useCallback((id: string, delta: -1 | 1) => {
    const from = items.findIndex((i) => i.widget.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= items.length) return;
    const next = [...items];
    [next[from], next[to]] = [next[to], next[from]];
    commit(toLayout(next));
  }, [items, commit]);

  const reset = useCallback(() => commit(null), [commit]);

  return { items, setVisible, move, reset, isCustomized: layout !== null && layout.order.length > 0 };
}
