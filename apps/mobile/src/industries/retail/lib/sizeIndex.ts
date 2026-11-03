/**
 * Sizes per product for the counter's size filter (garments, shoes). Sizes
 * live on the variants kept in the phone's mirror, so the index is built from
 * there in small slices (never blocking scrolling), works offline, and is
 * rebuilt at most every few minutes.
 */

import { useEffect, useState } from 'react';
import { offline } from '@/core/offline';

const STALE_MS = 5 * 60_000;
const SLICE = 25;

let index = new Map<string, string[]>();
let builtAt = 0;
let building: Promise<void> | null = null;
const listeners = new Set<() => void>();

const norm = (s: string) => s.trim().toUpperCase();

async function build() {
  const next = new Map<string, string[]>();
  const rows = await offline.products.search({ limit: 4000 }).catch(() => []);
  const withVariants = rows.filter((r) => r.hasVariants);
  for (let i = 0; i < withVariants.length; i += SLICE) {
    const slice = withVariants.slice(i, i + SLICE);
    const details = await Promise.all(slice.map((r) => offline.products.get(r.id).catch(() => null)));
    details.forEach((d, j) => {
      const sizes = [...new Set((d?.variants ?? []).map((v) => (v.size ? norm(v.size) : '')).filter(Boolean))];
      if (sizes.length) next.set(slice[j].id, sizes);
    });
    await new Promise((r) => setTimeout(r, 0));
  }
  index = next;
  builtAt = Date.now();
  listeners.forEach((l) => l());
}

function ensure() {
  if (building || Date.now() - builtAt < STALE_MS) return;
  building = build().catch(() => undefined).finally(() => { building = null; });
}

/** Product id → sizes (upper case), and the distinct sizes in a sensible order. */
export function useSizeIndex(order: string[] = []) {
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    ensure();
    return () => { listeners.delete(l); };
  }, []);
  const all = [...new Set([...index.values()].flat())];
  const rank = (s: string) => { const i = order.indexOf(s); return i < 0 ? 999 : i; };
  all.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, undefined, { numeric: true }));
  return { bySize: index, sizes: all };
}

export const hasSize = (sizes: Map<string, string[]>, productId: string, size: string) => sizes.get(productId)?.includes(size) ?? false;
