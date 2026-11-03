/**
 * Reads and saves the dashboard layout (see layout.ts). The server copy is the
 * one shared with the web; a copy on the phone opens Home with the right
 * layout offline or before the server answers. A change made offline is
 * marked unsent and sent when the internet is back, so an older server copy
 * never replaces it.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { useAuthStore } from '@/core/auth/store';
import { useOnlineStatus } from '@/core/net';
import { kv } from '@/core/storage/kv';
import {
  EMPTY_LAYOUT, applyWidgets, normalize, resolveKpis, resolveWidgets,
  type DashboardLayout, type HomeWidget, type KpiDef, type ResolvedWidget, type WidgetSize,
} from './layout';

export const LAYOUT_QUERY_KEY = ['preferences', 'dashboard'];
export const MAX_KPIS = 8;

interface Local { layout: DashboardLayout; unsent: boolean }
const localKey = (userId?: string) => `home.dashboardLayout:${userId ?? 'anon'}`;

export const preferencesApi = {
  get: () => apiClient.get<DashboardLayout | null>('/preferences/dashboard').then((r) => r.data),
  save: (value: DashboardLayout) => apiClient.put<DashboardLayout>('/preferences/dashboard', value).then((r) => r.data),
};

export function useHomeLayout(widgetDefs: HomeWidget[], kpiDefs: KpiDef[], defaultKpis: string[]) {
  const userId = useAuthStore((s) => s.user?.id);
  const online = useOnlineStatus();
  const qc = useQueryClient();
  const [local, setLocal] = useState<Local>(() => kv.get<Local | null>(localKey(userId), null) ?? { layout: EMPTY_LAYOUT, unsent: false });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(local);
  latest.current = local;

  const server = useQuery({
    queryKey: LAYOUT_QUERY_KEY,
    queryFn: preferencesApi.get,
    enabled: !!userId,
    staleTime: 30_000,
    retry: false,
    meta: { persist: false },
  });

  const write = useCallback((next: Local) => {
    setLocal(next);
    kv.set(localKey(userId), next);
  }, [userId]);

  const send = useCallback((layout: DashboardLayout) => {
    preferencesApi.save(layout)
      .then((saved) => {
        qc.setQueryData(LAYOUT_QUERY_KEY, saved);
        // A newer change may have been made while this one was on its way.
        if (latest.current.layout === layout) write({ layout: normalize(saved), unsent: false });
      })
      .catch(() => { /* stays unsent; sent again when online */ });
  }, [qc, write]);

  // The server copy wins unless this device has a change it has not sent yet.
  useEffect(() => {
    if (server.data === undefined || server.dataUpdatedAt === 0) return;
    if (latest.current.unsent) return;
    write({ layout: normalize(server.data), unsent: false });
  }, [server.data, server.dataUpdatedAt, write]);

  useEffect(() => {
    if (online && local.unsent) send(local.layout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = useCallback((layout: DashboardLayout) => {
    write({ layout, unsent: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => send(layout), 500);
  }, [write, send]);

  const layout = local.layout;
  const widgets = useMemo(() => resolveWidgets(widgetDefs, layout), [widgetDefs, layout]);
  const kpis = useMemo(() => resolveKpis(kpiDefs, defaultKpis, layout), [kpiDefs, defaultKpis, layout]);

  const update = useCallback((fn: (list: ResolvedWidget[]) => ResolvedWidget[]) => {
    commit(applyWidgets(widgetDefs, layout, fn(widgets)));
  }, [commit, widgetDefs, layout, widgets]);

  const setVisible = useCallback((id: string, visible: boolean) =>
    update((list) => list.map((i) => (i.widget.id === id ? { ...i, visible } : i))), [update]);

  const setSize = useCallback((id: string, size: WidgetSize) =>
    update((list) => list.map((i) => (i.widget.id === id ? { ...i, size } : i))), [update]);

  /** New order of the visible widgets; hidden ones keep their slots. */
  const reorderVisible = useCallback((ids: string[]) => update((list) => {
    const byId = new Map(list.map((i) => [i.widget.id, i]));
    const queue = ids.map((id) => byId.get(id)!).filter(Boolean);
    let k = 0;
    return list.map((i) => (i.visible ? queue[k++] ?? i : i));
  }), [update]);

  /** Shows a hidden widget at the end of the visible ones. */
  const addWidget = useCallback((id: string) => update((list) => {
    const item = list.find((i) => i.widget.id === id);
    if (!item) return list;
    const rest = list.filter((i) => i.widget.id !== id);
    const lastVisible = rest.reduce((at, i, idx) => (i.visible ? idx : at), -1);
    rest.splice(lastVisible + 1, 0, { ...item, visible: true });
    return rest;
  }), [update]);

  /** Headline numbers: unknown ids picked on the web are kept. */
  const toggleKpi = useCallback((id: string) => {
    const known = new Set(kpiDefs.map((k) => k.id));
    const current = layout.kpis.some((k) => known.has(k)) ? layout.kpis : [...defaultKpis, ...layout.kpis.filter((k) => !known.has(k))];
    const next = current.includes(id) ? current.filter((k) => k !== id) : current.length < MAX_KPIS ? [...current, id] : current;
    commit({ ...layout, kpis: next });
  }, [commit, layout, kpiDefs, defaultKpis]);

  const resetKpis = useCallback(() => commit({ ...layout, kpis: [] }), [commit, layout]);
  const setTarget = useCallback((target: number) => commit({ ...layout, target: Math.max(0, Math.round(target)) }), [commit, layout]);
  const reset = useCallback(() => commit({ ...EMPTY_LAYOUT, target: layout.target }), [commit, layout.target]);
  const refetch = server.refetch;

  const isCustomized = layout.order.length > 0 || layout.kpis.length > 0 || Object.keys(layout.sizes).length > 0;

  return {
    widgets, kpis, target: layout.target, unsent: local.unsent, isCustomized,
    setVisible, setSize, reorderVisible, addWidget, toggleKpi, resetKpis, setTarget, reset, refetch,
  };
}

export type HomeLayout = ReturnType<typeof useHomeLayout> & {
  openTarget: () => void;
  openNumbers: () => void;
  startCustomize: () => void;
};

export const HomeLayoutContext = createContext<HomeLayout | null>(null);

export function useHomeContext(): HomeLayout {
  const ctx = useContext(HomeLayoutContext);
  if (!ctx) throw new Error('useHomeContext must be used inside HomeScreen');
  return ctx;
}
