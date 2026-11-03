/**
 * Kitchen display (web KotDisplayPage): tickets (KOT) per station in three
 * lanes — new, cooking, ready. A ticket shows table or token, minutes since
 * it came in (amber after 10, red after 20), each dish with options and
 * notes, and one big button for the next step ("bump"). Cancel tickets for
 * voided dishes show in red on top; ready takeaway tokens are listed so the
 * counter can call them. A new ticket buzzes the device. Kitchen staff land
 * here. Tablets show the three lanes side by side.
 *
 * Tickets come from every phone and computer, so the screen needs the
 * server; offline it keeps showing the last tickets it had.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { Bell, BellOff, CheckCheck, ChefHat, Clock, Flame, HandPlatter, Printer, XCircle } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LANE_OF, NEXT_KOT, ageTone, freshTickets, minutesSince, readyCallouts, type KitchenLane, type KotStatus } from '@nafaa/core/restaurant';
import { useAuthStore } from '@/core/auth/store';
import { haptic } from '@/core/device/haptics';
import { msg, t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { kv } from '@/core/storage/kv';
import { Badge, Button, Chip, EmptyState, Icon, IconButton, Row, ScreenHeader, Segmented, Skeleton, Text, toast, useLayout, useTabBarSpace, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { kotApi, type Kot } from '../api';
import { KOT_KEY, MODE_META, apiError, refreshOrders } from '../meta';
import { printKot, snapshotOf } from '../slips';

const LANES: Array<{ id: KitchenLane; label: string; tone: 'info' | 'warning' | 'success' }> = [
  { id: 'new', label: msg('Naye'), tone: 'info' },
  { id: 'cooking', label: msg('Ban rahe'), tone: 'warning' },
  { id: 'ready', label: msg('Tayyar'), tone: 'success' },
];
const NONE = '-';
const ALERT_KEY = 'nafaa.restaurant.kotAlert';

export function KitchenScreen() {
  const th = useTheme();
  const insets = useSafeAreaInsets();
  const { isTablet } = useLayout();
  const tabSpace = useTabBarSpace();
  const can = usePermission();
  const online = useOnlineStatus();
  const shopName = useAuthStore((s) => s.tenant?.name) || t('Restaurant');
  const canCook = can(P.RESTAURANT_KITCHEN_MANAGE);
  const [station, setStation] = useState('all');
  const [lane, setLane] = useState<KitchenLane>('new');
  const [alert, setAlert] = useState(() => kv.get<boolean>(ALERT_KEY, true));
  const [, tick] = useState(0);
  const seen = useRef<Set<string> | null>(null);

  const q = useQuery({ queryKey: [KOT_KEY, 'active'], queryFn: () => kotApi.list({ active: true }), refetchInterval: 8_000 });
  const kots = q.data ?? [];

  useEffect(() => { const x = setInterval(() => tick((n) => n + 1), 30_000); return () => clearInterval(x); }, []);
  // Buzz once for each ticket that was not on the screen before.
  useEffect(() => {
    if (!q.data) return;
    if (alert && freshTickets(seen.current, q.data).length) {
      haptic('warning');
      Vibration.vibrate([0, 300, 150, 300]);
    }
    seen.current = new Set(q.data.map((k) => k.id));
  }, [q.data, alert]);

  const stations = useMemo(() => {
    const m = new Map<string, number>();
    for (const k of kots) if (k.status !== 'CANCELLED') m.set(k.station || NONE, (m.get(k.station || NONE) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [kots]);
  const mine = kots.filter((k) => station === 'all' || (k.station || NONE) === station);
  const cancels = mine.filter((k) => k.status === 'CANCELLED');
  const inLane = (id: KitchenLane) => mine.filter((k) => LANE_OF[k.status] === id);
  const callouts = useMemo(() => readyCallouts(kots), [kots]);
  const late = mine.filter((k) => LANE_OF[k.status] && LANE_OF[k.status] !== 'ready' && minutesSince(k.createdAt) >= 20).length;

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: KotStatus }) => kotApi.updateStatus(id, status),
    onMutate: () => haptic('success'),
    onSuccess: () => refreshOrders(),
    onError: (e) => toast.error(apiError(e)),
  });
  const bump = (k: Kot, status: KotStatus) => {
    if (!online) { toast.warning(onlineNeededText('kitchenDisplay')); return; }
    move.mutate({ id: k.id, status });
  };
  const toggleAlert = () => setAlert((v) => { kv.set(ALERT_KEY, !v); return !v; });

  const ticket = (k: Kot, cancel = false) => (
    <Ticket key={k.id} k={k} cancel={cancel} canCook={canCook} busy={move.isPending && move.variables?.id === k.id}
      onPrint={() => { printKot(k, shopName); if (k.status === 'PENDING' && canCook && online) move.mutate({ id: k.id, status: 'PRINTED' }); }}
      onNext={(s) => bump(k, s)} />
  );

  const column = (id: KitchenLane) => {
    const list = inLane(id);
    return !list.length
      ? <View style={{ padding: th.space(8), alignItems: 'center' }}><Text tone="muted">{t('Khaali')}</Text></View>
      : <View style={{ gap: th.space(3) }}>{list.map((k) => ticket(k))}</View>;
  };

  return (
    <View style={{ flex: 1, backgroundColor: th.colors.canvas, paddingTop: insets.top }}>
      <ScreenHeader onBack={null} title={t('Kitchen')} subtitle={station === 'all' ? t('Sab stations') : station === NONE ? t('Bina station') : station}
        actions={<IconButton icon={alert ? Bell : BellOff} label={alert ? t('Awaaz on') : t('Awaaz off')} onPress={toggleAlert} />} />
      <View style={{ paddingHorizontal: th.space(4), gap: th.space(2), paddingBottom: th.space(2) }}>
        <Row gap={2}>
          {LANES.map((l) => (
            <View key={l.id} style={{ flex: 1, padding: th.space(2), borderRadius: th.radius('lg'), backgroundColor: th.colors[l.tone].soft, alignItems: 'center' }}>
              <Text size="2xl" weight="bold" ltr color={th.colors[l.tone].text}>{String(inLane(l.id).length)}</Text>
              <Text size="xs" color={th.colors[l.tone].text}>{t(l.label)}</Text>
            </View>
          ))}
          <View style={{ flex: 1, padding: th.space(2), borderRadius: th.radius('lg'), backgroundColor: late ? th.colors.danger.soft : th.colors.surfaceMuted, alignItems: 'center' }}>
            <Text size="2xl" weight="bold" ltr color={late ? th.colors.danger.text : undefined}>{String(late)}</Text>
            <Text size="xs" align="center" color={late ? th.colors.danger.text : th.colors.textMuted}>{t('20 min se zyada')}</Text>
          </View>
        </Row>
        {stations.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: th.space(2) }}>
            <Chip label={t('Sab')} count={kots.filter((k) => k.status !== 'CANCELLED').length} selected={station === 'all'} onPress={() => setStation('all')} />
            {stations.map(([s, n]) => <Chip key={s} label={s === NONE ? t('Bina station') : s} count={n} selected={station === s} onPress={() => setStation(s)} />)}
          </ScrollView>
        )}
        {!isTablet && (
          <Segmented value={lane} onChange={setLane} options={LANES.map((l) => ({ value: l.id, label: t(l.label), count: inLane(l.id).length }))} />
        )}
        <CachedNote query={q} />
      </View>

      <ScrollView contentContainerStyle={{ padding: th.space(4), paddingTop: 0, gap: th.space(3), paddingBottom: Math.max(tabSpace, insets.bottom) + th.space(6) }}>
        {callouts.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: th.space(2), padding: th.space(3), borderRadius: th.radius('xl'), backgroundColor: th.colors.success.soft, borderWidth: 1, borderColor: th.colors.success.border }}>
            <Icon icon={HandPlatter} size={20} color={th.colors.success.text} />
            <Text weight="semibold" color={th.colors.success.text}>{t('Counter par bulayein:')}</Text>
            {callouts.map((c) => <Badge key={c} tone="success" solid size="md">{c}</Badge>)}
          </View>
        )}
        {cancels.length > 0 && <View style={{ gap: th.space(3) }}>{cancels.map((k) => ticket(k, true))}</View>}
        {q.isLoading ? (
          <View style={{ gap: th.space(3) }}>{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} height={180} radius={th.radius('xl')} />)}</View>
        ) : !kots.length ? (
          <EmptyState icon={ChefHat} title={t('Kitchen me koi ticket nahi. Naya order "Kitchen bhejein" se yahan aata hai.')} />
        ) : isTablet ? (
          <Row gap={3} align="start">
            {LANES.map((l) => (
              <View key={l.id} style={{ flex: 1, gap: th.space(2), padding: th.space(2), borderRadius: th.radius('xl'), backgroundColor: th.colors.surfaceSunken }}>
                <Row justify="between" style={{ paddingHorizontal: th.space(1) }}>
                  <Badge tone={l.tone} dot size="md">{t(l.label)}</Badge>
                  <Text weight="bold" ltr>{String(inLane(l.id).length)}</Text>
                </Row>
                {column(l.id)}
              </View>
            ))}
          </Row>
        ) : column(lane)}
      </ScrollView>
    </View>
  );
}

function Ticket({ k, cancel, busy, canCook, onPrint, onNext }: {
  k: Kot; cancel?: boolean; busy?: boolean; canCook?: boolean; onPrint: () => void; onNext: (s: KotStatus) => void;
}) {
  const th = useTheme();
  const snap = snapshotOf(k);
  const o = k.order;
  const age = minutesSince(k.createdAt);
  const table = snap.table ?? o?.table;
  const modeKey = (o?.mode ?? snap.mode) as keyof typeof MODE_META | undefined;
  const mode = modeKey && MODE_META[modeKey] ? t(MODE_META[modeKey].label) : '';
  const token = o?.token ?? snap.token;
  const title = table ? t('Table {{tableNumber}}', { tableNumber: table.tableNumber }) : token ? t('Token #{{token}}', { token }) : o?.customerName || o?.orderNumber || k.kotNumber;
  const tone = ageTone(age);
  const lane = LANE_OF[k.status];
  const timeTone = cancel ? th.colors.danger : tone === 'very-late' ? th.colors.danger : tone === 'late' ? th.colors.warning : th.colors.success;
  const next = lane ? NEXT_KOT[lane] : null;
  const nextLabel = lane === 'new' ? t('Shuru') : lane === 'cooking' ? t('Tayyar') : t('De diya');
  const nextIcon = lane === 'new' ? Flame : lane === 'cooking' ? CheckCheck : HandPlatter;
  return (
    <View style={{ borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: cancel || (tone === 'very-late' && lane !== 'ready') ? 2 : 1, borderColor: cancel ? th.colors.danger.solid : tone === 'very-late' && lane !== 'ready' ? th.colors.danger.border : th.colors.border }}>
      <Row justify="between" align="start" gap={2} style={{ padding: th.space(3), backgroundColor: cancel ? th.colors.danger.soft : th.colors.surfaceMuted }}>
        <View style={{ flex: 1 }}>
          <Row gap={1}>
            {cancel && <Icon icon={XCircle} size={18} color={th.colors.danger.text} />}
            <Text size="xl" weight="bold" numberOfLines={1}>{title}</Text>
          </Row>
          <Text size="xs" tone="muted" numberOfLines={1}>{[k.kotNumber, k.station, mode, o?.numberOfGuests ? t(' · {{numberOfGuests}} log', { numberOfGuests: o.numberOfGuests }).replace(/^ · /, '') : ''].filter(Boolean).join(' · ')}</Text>
        </View>
        <Row gap={1} style={{ paddingHorizontal: th.space(2), paddingVertical: 4, borderRadius: th.radius('md'), backgroundColor: cancel ? th.colors.danger.solid : timeTone.soft }}>
          <Icon icon={Clock} size={14} color={cancel ? th.colors.danger.onSolid : timeTone.text} />
          <Text size="sm" weight="bold" ltr color={cancel ? th.colors.danger.onSolid : timeTone.text}>{cancel ? t('CANCEL') : t('{{age}}m', { age })}</Text>
        </Row>
      </Row>
      <View style={{ paddingHorizontal: th.space(3) }}>
        {(snap.items ?? []).map((it, i) => (
          <View key={it.id ?? i} style={{ paddingVertical: th.space(2), borderBottomWidth: 1, borderBottomColor: th.colors.divider }}>
            <Text size="lg" weight="semibold" style={cancel ? { textDecorationLine: 'line-through' } : undefined}><Text size="lg" weight="bold" ltr>{`${it.quantity}× `}</Text>{it.name}</Text>
            {(it.modifiers?.length ?? 0) > 0 && <Text size="sm" tone="secondary">{it.modifiers!.join(', ')}</Text>}
            {!!it.spiceLevel && it.spiceLevel !== 'NONE' && <Row gap={1}><Icon icon={Flame} size={12} color={th.colors.danger.text} /><Text size="xs" weight="semibold" color={th.colors.danger.text}>{it.spiceLevel}</Text></Row>}
            {!!(it.specialInstructions || it.cookingNote) && <Text size="sm" weight="medium" italic color={th.colors.warning.text}>“{[it.cookingNote, it.specialInstructions].filter(Boolean).join(' · ')}”</Text>}
          </View>
        ))}
      </View>
      {!!(snap.specialRequests || k.notes) && (
        <View style={{ margin: th.space(3), marginBottom: 0, padding: th.space(2), borderRadius: th.radius('md'), backgroundColor: th.colors.warning.soft }}>
          <Text size="sm" color={th.colors.warning.text}>{[snap.specialRequests, k.notes].filter(Boolean).join(' · ')}</Text>
        </View>
      )}
      <Row gap={2} style={{ padding: th.space(3) }}>
        <IconButton icon={Printer} label={t('Print')} variant="secondary" onPress={onPrint} />
        {!cancel && canCook && next && (
          <Button size="xl" icon={nextIcon} style={{ flex: 1 }} variant={lane === 'cooking' ? 'success' : lane === 'ready' ? 'secondary' : 'primary'} loading={busy} onPress={() => onNext(next)}>{nextLabel}</Button>
        )}
      </Row>
    </View>
  );
}

/** Kitchen as a tab (kitchen staff land here). */
export const KitchenTab = KitchenScreen;
