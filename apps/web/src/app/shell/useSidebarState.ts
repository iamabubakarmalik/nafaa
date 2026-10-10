/**
 * Sidebar open/collapsed state.
 *
 * Stored as `sidebarMode` in the user's appearance preferences, so the
 * Settings → Appearance option, Ctrl/⌘+B and every device agree. "auto" shows
 * the full sidebar from 1280px and the icon rail below that, which is where
 * most Windows laptops land once display scaling is applied.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAppearanceStore } from '@/design-system';

const WIDE_QUERY = '(min-width: 1280px)';

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
  const mode = useAppearanceStore((s) => s.resolved.sidebarMode);
  const setPersonal = useAppearanceStore((s) => s.setPersonal);
  const isWide = useMediaQuery(WIDE_QUERY);
  const collapsed = mode === 'auto' ? !isWide : mode === 'collapsed';

  const toggle = useCallback(() => {
    setPersonal({ sidebarMode: collapsed ? 'expanded' : 'collapsed' });
  }, [collapsed, setPersonal]);

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
