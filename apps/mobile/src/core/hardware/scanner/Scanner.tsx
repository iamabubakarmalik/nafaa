/**
 * Camera barcode reader used by every screen that scans (POS, inventory,
 * purchasing, bookings, online-store packing and returns, industry packs).
 *
 *   variant="fullscreen" (default)  a full-screen modal with a frame, torch,
 *                                   close button and an optional footer
 *                                   (running total, last item). Without
 *                                   `continuous` the first good code closes it.
 *   variant="inline"                a camera panel inside the screen that keeps
 *                                   reading (packing, returns). Phones without
 *                                   a camera use the typed input next to it.
 *
 * The same code is ignored for a short pause so one barcode is not counted
 * twice. `onCode` may return false for a code that was not understood: red
 * flash and error haptic; anything else counts as good.
 */

import { CameraView, useCameraPermissions, type BarcodeType } from 'expo-camera';
import { Camera, CameraOff, Flashlight, FlashlightOff, X } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Linking, Modal, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptic } from '@/core/device/haptics';
import { t } from '@/core/i18n';
import { Button, Icon, IconButton, Row, Text, useTheme, withAlpha } from '@/design';

/** Same code again is ignored for this long. */
const SAME_CODE_PAUSE_MS = 1400;
export const BARCODE_TYPES: BarcodeType[] = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14', 'qr', 'pdf417', 'datamatrix'];
/** The camera area stays dark in every theme. */
const CAMERA_BG = '#0b1220';

export type ScanFlash = 'ok' | 'bad' | null;
export type ScanResult = Promise<boolean | void> | boolean | void;

export interface ScannerProps {
  /** Return false when the code was not understood. */
  onCode: (code: string) => ScanResult;
  variant?: 'fullscreen' | 'inline';
  /** Fullscreen: keep reading after a good code (inline always does). */
  continuous?: boolean;
  /** Fullscreen: title in the top bar. */
  title?: string;
  /** Fullscreen: close button and the system back gesture. */
  onClose?: () => void;
  /** Fullscreen: caller's area at the bottom. */
  footer?: ReactNode;
  /** Inline: the camera runs only while true. */
  active?: boolean;
  /** Inline: panel height. */
  height?: number;
  /** Inline: ring color from the caller's own result (packing: right or wrong item). */
  flash?: ScanFlash;
  barcodeTypes?: BarcodeType[];
}

/** Dedupe, busy guard and feedback shared by both variants. */
function useReader(onCode: ScannerProps['onCode'], feedback: (good: boolean) => void, pauseMs = SAME_CODE_PAUSE_MS) {
  const last = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const busy = useRef(false);
  return async (raw: string | null | undefined) => {
    const code = String(raw ?? '').trim();
    const now = Date.now();
    if (!code || busy.current) return;
    if (code === last.current.code && now - last.current.at < pauseMs) return;
    last.current = { code, at: now };
    busy.current = true;
    try {
      const ok = await onCode(code);
      feedback(ok !== false);
    } finally {
      busy.current = false;
    }
  };
}

export function Scanner(props: ScannerProps) {
  return props.variant === 'inline' ? <InlineScanner {...props} /> : <FullscreenScanner {...props} />;
}

