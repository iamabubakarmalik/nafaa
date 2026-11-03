/**
 * Wraps the app and applies the remote settings:
 *   - maintenance mode: a full screen with the message and a retry button;
 *   - below the minimum version: a full "update" screen with a store button;
 *   - below the latest version: a closable sheet that comes back after the
 *     reminder time set in the admin panel.
 * While the settings are loading or unavailable the app opens normally.
 *
 * Styling is deliberately plain; the colors can be passed in until the
 * design kit is wired in.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pickText, useAppConfig } from './useAppConfig';
import type { AppConfig } from './types';

export interface AppControlColors {
  accent: string;
  onAccent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
}

const DEFAULT_COLORS: AppControlColors = {
  accent: '#0f766e', onAccent: '#ffffff', background: '#f8fafc', surface: '#ffffff', text: '#0f172a', muted: '#64748b',
};

const SNOOZE_KEY = 'nafaa.updateSnooze';

export interface AppControlGateProps {
  children: ReactNode;
  colors?: Partial<AppControlColors>;
}

export function AppControlGate({ children, colors }: AppControlGateProps) {
  const c = { ...DEFAULT_COLORS, ...colors };
  const { config, refresh } = useAppConfig();

  if (config?.maintenance.active) return <MaintenanceScreen config={config} colors={c} onRetry={() => void refresh()} />;
  if (config?.update.state === 'force') return <ForceUpdateScreen config={config} colors={c} />;
  return (
    <>
      {children}
      {config?.update.state === 'soft' && <SoftUpdateSheet config={config} colors={c} />}
    </>
  );
}

function openStore(url: string | null) {
  if (url) void Linking.openURL(url);
}

function formatUntil(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function FullScreen({ colors, title, message, children }: { colors: AppControlColors; title: string; message: string; children?: ReactNode }) {
  return (
    <View style={[styles.full, { backgroundColor: colors.background }]}>
      <View style={[styles.mark, { backgroundColor: colors.accent }]} />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
      {children}
    </View>
  );
}

function Button({ label, onPress, colors, variant = 'primary' }: { label: string; onPress: () => void; colors: AppControlColors; variant?: 'primary' | 'plain' }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? { backgroundColor: colors.accent } : { backgroundColor: 'transparent' },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.buttonText, { color: variant === 'primary' ? colors.onAccent : colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

export function MaintenanceScreen({ config, colors, onRetry }: { config: AppConfig; colors: AppControlColors; onRetry: () => void }) {
  const { title, message, until } = config.maintenance;
  return (
    <FullScreen colors={colors} title={pickText(title)} message={pickText(message)}>
      {until && <Text style={[styles.note, { color: colors.muted }]}>Expected back: {formatUntil(until)}</Text>}
      <Button label="Try again" onPress={onRetry} colors={colors} />
    </FullScreen>
  );
}

export function ForceUpdateScreen({ config, colors }: { config: AppConfig; colors: AppControlColors }) {
  const { title, message, storeUrl, latestVersion, notes } = config.update;
  return (
    <FullScreen colors={colors} title={pickText(title)} message={pickText(message)}>
      {notes[0] && <ReleaseNotes notes={notes.slice(0, 1)} colors={colors} />}
      {storeUrl ? <Button label="Update now" onPress={() => openStore(storeUrl)} colors={colors} /> : null}
      {latestVersion && <Text style={[styles.note, { color: colors.muted }]}>New version {latestVersion}</Text>}
    </FullScreen>
  );
}

function ReleaseNotes({ notes, colors }: { notes: AppConfig['update']['notes']; colors: AppControlColors }) {
  return (
    <ScrollView style={styles.notes} contentContainerStyle={{ gap: 12 }}>
      {notes.map((n) => (
        <View key={`${n.version}-${n.platform}`}>
          <Text style={[styles.noteTitle, { color: colors.text }]}>What's new in {n.version}</Text>
          <Text style={[styles.noteBody, { color: colors.muted }]}>{pickText(n.text)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

export function SoftUpdateSheet({ config, colors }: { config: AppConfig; colors: AppControlColors }) {
  const { latestVersion, storeUrl, remindAfterHours, title, message, notes } = config.update;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(SNOOZE_KEY)
      .then((raw) => {
        const snooze = raw ? (JSON.parse(raw) as { version: string; until: number }) : null;
        const snoozed = snooze && snooze.version === latestVersion && snooze.until > Date.now();
        if (alive && !snoozed && storeUrl) setVisible(true);
      })
      .catch(() => alive && !!storeUrl && setVisible(true));
    return () => { alive = false; };
  }, [latestVersion, storeUrl]);

  const later = () => {
    setVisible(false);
    const until = Date.now() + Math.max(1, remindAfterHours) * 3_600_000;
    AsyncStorage.setItem(SNOOZE_KEY, JSON.stringify({ version: latestVersion, until })).catch(() => undefined);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={later}>
      <Pressable style={styles.backdrop} onPress={later} />
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <View style={styles.handle} />
        <Text style={[styles.title, { color: colors.text }]}>{pickText(title)}</Text>
        <Text style={[styles.message, { color: colors.muted }]}>{pickText(message)}</Text>
        {notes.length > 0 && <ReleaseNotes notes={notes.slice(0, 2)} colors={colors} />}
        <Button label="Update now" onPress={() => { later(); openStore(storeUrl); }} colors={colors} />
        <Button label="Later" onPress={later} colors={colors} variant="plain" />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  mark: { width: 56, height: 56, borderRadius: 16, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  message: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  note: { fontSize: 13, textAlign: 'center' },
  notes: { maxHeight: 180, alignSelf: 'stretch', marginVertical: 4 },
  noteTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  noteBody: { fontSize: 14, lineHeight: 20 },
  button: { alignSelf: 'stretch', minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, marginTop: 4 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, gap: 10 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', marginBottom: 8 },
});
