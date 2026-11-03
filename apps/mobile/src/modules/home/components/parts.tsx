/**
 * Shared parts for Home widgets: the card frame with its controls row, the
 * remembered control state, money that follows the eye, and small helpers.
 */

import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { kv } from '@/core/storage/kv';
import { Amount, Button, Card, Icon, Skeleton, Text, useTheme, withAlpha, type AmountProps } from '@/design';
import { useMasked } from '../lib/privacy';

/** Control choices of one widget, remembered on this device (web useWidgetState). */
export function useWidgetState<T extends Record<string, string>>(id: string, defaults: T): [T, (patch: Partial<T>) => void] {
  const key = `home.widget.${id}`;
  const [state, setState] = useState<T>(() => ({ ...defaults, ...kv.get<Partial<T>>(key, {}) }));
  const set = useCallback((patch: Partial<T>) => setState((prev) => {
    const next = { ...prev, ...patch };
    kv.set(key, next);
    return next;
  }), [key]);
  return [state, set];
}

export function WidgetCard({ title, description, href, linkLabel, controls, flush, children }: {
  title: string; description?: string; href?: string; linkLabel?: string; controls?: ReactNode; flush?: boolean; children?: ReactNode;
}) {
  const th = useTheme();
  return (
    <Card
      title={title}
      description={description}
      flush={flush}
      action={href ? <Button variant="link" size="sm" iconEnd={ArrowRight} iconEndFlip onPress={() => router.push(href as never)}>{linkLabel ?? t('Sab dekhein')}</Button> : undefined}
    >
      {controls && <View style={{ gap: th.space(2), paddingHorizontal: flush ? th.space(4) : 0, marginBottom: th.space(3) }}>{controls}</View>}
      {children}
    </Card>
  );
}

/** Money that follows the eye (`kind="sales"`) or the cost rule (`kind="cost"`). */
export function Money({ value, kind = 'sales', ...rest }: Omit<AmountProps, 'value' | 'hidden'> & { value: number | null | undefined; kind?: 'sales' | 'cost' }) {
  const { salesHidden, costHidden } = useMasked();
  return <Amount value={value ?? 0} hidden={kind === 'cost' ? costHidden : salesHidden} {...rest} />;
}

export function ChangeBadge({ change, onHero }: { change?: number; onHero?: boolean }) {
  const th = useTheme();
  if (change === undefined || !Number.isFinite(change) || change === 0) return null;
  const up = change > 0;
  const color = onHero ? '#fff' : up ? th.colors.success.text : th.colors.danger.text;
  const bg = onHero ? withAlpha(up ? '#ffffff' : '#000000', up ? 0.2 : 0.18) : up ? th.colors.success.soft : th.colors.danger.soft;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 99, backgroundColor: bg }}>
      <Icon icon={up ? ArrowUpRight : ArrowDownRight} size={12} color={color} />
      <Text size="2xs" weight="bold" color={color} ltr tabular>{`${Math.abs(change).toFixed(1)}%`}</Text>
    </View>
  );
}

export function EmptyLine({ text }: { text: string }) {
  const th = useTheme();
  return (
    <View style={{ paddingVertical: th.space(5), paddingHorizontal: th.space(4), alignItems: 'center' }}>
      <Text size="sm" tone="muted" align="center">{text}</Text>
    </View>
  );
}

export function WidgetSkeleton({ height = 140 }: { height?: number }) {
  return <Skeleton height={height} radius={12} />;
}

export const hourLabel = (h: number) => (h === 0 ? t('12 AM') : h < 12 ? t('{{h}} AM', { h }) : h === 12 ? t('12 PM') : t('{{value}} PM', { value: h - 12 }));
export const hourTick = (h: number) => (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`);
export const pctChange = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : undefined);

/** Day names by JS weekday (0 = Sunday), same words as the web. */
export const weekdayNames = () => [t('Itwar'), t('Peer'), t('Mangal'), t('Budh'), t('Jumeraat'), t('Juma'), t('Hafta')];

export const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash', CARD: 'Card', JAZZCASH: 'JazzCash', EASYPAISA: 'Easypaisa', BANK_TRANSFER: 'Bank', CREDIT: 'Udhaar', WALLET: 'Wallet',
};