function FullscreenScanner({ title, onCode, onClose, continuous, footer, barcodeTypes = BARCODE_TYPES }: ScannerProps) {
  const th = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, request] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const flash = useSharedValue(0);
  const [flashColor, setFlashColor] = useState(th.colors.success.solid);
  const onCam = th.colors.neutral.onSolid;
  const dim = withAlpha(onCam, 0.8);
  const close = () => onClose?.();

  useEffect(() => { if (permission && !permission.granted && permission.canAskAgain) void request(); }, [permission]); // eslint-disable-line react-hooks/exhaustive-deps
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  const read = useReader(onCode, (good) => {
    haptic(good ? 'success' : 'error');
    setFlashColor(good ? th.colors.success.solid : th.colors.danger.solid);
    flash.value = withSequence(withTiming(0.5, { duration: 60 }), withTiming(0, { duration: 280 }));
    if (good && !continuous) close();
  });

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={close} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: th.colors.overlay }}>
        {permission?.granted ? (
          <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes }} onBarcodeScanned={(r) => { void read(r.data); }} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: th.space(4), padding: th.space(8) }}>
            <Icon icon={Camera} size={48} color={onCam} />
            <Text align="center" color={onCam}>{t('Allow the camera to scan barcodes.')}</Text>
            <Button onPress={() => (permission?.canAskAgain === false ? void Linking.openSettings() : void request())}>{t('Allow camera')}</Button>
          </View>
        )}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: flashColor }, flashStyle]} />
        <View pointerEvents="none" style={{ position: 'absolute', top: '30%', alignSelf: 'center', width: '78%', aspectRatio: 1.7, borderRadius: 20, borderWidth: 3, borderColor: dim }} />
        <Row justify="between" style={{ position: 'absolute', top: insets.top + 8, start: 12, end: 12 }}>
          <IconButton icon={X} label={t('Close')} variant="inverse" onPress={close} />
          {!!title && <Text weight="semibold" color={onCam}>{title}</Text>}
          <IconButton icon={torch ? FlashlightOff : Flashlight} label={t('Torch')} variant="inverse" onPress={() => setTorch((x) => !x)} />
        </Row>
        {footer && (
          <View style={{ position: 'absolute', bottom: 0, start: 0, end: 0, padding: th.space(4), paddingBottom: insets.bottom + th.space(4), gap: th.space(3), backgroundColor: th.colors.overlay }}>
            {footer}
          </View>
        )}
      </View>
    </Modal>
  );
}

function InlineScanner({ active = true, height = 220, flash, onCode, barcodeTypes = BARCODE_TYPES }: ScannerProps) {
  const th = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [own, setOwn] = useState<ScanFlash>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (active && permission && !permission.granted && permission.canAskAgain) void requestPermission();
  }, [active, permission?.granted]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(timer.current), []);

  // Without a `flash` from the caller the ring shows this reader's own result.
  const read = useReader(onCode, (good) => {
    if (flash !== undefined) return;
    haptic(good ? 'success' : 'error');
    setOwn(good ? 'ok' : 'bad');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOwn(null), 700);
  }, 1500);

  const shown = flash !== undefined ? flash : own;
  const ring = shown === 'ok' ? th.colors.success.solid : shown === 'bad' ? th.colors.danger.solid : withAlpha('#ffffff', 0.75);

  return (
    <View style={{ height, borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: CAMERA_BG }}>
      {permission?.granted && active ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} onBarcodeScanned={(r) => { void read(r.data); }}
          barcodeScannerSettings={{ barcodeTypes }} />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: th.space(2), padding: th.space(4) }}>
          <Icon icon={permission?.granted === false ? CameraOff : Camera} size={28} color="#cbd5e1" />
          <Text size="sm" weight="semibold" color="#e2e8f0" align="center">
            {permission?.granted === false ? t('Camera ki ijazat nahi — neeche number likh kar Scan dabayein') : t('Camera khul raha hai…')}
          </Text>
          {permission && !permission.granted && permission.canAskAgain && <Button size="sm" variant="inverse" onPress={() => requestPermission()}>{t('Camera ki ijazat dein')}</Button>}
        </View>
      )}
      <View pointerEvents="none" style={{ position: 'absolute', top: '22%', bottom: '22%', start: '12%', end: '12%', borderWidth: 3, borderColor: ring, borderRadius: th.radius('lg') }} />
      {permission?.granted && active && (
        <View style={{ position: 'absolute', top: th.space(2), end: th.space(2) }}>
          <IconButton icon={torch ? FlashlightOff : Flashlight} label={torch ? t('Torch band') : t('Torch')} variant="inverse" size="sm" onPress={() => setTorch((v) => !v)} />
        </View>
      )}
    </View>
  );
}
