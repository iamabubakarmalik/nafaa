/**
 * Applies the shared appearance model to the partner portal.
 *
 * Same theme store as the merchant app and admin panel (light/dark/system,
 * accent, density, corners). The platform layer carries the partner accent:
 * Nafaa emerald.
 */

import { useEffect } from 'react';
import { applyAppearance, useAppearanceStore } from '@/design-system';

export const PARTNER_ACCENT = '#059669';

useAppearanceStore.getState().setPlatform({ brandColor: PARTNER_ACCENT, heroStyle: 'modern', heroPattern: 'dots' });

export function usePartnerTheme() {
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
