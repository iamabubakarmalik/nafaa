/**
 * Haptic feedback that follows the "Haptics" switch in Appearance.
 *
 *   haptic('tap')      light tick: chips, toggles, tabs
 *   haptic('select')   selection change in pickers
 *   haptic('success')  saved, sale done
 *   haptic('warning')  needs attention
 *   haptic('error')    failed
 *   haptic('impact')   heavier: drag drop, the logo landing
 */

import * as Haptics from 'expo-haptics';
import { getAppearance } from '@/design/theme/store';

export type HapticKind = 'tap' | 'select' | 'success' | 'warning' | 'error' | 'impact';

export function haptic(kind: HapticKind = 'tap'): void {
  if (!getAppearance().mobile.haptics) return;
  const run = () => {
    switch (kind) {
      case 'tap': return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case 'impact': return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      case 'select': return Haptics.selectionAsync();
      case 'success': return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'warning': return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      case 'error': return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };
  run()?.catch(() => undefined);
}
