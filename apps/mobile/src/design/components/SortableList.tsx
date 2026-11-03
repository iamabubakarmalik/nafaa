/**
 * Reorder rows by dragging. Rows have one fixed height; press and hold a row
 * (or drag the 44pt handle area at its start edge) and move it. `onReorder` gets the keys in their new
 * order when the finger lifts. `onDragging` lets a parent scroll view turn
 * scrolling off while a row is held.
 *
 *   <SortableList data={items} keyExtractor={(w) => w.id} rowHeight={72}
 *     renderItem={(w) => <MyRow item={w} />} onReorder={(ids) => save(ids)} />
 */

import { useEffect, useMemo, type ReactNode, type RefObject } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { haptic } from '@/core/device/haptics';
import { useTheme } from '../theme/ThemeProvider';
import { SPRING } from '../tokens/motion';

type Positions = Record<string, number>;

/** Width of the drag handle area at the row's start edge. */
const HANDLE = 44;

export interface SortableListProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  rowHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  onReorder: (keys: string[]) => void;
  onDragging?: (dragging: boolean) => void;
  /**
   * Ref of the surrounding react-native-gesture-handler ScrollView: swipes over
   * rows then scroll, and the handle wins over the scroll view.
   */
  scrollRef?: RefObject<unknown>;
}

export function SortableList<T>({ data, keyExtractor, rowHeight, renderItem, onReorder, onDragging, scrollRef }: SortableListProps<T>) {
  const keys = useMemo(() => data.map(keyExtractor), [data, keyExtractor]);
  const signature = keys.join('|');
  const positions = useSharedValue<Positions>(Object.fromEntries(keys.map((k, i) => [k, i])));
  useEffect(() => {
    positions.value = Object.fromEntries(keys.map((k, i) => [k, i]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const drop = (pos: Positions) => {
    const next = Object.keys(pos).sort((a, b) => pos[a] - pos[b]);
    if (next.join('|') !== signature) onReorder(next);
  };
  const dragging = (on: boolean) => {
    if (on) haptic('impact');
    onDragging?.(on);
  };

  return (
    <View style={{ height: rowHeight * data.length }}>
      {data.map((item, i) => {
        const key = keys[i];
        return (
          <SortRow key={key} id={key} scrollRef={scrollRef} index={i} count={data.length} rowHeight={rowHeight} positions={positions} onDrop={drop} onDragging={dragging}>
            {renderItem(item, i)}
          </SortRow>
        );
      })}
    </View>
  );
}

function SortRow({ id, scrollRef, index, count, rowHeight, positions, onDrop, onDragging, children }: {
  id: string; scrollRef?: RefObject<unknown>; index: number; count: number; rowHeight: number; positions: SharedValue<Positions>;
  onDrop: (p: Positions) => void; onDragging: (on: boolean) => void; children: ReactNode;
}) {
  const th = useTheme();
  const motion = th.motion;
  const rtl = th.rtl;
  const shadow = th.colors.brandScale[900];
  const y = useSharedValue(index * rowHeight);
  const startY = useSharedValue(0);
  const active = useSharedValue(false);
  /** Which of the two gestures (1 handle, 2 hold) is moving the row; 0 none. */
  const owner = useSharedValue(0);

  useAnimatedReaction(
    () => positions.value[id],
    (pos, prev) => {
      if (pos === undefined || pos === prev || active.value) return;
      y.value = motion ? withSpring(pos * rowHeight, SPRING.sheet) : pos * rowHeight;
    },
  );

  // Hold anywhere on the row, or drag the handle at the start edge straight away.
  const withHandlers = (g: ReturnType<typeof Gesture.Pan>, tag: number) => g
    .onStart(() => {
      if (owner.value !== 0) return;
      owner.value = tag;
      active.value = true;
      startY.value = y.value;
      runOnJS(onDragging)(true);
    })
    .onUpdate((e) => {
      if (owner.value !== tag) return;
      y.value = startY.value + e.translationY;
      const to = Math.max(0, Math.min(count - 1, Math.round(y.value / rowHeight)));
      const from = positions.value[id];
      if (to === from) return;
      const next: Positions = { ...positions.value };
      for (const k of Object.keys(next)) {
        if (k === id) continue;
        const p = next[k];
        if (from < to && p > from && p <= to) next[k] = p - 1;
        else if (from > to && p < from && p >= to) next[k] = p + 1;
      }
      next[id] = to;
      positions.value = next;
    })
    .onFinalize(() => {
      if (owner.value !== tag) return;
      owner.value = 0;
      active.value = false;
      y.value = withTiming(positions.value[id] * rowHeight, { duration: 160 });
      runOnJS(onDrop)(positions.value);
      runOnJS(onDragging)(false);
    });
  const pan = Gesture.Exclusive(
    withHandlers((() => {
      const g = Gesture.Pan().hitSlop(rtl ? { right: 0, width: HANDLE } : { left: 0, width: HANDLE }).activeOffsetY([-6, 6]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return scrollRef ? g.blocksExternalGesture(scrollRef as any) : g;
    })(), 1),
    withHandlers(Gesture.Pan().activateAfterLongPress(220), 2),
  );

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { scale: withTiming(active.value ? 1.03 : 1, { duration: 120 }) }],
    zIndex: active.value ? 10 : 0,
    shadowOpacity: withTiming(active.value ? 0.22 : 0, { duration: 120 }),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ position: 'absolute', top: 0, start: 0, end: 0, height: rowHeight, shadowColor: shadow, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }, style]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
