/**
 * Livestock (web LiveAnimalsPage): tagged animals bought at the mandi (bakra,
 * gaye, dumba), their health, feed cost and slaughter. Birds bought by weight go
 * straight to stock. "Mandi se aaya" makes the purchase (supplier, payment) and
 * the animals in one go.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Heart, HeartPulse, Plus, Scale, ShieldCheck, Trash2, Truck, Wheat } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { feedCost, mandiTotal } from '@nafaa/core/industries/meat';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, ChipGroup, DatePicker, DetailRow, EmptyState, HBarList, IconButton, Input, ListRow, ListTemplate, MoneyInput, Row, Segmented, Select, Sheet, Switch, Text, TextArea, confirm, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { SupplierPicker } from '@/modules/purchasing/components/SupplierPicker';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, dateToKey, errorText, keyToDate, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { RowCard, StatRow } from '../../_shared/farm/ui';
import { liveAnimalsApi, type LiveAnimal } from '../api';
import { ANIMALS, MEAT_KEYS, PAY_METHODS, animalOf, animalText, kg, opt, refreshMeat } from '../meta';

export function MeatLivestockScreen() {
  const th = useTheme();
  const can = usePermission();
  const canBuy = can(P.PURCHASES_CREATE);
  const { guard } = useDeskOnline('meatDesk');
  const { cost } = useCostMask();
  const [view, setView] = useState<'animals' | 'analytics'>('animals');
  const [show, setShow] = useState<'alive' | 'slaughtered' | 'all'>('alive');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [mandi, setMandi] = useState(false);
  const [open, setOpen] = useState<LiveAnimal | null>(null);
  const listQ = useQuery({ queryKey: [MEAT_KEYS.animals, show, type], queryFn: () => liveAnimalsApi.list({ ...(type ? { animalType: type } : {}), ...(show !== 'all' ? { isSlaughtered: String(show === 'slaughtered') } : {}) }) });
  const sumQ = useQuery({ queryKey: [MEAT_KEYS.animals, 'summary'], queryFn: () => liveAnimalsApi.summary() });
  const s = sumQ.data;
  const term = search.trim().toLowerCase();
  const rows = (listQ.data ?? []).filter((a) => !term || [a.tagNumber, a.breed, a.vendorName, a.sourceName].join(' ').toLowerCase().includes(term));
  const sick = (listQ.data ?? []).filter((a) => !a.isSlaughtered && !a.isHealthy).length;
  const totalKg = (s?.byType ?? []).reduce((x, b) => x + Number(b._sum.weightKg ?? 0), 0);
  const totalCost = Number(s?.totalCost._sum.purchasePrice ?? 0) + Number(s?.totalCost._sum.totalFeedCost ?? 0);
  const live = open ? (listQ.data ?? []).find((a) => a.id === open.id) ?? open : null;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <StatRow tiles={[
        { icon: Heart, tone: 'danger', label: t('Baara me'), loading: sumQ.isLoading, value: String(s?.aliveCount ?? 0), hint: kg(totalKg), onPress: () => setShow('alive') },
        { icon: Scale, tone: 'info', label: t('Cost + chara'), loading: sumQ.isLoading, value: cost(totalCost) },
      ]} />
      <StatRow tiles={[
        { icon: Wheat, tone: 'warning', label: t('Chara'), loading: sumQ.isLoading, value: cost(s?.totalCost._sum.totalFeedCost ?? 0) },
        { icon: HeartPulse, tone: sick ? 'danger' : 'neutral', label: t('Bimar'), loading: listQ.isLoading, value: String(sick) },
      ]} />
      <Segmented value={view} onChange={setView} options={[{ value: 'animals', label: t('Tag wale janwar') }, { value: 'analytics', label: t('Analytics') }]} />
      {view === 'animals' && (
        <>
          <ChipGroup value={show} onChange={(v) => setShow(v as typeof show)} style={{ marginHorizontal: -th.space(4) }} options={[{ value: 'alive', label: t('Baara me') }, { value: 'slaughtered', label: t('Zibah ho gaye') }, { value: 'all', label: t('Sab') }]} />
          <ChipGroup value={type} onChange={setType} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Sab janwar') }, ...ANIMALS.map((a) => ({ value: a.value, label: `${a.emoji} ${t(a.label)}` }))]} />
        </>
      )}
      <Row gap={2}>
        <Button style={{ flex: 1 }} variant="secondary" icon={ShieldCheck} onPress={() => router.push('/meat/slaughter' as never)}>{t('Zibah')}</Button>
        <Button style={{ flex: 1 }} variant="secondary" icon={Truck} onPress={() => router.push('/purchases' as never)}>{t('Purchases')}</Button>
      </Row>
      <OfflineNote feature="meatDesk" />
      {view === 'analytics' && (
        <Card title={t('Baara me janwar — type ke hisaab se')}>
          {(s?.byType ?? []).length === 0 ? <Text size="sm" tone="muted">{t('Baara khali hai')}</Text> : <HBarList colorful rows={(s?.byType ?? []).map((b) => ({ key: b.animalType, label: animalText(b.animalType), value: b._count._all, display: <Text size="xs" tone="muted">{`${b._count._all} · ${kg(b._sum.weightKg)}`}</Text> }))} />}
          <Text size="xs" tone="muted">{t('Murgi jaise wazan se aaye maal ka hisaab "Aaj ka rate → Din ka hisaab" me hai (zinda maal ka stock).')}</Text>
        </Card>
      )}
    </View>
  );

  return (
    <>
      <ListTemplate<LiveAnimal>
        title={t('Livestock')}
        grouped={false}
        search={view === 'animals' ? { value: search, onChange: setSearch, placeholder: t('Tag, nasal, supplier, purchase #…') } : undefined}
        summary={header}
        data={view === 'animals' ? rows : []}
        loading={listQ.isLoading}
        error={listQ.data ? null : listQ.error}
        onRetry={() => void listQ.refetch()}
        refreshing={listQ.isRefetching}
        onRefresh={() => { void listQ.refetch(); void sumQ.refetch(); }}
        keyExtractor={(a) => a.id}
        renderItem={({ item: a }) => (
          <RowCard dim={a.isSlaughtered}>
            <ListRow leading={<Text style={{ fontSize: 28 }}>{animalOf(a.animalType).emoji}</Text>}
              title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{a.tagNumber}</Text>{a.isSlaughtered ? <Badge tone="accent">{t('Zibah {{slaughteredAt}}', { slaughteredAt: formatDate(a.slaughteredAt ?? '') })}</Badge> : a.isHealthy ? <Badge tone="success">{t('Theek')}</Badge> : <Badge tone="danger">{t('Bimar')}</Badge>}</Row>}
              subtitle={<View style={{ gap: 2 }}><Text size="xs" tone="muted" numberOfLines={1}>{[animalText(a.animalType), a.breed].filter(Boolean).join(' · ')}</Text><Text size="xs" tone="secondary" numberOfLines={1}>{[kg(a.weightKg), a.vendorName ?? t('Supplier nahi'), formatDate(a.purchaseDate)].join(' · ')}</Text></View>}
              trailing={<View style={{ alignItems: 'flex-end' }}><Text size="sm" weight="semibold" ltr>{cost(a.purchasePrice)}</Text>{a.totalFeedCost > 0 && <Text size="2xs" tone="muted">{t('Chara')} {cost(a.totalFeedCost)}</Text>}</View>}
              chevron onPress={() => setOpen(a)} />
          </RowCard>
        )}
        empty={view === 'animals' ? <EmptyState icon={Heart} title={term || type ? t('Is filter me koi janwar nahi') : t('Koi tag wala janwar nahi')} message={t('Bakra, gaye ya dumba tag ke saath "Mandi se aaya" me likhein. Murgi wazan se aati hai — wo yahan list nahi hoti, stock me jaati hai.')} /> : undefined}
        fab={canBuy ? { icon: Plus, label: t('Mandi se aaya'), onPress: () => guard(() => setMandi(true)) } : undefined}
      />
      <MandiSheet open={mandi} onClose={() => setMandi(false)} />
      <AnimalSheet a={live} canEdit={can(P.PRODUCTS_EDIT)} onClose={() => setOpen(null)} />
    </>
  );
}

interface AnimalRow { tagNumber: string; animalType: string; breed: string; weightKg: number | null; price: number | null }
const blankAnimal = (): AnimalRow => ({ tagNumber: '', animalType: 'MUTTON', breed: '', weightKg: null, price: null });

function MandiSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const [mode, setMode] = useState<'animals' | 'kg'>('animals');
  const [supplierId, setSupplierId] = useState('');
  const [item, setItem] = useState<{ id: string; name: string } | null>(null);
  const [picking, setPicking] = useState(false);
  const [animals, setAnimals] = useState<AnimalRow[]>([blankAnimal()]);
  const [kgs, setKgs] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [birds, setBirds] = useState<number | null>(null);
  const [other, setOther] = useState<number | null>(null);
  const [paid, setPaid] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [date, setDate] = useState(todayKey());
  const [busy, setBusy] = useState(false);
  const total = mode === 'kg' ? mandiTotal(kgs ?? 0, rate ?? 0, other ?? 0) : mandiTotal(0, 0, other ?? 0) + animals.reduce((a, x) => a + (x.price ?? 0), 0);
  const error = !supplierId ? t('Supplier chunein') : !item ? t('Zinda maal ka item chunein') : mode === 'kg' ? (!((kgs ?? 0) > 0) ? t('Wazan likhein') : !((rate ?? 0) > 0) ? t('Rate likhein') : '') : animals.some((x) => !((x.weightKg ?? 0) > 0) || !((x.price ?? 0) > 0)) ? t('Har janwar ka wazan aur qeemat likhein') : '';
  const save = async () => {
    if (error) { toast.error(error); return; }
    setBusy(true);
    try {
      const r = await liveAnimalsApi.mandi({
        supplierId, productId: item!.id, paymentMethod: method, paidAmount: paid ?? 0, otherCharges: other ?? undefined, purchasedAt: date,
        ...(mode === 'kg' ? { kg: kgs ?? 0, ratePerKg: rate ?? 0, birds: birds ?? undefined } : { animals: animals.map((a) => ({ tagNumber: opt(a.tagNumber), animalType: a.animalType, breed: opt(a.breed), weightKg: a.weightKg ?? 0, price: a.price ?? 0 })) }),
      });
      refreshMeat([MEAT_KEYS.animals, MEAT_KEYS.daySheet, 'inv', 'purchases'], true);
      toast.success(t('Purchase {{purchaseNumber}} ban gayi — {{total}}', { purchaseNumber: r.purchaseNumber, total: formatMoney(r.total) }));
      setAnimals([blankAnimal()]); setKgs(null); setRate(null); setBirds(null); setOther(null); setPaid(null);
      onClose();
    } catch (e) { toast.error(errorText(e, t('Purchase save nahi hui'))); } finally { setBusy(false); }
  };
  const setA = (i: number, patch: Partial<AnimalRow>) => setAnimals((as) => as.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  return (
    <>
      <Sheet open={open && !picking} onClose={onClose} height={0.95} title={t('Mandi se aaya')} description={t('Total {{total}}', { total: formatMoney(total) })}
        footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Save')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <Segmented value={mode} onChange={setMode} options={[{ value: 'animals', label: t('Tag wale janwar') }, { value: 'kg', label: t('Wazan se (murgi)') }]} />
          <SupplierPicker value={supplierId} onChange={(sp) => setSupplierId(sp.id)} onNew={() => router.push('/suppliers/new' as never)} />
          <ListRow icon={Heart} title={item ? item.name : t('Zinda maal ka item')} subtitle={t('Stock isi item me jayega')} chevron onPress={() => setPicking(true)} />
          {mode === 'kg' ? (
            <>
              <NumberInput label={t('Kul zinda wazan (kg)')} value={kgs} onChangeValue={setKgs} />
              <MoneyInput label={t('Zinda rate / kg')} value={rate} onChangeValue={setRate} />
              <NumberInput label={t('Kitne parinde (marzi)')} integer value={birds} onChangeValue={setBirds} />
            </>
          ) : (
            <>
              {animals.map((a, i) => (
                <Card key={i}>
                  <Row justify="between"><Text weight="semibold">{`#${i + 1}`}</Text>{animals.length > 1 && <IconButton icon={Trash2} label={t('Hatayein')} size="sm" variant="ghost" onPress={() => setAnimals((as) => as.filter((_, j) => j !== i))} />}</Row>
                  <Select label={t('Janwar')} value={a.animalType} onChange={(v) => setA(i, { animalType: v })} options={ANIMALS.filter((x) => !['CHICKEN', 'DUCK', 'TURKEY', 'QUAIL', 'FISH', 'PRAWN'].includes(x.value)).map((x) => ({ value: x.value, label: `${x.emoji} ${t(x.label)}` }))} />
                  <Input label={t('Tag')} value={a.tagNumber} onChangeText={(v) => setA(i, { tagNumber: v })} hint={t('Khali = khud ban jayega')} ltr />
                  <Input label={t('Nasal')} value={a.breed} onChangeText={(v) => setA(i, { breed: v })} />
                  <Row gap={2}>
                    <View style={{ flex: 1 }}><NumberInput label={t('Wazan (kg)')} value={a.weightKg} onChangeValue={(v) => setA(i, { weightKg: v })} /></View>
                    <View style={{ flex: 1 }}><MoneyInput label={t('Qeemat')} value={a.price} onChangeValue={(v) => setA(i, { price: v })} /></View>
                  </Row>
                </Card>
              ))}
              <Button variant="secondary" icon={Plus} onPress={() => setAnimals((as) => [...as, blankAnimal()])}>{t('Aur janwar')}</Button>
            </>
          )}
          <MoneyInput label={t('Kiraya / mazdoori')} value={other} onChangeValue={setOther} />
          <DatePicker label={t('Tareekh')} value={keyToDate(date)} onChange={(d) => setDate(dateToKey(d))} maximumDate={keyToDate(todayKey()) ?? undefined} />
          <MoneyInput label={t('Abhi diya')} value={paid} onChangeValue={setPaid} hint={t('Baqi supplier ke khate me')} />
          <ChipGroup wrap value={method} onChange={setMethod} options={PAY_METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} />
        </View>
      </Sheet>
      <ProductPicker open={open && picking} onClose={() => setPicking(false)} title={t('Zinda maal ka item')} variants={false} includeRaw onPick={({ product }) => { setItem({ id: product.id, name: product.name }); setPicking(false); }} />
    </>
  );
}

function AnimalSheet({ a, canEdit, onClose }: { a: LiveAnimal | null; canEdit: boolean; onClose: () => void }) {
  const th = useTheme();
  const { guard } = useDeskOnline('meatDesk');
  const [mode, setMode] = useState<'view' | 'feed' | 'health'>('view');
  const [days, setDays] = useState<number | null>(null);
  const [perDay, setPerDay] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [healthy, setHealthy] = useState(true);
  const [vacc, setVacc] = useState('');
  const [notes, setNotes] = useState('');
  const [weight, setWeight] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);
  if (a && seen !== a.id) { setSeen(a.id); setMode('view'); setDays(null); setPerDay(a.dailyFeedCost || null); setHealthy(a.isHealthy); setVacc(a.vaccinationStatus ?? ''); setNotes(a.healthNotes ?? ''); setWeight(a.weightKg); }
  if (!a && seen) setSeen(null);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); refreshMeat([MEAT_KEYS.animals], true); toast.success(ok); setMode('view'); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!a) return;
    if (!(await confirm({ title: t('{{fullName}} ko list se hatayein?', { fullName: a.tagNumber }), tone: 'danger', confirmLabel: t('Hatayein') }))) return;
    await run(() => liveAnimalsApi.remove(a.id).then(() => onClose()), t('Hat gaya'));
  };
  return (
    <Sheet open={!!a} onClose={onClose} height={0.85} title={a ? `${animalOf(a.animalType).emoji} ${a.tagNumber}` : ''} description={a ? [animalText(a.animalType), a.breed, kg(a.weightKg)].filter(Boolean).join(' · ') : undefined}
      footer={a && mode !== 'view' ? <Button fullWidth size="lg" loading={busy} onPress={() => guard(() => void (mode === 'feed'
        ? run(() => liveAnimalsApi.addFeedCost(a.id, days ?? 0, perDay ?? 0, method), t('Chara likh diya'))
        : run(() => liveAnimalsApi.update(a.id, { isHealthy: healthy, vaccinationStatus: vacc, healthNotes: notes, ...((weight ?? a.weightKg) !== a.weightKg ? { weightKg: weight ?? a.weightKg } : {}) }), t('Save ho gaya'))))}>{mode === 'feed' ? t('Chara likhein · {{value}}', { value: formatMoney(feedCost(days ?? 0, perDay ?? 0)) }) : t('Save')}</Button> : undefined}>
      {a && (
        <View style={{ gap: th.space(3) }}>
          {mode === 'view' && (
            <>
              <Card flush>
                <DetailRow label={t('Wazan')} value={kg(a.weightKg)} />
                <DetailRow label={t('Purchase cost')} value={formatMoney(a.purchasePrice)} />
                <DetailRow label={t('Chara')} value={`${formatMoney(a.totalFeedCost)} · ${t('{{count}} din', { count: a.daysHeld })}`} />
                <DetailRow label={t('Supplier')} value={a.vendorName ?? '—'} />
                <DetailRow label={t('Tareekh')} value={formatDate(a.purchaseDate, { year: true })} />
                <DetailRow label={t('Sehat')} value={a.isHealthy ? t('Theek') : t('Bimar')} />
                {!!a.vaccinationStatus && <DetailRow label={t('Teeke')} value={a.vaccinationStatus} />}
                {a.isSlaughtered && <DetailRow label={t('Zibah ho gaye')} value={`${formatDate(a.slaughteredAt ?? '', { year: true })}${a.yieldPct ? ` · ${t('Yield')} ${a.yieldPct}%` : ''}`} />}
                <DetailRow label={t('Note')} value={a.healthNotes || a.notes || '—'} last />
              </Card>
              {canEdit && !a.isSlaughtered && (
                <Row gap={2} wrap>
                  <Button variant="secondary" icon={Wheat} style={{ flex: 1 }} onPress={() => setMode('feed')}>{t('Chara')}</Button>
                  <Button variant="secondary" icon={HeartPulse} style={{ flex: 1 }} onPress={() => setMode('health')}>{t('Sehat')}</Button>
                  <Button variant="secondary" icon={ShieldCheck} style={{ flex: 1 }} onPress={() => { onClose(); router.push('/meat/slaughter' as never); }}>{t('Zibah')}</Button>
                  <Button variant="ghost" icon={Trash2} style={{ flex: 1 }} onPress={() => guard(() => void remove())}>{t('Hatayein')}</Button>
                </Row>
              )}
            </>
          )}
          {mode === 'feed' && (
            <>
              <NumberInput label={t('Kitne din')} integer value={days} onChangeValue={setDays} />
              <MoneyInput label={t('Rozana kharcha')} value={perDay} onChangeValue={setPerDay} />
              <ChipGroup wrap value={method} onChange={setMethod} options={PAY_METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} />
              <Text size="xs" tone="muted">{t('Chara expense me likha jata hai')}</Text>
            </>
          )}
          {mode === 'health' && (
            <>
              <Switch value={healthy} onChange={setHealthy} label={t('Theek')} />
              <Input label={t('Teeke')} value={vacc} onChangeText={setVacc} />
              <NumberInput label={t('Wazan (kg)')} value={weight} onChangeValue={setWeight} />
              <TextArea label={t('Note')} value={notes} onChangeText={setNotes} />
            </>
          )}
        </View>
      )}
    </Sheet>
  );
}
