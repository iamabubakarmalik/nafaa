/**
 * Repairs on the customer's own piece (web RepairsPage). Booking in takes the
 * piece, weight and karat, the promised day, the charge and any advance
 * (held on the customer's khata); a karigar can be put on the job. Steps go
 * received, in work, ready; handing back makes the bill (the counter takes
 * charge less advance). "Purane record" lists repairs booked before this
 * page; one still in the shop can be handed back from there. Needs the server.
 */

import { useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Archive, ArrowRight, CheckCircle2, ListChecks, Pencil, Plus, Printer, Receipt, Share2, Wallet, Wrench, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Amount, ChipGroup, EmptyState, ListRow, ListTemplate, Sheet, StatTile, StatusPill, SwipeRow, Text, toast, useDebouncedValue, useTheme } from '@/design';
import { OfflineNote, PaySheet, daysFromToday, errorText } from '@/industries/_shared/deskKit';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { exchangesApi, repairsApi, type Exchange, type Repair, type RepairStatus, type RepairView } from '../api';
import { AdvanceSheet, RepairFormSheet } from '../components/RepairSheets';
import { ReasonSheet } from '../components/OrderSheets';
import { KaratBadge } from '../components/ui';
import { KEYS, REPAIR_STATUS, day, exchangeLabel, grams, refreshJewelry } from '../meta';
import { repairSlip, sendSlip } from '../slip';

type Tab = RepairView | 'old';
const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'open', label: msg('Dukaan me') }, { value: 'ready', label: msg('Tayyar') }, { value: 'late', label: msg('Late') }, { value: 'done', label: msg('De diye') },
  { value: 'cancelled', label: msg('Cancel') }, { value: 'all', label: msg('Sab') }, { value: 'old', label: msg('Purane record') },
];
const NEXT: Partial<Record<RepairStatus, RepairStatus>> = { RECEIVED: 'IN_PROGRESS', IN_PROGRESS: 'READY' };
const isOpen = (r: Repair) => r.status === 'RECEIVED' || r.status === 'IN_PROGRESS' || r.status === 'READY';
const isLate = (r: Repair) => isOpen(r) && !!r.promisedDate && (daysFromToday(r.promisedDate) ?? 0) < 0;

type Act = { r: Repair; kind: 'menu' | 'deliver' | 'pay' | 'cancel' } | null;

