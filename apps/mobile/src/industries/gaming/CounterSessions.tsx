/**
 * The "Stations" tab on the gaming counter. Stations: running sessions, put the
 * time so far on this bill (with snacks and cards) or end one on its own. Cards:
 * digital card kinds with the count in hand; one tap adds a card to the bill.
 */

import { useQuery } from '@tanstack/react-query';
import { CreditCard, Plus, Timer } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { liveBill } from '@nafaa/core/industries/gaming';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, EmptyState, IconButton, ListRow, Segmented, toast, useTheme } from '@/design';
import { usePos } from '@/modules/pos/engine/usePos';
import { gamingApi, type GamingSession } from './api';
import { EndSessionFlow, SessionCard, timerOf } from './components';
import { counterStore } from './counterStore';
import { GAMING_KEYS, minutesText, providerOf } from './meta';

export function CounterSessions({ padBottom }: { padBottom: number }) {
  const th = useTheme();
  const pos = usePos();
  const manage = usePermission()(P.POS_USE);
  const [tab, setTab] = useState<'stations' | 'cards'>('stations');
  const q = useQuery({ queryKey: [GAMING_KEYS.active], queryFn: () => gamingApi.sessions.active(), refetchInterval: 20_000 });
  const info = useQuery({ queryKey: [GAMING_KEYS.counter, 'sessions'], queryFn: async () => { const r = await gamingApi.sessions.counter(); counterStore.set({ timeProductId: r.timeProductId }); return r; }, staleTime: 60_000 });
  const cards = useQuery({ queryKey: [GAMING_KEYS.counter, 'cards'], queryFn: async () => { const r = await gamingApi.topups.counter(); counterStore.set({ cardProductIds: r.map((k) => k.productId) }); return r; }, staleTime: 15_000 });
  const [end, setEnd] = useState<GamingSession | null>(null);

  const addSession = async (s: GamingSession) => {
    const timeId = info.data?.timeProductId;
    if (!timeId) { toast.error(t('Station ka bill abhi nahi ban sakta — internet check karein')); return; }
    if (counterStore.get().sessions.some((p) => p.id === s.id)) { toast.info(t('Ye session pehle se bill me hai')); return; }
    const live = liveBill(timerOf(s), Date.now());
    if (!(live.currentAmount > 0)) { toast.error(t('{{name}} — abhi bill 0 hai', { name: s.station?.name ?? '' })); return; }
    const ok = await pos.addProduct(timeId, { qty: 1, price: live.currentAmount, limit: 9999, separate: true, note: `${s.station?.name ?? 'Station'} · ${minutesText(live.billableMinutes)}` });
    if (ok) counterStore.set({ sessions: [...counterStore.get().sessions, { id: s.id, sessionNumber: s.sessionNumber, amount: live.currentAmount, minutes: live.billableMinutes }] });
  };
  return (
    <ScrollView contentContainerStyle={{ padding: th.space(3), gap: th.space(2), paddingBottom: padBottom }}>
      <Segmented value={tab} onChange={(v) => setTab(v as 'stations' | 'cards')} options={[{ value: 'stations', label: t('Stations'), icon: Timer }, { value: 'cards', label: t('Top-up cards'), icon: CreditCard }]} />
      {tab === 'stations' ? (
        <>
          {(q.data ?? []).length === 0 && <EmptyState icon={Timer} title={t('Abhi koi session nahi chal raha')} />}
          {(q.data ?? []).map((s) => <SessionCard key={s.id} s={s} canManage={manage} onEnd={setEnd} onBill={(x) => void addSession(x)} />)}
        </>
      ) : (
        <View>
          {(cards.data ?? []).length === 0 && <EmptyState icon={CreditCard} title={t('Top-ups page par card daalein')} />}
          {(cards.data ?? []).map((k) => (
            <ListRow key={k.productId} icon={CreditCard} divider title={k.name} subtitle={providerOf(k.provider)}
              trailing={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Badge tone={k.count <= 3 ? 'warning' : 'info'}>{t('{{count}} card', { count: k.count })}</Badge><Amount value={k.sellingPrice} weight="bold" /><IconButton icon={Plus} label={t('Add')} variant="soft" disabled={k.count <= 0} onPress={() => void pos.addProduct(k.productId, { limit: k.count })} /></View>} />
          ))}
        </View>
      )}
      <EndSessionFlow s={end} onClose={() => setEnd(null)} />
    </ScrollView>
  );
}
