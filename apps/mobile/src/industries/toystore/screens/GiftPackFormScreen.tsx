/**
 * New or edited gift pack (web GiftPackFormPage): name, occasion, age, the toys
 * with quantity and rate, the pack price with the saving shown live, dates
 * and switches. Each toy leaves stock when the pack is sold. Needs the server.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { buildable, packMoney, packProblems, type PackProblem } from '@nafaa/core/industries/toystore';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText, useProductSearch } from '@/core/offline';
import { Button, Card, ChipGroup, DatePicker, ErrorState, FormSection, FormTemplate, IconButton, Input, ListRow, MoneyInput, Row, SearchBar, Select, SkeletonRows, Switch, Text, TextArea, toast, useDebouncedValue, useTheme } from '@/design';
import { variantsApi } from '@/modules/inventory/api/products';
import { NumberInput } from '@/modules/inventory/components/fields';
import { toyGiftPacksApi, type GiftPackBody } from '../api';
import { AGE_GROUPS, GENDERS, KEYS, OCCASIONS, refreshToy } from '../meta';

interface Line { key: string; productId: string; name: string; hasVariants: boolean; variantId: string; quantity: number; unitPrice: number; stock: number }
interface Draft {
  name: string; description: string; occasion: string; targetAgeGroup: string; targetGender: string; price: number | null;
  isGiftWrapped: boolean; includesCard: boolean; isActive: boolean; isFeatured: boolean; isSeasonal: boolean; seasonName: string;
  validFrom: string; validUntil: string; lines: Line[];
}
const EMPTY: Draft = {
  name: '', description: '', occasion: 'BIRTHDAY', targetAgeGroup: '', targetGender: '', price: null, isGiftWrapped: true, includesCard: false,
  isActive: true, isFeatured: false, isSeasonal: false, seasonName: '', validFrom: '', validUntil: '', lines: [],
};
let seq = 0;
const key = () => `l${++seq}`;
const dayKey = (v?: string | null) => (v ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date(v)) : '');
const asDate = (k: string) => new Date(`${k}T12:00:00+05:00`);

const PROBLEM: Record<PackProblem, string> = {
  name: msg('Pack ka naam likhein'), twoToys: msg('Kam se kam 2 khilone chunein'), qty: msg('Har khilone ki quantity poori ginti me, kam se kam 1'),
  variant: msg('Rang / model wale khilone ka rang chunein'), price: msg('Pack ki qeemat likhein'), dates: msg('Khatam ki tareekh shuru se pehle hai'),
};

export function GiftPackFormScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const online = useOnlineStatus();
  const [d, setD] = useState<Draft>(EMPTY);
  const [q, setQ] = useState('');
  const [dirty, setDirty] = useState(false);
  const set = (patch: Partial<Draft>) => { setDirty(true); setD((x) => ({ ...x, ...patch })); };
  const setLine = (k: string, patch: Partial<Line>) => set({ lines: d.lines.map((l) => (l.key === k ? { ...l, ...patch } : l)) });

  const packQ = useQuery({ queryKey: [KEYS.packs, 'one', id], queryFn: () => toyGiftPacksApi.getOne(id!), enabled: editing });
  useEffect(() => {
    const p = packQ.data;
    if (!p) return;
    setD({
      name: p.name, description: p.description ?? '', occasion: p.occasion ?? '', targetAgeGroup: p.targetAgeGroup ?? '', targetGender: p.targetGender ?? '',
      price: p.giftPackPrice, isGiftWrapped: p.isGiftWrapped, includesCard: p.includesCard, isActive: p.isActive, isFeatured: p.isFeatured,
      isSeasonal: p.isSeasonal, seasonName: p.seasonName ?? '', validFrom: dayKey(p.validFrom), validUntil: dayKey(p.validUntil),
      lines: p.items.map((i) => ({ key: key(), productId: i.productId, name: i.product?.name ?? t('Khilona nahi mila'), hasVariants: !!i.product?.hasVariants, variantId: i.variantId ?? '', quantity: i.quantity, unitPrice: i.unitPrice, stock: Number(i.product?.stock ?? 0) })),
    });
  }, [packQ.data]);

  const term = useDebouncedValue(q.trim(), 150);
  const found = useProductSearch({ query: term, limit: 12 }, { enabled: term.length >= 2 });
  const price = d.price ?? 0;
  const money = packMoney(d.lines, price);
  const packs = d.lines.length ? buildable(d.lines.map((l) => ({ quantity: l.quantity, stock: l.stock }))) : 0;
  const problems = useMemo(() => packProblems({ name: d.name, price, validFrom: d.validFrom, validUntil: d.validUntil, lines: d.lines }), [d, price]);

  const save = useMutation({
    mutationFn: () => {
      const body: GiftPackBody = {
        name: d.name.trim(), description: d.description.trim() || undefined, occasion: d.occasion || undefined, targetAgeGroup: d.targetAgeGroup || undefined, targetGender: d.targetGender || undefined,
        giftPackPrice: price, items: d.lines.map((l) => ({ productId: l.productId, ...(l.variantId ? { variantId: l.variantId } : {}), quantity: l.quantity, unitPrice: l.unitPrice })),
        isGiftWrapped: d.isGiftWrapped, includesCard: d.includesCard, isActive: d.isActive, isFeatured: d.isFeatured, isSeasonal: d.isSeasonal,
        seasonName: d.isSeasonal ? d.seasonName.trim() || undefined : undefined, validFrom: d.validFrom || undefined, validUntil: d.validUntil || undefined,
      };
      return editing ? toyGiftPacksApi.update(id!, body) : toyGiftPacksApi.create(body);
    },
    onSuccess: () => {
      setDirty(false);
      refreshToy([KEYS.packs, KEYS.posPacks, KEYS.overview]);
      toast.success(editing ? t('Pack save ho gaya') : t('Pack ban gaya — counter ke Gift packs tab me hai'));
      router.replace('/toystore/gift-packs' as never);
    },
  });
  const submit = () => {
    if (problems.length) { toast.error(t(PROBLEM[problems[0]])); return; }
    if (!online) { toast.warning(onlineNeededText('toystoreDesk')); return; }
    if (!save.isPending) save.mutate();
  };

  const add = (p: { id: string; name: string; price: number; stock: number | null; hasVariants: boolean }) => {
    const same = d.lines.find((l) => l.productId === p.id && !p.hasVariants);
    if (same) setLine(same.key, { quantity: same.quantity + 1 });
    else set({ lines: [...d.lines, { key: key(), productId: p.id, name: p.name, hasVariants: p.hasVariants, variantId: '', quantity: 1, unitPrice: Number(p.price) || 0, stock: Number(p.stock) || 0 }] });
    setQ('');
  };

  if (editing && !packQ.data) {
    return <FormTemplate title={t('Pack badlein')} onSave={() => undefined}>{packQ.isError ? <ErrorState error={packQ.error} onRetry={() => void packQ.refetch()} /> : <SkeletonRows count={5} />}</FormTemplate>;
  }

  return (
    <FormTemplate title={editing ? t('{{name}} — badlein', { name: packQ.data?.name }) : t('Naya gift pack')} subtitle={t('Khilone chunein, pack ki qeemat rakhein — counter par ek tap me bikta hai')}
      dirty={dirty} saving={save.isPending} onSave={submit} saveLabel={editing ? t('Save karein') : t('Pack banayein')}>
      <FormSection title={t('Pack')}>
        <Input label={t('Naam')} value={d.name} onChangeText={(name) => set({ name })} placeholder={t('Eid box larkon ke liye')} maxLength={100} hint={t('Counter aur receipt par yahi naam aata hai')} />
        <Text size="sm" weight="medium" tone="secondary">{t('Mauqa')}</Text>
        <ChipGroup wrap value={d.occasion} onChange={(v) => set({ occasion: d.occasion === v ? '' : v })} options={OCCASIONS.map(([v, l]) => ({ value: v, label: t(l) }))} />
        <Select label={t('Umar')} value={d.targetAgeGroup} onChange={(targetAgeGroup) => set({ targetAgeGroup })} hint={t('Gift finder isi se pack dikhata hai')} options={[{ value: '', label: t('Har umar') }, ...AGE_GROUPS.map(([v, l]) => ({ value: v, label: t(l) }))]} />
        <Select label={t('Kis ke liye')} value={d.targetGender} onChange={(targetGender) => set({ targetGender })} options={[{ value: '', label: t('Sab') }, ...GENDERS.map(([v, l]) => ({ value: v, label: t(l) }))]} />
        <TextArea label={t('Tafseel')} value={d.description} onChangeText={(description) => set({ description })} maxLength={500} placeholder={t('Car, ball aur chocolate — wrap ke saath')} hint={t('Marzi hai')} />
      </FormSection>

      <FormSection title={t('Khilone')} description={t('Har khilona pack bikne par stock se nikalta hai')}>
        <SearchBar value={q} onChangeText={setQ} placeholder={t('Khilone ka naam ya barcode likhein')} />
        {term.length >= 2 && (
          <Card flush>
            {(found.data ?? []).length === 0
              ? <Text tone="muted" style={{ padding: th.space(3) }}>{found.isFetching ? t('Dhoond rahe hain…') : t('Kuch nahi mila')}</Text>
              : found.data!.map((p, i) => (
                <ListRow key={p.id} dense divider={i < found.data!.length - 1} title={`${p.name}${p.hasVariants ? t(' (rang / model)') : ''}`} subtitle={t('Stock {{stock}}', { stock: p.stock ?? 0 })}
                  trailing={<Text size="sm" weight="semibold" ltr>{formatMoney(p.price)}</Text>} onPress={() => add({ id: p.id, name: p.name, price: p.price, stock: p.stock, hasVariants: p.hasVariants })} />
              ))}
          </Card>
        )}
        {d.lines.length === 0 ? <Text size="sm" tone="muted">{t('Upar se kam se kam 2 khilone chunein.')}</Text> : d.lines.map((l) => (
          <Card key={l.key} style={{ gap: th.space(2) }}>
            <Row gap={2} justify="between" align="start">
              <View style={{ flex: 1 }}>
                <Text weight="semibold" numberOfLines={2}>{l.name}</Text>
                <Text size="xs" tone={l.stock < l.quantity ? 'danger' : 'muted'}>{t('Stock {{stock}}', { stock: l.stock })}</Text>
              </View>
              <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" size="sm" onPress={() => set({ lines: d.lines.filter((x) => x.key !== l.key) })} />
            </Row>
            {l.hasVariants && <VariantSelect productId={l.productId} value={l.variantId} onChange={(variantId, stock, rate) => setLine(l.key, { variantId, stock: stock ?? l.stock, unitPrice: rate ?? l.unitPrice })} />}
            <Row gap={2}>
              <NumberInput integer containerStyle={{ flex: 1 }} label={t('Qty')} value={l.quantity} onChangeValue={(v) => setLine(l.key, { quantity: v ?? 0 })} />
              <MoneyInput containerStyle={{ flex: 2 }} label={t('Rate (Rs)')} value={l.unitPrice} onChangeValue={(v) => setLine(l.key, { unitPrice: v ?? 0 })} hint={t('Asal rate')} />
            </Row>
          </Card>
        ))}
      </FormSection>

      <FormSection title={t('Qeemat')}>
        <MoneyInput label={t('Pack ki qeemat (Rs)')} value={d.price} onChangeValue={(v) => set({ price: v })} size="xl" placeholder={money.original ? String(Math.round(money.original * 0.9)) : '0'}
          hint={money.original ? t('Alag alag {{original}} — 10% kam: {{formatPKR}}', { original: formatMoney(money.original), formatPKR: formatMoney(Math.round(money.original * 0.9)) }) : t('Khilone chunne ke baad')} />
        <Card tone="muted">
          <Row justify="between"><Text size="sm" tone="secondary">{t('Alag alag')}</Text><Text size="sm" weight="semibold" ltr>{formatMoney(money.original)}</Text></Row>
          <Row justify="between"><Text size="sm" tone="secondary">{t('Bachat')}</Text><Text size="sm" weight="semibold" tone="success" ltr>{formatMoney(money.savings)}</Text></Row>
          <Row justify="between"><Text size="sm" tone="secondary">{t('Stock se')}</Text><Text size="sm" weight="semibold" tone={packs === 0 && d.lines.length ? 'danger' : 'default'}>{t('{{packs}} pack', { packs })}</Text></Row>
        </Card>
        {money.dearer && <Card tone="warning"><Text size="sm">{t('Pack alag alag se mehnga hai — customer alag le lega.')}</Text></Card>}
      </FormSection>

      <FormSection title={t('Kab tak')} description={t('Khali chhorein to hamesha counter par')}>
        <DatePicker label={t('Shuru')} value={d.validFrom ? asDate(d.validFrom) : null} onChange={(x) => set({ validFrom: dayKey(x.toISOString()) })} />
        <DatePicker label={t('Khatam')} value={d.validUntil ? asDate(d.validUntil) : null} hint={t('Is din ke baad counter se hat jata hai')} onChange={(x) => set({ validUntil: dayKey(x.toISOString()) })} />
        <Switch value={d.isSeasonal} onChange={(isSeasonal) => set({ isSeasonal })} label={t('Season ka pack')} description={t('Eid, saalgirah ka season — packs page par alag tab')} />
        {d.isSeasonal && <Input label={t('Season')} value={d.seasonName} onChangeText={(seasonName) => set({ seasonName })} placeholder={t('Eid ul Fitr 2027')} />}
      </FormSection>

      <FormSection title={t('Aur')}>
        <Switch value={d.isActive} onChange={(isActive) => set({ isActive })} label={t('Counter par chalu')} />
        <Switch value={d.isFeatured} onChange={(isFeatured) => set({ isFeatured })} label={t('Upar dikhayein')} description={t('Gift packs tab me sab se pehle')} />
        <Switch value={d.isGiftWrapped} onChange={(isGiftWrapped) => set({ isGiftWrapped })} label={t('Wrap ke saath')} description={t('Pack ki qeemat me wrap shamil hai')} />
        <Switch value={d.includesCard} onChange={(includesCard) => set({ includesCard })} label={t('Card ke saath')} />
      </FormSection>
    </FormTemplate>
  );
}

/** Toys with variants name the exact colour or model, so the counter takes the right stock. */
function VariantSelect({ productId, value, onChange }: { productId: string; value: string; onChange: (id: string, stock?: number, price?: number) => void }) {
  const { data: variants = [] } = useQuery({ queryKey: ['toy-pack-variants', productId], queryFn: () => variantsApi.list(productId), staleTime: 60_000 });
  const active = variants.filter((v) => v.isActive !== false);
  return (
    <Select label={t('Rang / model')} value={value} error={!value ? t('Rang chunein') : undefined}
      onChange={(v) => { const x = active.find((a) => a.id === v); onChange(v, x ? Number(x.stock) : undefined, x?.price != null ? Number(x.price) : undefined); }}
      options={[{ value: '', label: t('Rang / model chunein') }, ...active.map((v) => ({ value: v.id, label: `${v.name} (${v.stock})` }))]} />
  );
}
