/**
 * Swipe actions on a list row: drag towards the start edge to show the end
 * actions (Stock, Edit, Delete), towards the end edge for the start actions.
 * Tapping an action closes the row first. Mirrors in Urdu: "end" is always
 * the reading end.
 *
 *   <SwipeRow end={[{ icon: Plus, label: t('Stock'), tone: 'brand', onPress: openStock },
 *                   { icon: Trash2, label: t('Delete'), tone: 'danger', onPress: remove }]}>
 *     <ListRow title={p.name} … />
 *   </SwipeRow>
 */

import type { LucideIcon } from 'lucide-react-native';
import { useRef, type ReactNode } from 'react';
import { View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { haptic } from '@/core/device/haptics';
import { useTheme } from '../theme/ThemeProvider';
import type { StatusTone } from '../theme/palette';
import { PressableScale } from './Pressable';
import { Icon } from './Icon';
import { Text } from './Text';

export interface SwipeAction {
  icon: LucideIcon;
  label: string;
  tone?: StatusTone;
  onPress: () => void;
}

const WIDTH = 76;

export function SwipeRow({ start, end, enabled = true, children }: {
  start?: SwipeAction[];
  end?: SwipeAction[];
  enabled?: boolean;
  children: ReactNode;
}) {
  const th = useTheme();
  const ref = useRef<SwipeableMethods>(null);
  if (!enabled || (!start?.length && !end?.length)) return <>{children}</>;

  const render = (actions: SwipeAction[] | undefined) => (actions?.length ? () => (
    <View style={{ flexDirection: 'row' }}>
      {actions.map((a) => {
        const tone = th.colors[a.tone ?? 'neutral'];
        return (
          <PressableScale key={a.label} accessibilityLabel={a.label} haptic="tap"
            onPress={() => { ref.current?.close(); a.onPress(); }}
            style={{ width: WIDTH, backgroundColor: tone.solid, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 4 }}>
            <Icon icon={a.icon} size={20} color={tone.onSolid} />
            <Text size="2xs" weight="semibold" color={tone.onSolid} numberOfLines={1}>{a.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  ) : undefined);

  // Gesture Handler's "right" is the physical right; in Urdu the reading end is on the left.
  const left = th.rtl ? end : start;
  const right = th.rtl ? start : end;
  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={1.8}
      leftThreshold={WIDTH / 2}
      rightThreshold={WIDTH / 2}
      overshootLeft={false}
      overshootRight={false}
      onSwipeableWillOpen={() => haptic('tap')}
      renderLeftActions={render(left)}
      renderRightActions={render(right)}
    >
      {children}
    </ReanimatedSwipeable>
  );
}
