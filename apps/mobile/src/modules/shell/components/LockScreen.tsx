/** Biometric lock over the app (Settings → Security → Face ID / fingerprint). */

import { Fingerprint, LogOut } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/core/i18n';
import { useBiometric } from '@/core/auth/biometric';
import { useAuthStore } from '@/core/auth/store';
import { Button, Logo, Text, useTheme } from '@/design';

export function LockScreen() {
  const th = useTheme();
  const insets = useSafeAreaInsets();
  const locked = useBiometric((s) => s.locked);
  const unlock = useBiometric((s) => s.unlock);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  useEffect(() => {
    if (locked) void unlock();
  }, [locked, unlock]);
  if (!locked) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 900, backgroundColor: th.colors.canvas, alignItems: 'center', justifyContent: 'center', padding: th.space(6), paddingBottom: insets.bottom + th.space(6), gap: th.space(4) }]}>
      <Logo size={72} />
      <Text size="xl" weight="bold" align="center">{t('Nafaa band hai')}</Text>
      <Text tone="muted" align="center">{t('{{name}}, kholne ke liye tasdeeq karein', { name: user?.fullName?.split(' ')[0] ?? '' })}</Text>
      <Button size="lg" icon={Fingerprint} onPress={() => void unlock()}>{t('Kholein')}</Button>
      <Button variant="ghost" icon={LogOut} onPress={() => { useBiometric.setState({ locked: false }); void logout(); }}>{t('Log out')}</Button>
    </View>
  );
}
