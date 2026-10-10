/**
 * Sidebar open/collapsed state.
 *
 * The default is "auto": the full sidebar on wide screens (1280px and up) and
 * the icon rail below that, which is where most Windows laptops land once
 * display scaling is applied. Toggling with the button or Ctrl/⌘+B stores an
 * explicit choice that then wins on every screen size.
 */

import { useCallback, useEffect, useState } from 'react';

type SidebarMode = 'auto' | 'expanded' | 'collapsed';

const STORAGE_KEY = 'nafaa-sidebar-mode';
const WIDE_QUERY = '(min-width: 1280px)';

function readMode(): SidebarMode {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'expanded' || value === 'collapsed' ? value : 'auto';
  } catch {
    return 'auto';
  }
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export function useSidebarState() {
  const [mode, setMode] = useState<SidebarMode>(readMode);
  const isWide = useMediaQuery(WIDE_QUERY);
  const collapsed = mode === 'auto' ? !isWide : mode === 'collapsed';

  const toggle = useCallback(() => {
    setMode(() => {
      const next: SidebarMode = collapsed ? 'expanded' : 'collapsed';
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* storage unavailable */ }
      return next;
    });
  }, [collapsed]);

  // Ctrl/⌘ + B toggles the sidebar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggle]);

  return { collapsed, toggle };
}
