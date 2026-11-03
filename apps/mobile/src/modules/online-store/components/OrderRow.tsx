/**
 * One online order in a list: channel, number, status, customer, items and
 * money, the badges that matter (COD, paid, risk, confirm, cancel asked,
 * late) and the next step as a button. Long press starts picking several;
 * "…" opens the rest of the actions.
 */

import { memo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Check, CheckCircle2, MoreHorizontal, Timer, Truck } from 'lucide-react-native';
import {
  isClosed, itemQty, moneyOf, orderNo, orderOptions, qtyText, waitMinutes, type OnlineOrder,
} from '@nafaa/core/online-store';
import { formatMoney, formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Badge, Button, Icon, IconButton, PressableScale, Text, useTheme } from '@/design';
import { NEXT_ACTION, NEXT_FALLBACK } from '../lib/labels';
import { ChannelLogo } from './BrandLogo';
import { OrderStatusBadge, RiskBadge } from './bits';

const waitText = (m: number) => (m < 60 ? t('{{m}} min', { m }) : m < 1440 ? t('{{value}} ghante', { value: Math.floor(m / 60) }) : t('{{value}} din', { value: Math.floor(m / 1440) }));

export interface OrderRowProps {
  order: OnlineOrder;
  now: number;
  staleMinutes: number;
  branchName?: string;
  selecting: boolean;
  checked: boolean;
  busy: boolean;
  canManage: boolean;
  onOpen: (o: OnlineOrder) => void;
  onToggle: (o: OnlineOrder) => void;
  onLongPress: (o: OnlineOrder) => void;
  onAccept: (o: OnlineOrder) => void;
  onNext: (o: OnlineOrder) => void;
  onMore: (o: OnlineOrder) => void;
}

