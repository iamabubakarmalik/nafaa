/**
 * Bottom sheet (on tablets a centered card-width sheet).
 *
 *   <Sheet open={open} onClose={() => setOpen(false)} title={t('New')} footer={<Button fullWidth>{t('Save')}</Button>}>
 *     …content (scrolls when tall; inputs stay above the keyboard)
 *   </Sheet>
 *
 * Sizes itself to its content up to 90% of the screen (or a fixed height
 * with `height`). Drag the handle down, tap the backdrop or press Android
 * back to close. Built on the native Modal, so it works from anywhere
 * (button handlers, effects, deep links) without a provider.
 */

import { X } from 'lucide-react-native';
import { createContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/core/i18n';
import { useTheme } from '../theme/ThemeProvider';
import { TABLET_MIN_WIDTH } from '../tokens/layout';
import { SPRING } from '../tokens/motion';
import { Text } from './Text';
import { IconButton } from './Button';

/** Kept for API compatibility; sheets need no provider. */
export function SheetProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/** True inside a sheet (components can adapt, e.g. tighter padding). */
export const InSheetContext = createContext(false);

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: string;
  /** Pinned under the content (main action buttons). */
  footer?: ReactNode;
  /** Fixed height instead of fitting the content: a fraction of the screen (0.6) or points. */
  height?: number;
  /** Content scrolls (default). Pass false when the content is a list that scrolls itself. */
  scrollable?: boolean;
  /** Hide the close (X) button. */
  hideClose?: boolean;
  children: ReactNode;
}

const CLOSE_DISTANCE = 120;

/**
 * iOS cannot present a native modal while another is being dismissed, so a
 * sheet that opens while another is closing (bill -> pay) waits until that
 * one is gone.
 */
let closingSheets = 0;
const waiters = new Set<() => void>();
function sheetClosed() {
  closingSheets = Math.max(0, closingSheets - 1);
  if (closingSheets) return;
  const run = [...waiters];
  waiters.clear();
  run.forEach((w) => w());
}

/** Runs `cb` once no sheet is closing (dialogs use this so iOS does not drop them). Returns a cancel function. */
export function whenSheetsIdle(cb: () => void): () => void {
  if (closingSheets === 0) { cb(); return () => undefined; }
  waiters.add(cb);
  return () => { waiters.delete(cb); };
}

export function Sheet({ open, onClose, title, description, footer, height, scrollable = true, hideClose, children }: SheetProps) {
  const th = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height: screenH } = useWindowDimensions();
  const tablet = width >= TABLET_MIN_WIDTH;
  const sheetWidth = tablet ? Math.min(560, width - 48) : width;
  const fixedHeight = height === undefined ? undefined : height <= 1 ? screenH * height : height;
  const maxHeight = screenH * 0.92 - insets.top;

  // Shown from the effect (never on first render) so a sheet closing in the same update is seen first.
  const [mounted, setMounted] = useState(false);
  // True from the start of a close until the native modal is gone.
  const closing = useRef(false);
  const released = () => {
    if (!closing.current) return;
    closing.current = false;
    sheetClosed();
  };
  useEffect(() => released, []); // eslint-disable-line react-hooks/exhaustive-deps
  const y = useSharedValue(screenH);
  const fade = useSharedValue(0);

  useEffect(() => {
    if (open) {
      const show = () => {
        setMounted(true);
        fade.value = withTiming(1, { duration: th.motion ? 200 : 0 });
        y.value = th.motion ? withSpring(0, SPRING.sheet) : 0;
      };
      // A frame later every sheet closing in this same update has been counted.
      const frame = requestAnimationFrame(() => {
        if (closingSheets > 0) waiters.add(show);
        else show();
      });
      return () => { cancelAnimationFrame(frame); waiters.delete(show); };
    } else if (mounted) {
      if (!closing.current) { closing.current = true; closingSheets += 1; }
      const finish = (closed: boolean) => {
        if (!closed) { released(); return; }
        setMounted(false);
        // iOS counts it closed on onDismiss; the timer makes sure others never wait forever.
        if (Platform.OS === 'ios') setTimeout(released, 300);
        else released();
      };
      fade.value = withTiming(0, { duration: th.motion ? 180 : 0 });
      y.value = withTiming(screenH, { duration: th.motion ? 220 : 0, easing: Easing.in(Easing.cubic) }, (done) => {
        runOnJS(finish)(!!done);
      });
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const drag = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => {
      y.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > CLOSE_DISTANCE || e.velocityY > 900) runOnJS(onClose)();
      else y.value = withSpring(0, SPRING.sheet);
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const header = (
    <GestureDetector gesture={drag}>
      <View>
        <View style={{ alignItems: 'center', paddingTop: th.space(2), paddingBottom: th.space(1) }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: th.colors.borderStrong }} />
        </View>
        {(title || !hideClose) && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: th.space(2), paddingHorizontal: th.space(4), paddingBottom: th.space(2) }}>
            <View style={{ flex: 1, gap: 2, paddingTop: 6 }}>
              {typeof title === 'string' ? <Text size="lg" weight="bold" accessibilityRole="header">{title}</Text> : title}
              {description && <Text size="sm" tone="muted">{description}</Text>}
            </View>
            {!hideClose && <IconButton icon={X} label={t('Band karein')} onPress={onClose} variant="secondary" size="sm" />}
          </View>
        )}
      </View>
    </GestureDetector>
  );

  const bottomPad = footer ? th.space(3) : Math.max(insets.bottom, th.space(4));

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}
      onDismiss={released} supportedOrientations={['portrait', 'landscape']}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: th.colors.overlay }, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('Band karein')} />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
          <Animated.View
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
            style={[{
              width: sheetWidth, alignSelf: 'center', maxHeight, height: fixedHeight,
              backgroundColor: th.colors.surfaceRaised,
              borderTopLeftRadius: th.radius('3xl'), borderTopRightRadius: th.radius('3xl'),
              borderBottomLeftRadius: tablet ? th.radius('3xl') : 0, borderBottomRightRadius: tablet ? th.radius('3xl') : 0,
              marginBottom: tablet ? th.space(6) : 0,
              shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: -4 }, elevation: 16,
              overflow: 'hidden',
            }, sheetStyle]}
          >
            <InSheetContext.Provider value>
              {header}
              {scrollable ? (
                <ScrollView
                  style={{ flexGrow: 0, flexShrink: 1 }}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingHorizontal: th.space(4), paddingBottom: bottomPad }}
                  showsVerticalScrollIndicator={false}
                >
                  {children}
                </ScrollView>
              ) : (
                <View style={{ flex: fixedHeight ? 1 : undefined, paddingBottom: bottomPad }}>{children}</View>
              )}
              {footer && (
                <View style={{ borderTopWidth: 1, borderTopColor: th.colors.divider, paddingHorizontal: th.space(4), paddingTop: th.space(3), paddingBottom: Math.max(tablet ? th.space(4) : insets.bottom, th.space(3)) }}>
                  {footer}
                </View>
              )}
            </InSheetContext.Provider>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
