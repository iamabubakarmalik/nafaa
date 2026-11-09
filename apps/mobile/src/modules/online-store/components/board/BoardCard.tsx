/**
 * One order on the board: channel, number, board status chip (tap to
 * move), money, customer and city, items, tracking with the courier's last
 * step, and the badges that matter (COD, risk, confirm result, assignee,
 * follow-up, tags). The WhatsApp button opens the shop's templates and the
 * confirm result. Long press starts picking several.
 */

import { memo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { CalendarClock, Check, ChevronDown, CheckCircle2, MessageCircle, MoreHorizontal, Timer, Truck, UserRound } from 'lucide-react-native';
import { isClosed, itemQty, moneyOf, orderNo, qtyText, waitMinutes } from '@nafaa/core/online-store';
import { formatMoney, formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Badge, Icon, IconButton, PressableScale, Text, useTheme } from '@/design';
import type { BoardOrder, CustomStage } from '../../api/board';
import { boardEntry, boardOf } from '../../lib/board';
import { COURIER_STATE_LABEL } from '../../lib/labels';
import { entryLabel } from '../../hooks/useMoveOrder';
import { ChannelLogo } from '../BrandLogo';
import { RiskBadge } from '../bits';

export interface BoardCardProps {
  order: BoardOrder;
  now: number;
  custom: CustomStage[];
  selecting: boolean;
  checked: boolean;
  busy: boolean;
  canManage: boolean;
  onOpen: (o: BoardOrder) => void;
  onToggle: (o: BoardOrder) => void;
  onLongPress: (o: BoardOrder) => void;
  onStatus: (o: BoardOrder) => void;
  onWhatsApp: (o: BoardOrder) => void;
  onMore: (o: BoardOrder) => void;
}

export const BoardCard = memo(function BoardCard({
  order: o, now, custom, selecting, checked, busy, canManage, onOpen, onToggle, onLongPress, onStatus, onWhatsApp, onMore,
}: BoardCardProps) {
  const th = useTheme();
  const closed = isClosed(o);
  const entry = boardEntry(boardOf(o), custom);
  const tone = th.colors[entry?.tone ?? 'neutral'];
  const color = tone.text;
  const m = moneyOf(o);
  const isNew = o.orderStatus === 'PENDING';
  const wait = waitMinutes(o.receivedAt, now);
  const tags = o.metadata?.tags ?? [];
  const followDue = !!o.followUpAt && new Date(o.followUpAt).getTime() <= now;
  const trail = o.courierTrail;
  const lastStep = trail?.events?.length ? trail.events[trail.events.length - 1]?.text : trail?.label;
  const conf = o.confirmation?.result;

  return (
    <PressableScale onPress={() => (selecting ? onToggle(o) : onOpen(o))} onLongPress={() => onLongPress(o)} scaleTo={0.99}
      haptic={selecting ? 'select' : false} accessibilityLabel={t('Order #{{orderNo}} kholein', { orderNo: orderNo(o) })}
      accessibilityState={{ selected: checked }} style={{ backgroundColor: checked ? th.colors.brand.soft : undefined }}>
      <View style={{ position: 'absolute', top: 0, bottom: 0, start: 0, width: 3, backgroundColor: tone.solid }} />
      <View style={{ flexDirection: 'row', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(3), opacity: closed ? 0.75 : 1 }}>
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
            <View style={{ flex: 1 }} />
            <Amount value={o.total} weight="bold" size="base" style={closed ? { textDecorationLine: 'line-through', color: th.colors.textMuted } : undefined} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1.5) }}>
            <Text size="sm" weight="medium" numberOfLines={1} style={{ maxWidth: '62%' }}>{o.customerName}</Text>
            {!!o.customerCity && <Text size="sm" tone="muted" numberOfLines={1} style={{ flex: 1 }}>· {o.customerCity}</Text>}
          </View>
          <Text size="xs" tone="muted" numberOfLines={1}>
            {t('{{count}} cheezein · {{qtyText}} qty', { count: o.items.length, qtyText: qtyText(itemQty(o)) })} · {formatRelative(o.receivedAt, now)}
            {m.advance > 0 && m.codDue > 0 && !closed ? ` · ${t('COD {{codDue}}', { codDue: formatMoney(m.codDue) })}` : ''}
          </Text>
          {!!o.trackingNumber && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1.5) }}>
              <Icon icon={Truck} size={13} color={th.colors.info.text} />
              <Text size="xs" weight="semibold" tone="info" ltr numberOfLines={1}>{[o.courierLabel, o.trackingNumber].filter(Boolean).join(' · ')}</Text>
              {!!(o.courierStatus && o.courierStatus in COURIER_STATE_LABEL) && (
                <Text size="xs" tone="muted" numberOfLines={1} style={{ flex: 1 }}>· {lastStep || t(COURIER_STATE_LABEL[o.courierStatus as keyof typeof COURIER_STATE_LABEL])}</Text>
              )}
            </View>
          )}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
            {o.paymentStatus === 'PAID' ? <Badge tone="success">{t('Paid')}</Badge>
              : m.advance > 0 && !closed ? <Badge tone="success">{t('Advance')}</Badge>
                : o.isCod && !closed ? <Badge tone="warning">{t('COD')}</Badge> : null}
            {o.isTest && <Badge tone="warning" solid>{t('TEST')}</Badge>}
            {!closed && <RiskBadge risk={o.risk} />}
            {o.isCod && !o.dispatchedAt && !closed && (conf === 'CONFIRMED' ? <Badge tone="success" icon={CheckCircle2}>{t('Confirm ho gaya')}</Badge>
              : conf === 'REFUSED' ? <Badge tone="danger">{t('Mana kiya')}</Badge>
                : conf === 'NO_ANSWER' ? <Badge tone="warning">{t('Jawab nahi ({{attempts}})', { attempts: o.confirmation!.attempts })}</Badge> : null)}
            {o.metadata?.cancelRequested && o.orderStatus !== 'CANCELLED' && <Badge tone="danger" solid>{t('Customer ne cancel maanga')}</Badge>}
            {isNew && !o.isTest && wait >= 15 && <Badge tone="danger" icon={Timer}>{t('{{m}} min', { m: wait })}</Badge>}
            {!!o.assigneeName && <Badge tone="neutral" icon={UserRound}>{o.assigneeName}</Badge>}
            {!!o.followUpAt && <Badge tone={followDue ? 'danger' : 'info'} icon={CalendarClock}>{formatRelative(o.followUpAt, now)}</Badge>}
            {tags.slice(0, 3).map((x) => <Badge key={x} tone="brand">{x}</Badge>)}
          </View>

          {!selecting && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), marginTop: th.space(1.5) }}>
              <PressableScale disabled={!canManage || busy} onPress={() => onStatus(o)} accessibilityLabel={t('Status badlein')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: th.space(2.5), paddingVertical: th.space(1), borderRadius: th.radius('full'), backgroundColor: tone.soft }}>
                {entry && <Icon icon={entry.icon} size={13} color={color} />}
                <Text size="xs" weight="bold" color={color}>{entryLabel(entry, o.orderStatus)}</Text>
                {canManage && (busy ? <ActivityIndicator size="small" color={color} /> : <Icon icon={ChevronDown} size={13} color={color} />)}
              </PressableScale>
              <View style={{ flex: 1 }} />
              {!!o.customerPhone && (
                <PressableScale onPress={() => onWhatsApp(o)} accessibilityLabel={t('WhatsApp message')}
                  style={{ width: 34, height: 34, borderRadius: th.radius('full'), backgroundColor: th.colors.success.solid, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon icon={MessageCircle} size={17} color={th.colors.success.onSolid} />
                </PressableScale>
              )}
              <IconButton icon={MoreHorizontal} label={t('Aur kaam')} size="sm" variant="secondary" onPress={() => onMore(o)} />
            </View>
          )}
        </View>
      </View>
    </PressableScale>
  );
});
