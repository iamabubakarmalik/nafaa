/**
 * Raw metal (kachcha sona / chandi) by karat (web MetalStockPage): what is in
 * the safe and its value at today's buying rate, and every movement. Purchases,
 * opening stock and corrections are added here; the rest comes from old gold,
 * karigar and bill screens. Needs the server; the last loaded data shows offline.
 */

import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Coins, Hammer, Layers, ListChecks, Plus, Repeat, Scale } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { COMMON_PURITIES, metalOf, r2, r3, rateFor, type Purity } from '@nafaa/core/industries/jewelry';
import { apiErrorMessage } from '@/core/api/errors';
import { t, msg } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Button, Card, ChipGroup, EmptyState, FormSection, Input, ListRow, ListTemplate, Segmented, Sheet, StatTile, Text, TextArea, toast, useDebouncedValue, useTheme } from '@/design';
import { OfflineNote, useDeskOnline } from '@/industries/_shared/deskKit';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { NumberInput } from '@/modules/inventory/components/fields';
import { metalStockApi, type MetalStockEntry } from '../api';
import { ENTRY_LABEL, KEYS, day, dayTime, entryLabel, grams, purityLabel, refreshJewelry, tola, useMetalRates } from '../meta';
import { PurityPicker } from '../components/ui';

type Tab = 'entries' | 'balance';

const MANUAL = [
  { value: 'PURCHASE', label: msg('Khareed'), hint: msg('Supplier / sarafa se aaya') },
  { value: 'OPENING', label: msg('Shuru ka stock'), hint: msg('Pehli dafa ginti') },
  { value: 'ADJUSTMENT', label: msg('Kami'), hint: msg('Tol me kam, galai ka loss') },
  { value: 'SALE', label: msg('Becha'), hint: msg('Kachcha sona bech diya') },
];

