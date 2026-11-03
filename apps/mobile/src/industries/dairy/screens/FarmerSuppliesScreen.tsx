/**
 * Milk intake (web FarmerSuppliesPage): milk bought from gawale, morning and
 * evening. Each slip puts the litres into the milk stock at the price paid (fat
 * bonus included) and adds the amount to the gawala's account; a wrong slip is
 * cancelled, never deleted.
 */

import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Ban, Droplets, Milk, Plus, Sunrise, Sunset, Wallet } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { fatBonus, supplyTotal } from '@nafaa/core/industries/dairy';
import { isCancelledSupply } from '../api';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, ChipGroup, EmptyState, Input, ListRow, ListTemplate, MoneyInput, Row, Segmented, Sheet, SwipeRow, Text, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, errorText, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { DayBar } from '../../_shared/farm/DayBar';
import { PickerSheet } from '../../_shared/farm/PickerSheet';
import { ReasonSheet, RowCard, StatRow } from '../../_shared/farm/ui';
import { farmerSuppliesApi, farmersApi, type DairyFarmer, type FarmerSupply } from '../api';
import { DAIRY_KEYS, QUALITY, liters, opt, refreshDairy, slotLabel, slotNow } from '../meta';

export function FarmerSuppliesScreen() {
  const th = useTheme();
  const { farmer: farmerParam } = useLocalSearchParams<{ farmer?: string }>();
  const can = usePermission();
  const canBuy = can(P.PURCHASES_CREATE);
  const canPay = can(P.SUPPLIERS_EDIT);
  const { guard } = useDeskOnline('dairyDesk');
  const { cost } = useCostMask();
  const [date, setDate] = useState(todayKey());
  const [slot, setSlot] = useState<'MORNING' | 'EVENING'>(slotNow());
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [cancelling, setCancelling] = useState<FarmerSupply | null>(null);
  useEffect(() => { if (farmerParam && canBuy) setAdding(true); }, [farmerParam, canBuy]);
  const list = useQuery({ queryKey: [DAIRY_KEYS.supplies, date, slot, search.trim()], queryFn: () => farmerSuppliesApi.entries({ from: date, to: date, slot, search: search.trim() || undefined }) });
  const sum = useQuery({ queryKey: [DAIRY_KEYS.supplies, 'summary', date], queryFn: () => farmerSuppliesApi.summary(date) });
  const s = sum.data;
  const rows = list.data ?? [];

  const pay = async (x: FarmerSupply) => {
    try { await farmerSuppliesApi.pay(x.id, { paymentMethod: 'CASH' }); refreshDairy([DAIRY_KEYS.supplies, DAIRY_KEYS.farmers], true); toast.success(t('Parchi ada — cash drawer se')); }
    catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };

  const header = (
    <View style={{ gap: th.space(3) }}>
      <DayBar value={date} onChange={setDate} />
      <Segmented value={slot} onChange={setSlot} options={[{ value: 'MORNING', label: t('Subah') }, { value: 'EVENING', label: t('Shaam') }]} />
      <StatRow tiles={[
        { icon: Milk, tone: 'info', label: t('Aaj doodh aaya'), loading: sum.isLoading, value: liters(s?.totalLiters ?? 0), hint: t('{{totalSupplies}} parchi', { totalSupplies: s?.totalSupplies ?? 0 }) },
        { icon: Wallet, tone: 'warning', label: t('Amount'), loading: sum.isLoading, value: cost(s?.totalAmount ?? 0), hint: s?.averageRate ? `${cost(s.averageRate)}/L` : undefined },
      ]} />
      <StatRow tiles={[
        { icon: Sunrise, tone: 'warning', label: t('Subah'), loading: sum.isLoading, value: liters(s?.morningLiters ?? 0), onPress: () => setSlot('MORNING') },
        { icon: Sunset, tone: 'accent', label: t('Shaam'), loading: sum.isLoading, value: liters(s?.eveningLiters ?? 0), onPress: () => setSlot('EVENING') },
        { icon: Droplets, tone: 'info', label: t('Ausat fat'), loading: sum.isLoading, value: s?.averageFat ? `${s.averageFat}%` : '—' },
      ]} />
      <OfflineNote feature="dairyDesk" />
    </View>
  );

  return (
    <>
      <ListTemplate<FarmerSupply>
        title={t('Milk intake')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Gawale ka naam, number ya gaon…') }}
        summary={header}
        data={rows}
        loading={list.isLoading}
        error={list.data ? null : list.error}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching}
        onRefresh={() => { void list.refetch(); void sum.refetch(); }}
        keyExtractor={(r) => r.id}
        renderItem={({ item: r }) => {
          const off = isCancelledSupply(r);
          const q = r.quality ? QUALITY[r.quality] : null;
          const row = (
            <RowCard dim={off}>
              <ListRow icon={Milk} iconTone={off ? 'neutral' : r.isPaid ? 'success' : 'info'}
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{r.farmer?.name ?? t('Gawala')}</Text>{q && <Badge tone={q.tone}>{t(q.label)}</Badge>}{!off && r.isPaid && <Badge tone="success">{t('Ada')}</Badge>}</Row>}
                subtitle={off ? <Text size="xs" tone="muted">{r.notes?.replace('CANCELLED:', '').trim() || t('Cancel')}</Text> : <View style={{ gap: 2 }}>
                  <Text size="xs" tone="secondary">{`${liters(r.quantity)} @ ${formatMoney(r.ratePerLiter)}${r.fatContent ? ` · fat ${r.fatContent}%` : ''}`}</Text>
                  <Text size="xs" tone="muted">{[r.farmer?.village, r.fatBonus ? `${t('Bonus')} ${formatMoney(r.fatBonus)}` : '', r.otherAdjustment ? formatMoney(r.otherAdjustment) : ''].filter(Boolean).join(' · ')}</Text>
                </View>}
                trailing={off ? <Text size="xs" tone="muted">{t('Cancel')}</Text> : <Amount value={r.totalAmount} weight="bold" />} />
            </RowCard>
          );
          if (off || !canBuy) return row;
          const end = [
            ...(!r.isPaid && r.totalAmount > 0 && canPay ? [{ icon: Wallet, label: t('Cash ada'), tone: 'success' as const, onPress: () => guard(() => void pay(r)) }] : []),
            ...(!r.isPaid || r.quality === 'REJECTED' ? [{ icon: Ban, label: t('Cancel'), tone: 'danger' as const, onPress: () => guard(() => setCancelling(r)) }] : []),
          ];
          return end.length ? <SwipeRow end={end}>{row}</SwipeRow> : row;
        }}
        empty={<EmptyState icon={Milk} title={t('{{slot}} ki koi entry nahi', { slot: slotLabel(slot) })} message={t('Neeche + se har gawale ka doodh likhein.')} />}
        fab={canBuy && date <= todayKey() ? { icon: Plus, label: t('Nayi entry'), onPress: () => guard(() => setAdding(true)) } : undefined}
      />
      <EntrySheet open={adding} date={date} slot={slot} farmerId={farmerParam} onClose={() => setAdding(false)} />
      <ReasonSheet open={!!cancelling} title={t('Entry cancel')} cta={t('Cancel')} required={false} onClose={() => setCancelling(null)}
        onConfirm={async (reason) => { try { await farmerSuppliesApi.cancel(cancelling!.id, reason || undefined); refreshDairy([DAIRY_KEYS.supplies, DAIRY_KEYS.farmers], true); toast.success(t('Entry cancel')); } catch (e) { toast.error(errorText(e, t('Cancel nahi hui'))); throw e; } }} />
    </>
  );
}

