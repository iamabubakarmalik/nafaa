import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'nafaa.catalog-wishlist';

function loadWishlist(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

export function useWishlist() {
  const [ids, setIds] = useState<Set<string>>(loadWishlist);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
    } catch {}
  }, [ids]);

  const toggle = useCallback((productId: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }, []);

  const has = useCallback((productId: string) => ids.has(productId), [ids]);

  const clear = useCallback(() => setIds(new Set()), []);

  return { ids, count: ids.size, toggle, has, clear };
}
