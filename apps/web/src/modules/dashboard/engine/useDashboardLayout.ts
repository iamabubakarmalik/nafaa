/**
 * The user's dashboard layout: widget order, visibility and width, the
 * headline numbers they picked, and their daily sales target.
 *
 * Saved on the server so it follows the user across devices, with a local
 * copy so the dashboard opens with the right layout offline or before the
 * server answers. Widgets added to a config after the user saved a layout
 * appear at the end, visible unless they are `defaultHidden`.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { preferencesApi } from '@core/api/preferences.api';
import { useAuthStore } from '@core/stores/auth.store';
import type { DashboardConfig, DashboardLayout, KpiDef, WidgetDef, WidgetSize } from './types';
import { t } from '@core/i18n';

const QUERY_KEY = ['preferences', 'dashboard'];
const EMPTY: DashboardLayout = { order: [], hidden: [], sizes: {}, kpis: [], target: 0 };
const localKey = (userId?: string) => `nafaa-dashboard-layout:${userId ?? 'anon'}`;

const normalize = (raw: Partial<DashboardLayout> | null | undefined): DashboardLayout => ({ ...EMPTY, ...(raw ?? {}) });

function readLocal(userId?: string): DashboardLayout | null {
  try {
    const raw = localStorage.getItem(localKey(userId));
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeLocal(userId: string | undefined, layout: DashboardLayout) {
  try {
    localStorage.setItem(localKey(userId), JSON.stringify(layout));
  } catch {
    /* storage unavailable (private window); the server copy still works */
  }
}

export interface ResolvedWidget {
  widget: WidgetDef;
  visible: boolean;
  size: WidgetSize;
}

export function resolveWidgets(widgets: WidgetDef[], layout: DashboardLayout): ResolvedWidget[] {
  const byId = new Map(widgets.map((w) => [w.id, w]));
  const saved = layout.order.filter((id) => byId.has(id));
  const known = new Set(saved);
  const ordered = [...saved.map((id) => byId.get(id)!), ...widgets.filter((w) => !known.has(w.id))];
  const hidden = new Set(layout.hidden);
  return ordered.map((widget) => {
    const chosen = layout.sizes[widget.id];
    const allowed = widget.sizes ?? [widget.size];
    return {
      widget,
      visible: known.has(widget.id) ? !hidden.has(widget.id) : !widget.defaultHidden,
      size: chosen && allowed.includes(chosen) ? chosen : widget.size,
    };
  });
}

export function resolveKpis(config: DashboardConfig, layout: DashboardLayout): KpiDef[] {
  const byId = new Map(config.kpis.map((k) => [k.id, k]));
  const ids = layout.kpis.length ? layout.kpis : config.defaultKpis;
  return ids.map((id) => byId.get(id)).filter((k): k is KpiDef => !!k);
}

export function useDashboardLayout(config: DashboardConfig) {
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  const [layout, setLayout] = useState<DashboardLayout>(() => readLocal(userId) ?? EMPTY);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const server = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => preferencesApi.get<DashboardLayout>('dashboard'),
    staleTime: Infinity,
    retry: false,
  });

  // The server copy wins once it arrives; it is the one shared across devices.
  useEffect(() => {
    if (server.data === undefined) return;
    const next = normalize(server.data);
    setLayout(next);
    writeLocal(userId, next);
  }, [server.data, userId]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const commit = useCallback((next: DashboardLayout) => {
    setLayout(next);
    writeLocal(userId, next);
    qc.setQueryData(QUERY_KEY, next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      preferencesApi.save('dashboard', next).catch(() => {
        /* offline or older server; the local copy keeps the layout */
      });
    }, 600);
  }, [qc, userId]);

  const widgets = useMemo(() => resolveWidgets(config.widgets, layout), [config.widgets, layout]);
  const kpis = useMemo(() => resolveKpis(config, layout), [config, layout]);

  /** Applies a change to the resolved widget list and saves it. */
  const updateWidgets = useCallback((fn: (list: ResolvedWidget[]) => ResolvedWidget[]) => {
    const list = fn(widgets);
    commit({
      ...layout,
      order: list.map((i) => i.widget.id),
      hidden: list.filter((i) => !i.visible).map((i) => i.widget.id),
      sizes: Object.fromEntries(list.filter((i) => i.size !== i.widget.size).map((i) => [i.widget.id, i.size])),
    });
  }, [widgets, layout, commit]);

  const setVisible = useCallback((id: string, visible: boolean) =>
    updateWidgets((list) => list.map((i) => (i.widget.id === id ? { ...i, visible } : i))), [updateWidgets]);

  const setSize = useCallback((id: string, size: WidgetSize) =>
    updateWidgets((list) => list.map((i) => (i.widget.id === id ? { ...i, size } : i))), [updateWidgets]);

  const moveTo = useCallback((id: string, to: number) => updateWidgets((list) => {
    const from = list.findIndex((i) => i.widget.id === id);
    if (from < 0 || to < 0 || to >= list.length || from === to) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  }), [updateWidgets]);

  const setKpis = useCallback((ids: string[]) => commit({ ...layout, kpis: ids }), [layout, commit]);
  const setTarget = useCallback((target: number) => commit({ ...layout, target: Math.max(0, Math.round(target)) }), [layout, commit]);
  const reset = useCallback(() => commit({ ...EMPTY, target: layout.target }), [layout.target, commit]);

  const isCustomized = layout.order.length > 0 || layout.kpis.length > 0 || Object.keys(layout.sizes).length > 0;

  return { widgets, kpis, target: layout.target, setVisible, setSize, moveTo, setKpis, setTarget, reset, isCustomized };
}

export type CustomizeTab = 'widgets' | 'numbers' | 'target';

export type DashboardContextValue = ReturnType<typeof useDashboardLayout> & {
  openCustomize: (tab?: CustomizeTab) => void;
};

/** Lets widgets read the layout (the hero reads the target, the KPI strip its numbers). */
export const DashboardLayoutContext = createContext<DashboardContextValue | null>(null);

export function useDashboardContext() {
  const ctx = useContext(DashboardLayoutContext);
  if (!ctx) throw new Error(t('useDashboardContext must be used inside DashboardView'));
  return ctx;
}
