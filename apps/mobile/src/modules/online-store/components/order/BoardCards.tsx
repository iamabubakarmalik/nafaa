/**
 * Order screen cards from the board: who has the order and when to contact
 * again, the parcel's journey from the courier's own steps
 * (courierTrail.events, older trails fall back to their history) and the
 * status history (who moved it, when, why).
 */

import { useState } from 'react';
import { View } from 'react-native';
import { CalendarClock, MapPin, Phone, Truck, UserRound } from 'lucide-react-native';
import { formatDateTime, formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { Badge, Button, Card, Icon, Text, useTheme } from '@/design';
import type { BoardOrderDetail, CustomStage } from '../../api/board';
import { boardEntry } from '../../lib/board';
import { callPhone } from '../../lib/device';
import { entryLabel } from '../../hooks/useMoveOrder';
import { TeamToolSheet, type TeamTool } from '../board/TeamSheets';

export function TeamCard({ order: o, canManage }: { order: BoardOrderDetail; canManage: boolean }) {
  const th = useTheme();
  const [tool, setTool] = useState<TeamTool | null>(null);
  const due = !!o.followUpAt && new Date(o.followUpAt).getTime() <= Date.now();
  return (
    <Card title={t('Team')}>
      <View style={{ gap: th.space(3) }}>
        <Row icon={UserRound} label={t('Kis ke zimme')} value={o.assigneeName ?? t('Kisi ke zimme nahi')}
          action={canManage ? <Button size="sm" variant="secondary" onPress={() => setTool('assign')}>{t('Badlein')}</Button> : undefined} />
        <Row icon={CalendarClock} label={t('Follow-up')}
          value={o.followUpAt ? `${formatDateTime(o.followUpAt)}${o.followUpNote ? ` · ${o.followUpNote}` : ''}` : t('Koi nahi')}
          badge={o.followUpAt ? <Badge tone={due ? 'danger' : 'info'}>{formatRelative(o.followUpAt)}</Badge> : undefined}
          action={canManage ? <Button size="sm" variant="secondary" onPress={() => setTool('follow-up')}>{o.followUpAt ? t('Badlein') : t('Lagayein')}</Button> : undefined} />
      </View>
      <TeamToolSheet tool={tool} ids={[o.id]} onClose={() => setTool(null)}
        current={{ assignedToId: o.assignedToId, followUpAt: o.followUpAt, followUpNote: o.followUpNote, tags: o.metadata?.tags }} />
    </Card>
  );
}

function Row({ icon, label, value, badge, action }: { icon: typeof UserRound; label: string; value: string; badge?: React.ReactNode; action?: React.ReactNode }) {
  const th = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
      <Icon icon={icon} size={18} color={th.colors.textMuted} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="2xs" tone="muted">{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1.5), flexWrap: 'wrap' }}>
          <Text size="sm" weight="semibold">{value}</Text>
          {badge}
        </View>
      </View>
      {action}
    </View>
  );
}

/** The courier's own steps, newest first. Hidden until the parcel is booked. */
export function JourneyCard({ order: o }: { order: BoardOrderDetail }) {
  const th = useTheme();
  const [all, setAll] = useState(false);
  const trail = o.courierTrail;
  const steps = trail?.events?.length
    ? trail.events.map((e) => ({ at: e.at, text: e.text, city: e.city, rider: e.rider }))
    : (trail?.history ?? []).map((h) => ({ at: h.at ?? null, text: h.label, city: undefined, rider: undefined }));
  if (!o.trackingNumber || !steps.length) return null;
  const list = [...steps].reverse();
  const shown = all ? list : list.slice(0, 5);
  return (
    <Card title={t('Parcel ka safar')} action={<Badge tone="info" icon={Truck}>{o.courierLabel ?? o.courierName ?? ''}</Badge>}>
      <View style={{ gap: th.space(0.5) }}>
        {shown.map((s, i) => {
          const first = i === 0;
          const c = first ? th.colors.brand : th.colors.neutral;
          return (
            <View key={`${s.at}-${i}`} style={{ flexDirection: 'row', gap: th.space(3) }}>
              <View style={{ alignItems: 'center', width: 14 }}>
                <View style={{ width: 10, height: 10, borderRadius: th.radius('full'), backgroundColor: c.solid, marginTop: 4 }} />
                {i < shown.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: th.colors.divider, marginVertical: 2 }} />}
              </View>
              <View style={{ flex: 1, paddingBottom: th.space(2.5), gap: 2 }}>
                <Text size="sm" weight={first ? 'bold' : 'medium'}>{s.text}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2), alignItems: 'center' }}>
                  {s.at ? <Text size="2xs" tone="muted">{formatDateTime(s.at)}</Text> : null}
                  {s.city ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}><Icon icon={MapPin} size={11} color={th.colors.textMuted} /><Text size="2xs" tone="muted">{s.city}</Text></View> : null}
                </View>
                {s.rider?.name ? (
                  <Button size="sm" variant="ghost" icon={Phone} disabled={!s.rider.phone} onPress={() => callPhone(s.rider?.phone)} style={{ alignSelf: 'flex-start' }}>
                    {t('Rider: {{name}}', { name: s.rider.name })}
                  </Button>
                ) : null}
              </View>
            </View>
          );
        })}
        {list.length > 5 && <Button size="sm" variant="ghost" onPress={() => setAll((v) => !v)}>{all ? t('Kam dikhayein') : t('Sab {{count}} qadam', { count: list.length })}</Button>}
      </View>
    </Card>
  );
}

type TimelineRow = { at: string; byName?: string | null; from?: string | null; to: string; note?: string | null };

/** Who moved the order to which status, newest first. */
export function HistoryCard({ order: o, custom }: { order: BoardOrderDetail; custom: CustomStage[] }) {
  const th = useTheme();
  const rows = ((o.metadata as { timeline?: TimelineRow[] } | undefined)?.timeline ?? []).slice().reverse().slice(0, 12);
  if (!rows.length) return null;
  const name = (k?: string | null) => (k ? entryLabel(boardEntry(k, custom), k) : '');
  return (
    <Card title={t('Status history')}>
      <View style={{ gap: th.space(2.5) }}>
        {rows.map((r, i) => (
          <View key={`${r.at}-${i}`} style={{ gap: 1 }}>
            <Text size="sm" weight="semibold">{r.from ? `${name(r.from)} → ${name(r.to)}` : name(r.to)}</Text>
            <Text size="2xs" tone="muted">{[formatDateTime(r.at), r.byName, r.note].filter(Boolean).join(' · ')}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
