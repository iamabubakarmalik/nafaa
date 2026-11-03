/** Four-step password strength bar with a one-word verdict. */

import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Text, useTheme } from '@/design';

export function passwordScore(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw) || (/[a-z]/.test(pw) && /[A-Z]/.test(pw))) s++;
  return Math.min(4, s);
}

export function PasswordStrength({ value }: { value: string }) {
  const th = useTheme();
  const score = passwordScore(value);
  const tones = [th.colors.danger.solid, th.colors.danger.solid, th.colors.warning.solid, th.colors.success.solid, th.colors.success.solid];
  const labels = [t('Bohat kamzor'), t('Kamzor'), t('Theek'), t('Mazboot'), t('Bohat mazboot')];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
      <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < score ? tones[score] : th.colors.surfaceMuted }} />
        ))}
      </View>
      <Text size="xs" weight="semibold" color={tones[score]}>{labels[score]}</Text>
    </View>
  );
}
