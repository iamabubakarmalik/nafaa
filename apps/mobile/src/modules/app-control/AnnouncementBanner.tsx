/**
 * The top live announcement for this person, with an optional button and a
 * close control when the banner allows it. A closed banner stays closed until
 * it is edited in the admin panel.
 */

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setup } from './setup';
import { pickText, useAppConfig } from './useAppConfig';
import type { AppAnnouncement } from './types';

const DISMISSED_KEY = 'nafaa.dismissedAnnouncements';

const TONES: Record<AppAnnouncement['tone'], { bg: string; border: string; text: string }> = {
  info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e3a8a' },
  success: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
  warning: { bg: '#fffbeb', border: '#fde68a', text: '#78350f' },
  critical: { bg: '#fff1f2', border: '#fecdd3', text: '#881337' },
};

const keyOf = (a: AppAnnouncement) => `${a.id}:${a.revision}`;

export interface AnnouncementBannerProps {
  /** How many banners to stack; default 1. */
  max?: number;
  style?: StyleProp<ViewStyle>;
}

export function AnnouncementBanner({ max = 1, style }: AnnouncementBannerProps) {
  const { config } = useAppConfig();
  const [dismissed, setDismissed] = useState<string[] | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((raw) => setDismissed(raw ? (JSON.parse(raw) as string[]) : []))
      .catch(() => setDismissed([]));
  }, []);

  if (!config || dismissed === null) return null;
  const now = Date.now();
  const visible = config.announcements
    .filter((a) => !(a.dismissible && dismissed.includes(keyOf(a))))
    .filter((a) => !a.endsAt || new Date(a.endsAt).getTime() > now)
    .slice(0, max);
  if (!visible.length) return null;

  const dismiss = (a: AppAnnouncement) => {
    // Keep the list short: only banners the server still sends.
    const live = new Set(config.announcements.map(keyOf));
    const next = [...dismissed.filter((k) => live.has(k)), keyOf(a)];
    setDismissed(next);
    AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(next)).catch(() => undefined);
  };

  return (
    <View style={[styles.stack, style]}>
      {visible.map((a) => {
        const tone = TONES[a.tone] ?? TONES.info;
        const cta = a.ctaLink && a.ctaLabel ? pickText(a.ctaLabel) : '';
        return (
          <View key={a.id} accessibilityRole="alert" style={[styles.card, { backgroundColor: tone.bg, borderColor: tone.border }]}>
            <View style={styles.body}>
              <Text style={[styles.title, { color: tone.text }]}>{pickText(a.title)}</Text>
              <Text style={[styles.message, { color: tone.text }]}>{pickText(a.body)}</Text>
              {cta ? (
                <Pressable accessibilityRole="link" onPress={() => setup().openLink(a.ctaLink as string)} hitSlop={8}>
                  <Text style={[styles.cta, { color: tone.text }]}>{cta}</Text>
                </Pressable>
              ) : null}
            </View>
            {a.dismissible && (
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => dismiss(a)} hitSlop={12} style={styles.close}>
                <Text style={[styles.closeText, { color: tone.text }]}>×</Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 8 },
  card: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '700' },
  message: { fontSize: 14, lineHeight: 20, opacity: 0.9 },
  cta: { fontSize: 14, fontWeight: '700', textDecorationLine: 'underline', marginTop: 4 },
  close: { paddingHorizontal: 4 },
  closeText: { fontSize: 22, lineHeight: 22, opacity: 0.7 },
});
