/**
 * Small pieces shared by the booker screens: the big quantity stepper, the
 * queue status pill, the sync header button and day helpers. Everything else
 * comes from the design kit.
 */

import { useRouter } from 'expo-router';
import { Minus, Plus, RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { t } from '@/core/i18n';
import { IconButton, PressableScale, StatusPill, Text, useTheme } from '@/design';
import { useBookerStore } from '../store';

export const qtyText = (v: number) => String(Math.round(v * 10000) / 10000);

/** Days since an ISO date, or null. */
export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

/** Header button: opens the sync status screen; the badge counts what is waiting or refused. */
export function SyncAction() {
  const router = useRouter();
  const { pending, issues } = useBookerStore();
  return <IconButton icon={RefreshCw} label={t('Sync status')} badge={pending + issues || undefined} onPress={() => router.push('/booker/issues')} />;
}

export function QueueStatus({ status }: { status: string }) {
  if (status === 'SYNCED') return <StatusPill tone="success">{t('Sync ho gaya')}</StatusPill>;
  if (status === 'CONFLICT') return <StatusPill tone="danger">{t('Nahi gaya')}</StatusPill>;
  return <StatusPill tone="warning">{t('Sync baqi')}</StatusPill>;
}

/** Big minus / number / plus control for packs and pieces (one-hand use). */
export function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const th = useTheme();
  const [text, setText] = useState<string | null>(null);
  const c = th.colors;
  const btn = { width: 52, height: 52, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: c.surfaceMuted };
  return (
    <View style={{ flex: 1, gap: th.space(1) }}>
      <Text size="xs" tone="muted" weight="semibold" numberOfLines={1}>{label}</Text>
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', borderRadius: th.radius('lg'), borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
        <PressableScale onPress={() => onChange(Math.max(0, value - 1))} style={btn} accessibilityLabel={t('Kam')}>
          <Minus size={20} color={c.text} />
        </PressableScale>
        <TextInput
          value={text ?? qtyText(value)}
          onChangeText={setText}
          onBlur={() => {
            const n = Number((text ?? '').replace(',', '.'));
            if (text != null) onChange(Number.isFinite(n) && n >= 0 ? Math.round(n * 10000) / 10000 : value);
            setText(null);
          }}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={{ flex: 1, minWidth: 0, width: 0, textAlign: 'center', fontSize: 18, fontWeight: '700', color: c.text }}
        />
        <PressableScale onPress={() => onChange(value + 1)} style={{ ...btn, backgroundColor: c.brand.soft }} accessibilityLabel={t('Zyada')}>
          <Plus size={20} color={c.brand.text} />
        </PressableScale>
      </View>
    </View>
  );
}