export function RepairsScreen() {
  const th = useTheme();
  const can = usePermission();
  const lang = useBillLanguage();
  const shop = useAuthStore((s) => s.tenant?.name) ?? t('Jewelry');
  const canDo = can(P.POS_USE);
  const [tab, setTab] = useState<Tab>('open');
  const { q: openWith } = useLocalSearchParams<{ q?: string }>();
  const [search, setSearch] = useState(openWith ?? '');
  const query = useDebouncedValue(search.trim(), 250);
  const [form, setForm] = useState<Repair | 'new' | null>(null);
  const [act, setAct] = useState<Act>(null);
  const [oldDeliver, setOldDeliver] = useState<Exchange | null>(null);
  const old = tab === 'old';

  const list = useInfiniteQuery({
    queryKey: [KEYS.repairs, 'page', tab, query], queryFn: ({ pageParam }) => repairsApi.page({ view: tab as RepairView, search: query || undefined, page: pageParam, limit: 30 }), initialPageParam: 1,
    getNextPageParam: (l) => (l.page < l.pages ? l.page + 1 : undefined), placeholderData: (p) => p, enabled: !old,
  });
  const oldQ = useQuery({ queryKey: [KEYS.exchanges, 'repair', query], queryFn: () => exchangesApi.page({ kind: 'repair', page: 1, limit: 50, search: query || undefined }), enabled: old });
  const countsQ = useQuery({ queryKey: [KEYS.repairs, 'counts'], queryFn: () => repairsApi.page({ view: 'open', limit: 1 }) });
  const counts = countsQ.data?.counts;
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const refresh = () => refreshJewelry([KEYS.repairs, KEYS.exchanges, KEYS.karigars], true);

  const step = useMutation({
    mutationFn: ({ r, status, reason }: { r: Repair; status: RepairStatus; reason?: string }) => repairsApi.status(r.id, status, reason),
    onSuccess: (r) => { toast.success(`${r.repairNumber}: ${t(REPAIR_STATUS[r.status].label)}`); setAct(null); refresh(); },
    onError: (e) => toast.error(errorText(e, t('Halat nahi badli'))),
  });
  const deliver = async (r: Repair, p: { paymentMethod: string; paidAmount: number }) => {
    const res = await repairsApi.deliver(r.id, { charge: r.charge, paidAmount: p.paidAmount, paymentMethod: p.paymentMethod });
    toast.success(res.saleId ? t('Zewar wapas — bill ban gaya') : t('Zewar wapas de diya'));
    refresh();
  };
  const slip = (r: Repair, karigar: boolean, share: boolean) => void sendSlip(repairSlip(r, lang, karigar), shop, lang, share).catch((e) => toast.error(errorText(e, t('Print nahi hua'))));

  const header = (
    <View style={{ gap: th.space(3) }}>
      <View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <StatTile style={{ flex: 1 }} icon={ListChecks} tone="info" label={t('Dukaan me')} loading={!counts} value={String(counts?.open ?? 0)} onPress={() => setTab('open')} />
        <StatTile style={{ flex: 1 }} icon={CheckCircle2} tone="success" label={t('Tayyar')} loading={!counts} value={String(counts?.ready ?? 0)} onPress={() => setTab('ready')} />
      </View>
      <View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <StatTile style={{ flex: 1 }} icon={AlertTriangle} tone={counts?.late ? 'danger' : 'neutral'} label={t('Late')} loading={!counts} value={String(counts?.late ?? 0)} onPress={() => setTab('late')} />
        <StatTile style={{ flex: 1 }} icon={Wallet} tone="warning" label={t('Advance jama')} loading={!countsQ.data} value={<Amount value={countsQ.data?.totals.advance ?? 0} size="lg" weight="bold" compact />} />
      </View>
      <ChipGroup value={tab} onChange={(v) => setTab(v as Tab)} style={{ marginHorizontal: -th.space(4) }}
        options={TABS.map((x) => ({ value: x.value, label: t(x.label), count: x.value === 'old' ? undefined : counts?.[x.value as RepairView] }))} />
      {!old && <CachedNote query={list} />}
      <OfflineNote feature="jewelryDesk" />
    </View>
  );

  const menu = act?.kind === 'menu' ? act.r : null;
  const go = (kind: 'deliver' | 'pay' | 'cancel') => { if (menu) setAct({ r: menu, kind }); };

  return (
    <>
      <ListTemplate<Repair | Exchange>
        title={t('Repair')}
        search={{ value: search, onChange: setSearch, placeholder: t('Customer, phone, parchi #, zewar…') }}
        summary={header}
        data={old ? oldQ.data?.items ?? [] : rows}
        loading={old ? oldQ.isLoading : list.isLoading}
        error={old ? oldQ.error : !list.data ? list.error : undefined}
        onRetry={() => { void list.refetch(); void oldQ.refetch(); }}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => { void list.refetch(); void oldQ.refetch(); void countsQ.refetch(); }}
        onEndReached={() => { if (!old && list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => {
          if ('exchangeNumber' in item) {
            const e = item;
            return (
              <ListRow icon={Archive} title={e.customerName} subtitle={`${e.exchangeNumber} · ${e.itemDescription} · ${exchangeLabel(e.exchangeType)} · ${grams(e.netWeight ?? e.grossWeight)}`}
                trailing={e.purpose === 'REPAIR' ? <StatusPill tone="warning">{t('Dukaan me')}</StatusPill> : <StatusPill tone="success">{t('De diya')}</StatusPill>}
                onPress={e.purpose === 'REPAIR' && canDo ? () => setOldDeliver(e) : undefined} />
            );
          }
          const r = item;
          const nx = NEXT[r.status];
          return (
            <SwipeRow end={isOpen(r) && canDo ? [
              { icon: Receipt, label: t('Wapas dein'), tone: 'success' as const, onPress: () => setAct({ r, kind: 'deliver' }) },
              ...(nx ? [{ icon: ArrowRight, label: t(REPAIR_STATUS[nx].label), tone: 'brand' as const, onPress: () => step.mutate({ r, status: nx }) }] : []),
            ] : []}>
              <ListRow icon={Wrench} iconTone={isLate(r) ? 'danger' : REPAIR_STATUS[r.status].tone} title={r.customerName ?? '—'}
                subtitle={[r.repairNumber, r.itemDescription, r.karat ? `${r.karat}K` : '', r.weightGrams ? grams(r.weightGrams) : '', `${t('Wapas')} ${day(r.promisedDate)}`].filter(Boolean).join(' · ')}
                trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Amount value={r.charge} weight="bold" />
                  <StatusPill tone={REPAIR_STATUS[r.status].tone}>{t(REPAIR_STATUS[r.status].label)}</StatusPill>
                  {isOpen(r) && r.due > 0 && <Text size="2xs" tone="warning">{t('Baqi {{due}}', { due: formatMoney(r.due) })}</Text>}
                </View>}
                onPress={() => setAct({ r, kind: 'menu' })} />
            </SwipeRow>
          );
        }}
        empty={<EmptyState icon={Wrench} title={old ? t('Koi purana record nahi') : query ? t('Is search me kuch nahi') : tab === 'late' ? t('Koi repair late nahi') : t('Koi repair nahi')}
          message={t('Customer ka zewar, wazan, karat, wapas dene ka din aur charges likhein. Advance khate me jata hai aur bill par kat jata hai.')} />}
        fab={canDo ? { icon: Plus, label: t('Repair lein'), onPress: () => setForm('new') } : undefined}
      />

      <RepairFormSheet open={!!form} repair={form === 'new' ? null : form} onClose={() => setForm(null)} />
      <AdvanceSheet r={act?.kind === 'pay' ? act.r : null} onClose={() => setAct(null)} />
      <PaySheet open={act?.kind === 'deliver'} title={t('Zewar wapas')} name={act?.r.customerName ?? ''} due={act?.r.due ?? 0} cta={act && act.r.charge > 0 ? t('Wapas dein aur bill banayein') : t('Wapas dein')}
        onClose={() => setAct(null)} onConfirm={(p) => deliver(act!.r, p)} />
      <PaySheet open={!!oldDeliver} title={t('Zewar wapas')} name={oldDeliver?.customerName ?? ''} due={oldDeliver?.netValue ?? 0} cta={t('Wapas dein aur bill banayein')} onClose={() => setOldDeliver(null)}
        onConfirm={async (p) => { await exchangesApi.deliverRepair(oldDeliver!.id, { charge: oldDeliver!.netValue, paidAmount: p.paidAmount, paymentMethod: p.paymentMethod }); toast.success(t('Zewar wapas — bill ban gaya')); refresh(); }} />
      <ReasonSheet open={act?.kind === 'cancel'} title={t('Repair cancel karein')} label={t('Wajah')} placeholder={t('Jaise: customer ne kaam nahi karwaya')} cta={t('Repair cancel karein')} loading={step.isPending}
        onClose={() => setAct(null)} onConfirm={(reason) => step.mutate({ r: act!.r, status: 'CANCELLED', reason })} />

      <Sheet open={!!menu} onClose={() => setAct(null)} title={menu?.customerName ?? ''} description={menu ? `${menu.repairNumber} · ${t(REPAIR_STATUS[menu.status].label)}` : undefined}>
        {menu && (
          <View>
            {isOpen(menu) && canDo && <ListRow icon={Receipt} iconTone="success" title={t('Wapas dein')} subtitle={menu.charge > 0 ? t('Bill: {{due}}', { due: formatMoney(menu.due) }) : undefined} chevron onPress={() => go('deliver')} />}
            {isOpen(menu) && canDo && !!NEXT[menu.status] && <ListRow icon={ArrowRight} title={t(REPAIR_STATUS[NEXT[menu.status]!].label)} onPress={() => step.mutate({ r: menu, status: NEXT[menu.status]! })} />}
            {isOpen(menu) && canDo && (menu.charge === 0 || menu.due > 0) && <ListRow icon={Wallet} iconTone="info" title={t('Advance')} chevron onPress={() => go('pay')} />}
            {isOpen(menu) && canDo && <ListRow icon={Pencil} title={t('Badlein')} onPress={() => { setAct(null); setTimeout(() => setForm(menu), 350); }} />}
            <ListRow icon={Printer} title={t('Parchi')} onPress={() => slip(menu, false, false)} />
            <ListRow icon={Share2} title={t('Parchi share karein')} onPress={() => slip(menu, false, true)} />
            {!!menu.karigarName && <ListRow icon={Printer} title={t('Karigar parchi')} onPress={() => slip(menu, true, false)} />}
            {isOpen(menu) && canDo && <ListRow icon={XCircle} destructive title={t('Cancel')} onPress={() => go('cancel')} />}
          </View>
        )}
      </Sheet>
    </>
  );
}