export function MetalStockScreen() {
  const th = useTheme();
  const can = usePermission();
  const { cost } = useCostMask();
  const { rates } = useMetalRates();
  const canAdd = can(P.STOCK_ADJUSTMENTS_MANAGE);
  const [tab, setTab] = useState<Tab>('entries');
  const [purity, setPurity] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 250);
  const [adding, setAdding] = useState(false);

  const q = { purity: purity || undefined, metalType: purity ? metalOf(purity) : undefined, entryType: type || undefined, search: query || undefined };
  const list = useInfiniteQuery({
    queryKey: [KEYS.metal, 'page', q], queryFn: ({ pageParam }) => metalStockApi.page({ ...q, page: pageParam, limit: 30 }), initialPageParam: 1,
    getNextPageParam: (l) => (l.page < l.pages ? l.page + 1 : undefined), placeholderData: (p) => p, enabled: tab === 'entries',
  });
  const balQ = useQuery({ queryKey: [KEYS.metal, 'balance'], queryFn: metalStockApi.balance });
  const balances = (balQ.data ?? []).map((b) => {
    const rate = rateFor(rates, b.metalType, b.purity);
    return { ...b, value: rate ? r2(b.balanceGrams * (rate.buyRate || rate.ratePerGram)) : null };
  });
  const goldGrams = r3(balances.filter((b) => b.metalType === 'GOLD').reduce((s, b) => s + b.balanceGrams, 0));
  const silverGrams = r3(balances.filter((b) => b.metalType === 'SILVER').reduce((s, b) => s + b.balanceGrams, 0));
  const totalValue = r2(balances.reduce((s, b) => s + (b.value ?? 0), 0));
  const rows = list.data?.pages.flatMap((p) => p.items) ?? [];
  const filtered = !!purity || !!type || !!query;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <View style={{ flexDirection: 'row', gap: th.space(2) }}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Coins} tone="warning" label={t('Sona')} loading={balQ.isLoading} value={grams(goldGrams)} hint={tola(goldGrams)} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Coins} tone="neutral" label={t('Chandi')} loading={balQ.isLoading} value={grams(silverGrams)} hint={tola(silverGrams)} />
      </View>
      <StatTile icon={Scale} label={t('Aaj ki qeemat')} hint={t('Khareed rate par')} loading={balQ.isLoading} value={cost(totalValue)} />
      <Segmented value={tab} onChange={setTab} options={[{ value: 'entries', label: t('Entries'), icon: ListChecks }, { value: 'balance', label: t('Baqi'), icon: Layers }]} />
      {tab === 'entries' && (
        <>
          <ChipGroup value={purity} onChange={setPurity} style={{ marginHorizontal: -th.space(4) }}
            options={[{ value: '', label: t('Sab karat') }, ...COMMON_PURITIES.map((p) => ({ value: p as string, label: purityLabel(p) }))]} />
          <ChipGroup value={type} onChange={setType} style={{ marginHorizontal: -th.space(4) }}
            options={[{ value: '', label: t('Sab entries') }, ...Object.keys(ENTRY_LABEL).map((k) => ({ value: k, label: entryLabel(k).label }))]} />
          <CachedNote query={list} />
        </>
      )}
      <OfflineNote feature="jewelryDesk" />
    </View>
  );

  const entryRow = (e: MetalStockEntry) => {
    const m = entryLabel(e.entryType);
    const icon = e.entryType === 'EXCHANGE_IN' ? Repeat : e.karigarId ? Hammer : m.in ? ArrowDownLeft : ArrowUpRight;
    return (
      <ListRow icon={icon} iconTone={m.in ? 'success' : 'danger'} title={`${m.label} · ${purityLabel(e.purity)}`}
        subtitle={[dayTime(e.entryDate), e.source, e.reference].filter(Boolean).join(' · ')}
        trailing={<View style={{ alignItems: 'flex-end' }}><Text weight="bold" tone={m.in ? 'success' : 'danger'} ltr>{m.in ? '+' : '−'}{r3(e.grams)} g</Text><Text size="2xs" tone="muted" ltr>{t('Baqi')} {r3(e.balanceGrams)}</Text></View>} />
    );
  };

  return (
    <>
      <ListTemplate<MetalStockEntry | (typeof balances)[number]>
        title={t('Metal stock')}
        search={tab === 'entries' ? { value: search, onChange: setSearch, placeholder: t('Kis se, reference, entry #…') } : undefined}
        summary={header}
        data={tab === 'entries' ? rows : balances}
        loading={tab === 'entries' ? list.isLoading : balQ.isLoading}
        error={tab === 'entries' ? (!list.data ? list.error : undefined) : balQ.error}
        onRetry={() => { void list.refetch(); void balQ.refetch(); }}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={() => { void list.refetch(); void balQ.refetch(); }}
        onEndReached={() => { if (tab === 'entries' && list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        keyExtractor={(x) => ('id' in x ? x.id : `${x.metalType}_${x.purity}`)}
        renderItem={({ item }) => ('id' in item ? entryRow(item) : (
          <ListRow icon={Coins} iconTone={item.metalType === 'SILVER' ? 'neutral' : 'warning'} title={purityLabel(item.purity)} subtitle={`${tola(item.balanceGrams)} · ${day(item.lastEntryDate)}`}
            trailing={<View style={{ alignItems: 'flex-end' }}><Text weight="bold" tone={item.balanceGrams < 0 ? 'danger' : 'default'} ltr>{r3(item.balanceGrams)} g</Text>{item.value != null && <Text size="2xs" tone="muted">{cost(item.value)}</Text>}</View>}
            onPress={() => { setPurity(item.purity); setTab('entries'); }} />
        ))}
        empty={<EmptyState icon={Scale} title={tab === 'balance' ? t('Tijori me abhi kuch nahi') : filtered ? t('Is filter me koi entry nahi') : t('Abhi koi entry nahi')}
          message={t('Khareed, shuru ka stock, purana sona aur karigar ka lena dena yahan aata hai.')} />}
        fab={canAdd ? { icon: Plus, label: t('Entry'), onPress: () => setAdding(true) } : undefined}
      />
      <EntrySheet open={adding} onClose={() => setAdding(false)} />
    </>
  );
}

function EntrySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const { guard } = useDeskOnline('jewelryDesk');
  const [entryType, setEntryType] = useState('PURCHASE');
  const [purity, setPurity] = useState<Purity>('KARAT_24');
  const [g, setG] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [source, setSource] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const save = useMutation({
    mutationFn: () => metalStockApi.addEntry({
      entryType, metalType: metalOf(purity), purity, grams: g, ratePerGram: rate || undefined, source: source.trim() || undefined,
      reference: reference.trim() || undefined, notes: notes.trim() || undefined,
    }),
    onSuccess: () => { toast.success(t('Entry save ho gayi')); refreshJewelry([KEYS.metal, 'metal-stock-balance']); setG(null); setRate(null); setNotes(''); setSource(''); setReference(''); onClose(); },
    onError: (e) => setError(apiErrorMessage(e, t('Entry save nahi hui'))),
  });
  const submit = () => {
    if (!(g && g > 0)) return setError(t('Grams likhein'));
    if (entryType === 'ADJUSTMENT' && !notes.trim()) return setError(t('Kami ki wajah likhein'));
    setError('');
    guard(() => save.mutate());
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Metal ki entry')} description={t('Khareed, shuru ka stock ya kami')} footer={<Button fullWidth size="lg" loading={save.isPending} onPress={submit}>{t('Save karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <FormSection title={t('Entry')}>
          {MANUAL.map((m) => <ListRow key={m.value} dense title={t(m.label)} subtitle={t(m.hint)} selected={entryType === m.value} onPress={() => setEntryType(m.value)} />)}
        </FormSection>
        <PurityPicker label={t('Karat')} value={purity} onChange={setPurity} />
        <NumberInput label={t('Grams')} value={g} onChangeValue={setG} hint={g && g > 0 ? tola(g) : t('Kaante ka wazan')} />
        <NumberInput label={t('Rate fi gram')} value={rate} onChangeValue={setRate} prefix="Rs" hint={t('Khareed ka rate (ikhtiyari)')} />
        <Input label={entryType === 'PURCHASE' ? t('Kis se liya') : t('Kis se / kahan')} value={source} onChangeText={setSource} maxLength={80} />
        <Input label={t('Reference')} value={reference} onChangeText={setReference} placeholder={t('Bill / parchi number')} maxLength={60} />
        <TextArea label={entryType === 'ADJUSTMENT' ? t('Wajah') : t('Note')} value={notes} onChangeText={setNotes} maxLength={300} />
        {!!g && !!rate && <Text size="sm" tone="secondary">{t('Kul qeemat:')} <Amount value={g * rate} weight="bold" /></Text>}
        {!!error && <Card tone="danger"><Text size="sm">{error}</Text></Card>}
      </View>
    </Sheet>
  );
}
