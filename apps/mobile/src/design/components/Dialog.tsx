/**
 * Centered dialogs and the confirm/alert helpers.
 *
 *   const ok = await confirm({ title: t('Delete product?'), message: t('…'), confirmLabel: t('Delete'), tone: 'danger' });
 *   if (ok) …
 *
 *   await alert({ title: t('Saved') });
 *
 *   <Dialog open={open} onClose={close} title=… actions={<>…buttons</>}>…</Dialog>
 *
 * <DialogHost> (mounted by the root layout) renders confirm()/alert().
 */

import type { LucideIcon } from 'lucide-react-native';
import { TriangleAlert } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { create } from 'zustand';
import { t } from '@/core/i18n';
import { haptic } from '@/core/device/haptics';
import { useTheme } from '../theme/ThemeProvider';
import { SPRING } from '../tokens/motion';
import { whenSheetsIdle } from './Sheet';
import { Text } from './Text';
import { Button } from './Button';
import { Icon } from './Icon';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  icon?: LucideIcon;
  tone?: 'brand' | 'danger' | 'warning' | 'success' | 'info';
  actions?: ReactNode;
  children?: ReactNode;
  /** Tapping outside closes (default true). */
  dismissable?: boolean;
}

export function Dialog({ open, onClose, title, message, icon, tone = 'brand', actions, children, dismissable = true }: DialogProps) {
  const th = useTheme();
  const { width } = useWindowDimensions();
  const s = useSharedValue(0.94);
  const o = useSharedValue(0);
  // iOS drops a modal presented while a sheet is still dismissing, so wait for the sheets first.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!open) { setReady(false); return undefined; }
    let cancel: () => void = () => undefined;
    const frame = requestAnimationFrame(() => { cancel = whenSheetsIdle(() => setReady(true)); });
    return () => { cancelAnimationFrame(frame); cancel(); };
  }, [open]);
  useEffect(() => {
    if (open) {
      s.value = th.motion ? withSpring(1, SPRING.sheet) : 1;
      o.value = withTiming(1, { duration: th.motion ? 160 : 0 });
    } else {
      s.value = 0.94;
      o.value = 0;
    }
  }, [open, th.motion, s, o]);
  const card = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: s.value }] }));
  const tc = th.colors[tone];

  return (
    <Modal visible={open && ready} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      {/* The backdrop is not an accessibility element: a focusable wrapper would hide the
          title, message and buttons inside it. Screen readers close with the escape gesture. */}
      <Pressable
        style={{ flex: 1, backgroundColor: th.colors.overlay, alignItems: 'center', justifyContent: 'center', padding: th.space(6) }}
        onPress={dismissable ? onClose : undefined}
        accessible={false}
        importantForAccessibility="no"
      >
        <Animated.View
          accessibilityViewIsModal
          importantForAccessibility="yes"
          onAccessibilityEscape={dismissable ? onClose : undefined}
          style={[{ width: Math.min(420, width - 48), backgroundColor: th.colors.surfaceRaised, borderRadius: th.radius('2xl'), padding: th.space(5), gap: th.space(3) }, card]}
        >
          <Pressable onPress={() => undefined} accessible={false} style={{ gap: th.space(3) }}>
            {icon && (
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: tc.soft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon icon={icon} size={24} color={tc.text} />
              </View>
            )}
            <Text size="lg" weight="bold" accessibilityRole="header">{title}</Text>
            {message && <Text size="base" tone="secondary">{message}</Text>}
            {children}
            {actions && <View style={{ flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: th.space(2), marginTop: th.space(2) }}>{actions}</View>}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'brand' | 'danger' | 'warning';
  icon?: LucideIcon;
  /** alert(): one button only. */
  single?: boolean;
}

interface DialogQueue {
  current: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null;
}

const useDialogQueue = create<DialogQueue>(() => ({ current: null }));

export function confirm(options: ConfirmOptions): Promise<boolean> {
  if (options.tone === 'danger') haptic('warning');
  return new Promise((resolve) => useDialogQueue.setState({ current: { ...options, resolve } }));
}

export function alert(options: Omit<ConfirmOptions, 'single' | 'cancelLabel'>): Promise<void> {
  return confirm({ ...options, single: true }).then(() => undefined);
}

export function DialogHost() {
  const current = useDialogQueue((s) => s.current);
  const finish = (ok: boolean) => {
    current?.resolve(ok);
    useDialogQueue.setState({ current: null });
  };
  if (!current) return null;
  const danger = current.tone === 'danger';
  return (
    <Dialog
      open
      onClose={() => finish(false)}
      title={current.title}
      message={current.message}
      tone={current.tone ?? 'brand'}
      icon={current.icon ?? (danger ? TriangleAlert : undefined)}
      actions={(
        <>
          {!current.single && <Button variant="secondary" onPress={() => finish(false)}>{current.cancelLabel ?? t('Cancel')}</Button>}
          <Button variant={danger ? 'danger' : 'primary'} onPress={() => finish(true)}>{current.confirmLabel ?? t('OK')}</Button>
        </>
      )}
    />
  );
}
