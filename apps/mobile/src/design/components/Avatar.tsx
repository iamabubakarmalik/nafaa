/**
 * Avatar: photo when there is one, else initials on a color picked from the
 * name (stable per person).
 *
 *   <Avatar name={user.fullName} url={user.avatarUrl} size={40} />
 */

import { Image } from 'expo-image';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

const COLORS = ['#059669', '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#0891b2', '#4f46e5', '#b45309', '#0d9488', '#e11d48'];

export function initials(name?: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function colorFor(name?: string | null) {
  let h = 0;
  for (const ch of name ?? '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function Avatar({ name, url, size = 40, square }: { name?: string | null; url?: string | null; size?: number; square?: boolean }) {
  const t = useTheme();
  const radius = square ? t.radius('md') : size / 2;
  if (url) {
    return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: radius, backgroundColor: t.colors.surfaceMuted }} contentFit="cover" transition={150} accessibilityLabel={name ?? undefined} />;
  }
  return (
    <View accessibilityLabel={name ?? undefined} style={{ width: size, height: size, borderRadius: radius, backgroundColor: colorFor(name), alignItems: 'center', justifyContent: 'center' }}>
      <Text weight="bold" color="#fff" ltr style={{ fontSize: size * 0.38, lineHeight: size * 0.5 }}>{initials(name)}</Text>
    </View>
  );
}
