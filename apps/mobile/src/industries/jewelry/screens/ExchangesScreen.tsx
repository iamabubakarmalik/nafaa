/**
 * Old gold bought across the counter (web ExchangesPage). Weigh, test the
 * karat, take the stones off, value at today's buying rate less kaat; the
 * metal goes into metal stock and cash paid leaves the drawer. Gold weighed
 * in for a bill that no bill used can be handed back. A slip with CNIC
 * shares from the row. Needs the server.
 */

import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { Plus, Repeat, Scale, ShieldCheck, Undo2, Wallet } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { exchangeBuy, metalOf, rateFor, type Purity } from '@nafaa/core/industries/jewelry';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Button, Card, ChipGroup, EmptyState, Input, ListRow, ListTemplate, MoneyInput, Select, Sheet, StatTile, Switch, Text, TextArea, confirm, toast, useDebouncedValue, useTheme } from '@/design';
import { OfflineNote, errorText, useDeskOnline } from '@/industries/_shared/deskKit';
import { NumberInput } from '@/modules/inventory/components/fields';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { PERIOD_PRESETS, usePeriod } from '@/modules/sales/lib/period';
import { exchangesApi, type Exchange } from '../api';
import { PurityPicker } from '../components/ui';
import { EXCHANGE_TYPES, KEYS, dayTime, exchangeLabel, grams, purityLabel, refreshJewelry, tola, useMetalRates } from '../meta';

const isOpenBillGold = (e: Exchange) => e.purpose === 'SALE' && !e.saleId;
const PURPOSE_NOTE: Record<string, string> = { SALE: msg('bill par'), ORDER: msg('order advance'), RETURNED: msg('customer ko wapas') };

export function ExchangesScreen() {
  const th = useTheme();
  const canBuy = usePermission()(P.PURCHASES_CREATE);
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 250);
  const period = usePeriod('month');
  const [form, setForm] = useState(false);
  const q = { kind: 'buy' as const, search: query || undefined, ...(period.period.from !== 'all' ? { from: period.period.from, to: period.period.to } : {}) };
  const list = useInfiniteQuery({
    queryKey: [KEYS.exchanges, 'page', q], queryFn: ({ pageParam }) => exchangesApi.page({ ...q, page: pageParam, limit: 30 }), initialPageParam: 1,
    getNextPageParam: (l) => (l.page < l.pages ? l.page + 1 : undefined), placeholderData: (p) => p,
  });
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const tot = list.data?.pages[0]?.totals;
  const giveBack = useMutation({
    mutationFn: (e: Exchange) => exchangesApi.giveBack(e.id),
    onSuccess: () => { toast.success(t('Purana sona customer ko wapas — metal stock se nikal gaya')); refreshJewelry([KEYS.exchanges, KEYS.metal, 'metal-stock-balance']); },
    onError: (e) => toast.error(errorText(e, t('Wapas nahi hua'))),
  });

  const header = (
    <View style={{ gap: th.space(3) }}>
      <View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <StatTile style={{ flex: 1 }} icon={Scale} tone="warning" label={t('Wazan aaya')} loading={!tot} value={grams(tot?.grams ?? 0)} hint={t('Is period me')} />
        <StatTile style={{ flex: 1 }} icon={Wallet} tone="info" label={t('Customer ko diya')} loading={!tot} value={<Amount value={tot?.value ?? 0} size="lg" weight="bold" compact />} />
      </View>
      <StatTile icon={ShieldCheck} tone="success" label={t('Kaat (dukaan ko)')} loading={!tot} value={<Amount value={tot?.deductions ?? 0} size="lg" weight="bold" />} hint={t('Testing / galai ka farq')} />
      <ChipGroup value={period.preset} onChange={(v) => period.setPreset(v as typeof period.preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.map((p) => ({ value: p.value, label: t(p.label) }))} />
      <CachedNote query={list} />
      <OfflineNote feature="jewelryDesk" />
    </View>
  );

  return (
    <>
      <ListTemplate<Exchange>
        title={t('Purana sona')}
        search={{ value: search, onChange: setSearch, placeholder: t('Customer, phone, CNIC, parchi #, zewar…') }}
        summary={header}
        data={rows}
        loading={list.isLoading}
        error={!list.data ? list.error : undefined}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => void list.refetch()}
        onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        keyExtractor={(e) => e.id}
        renderItem={({ item: e }) => (
          <ListRow icon={Repeat} iconTone="warning" title={e.customerName}
            subtitle={`${e.exchangeNumber} · ${purityLabel(e.testedPurity ?? e.claimedPurity)} · ${grams(e.netWeight ?? e.grossWeight)} · ${dayTime(e.exchangeDate)}${e.purpose && PURPOSE_NOTE[e.purpose] ? ` · ${t(PURPOSE_NOTE[e.purpose])}` : ''}`}
            trailing={<View style={{ alignItems: 'flex-end' }}>
              <Amount value={e.netValue} weight="bold" />
              {e.deductions > 0 && <Text size="2xs" tone="muted">{t('kaat {{value}}', { value: formatMoney(e.deductions) })}</Text>}
              {isOpenBillGold(e) && canBuy && (
                <Button variant="link" size="sm" icon={Undo2} onPress={async () => { if (await confirm({ title: t('Sona wapas karein?'), message: t('Yeh sona customer ko wapas jayega aur metal stock se nikal jayega.'), confirmLabel: t('Wapas dein') })) giveBack.mutate(e); }}>{t('Wapas dein')}</Button>
              )}
            </View>} />
        )}
        empty={<EmptyState icon={Repeat} title={query ? t('Is search me kuch nahi') : t('Abhi koi entry nahi')} message={t('Customer ka purana zewar tol kar, karat test kar ke khareedein — sona metal stock me chala jata hai.')} />}
        fab={canBuy ? { icon: Plus, label: t('Sona khareedein'), onPress: () => setForm(true) } : undefined}
      />
      <BuySheet open={form} onClose={() => setForm(false)} />
    </>
  );
}

function BuySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const { rates } = useMetalRates();
  const { guard } = useDeskOnline('jewelryDesk');
  const blank = {
    exchangeType: 'OLD_GOLD_EXCHANGE', customerName: '', customerPhone: '', customerCnic: '', itemDescription: '', claimedPurity: 'KARAT_22' as Purity, testedPurity: 'KARAT_22' as Purity,
    grossWeight: null as number | null, stoneWeight: null as number | null, rate: null as number | null, kaat: 0 as number | null, testing: null as number | null, testedBy: '', notes: '', paidInCash: true,
  };
  const [f, setF] = useState(blank);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setF(blank); setError(''); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const r = rateFor(rates, metalOf(f.testedPurity), f.testedPurity);
  const autoRate = r ? r.buyRate || r.ratePerGram : 0;
  const rate = f.rate ?? autoRate;
  const calc = exchangeBuy({ grossWeight: f.grossWeight ?? 0, stoneWeight: f.stoneWeight ?? 0, rate, kaatPct: f.kaat ?? 0, testing: f.testing ?? 0 });
  const save = useMutation({
    mutationFn: () => exchangesApi.create({
      exchangeType: f.exchangeType, customerName: f.customerName.trim(), customerPhone: f.customerPhone.trim(), customerCnic: f.customerCnic.trim() || undefined,
      itemDescription: f.itemDescription.trim(), metalType: metalOf(f.testedPurity), claimedPurity: f.claimedPurity, testedPurity: f.testedPurity,
      grossWeight: f.grossWeight, stoneWeight: f.stoneWeight ?? 0, ratePerGram: rate, deductionPct: f.kaat ?? 0, testingCharges: f.testing ?? 0, paidInCash: f.paidInCash,
      testedBy: f.testedBy.trim() || undefined, notes: f.notes.trim() || undefined,
    }),
    onSuccess: (e) => {
      toast.success(t('Sona khareeda gaya'));
      if (e.paidFromDrawer === false) toast.warning(t('Register band hai — drawer se nikla cash record nahi hua'));
      refreshJewelry([KEYS.exchanges, KEYS.metal, 'metal-stock-balance', 'cash-register']);
      onClose();
    },
    onError: (e) => setError(errorText(e, t('Save nahi hua'))),
  });
  const submit = () => {
    if (!f.customerName.trim()) return setError(t('Customer ka naam likhein'));
    if (!f.itemDescription.trim()) return setError(t('Zewar ki tafseel likhein'));
    if (!((f.grossWeight ?? 0) > 0)) return setError(t('Wazan likhein'));
    if ((f.stoneWeight ?? 0) >= (f.grossWeight ?? 0)) return setError(t('Nag ka wazan kul wazan se kam ho'));
    if (!(rate > 0)) return setError(t('Rate likhein — is karat ka aaj ka rate set nahi'));
    setError('');
    guard(() => save.mutate());
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Purana sona khareedein')} height={0.95}
      footer={<Button fullWidth size="lg" loading={save.isPending} onPress={submit}>{t('Khareedein — {{pay}}', { pay: formatMoney(calc.pay) })}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Customer')} value={f.customerName} onChangeText={(v) => set({ customerName: v })} maxLength={80} />
        <Input label={t('Phone')} value={f.customerPhone} onChangeText={(v) => set({ customerPhone: v })} keyboardType="phone-pad" ltr placeholder="03xx xxxxxxx" />
        <Input label={t('CNIC')} value={f.customerCnic} onChangeText={(v) => set({ customerCnic: v })} ltr placeholder="35202-xxxxxxx-x" hint={t('Khareed par zaroor likhein')} />
        <Input label={t('Zewar')} value={f.itemDescription} onChangeText={(v) => set({ itemDescription: v })} placeholder={t('Jaise: purani choori 2 adad')} maxLength={200} />
        <Select label={t('Kaam')} value={f.exchangeType} onChange={(v) => set({ exchangeType: v })} options={EXCHANGE_TYPES.map((x) => ({ value: x.value, label: t(x.label) }))} />
        <PurityPicker label={t('Customer ne bataya')} value={f.claimedPurity} onChange={(p) => set({ claimedPurity: p, testedPurity: p, rate: null })} />
        <PurityPicker label={t('Test me nikla')} value={f.testedPurity} onChange={(p) => set({ testedPurity: p, rate: null })} />
        <NumberInput label={t('Kul wazan (g)')} value={f.grossWeight} onChangeValue={(v) => set({ grossWeight: v })} />
        <NumberInput label={t('Nag ka wazan (g)')} value={f.stoneWeight} onChangeValue={(v) => set({ stoneWeight: v })} hint={t('Asal {{net}}', { net: grams(calc.net) })} />
        <MoneyInput label={t('Rate fi gram')} value={f.rate ?? (autoRate || null)} onChangeValue={(v) => set({ rate: v })} hint={autoRate ? t('Aaj ka khareed rate') : t('Is karat ka rate set nahi')} />
        <NumberInput label={t('Kaat %')} value={f.kaat} onChangeValue={(v) => set({ kaat: v })} hint={calc.kaat ? `− ${formatMoney(calc.kaat)}` : t('Galai / testing ka farq')} />
        <MoneyInput label={t('Testing charges (Rs)')} value={f.testing} onChangeValue={(v) => set({ testing: v })} />
        <Input label={t('Kis ne test kiya')} value={f.testedBy} onChangeText={(v) => set({ testedBy: v })} maxLength={60} />
        <TextArea label={t('Note')} value={f.notes} onChangeText={(v) => set({ notes: v })} maxLength={300} />
        <Card tone="info">
          <Text size="sm">{t('Khalis wazan {{net}} ({{tola}}) × {{rate}} = {{gross}}', { net: grams(calc.net), tola: tola(calc.net), rate: formatMoney(rate), gross: formatMoney(calc.gross) })}</Text>
          <Text weight="bold">{t('Customer ko dena: {{pay}}', { pay: formatMoney(calc.pay) })}</Text>
        </Card>
        <Switch label={t('Cash drawer se diya')} value={f.paidInCash} onChange={(v) => set({ paidInCash: v })} />
        {!!error && <Card tone="danger"><Text size="sm">{error}</Text></Card>}
      </View>
    </Sheet>
  );
}