function EntrySheet({ open, date, slot, farmerId, onClose }: { open: boolean; date: string; slot: 'MORNING' | 'EVENING'; farmerId?: string; onClose: () => void }) {
  const th = useTheme();
  const [farmer, setFarmer] = useState<DairyFarmer | null>(null);
  const [picking, setPicking] = useState(false);
  const [f, setF] = useState({ quantity: null as number | null, fat: null as number | null, snf: null as number | null, rate: null as number | null, adjust: null as number | null, quality: '', notes: '' });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setF({ quantity: null, fat: null, snf: null, rate: null, adjust: null, quality: '', notes: '' });
    if (farmerId) void farmersApi.getOne(farmerId).then((x) => { setFarmer(x); setF((v) => ({ ...v, rate: x.ratePerLiter || null })); }).catch(() => undefined); else setFarmer(null);
  }, [open, farmerId]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const n = f.quantity ?? 0;
  const rate = f.rate ?? 0;
  const bonus = farmer ? fatBonus(n, f.fat, farmer.fatBonusRate) : 0;
  const total = supplyTotal({ quantity: n, rate, fat: f.fat, bonusRate: farmer?.fatBonusRate, adjust: f.adjust ?? 0, quality: f.quality });
  const error = !farmer ? t('Gawala chunein') : !(n > 0) || n > 20000 ? t('Liter likhein') : !(rate > 0) && f.quality !== 'REJECTED' ? t('Rate likhein') : f.fat != null && (f.fat < 0 || f.fat > 15) ? t('Fat 0 se 15') : total < 0 ? t('Katauti amount se zyada hai') : '';
  const save = async () => {
    setTouched(true);
    if (error) { toast.error(error); return; }
    setBusy(true);
    try {
      const r = await farmerSuppliesApi.add({ farmerId: farmer!.id, supplyDate: date, slot, quantity: n, ratePerLiter: rate || undefined, fatContent: f.fat ?? undefined, snfContent: f.snf ?? undefined, otherAdjustment: f.adjust ?? undefined, quality: opt(f.quality), notes: opt(f.notes) });
      refreshDairy([DAIRY_KEYS.supplies, DAIRY_KEYS.farmers], true);
      toast.success(t('{{value}} — {{quantity}} likha{{value2}}', { value: farmer!.name, quantity: liters(r.quantity), value2: r.stockProduct ? t(', {{name}} stock me', { name: r.stockProduct.name }) : '' }));
      if (!r.stockProduct && f.quality !== 'REJECTED') toast.warning(t('Doodh ka product nahi mila — stock nahi barha. Products me doodh par "Asal doodh" lagayein.'));
      onClose();
    } catch (e) { toast.error(errorText(e, t('Entry save nahi hui'))); } finally { setBusy(false); }
  };
  return (
    <>
      <Sheet open={open && !picking} onClose={onClose} height={0.94} title={t('Nayi entry — {{slot}}', { slot: slotLabel(slot) })} description={total ? t('Amount: {{total}}{{value}}', { total: formatMoney(total), value: bonus ? ` (${t('Bonus')} ${formatMoney(bonus)})` : '' }) : undefined}
        footer={<Button fullWidth size="lg" loading={busy} onPress={() => void save()}>{t('Save')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <ListRow icon={Milk} title={farmer ? farmer.name : t('Chunein…')} subtitle={farmer ? [farmer.farmerNumber, farmer.village].filter(Boolean).join(' · ') : t('Gawala')} chevron onPress={() => setPicking(true)} />
          {touched && !farmer && <Text size="xs" tone="danger">{t('Gawala chunein')}</Text>}
          <NumberInput label={t('Liter')} value={f.quantity} onChangeValue={(v) => set('quantity', v)} autoFocus={!!farmer} error={touched && farmer && !(n > 0) ? error : undefined} />
          <NumberInput label={t('Fat %')} value={f.fat} onChangeValue={(v) => set('fat', v)} hint={farmer?.fatBonusRate ? t('{{BASE_FAT}}% se upar bonus', { BASE_FAT: 6 }) : undefined} />
          <MoneyInput label={t('Rate')} value={f.rate} onChangeValue={(v) => set('rate', v)} />
          <Text size="sm" weight="semibold" tone="secondary">{t('Quality')}</Text>
          <ChipGroup wrap value={f.quality} onChange={(v) => set('quality', v)} options={[{ value: '', label: t('Theek') }, ...Object.entries(QUALITY).map(([value, x]) => ({ value, label: t(x.label) }))]} />
          <NumberInput label={t('SNF %')} value={f.snf} onChangeValue={(v) => set('snf', v)} />
          <Input label={t('Katauti (-) ya izafa (+)')} keyboardType="numbers-and-punctuation" ltr value={f.adjust == null ? '' : String(f.adjust)} onChangeText={(v) => set('adjust', v === '' || v === '-' ? null : Number(v) || 0)} hint={t('Jaise -50 paani ki wajah se')} />
          <Input label={t('Note')} value={f.notes} onChangeText={(v) => set('notes', v)} />
        </View>
      </Sheet>
      <PickerSheet<DairyFarmer> open={open && picking} title={t('Gawala')} cacheKey="dairy-farmers" onClose={() => setPicking(false)} placeholder={t('Gawale ka naam, number ya gaon…')}
        load={(term) => farmersApi.all({ active: true, search: term || undefined })} onPick={(x) => { setFarmer(x); setF((v) => ({ ...v, rate: x.ratePerLiter || null })); setPicking(false); }}
        row={(x, pick) => <ListRow dense icon={Milk} title={x.name} subtitle={[x.farmerNumber, x.village].filter(Boolean).join(' · ')} trailing={<Text size="xs" tone="muted" ltr>{`${x.ratePerLiter}/L`}</Text>} onPress={pick} />} />
    </>
  );
}
