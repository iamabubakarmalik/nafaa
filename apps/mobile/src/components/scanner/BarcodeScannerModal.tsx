import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, Modal, Dimensions, Animated, Easing, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { X, Zap, ZapOff, ScanLine, Camera } from 'lucide-react-native';

import { useTranslation } from '@/i18n/useTranslation';
const { width: SCREEN_W } = Dimensions.get('window');
const FRAME_W = Math.min(SCREEN_W * 0.78, 320);
const FRAME_H = FRAME_W * 0.65;

interface Props {
  visible: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

export function BarcodeScannerModal({ visible, onClose, onScan }: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [scanned, setScanned] = useState(false);
  const scannedRef = useRef(false);
  const lineY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scannedRef.current = false;
    setScanned(false);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(lineY, {
          toValue: FRAME_H - 8,
          duration: 1800,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(lineY, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible]);

  useEffect(() => {
    if (visible && permission && !permission.granted) {
      requestPermission();
    }
  }, [visible, permission]);

  const handleScanned = ({ data }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onScan(data);
    setTimeout(() => {
      scannedRef.current = false;
      setScanned(false);
    }, 2000);
  };

  if (!permission) return null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent presentationStyle="fullScreen">
      <View style={styles.root}>
        {permission.granted && (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            enableTorch={torchOn}
            onBarcodeScanned={handleScanned}
            barcodeScannerSettings={{
              barcodeTypes: [
                'ean13', 'ean8', 'upc_a', 'upc_e',
                'code128', 'code39', 'code93',
                'qr', 'pdf417', 'aztec', 'datamatrix', 'itf14',
              ],
            }}
          />
        )}

        {/* Dark overlay with cutout */}
        {permission.granted && (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <View style={styles.overlayTop} />
            <View style={styles.overlayMiddle}>
              <View style={styles.overlaySide} />
              <View style={styles.frame}>
                {/* Corner brackets */}
                <View style={[styles.corner, styles.cornerTL, scanned && styles.cornerSuccess]} />
                <View style={[styles.corner, styles.cornerTR, scanned && styles.cornerSuccess]} />
                <View style={[styles.corner, styles.cornerBL, scanned && styles.cornerSuccess]} />
                <View style={[styles.corner, styles.cornerBR, scanned && styles.cornerSuccess]} />

                {/* Animated scan line */}
                {!scanned && (
                  <Animated.View
                    style={[
                      styles.scanLine,
                      { transform: [{ translateY: lineY }] },
                    ]}
                  />
                )}

                {scanned && <View style={styles.successFlash} />}
              </View>
              <View style={styles.overlaySide} />
            </View>
            <View style={styles.overlayBottom} />
          </View>
        )}

        {/* Content */}
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              style={styles.iconButton}
              hitSlop={12}
            >
              <X size={22} color="#ffffff" />
            </Pressable>

            <View style={styles.titleBadge}>
              <ScanLine size={16} color="#ffffff" />
              <Text style={styles.titleText}>{t('auto.BarcodeScannerModal.scan_barcode')}</Text>
            </View>

            <Pressable
              onPress={() => setTorchOn((v) => !v)}
              style={[styles.iconButton, torchOn && styles.iconButtonActive]}
              hitSlop={12}
            >
              {torchOn ? (
                <Zap size={22} color="#0a0a0a" fill="#0a0a0a" />
              ) : (
                <ZapOff size={22} color="#ffffff" />
              )}
            </Pressable>
          </View>

          {/* Permission prompt */}
          {!permission.granted && (
            <View style={styles.permissionContainer}>
              <View style={styles.permissionIcon}>
                <Camera size={36} color="#ffffff" />
              </View>
              <Text style={styles.permissionTitle}>{t('auto.BarcodeScannerModal.camera_access_required')}</Text>
              <Text style={styles.permissionText}>{t('auto.BarcodeScannerModal.barcode_scan_karne_ke_liye_camera_ki_ija')}</Text>
              <Pressable onPress={requestPermission} style={styles.permissionButton}>
                <Text style={styles.permissionButtonText}>{t('auto.BarcodeScannerModal.grant_permission')}</Text>
              </Pressable>
            </View>
          )}

          {/* Bottom hint */}
          {permission.granted && (
            <View style={styles.bottomHint}>
              <View style={styles.hintBadge}>
                <ScanLine size={18} color="#22c55e" />
                <Text style={styles.hintText}>
                  {scanned ? '✓ Scanned!' : 'Align barcode within frame'}
                </Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const OVERLAY_BG = 'rgba(0,0,0,0.65)';
const BRAND = '#16a34a';
const SUCCESS = '#22c55e';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  iconButton: {
    height: 44, width: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconButtonActive: { backgroundColor: '#fbbf24' },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 999,
  },
  titleText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  overlayTop: { flex: 1, backgroundColor: OVERLAY_BG },
  overlayMiddle: { flexDirection: 'row', height: FRAME_H },
  overlaySide: { flex: 1, backgroundColor: OVERLAY_BG },
  overlayBottom: { flex: 1, backgroundColor: OVERLAY_BG },

  frame: {
    width: FRAME_W,
    height: FRAME_H,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 32, height: 32,
    borderColor: BRAND,
  },
  cornerSuccess: { borderColor: SUCCESS },
  cornerTL: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 12 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 12 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 12 },

  scanLine: {
    position: 'absolute',
    left: 12, right: 12,
    height: 3,
    borderRadius: 2,
    backgroundColor: SUCCESS,
    shadowColor: SUCCESS,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  successFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34,197,94,0.25)',
  },

  permissionContainer: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionIcon: {
    height: 80, width: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  permissionTitle: {
    color: '#fff', fontSize: 22, fontWeight: '800',
    textAlign: 'center',
  },
  permissionText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 16, textAlign: 'center',
    marginTop: 8, lineHeight: 22,
  },
  permissionButton: {
    marginTop: 24,
    paddingHorizontal: 24, paddingVertical: 14,
    backgroundColor: BRAND, borderRadius: 14,
  },
  permissionButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  bottomHint: {
    position: 'absolute',
    bottom: 48,
    left: 0, right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  hintBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 999,
  },
  hintText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