export const OrderRow = memo(function OrderRow({
  order: o, now, staleMinutes, branchName, selecting, checked, busy, canManage, onOpen, onToggle, onLongPress, onAccept, onNext, onMore,
}: OrderRowProps) {
  const th = useTheme();
  const closed = isClosed(o);
  const isNew = o.orderStatus === 'PENDING';
  const wait = waitMinutes(o.receivedAt, now);
  const late = isNew && !o.isTest && wait >= staleMinutes;
  const opt = orderOptions(o);
  const m = moneyOf(o);
  const place = [o.customerCity, branchName].filter(Boolean).join(' · ');

  return (
    <PressableScale
      onPress={() => (selecting ? onToggle(o) : onOpen(o))}
      onLongPress={() => onLongPress(o)}
      scaleTo={0.99}
      haptic={selecting ? 'select' : false}
      accessibilityLabel={t('Order #{{orderNo}} kholein', { orderNo: orderNo(o) })}
      accessibilityState={{ selected: checked }}
      style={{ backgroundColor: checked ? th.colors.brand.soft : undefined }}
    >
      {isNew && <View style={{ position: 'absolute', top: 0, bottom: 0, start: 0, width: 3, backgroundColor: late ? th.colors.danger.solid : th.colors.warning.solid }} />}
      <View style={{ flexDirection: 'row', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(3), opacity: closed ? 0.72 : 1 }}>
        {selecting ? (
          <View style={{
            width: 40, height: 40, borderRadius: th.radius('md'), borderWidth: 2, alignItems: 'center', justifyContent: 'center',
            borderColor: checked ? th.colors.brand.solid : th.colors.borderStrong, backgroundColor: checked ? th.colors.brand.solid : 'transparent',
          }}>
            {checked && <Icon icon={Check} size={20} color={th.colors.brand.onSolid} />}
          </View>
        ) : (
          <ChannelLogo type={o.integration?.type} platform={o.platform ?? o.metadata?.platform} size={40} />
        )}

        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
            <Text size="base" weight="bold" ltr numberOfLines={1} style={{ flexShrink: 1 }}>#{orderNo(o)}</Text>
            <OrderStatusBadge status={o.orderStatus} />
            <View style={{ flex: 1 }} />
            <Amount value={o.total} weight="bold" size="base" style={closed ? { textDecorationLine: 'line-through', color: th.colors.textMuted } : undefined} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
            <Text size="sm" weight="medium" numberOfLines={1} style={{ flexShrink: 0, maxWidth: '62%' }}>{o.customerName}</Text>
            {!!place && <Text size="sm" tone="muted" numberOfLines={1} style={{ flexShrink: 1, flex: 1 }}>· {place}</Text>}
            {m.advance > 0 && m.codDue > 0 && !closed && <Text size="2xs" weight="semibold" tone="warning">{t('COD {{codDue}}', { codDue: formatMoney(m.codDue) })}</Text>}
          </View>
          <Text size="xs" tone="muted" numberOfLines={1}>
            {t('{{count}} cheezein · {{qtyText}} qty', { count: o.items.length, qtyText: qtyText(itemQty(o)) })} · {formatRelative(o.receivedAt, now)}
            {o.trackingNumber ? ` · ${o.trackingNumber}` : ''}
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
            {o.paymentStatus === 'PAID'
              ? <Badge tone="success">{t('Paid')}</Badge>
              : m.advance > 0 && !closed
                ? <Badge tone="success">{t('Advance')}</Badge>
                : o.isCod && !closed ? <Badge tone="warning">{t('COD')}</Badge> : null}
            {o.isTest && <Badge tone="warning" solid>{t('TEST')}</Badge>}
            {!closed && <RiskBadge risk={o.risk} />}
            {opt.confirm && (o.confirmation?.result === 'REFUSED'
              ? <Badge tone="danger">{t('Mana kiya')}</Badge>
              : <Badge tone="warning">{o.confirmation?.result === 'NO_ANSWER' ? t('Jawab nahi ({{attempts}})', { attempts: o.confirmation.attempts }) : t('Confirm baqi')}</Badge>)}
            {o.isCod && o.confirmation?.result === 'CONFIRMED' && !o.dispatchedAt && !closed && <Badge tone="success" icon={CheckCircle2}>{t('Confirm ho gaya')}</Badge>}
            {o.metadata?.cancelRequested && o.orderStatus !== 'CANCELLED' && <Badge tone="danger" solid>{t('Customer ne cancel maanga')}</Badge>}
            {late && <Badge tone="danger" icon={Timer}>{t('{{wait}} se ruka', { wait: waitText(wait) })}</Badge>}
            {o.courierBooked && o.courierLabel && !closed && o.orderStatus !== 'DELIVERED' && <Badge tone="info" icon={Truck}>{o.courierLabel}</Badge>}
          </View>

          {!selecting && canManage && (opt.accept || opt.next) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), marginTop: th.space(1.5) }}>
              {busy ? <ActivityIndicator color={th.colors.brand.solid} /> : opt.accept ? (
                <Button size="sm" variant="success" icon={CheckCircle2} onPress={() => onAccept(o)}>{t('Accept')}</Button>
              ) : (
                <Button size="sm" variant="secondary" onPress={() => onNext(o)}>{t(o.orderStatus in NEXT_ACTION ? NEXT_ACTION[o.orderStatus]! : NEXT_FALLBACK)}</Button>
              )}
              <View style={{ flex: 1 }} />
              <IconButton icon={MoreHorizontal} label={t('Aur kaam')} size="sm" variant="secondary" onPress={() => onMore(o)} />
            </View>
          )}
          {!selecting && (!canManage || !(opt.accept || opt.next)) && !closed && (
            <View style={{ position: 'absolute', bottom: -4, end: 0 }}>
              <IconButton icon={MoreHorizontal} label={t('Aur kaam')} size="sm" onPress={() => onMore(o)} />
            </View>
          )}
        </View>
      </View>
    </PressableScale>
  );
});
