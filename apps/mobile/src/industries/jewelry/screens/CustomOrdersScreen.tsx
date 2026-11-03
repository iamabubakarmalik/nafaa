/**
 * Made-to-order jewelry (web CustomOrdersPage): due today, late, with the
 * karigar, ready and money still to come; the orders by view with search,
 * karigar and sort. Swipe a row for the next step and advance; tap it for
 * every step: gold advance, gold to the karigar and the piece back, delivery
 * (the bill), edit, cancel and the slips. Needs the server.
 */

import { useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Hammer, MessageCircle, Palette, Pencil, Plus, Printer, Receipt, Repeat, Scale, Share2, Wallet, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { NEXT_STATUS, isOrderClosed } from '@nafaa/core/industries/jewelry';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { withManagerPin } from '@/core/security/ManagerPin';
import { Amount, Badge, ChipGroup, EmptyState, ListRow, ListTemplate, Select, Sheet, StatTile, SwipeRow, Text, toast, useDebouncedValue, useTheme } from '@/design';
import { OfflineNote, PaySheet, daysFromToday, errorText } from '@/industries/_shared/deskKit';
import { openWhatsApp } from '@/modules/customers/lib/contact';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { customOrdersApi, karigarsApi, type CustomOrderQuery, type CustomOrderRow, type OrderView } from '../api';
import { DeliverSheet, GoldAdvanceSheet, OrderFormSheet, OrderMetalSheet, ReasonSheet } from '../components/OrderSheets';
import { KaratBadge, OrderStatusPill } from '../components/ui';
import { KEYS, categoryLabel, day, grams, orderStatus, refreshJewelry } from '../meta';
import { orderSlip, sendSlip } from '../slip';

const VIEWS: Array<{ value: OrderView; label: string }> = [
  { value: 'active', label: msg('Chal rahe') }, { value: 'today', label: msg('Aaj dena hai') }, { value: 'late', label: msg('Late') }, { value: 'work', label: msg('Karigar ke paas') },
  { value: 'ready', label: msg('Tayyar') }, { value: 'unpaid', label: msg('Paisa baqi') }, { value: 'done', label: msg('De diye / cancel') }, { value: 'all', label: msg('Sab') },
];
const priceOf = (o: CustomOrderRow) => o.finalPrice ?? o.estimatedPrice;
const isLate = (o: CustomOrderRow) => !isOrderClosed(o.status) && (daysFromToday(o.promisedDate) ?? 0) < 0 && !!o.promisedDate;

type Act = { o: CustomOrderRow; kind: 'menu' | 'pay' | 'gold' | 'issue' | 'receive' | 'deliver' | 'cancel' } | null;

export function CustomOrdersScreen() {
  const th = useTheme();
  const can = usePermission();
  const lang = useBillLanguage();
  const shop = useAuthStore((s) => s.tenant?.name) ?? t('Jewelry');
  const canManage = can(P.POS_USE);
  const canMetal = can(P.STOCK_ADJUSTMENTS_MANAGE);
  const [view, setView] = useState<OrderView>('active');
  const [sort, setSort] = useState<NonNullable<CustomOrderQuery['sort']>>('due');
  const [karigarId, setKarigarId] = useState('');
  const { q: openWith } = useLocalSearchParams<{ q?: string }>();
  const [search, setSearch] = useState(openWith ?? '');
  const query = useDebouncedValue(search.trim(), 250);
  const [form, setForm] = useState<CustomOrderRow | 'new' | null>(null);
  const [act, setAct] = useState<Act>(null);

  const q: CustomOrderQuery = { view, sort, search: query || undefined, karigarId: karigarId || undefined };
  const list = useInfiniteQuery({
    queryKey: [KEYS.orders, 'page', q], queryFn: ({ pageParam }) => customOrdersApi.page({ ...q, page: pageParam, limit: 30 }), initialPageParam: 1,
    getNextPageParam: (l) => (l.page < l.pages ? l.page + 1 : undefined), placeholderData: (p) => p, refetchInterval: 60_000,
  });
  const sumQ = useQuery({ queryKey: [KEYS.orders, 'summary'], queryFn: customOrdersApi.summary, refetchInterval: 60_000 });
  const karigars = useQuery({ queryKey: [KEYS.karigars, 'list', { isActive: 'true' }], queryFn: () => karigarsApi.list({ isActive: 'true' }), staleTime: 60_000 });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const first = list.data?.pages[0];
  const sum = sumQ.data;
  const refresh = () => refreshJewelry([KEYS.orders, KEYS.karigars, KEYS.metal, KEYS.exchanges, 'metal-stock-balance'], true);

  const step = useMutation({
    mutationFn: ({ o, status, reason, pin }: { o: CustomOrderRow; status: string; reason?: string; pin?: string }) => customOrdersApi.updateStatus(o.id, status, reason, pin),
    onSuccess: (_r, v) => { toast.success(v.status === 'DELIVERED' ? t('Order de diya — bill ban gaya') : t('Order: {{label}}', { label: t(orderStatus(v.status).label) })); setAct(null); refresh(); },
    onError: (e) => toast.error(errorText(e, t('Order update nahi hua'))),
  });
  const deliver = (o: CustomOrderRow) => withManagerPin(t('Udhaar ke liye malik ka PIN'), (pin) => step.mutateAsync({ o, status: 'DELIVERED', pin }), 'credit').catch(() => undefined);
  const pay = (o: CustomOrderRow) => async (p: { paymentMethod: string; paidAmount: number }) => { await customOrdersApi.addPayment(o.id, p.paidAmount, p.paymentMethod); toast.success(t('Advance jama — customer ke khate me')); refresh(); };
  const slip = (o: CustomOrderRow, karigar: boolean, share: boolean) => void sendSlip(orderSlip(o, lang, karigar), shop, lang, share).catch((e) => toast.error(errorText(e, t('Print nahi hua'))));
  const filtered = !!karigarId || !!query;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <StatTile style={{ flex: 1 }} icon={Clock} tone="warning" label={t('Aaj dena hai')} loading={!sum} value={String(sum?.today ?? 0)} onPress={() => setView('today')} />
        <StatTile style={{ flex: 1 }} icon={AlertTriangle} tone={sum?.late ? 'danger' : 'neutral'} label={t('Late')} loading={!sum} value={String(sum?.late ?? 0)} hint={sum?.late ? t('Customer ko batayein') : t('Koi late nahi')} onPress={() => setView('late')} />
      </View>
      <View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <StatTile style={{ flex: 1 }} icon={Hammer} tone="accent" label={t('Karigar ke paas')} loading={!sum} value={String(sum?.work ?? 0)} onPress={() => setView('work')} />
        <StatTile style={{ flex: 1 }} icon={CheckCircle2} tone="success" label={t('Tayyar')} loading={!sum} value={String(sum?.ready ?? 0)} hint={t('Customer ko bulayein')} onPress={() => setView('ready')} />
      </View>
      <ChipGroup value={view} onChange={(v) => setView(v as OrderView)} style={{ marginHorizontal: -th.space(4) }}
        options={VIEWS.map((v) => ({ value: v.value, label: t(v.label), count: first?.counts?.[v.value] }))} />
      <View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <View style={{ flex: 1 }}><Select label={t('Karigar')} value={karigarId} onChange={setKarigarId} options={[{ value: '', label: t('Sab') }, ...(karigars.data ?? []).map((k) => ({ value: k.id, label: k.fullName }))]} /></View>
        <View style={{ flex: 1 }}><Select label={t('Tarteeb')} value={sort} onChange={(v) => setSort(v as typeof sort)} options={[{ value: 'due', label: t('Jo pehle dena') }, { value: 'recent', label: t('Naye pehle') }, { value: 'amount', label: t('Bari amount pehle') }]} /></View>
      </View>
      {first && first.total > 0 && <Text size="sm" tone="secondary">{t('{{total}} orders · {{value}}', { total: first.total, value: formatMoney(first.totals.value) })} · {t('Advance {{paid}}', { paid: formatMoney(first.totals.paid) })}</Text>}
      <CachedNote query={list} />
      <OfflineNote feature="jewelryDesk" />
    </View>
  );

  const menu = act?.kind === 'menu' ? act.o : null;
  const open = menu ? !isOrderClosed(menu.status) : false;
  const next = menu ? NEXT_STATUS[menu.status] : undefined;
  const go = (kind: NonNullable<Act>['kind']) => { if (menu) setAct({ o: menu, kind }); };

  return (
    <>
      <ListTemplate<CustomOrderRow>
        title={t('Custom orders')}
        search={{ value: search, onChange: setSearch, placeholder: t('Customer, phone, order #, design…') }}
        summary={header}
        data={rows}
        loading={list.isLoading}
        error={!list.data ? list.error : undefined}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => { void list.refetch(); void sumQ.refetch(); }}
        onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        keyExtractor={(o) => o.id}
        renderItem={({ item: o }) => {
          const nx = NEXT_STATUS[o.status];
          const live = !isOrderClosed(o.status);
          return (
            <SwipeRow end={live && canManage ? [
              ...(o.status === 'READY' ? [{ icon: Receipt, label: t('De dein'), tone: 'success' as const, onPress: () => setAct({ o, kind: 'deliver' }) }] : []),
              ...(nx ? [{ icon: ArrowRight, label: t(orderStatus(nx).label), tone: 'brand' as const, onPress: () => step.mutate({ o, status: nx }) }] : []),
              { icon: Wallet, label: t('Advance'), tone: 'info' as const, onPress: () => setAct({ o, kind: 'pay' }) },
            ] : []}>
              <ListRow icon={Palette} iconTone={isLate(o) ? 'danger' : orderStatus(o.status).tone} title={o.customerName}
                subtitle={`${o.orderNumber} · ${categoryLabel(o.category)} · ${grams(o.expectedGrossWeight)} · ${t('Dena')} ${day(o.promisedDate)}${o.assignedKarigarName ? ` · ${o.assignedKarigarName}` : ''}`}
                trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Amount value={priceOf(o)} weight="bold" />
                  <OrderStatusPill status={o.status} />
                  {live && <Text size="2xs" tone={o.due > 0 ? 'warning' : 'success'}>{o.due > 0 ? t('Baqi {{due}}', { due: formatMoney(o.due) }) : t('Poora mila')}</Text>}
                </View>}
                onPress={() => setAct({ o, kind: 'menu' })} />
            </SwipeRow>
          );
        }}
        empty={<EmptyState icon={Palette} title={filtered ? t('Is filter me koi order nahi') : view === 'late' ? t('Koi order late nahi — shabash') : t('Koi order nahi')}
          message={t('Customer ka design, karat aur andaza wazan likhein, advance (cash ya purana sona) lein aur parchi dein.')} />}
        fab={canManage ? { icon: Plus, label: t('Naya order'), onPress: () => setForm('new') } : undefined}
      />

      <OrderFormSheet open={!!form} order={form === 'new' ? null : form} onClose={() => setForm(null)} />
      <GoldAdvanceSheet o={act?.kind === 'gold' ? act.o : null} onClose={() => setAct(null)} />
      <OrderMetalSheet o={act?.kind === 'issue' || act?.kind === 'receive' ? act.o : null} mode={act?.kind === 'receive' ? 'receive' : 'issue'} onClose={() => setAct(null)} />
      <DeliverSheet o={act?.kind === 'deliver' ? act.o : null} loading={step.isPending} onClose={() => setAct(null)}
        onConfirm={async (finalPrice) => {
          const o = act!.o;
          if (Math.abs(finalPrice - priceOf(o)) >= 0.01) {
            try { await customOrdersApi.update(o.id, { finalPrice }); } catch (e) { toast.error(errorText(e, t('Qeemat save nahi hui'))); return; }
          }
          await deliver({ ...o, finalPrice });
        }} />
      <ReasonSheet open={act?.kind === 'cancel'} title={t('Order cancel karein')} label={t('Wajah')} placeholder={t('Customer ne mana kar diya, design badla…')} cta={t('Order cancel karein')} loading={step.isPending}
        onClose={() => setAct(null)} onConfirm={(reason) => step.mutate({ o: act!.o, status: 'CANCELLED', reason })} />
      <PaySheet open={act?.kind === 'pay'} title={t('Advance jama karein')} name={act?.o.customerName ?? ''} due={act?.o.due || act?.o.estimatedPrice || 0} cta={t('Advance jama karein')}
        onClose={() => setAct(null)} onConfirm={(p) => pay(act!.o)(p)} />

      <Sheet open={!!menu} onClose={() => setAct(null)} title={menu?.customerName ?? ''} description={menu ? `${menu.orderNumber} · ${t(orderStatus(menu.status).label)}` : undefined}>
        {menu && (
          <View>
            {open && canManage && menu.status === 'READY' && <ListRow icon={Receipt} iconTone="success" title={t('De dein')} subtitle={t('Final qeemat likhein — bill banta hai')} chevron onPress={() => go('deliver')} />}
            {open && canManage && !!next && <ListRow icon={ArrowRight} title={t(orderStatus(next).label)} subtitle={t('Agla qadam')} onPress={() => { step.mutate({ o: menu, status: next }); }} />}
            {open && canManage && <ListRow icon={Wallet} iconTone="info" title={t('Advance')} chevron onPress={() => go('pay')} />}
            {open && canManage && <ListRow icon={Repeat} iconTone="warning" title={t('Sona')} subtitle={t('Customer ka purana sona advance')} chevron onPress={() => go('gold')} />}
            {open && canMetal && <ListRow icon={Hammer} iconTone="accent" title={t('Karigar')} subtitle={t('Karigar ko sona dein')} chevron onPress={() => go('issue')} />}
            {open && canMetal && (menu.metalIssuedGrams ?? 0) > 0 && <ListRow icon={Scale} title={t('Zewar aaya')} chevron onPress={() => go('receive')} />}
            {open && canManage && <ListRow icon={Pencil} title={t('Badlein')} onPress={() => { setAct(null); setTimeout(() => setForm(menu), 350); }} />}
            <ListRow icon={Printer} title={t('Parchi')} onPress={() => slip(menu, false, false)} />
            <ListRow icon={Share2} title={t('Parchi share karein')} onPress={() => slip(menu, false, true)} />
            {!!menu.assignedKarigarName && <ListRow icon={Printer} title={t('Karigar parchi')} onPress={() => slip(menu, true, false)} />}
            <ListRow icon={MessageCircle} title={t('WhatsApp')} onPress={() => openWhatsApp(menu.customerPhone, t('{{shop}}: aap ka order {{no}} — {{status}}. Baqi {{due}}.', { shop, no: menu.orderNumber, status: t(orderStatus(menu.status).label), due: formatMoney(menu.due) }))} />
            {open && canManage && <ListRow icon={XCircle} destructive title={t('Cancel')} onPress={() => go('cancel')} />}
          </View>
        )}
      </Sheet>
    </>
  );
}
