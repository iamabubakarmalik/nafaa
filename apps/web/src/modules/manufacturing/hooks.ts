/**
 * Whether manufacturing is switched on (Settings → Inventory), read from the
 * counter rules every staff member can see, and which products the counter
 * may sell without stock because they are made when sold.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { MFG_KEY, manufacturingApi } from './api';

export function useManufacturingEnabled(): boolean {
  return useManufacturingSwitch() === 'on';
}

/** 'loading' until the counter rules are in, so pages do not flash "switched off". */
export function useManufacturingSwitch(): 'loading' | 'on' | 'off' {
  const { data, isLoading } = useQuery({ queryKey: ['settings', 'counter'], queryFn: () => settingsApi.counter(), staleTime: 5 * 60_000 });
  if (isLoading) return 'loading';
  return data?.manufacturingEnabled ? 'on' : 'off';
}

const EMPTY = new Set<string>();

/** Product ids made when sold; empty (and no request) while manufacturing is off. */
export function useMadeOnSaleIds(): Set<string> {
  const enabled = useManufacturingEnabled();
  const { data } = useQuery({ queryKey: [MFG_KEY, 'make-on-sale'], queryFn: manufacturingApi.makeOnSale, enabled, staleTime: 5 * 60_000 });
  return useMemo(() => (enabled && data?.length ? new Set(data) : EMPTY), [enabled, data]);
}
