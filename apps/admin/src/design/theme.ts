/**
 * Applies the shared appearance model to the admin panel.
 *
 * The admin panel uses the same theme store as the merchant app
 * (light/dark/system, accent, density, corners, text size). It has no
 * business or industry layer: the platform layer carries the admin accent,
 * and each admin's own choices go in the personal layer (stored per browser).
 */

import { useEffect } from 'react';
import { applyAppearance, useAppearanceStore } from '@/design-system';

/** Admin accent: indigo, so the panel never looks like a merchant screen. */
export const ADMIN_ACCENT = '#4f46e5';

useAppearanceStore.getState().setPlatform({ brandColor: ADMIN_ACCENT, heroStyle: 'modern', heroPattern: 'dots' });

export function useAdminTheme() {
  const resolved = useAppearanceStore((s) => s.resolved);
  const systemDark = useAppearanceStore((s) => s.systemPrefersDark);
  const setSystemPrefersDark = useAppearanceStore((s) => s.setSystemPrefersDark);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemPrefersDark(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [setSystemPrefersDark]);

  useEffect(() => { applyAppearance(resolved, systemDark); }, [resolved, systemDark]);
}
