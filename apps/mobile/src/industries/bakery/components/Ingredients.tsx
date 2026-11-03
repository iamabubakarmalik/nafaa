/**
 * Raw material pieces (web raw/*): add or edit a material, goods received
 * (a supplier bill; the unpaid part goes on the supplier's khata), waste and
 * a counted correction, a material's record, recipe costing at today's rates,
 * the movement record and analytics.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowDownToLine, Pencil, Scale, Trash2, Wheat } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { fmtQty } from '@nafaa/core/bakery';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDateTime, formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, Chip, ChipGroup, EmptyState, HBarList, Input, ListRow, MoneyInput, Row, Select, Sheet, Skeleton, StatTile, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { productsApi } from '@/modules/inventory/api/products';
import { SupplierPicker } from '@/modules/purchasing/components/SupplierPicker';
import { useCostMask } from '@/modules/sales/lib/mask';
import type { Period } from '@/modules/sales/lib/period';
import { ingredientsApi, type Ingredient, type MovementKind, type RecipeCost } from '../api';
import { RAW_CATEGORIES, RAW_KEY, RAW_UNITS, PAY_METHODS, refreshBakery } from '../meta';
import { useShopId } from './OrderSheets';

export function IngredientFormSheet({ item, onClose }: { item: Ingredient | null; onClose: () => void }) {
  const th = useTheme();
  const editing = !!item;
  const [f, setF] = useState({
    name: item?.name ?? '', category: item?.category ?? 'GENERAL', unit: item?.unit ?? 'kg', costPerUnit: item ? item.costPerUnit : null as number | null,
    currentStock: null as number | null, minStock: item?.minStock ?? null as number | null, reorderLevel: item?.reorderLevel ?? null as number | null,
    brand: item?.brand ?? '', supplierName: item?.supplierName ?? '', supplierPhone: item?.supplierPhone ?? '', shelfLifeDays: item?.shelfLifeDays ?? null as number | null,
    requiresRefrigeration: item?.requiresRefrigeration ?? false, isCritical: item?.isCritical ?? false, notes: item?.notes ?? '',
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const save = useMutation({
    mutationFn: () => {
      const body: Partial<Ingredient> = {
        name: f.name.trim(), category: f.category, unit: f.unit, costPerUnit: Number(f.costPerUnit) || 0, minStock: Number(f.minStock) || 0,
        reorderLevel: f.reorderLevel ?? undefined, brand: f.brand.trim() || undefined, supplierName: f.supplierName.trim() || undefined,
        supplierPhone: f.supplierPhone.trim() || undefined, shelfLifeDays: f.shelfLifeDays ?? undefined,
        requiresRefrigeration: f.requiresRefrigeration, isCritical: f.isCritical, notes: f.notes.trim() || undefined,
      };
      return editing ? ingredientsApi.update(item!.id, body) : ingredientsApi.create({ ...body, currentStock: Number(f.currentStock) || 0 });
    },
    onSuccess: () => { toast.success(editing ? t('Save ho gaya') : t('Saamaan jur gaya')); refreshBakery([RAW_KEY]); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  const bad = !f.name.trim() || !(Number(f.costPerUnit) > 0);
  return (
    <Sheet open onClose={onClose} title={editing ? t('{{name}} — badlein', { name: item!.name }) : t('Naya saamaan')} description={t('Maida, cheeni, makhan — jo bikta nahi magar banane me lagta hai')}
      footer={<Button fullWidth size="lg" disabled={bad} loading={save.isPending} onPress={() => save.mutate()}>{editing ? t('Save karein') : t('Jorein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Naam')} value={f.name} onChangeText={(name) => set({ name })} placeholder={t('Maida, cheeni, makhan…')} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Type')}</Text>
        <ChipGroup wrap value={f.category} onChange={(category) => set({ category })} options={RAW_CATEGORIES.map((c) => ({ value: c.value, label: `${c.emoji} ${t(c.label)}` }))} />
        <Select label={t('Naap')} value={f.unit} onChange={(unit) => set({ unit })} options={RAW_UNITS.map((u) => ({ value: u, label: u }))} hint={t('Isi naap me khareeda aur recipe me likha jata hai')} />
        <MoneyInput label={t('Ek {{unit}} ka rate', { unit: f.unit })} value={f.costPerUnit} onChangeValue={(costPerUnit) => set({ costPerUnit })} hint={editing ? t('"Maal aaya" par khud badalta hai') : t('Abhi ka bhao')} />
        {!editing && <NumberInput label={t('Abhi kitna hai')} value={f.currentStock} onChangeValue={(currentStock) => set({ currentStock })} hint={t('Gudaam me ginti')} />}
        <Row gap={2}>
          <NumberInput containerStyle={{ flex: 1 }} label={t('Kam se kam')} value={f.minStock} onChangeValue={(minStock) => set({ minStock })} hint={t('Itna reh jaye to list me peela')} />
          <NumberInput containerStyle={{ flex: 1 }} label={t('Mangwane ki had')} value={f.reorderLevel} onChangeValue={(reorderLevel) => set({ reorderLevel })} />
        </Row>
        <NumberInput integer label={t('Kitne din chalta hai')} value={f.shelfLifeDays} onChangeValue={(shelfLifeDays) => set({ shelfLifeDays })} hint={t('Marzi hai')} />
        {editing && <Text size="xs" tone="muted">{t('Stock yahan se nahi badalta — "Maal aaya" ya "Gin kar theek" se badlein, taake record me wajah bhi aaye.')}</Text>}
        <Input label={t('Brand')} value={f.brand} onChangeText={(brand) => set({ brand })} placeholder={t('Sunridge')} hint={t('Marzi hai')} />
        <Input label={t('Supplier')} value={f.supplierName} onChangeText={(supplierName) => set({ supplierName })} hint={t('Jis se aata hai')} />
        <Input label={t('Supplier ka WhatsApp')} value={f.supplierPhone} onChangeText={(supplierPhone) => set({ supplierPhone })} keyboardType="phone-pad" ltr placeholder="03001234567" hint={t('List seedha isi par jayegi')} />
        <Switch value={f.requiresRefrigeration} onChange={(requiresRefrigeration) => set({ requiresRefrigeration })} label={t('Fridge me rakhna hai')} />
        <Switch value={f.isCritical} onChange={(isCritical) => set({ isCritical })} label={t('Is ke bagair kaam nahi chalta')} description={t('Khatam hone par sab se upar')} />
        <TextArea label={t('Note')} value={f.notes} onChangeText={(notes) => set({ notes })} maxLength={500} />
      </View>
    </Sheet>
  );
}

export type StockMode = 'purchase' | 'waste' | 'adjust';

export function RawStockSheet({ item, mode, onClose }: { item: Ingredient; mode: StockMode; onClose: () => void }) {
  const th = useTheme();
  const shopId = useShopId();
  const [qty, setQty] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(item.costPerUnit || null);
  const [vendor, setVendor] = useState(item.lastVendorName ?? item.supplierName ?? '');
  const [reason, setReason] = useState('');
  const [newStock, setNewStock] = useState<number | null>(item.currentStock ?? 0);
  const [payWay, setPayWay] = useState('CASH');
  const [payMode, setPayMode] = useState<'FULL' | 'PARTIAL' | 'UDHAAR'>('FULL');
  const [paidNow, setPaidNow] = useState<number | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const n = qty ?? 0;
  const total = Math.round(n * (rate ?? 0) * 100) / 100;
  const paid = payMode === 'FULL' ? total : payMode === 'UDHAAR' ? 0 : paidNow ?? 0;
  const owe = Math.max(total - paid, 0);
  const meta = {
    purchase: { title: t('Maal aaya'), icon: ArrowDownToLine, btn: t('Darj karein') },
    waste: { title: t('Waste hua'), icon: Trash2, btn: t('Waste likhein') },
    adjust: { title: t('Gin kar theek karein'), icon: Scale, btn: t('Theek karein') },
  }[mode];
  const save = useMutation({
    mutationFn: () => {
      if (mode === 'purchase') return ingredientsApi.purchase(item.id, { quantity: n, costPerUnit: rate ?? 0, vendorName: vendor.trim() || undefined, supplierId: supplierId || undefined, paymentMethod: payWay, paidAmount: paid, shopId: shopId || undefined });
      if (mode === 'waste') return ingredientsApi.waste(item.id, { quantity: n, reason: reason.trim() });
      return ingredientsApi.adjust(item.id, { newStock: newStock ?? 0, reason: reason.trim() });
    },
    onSuccess: () => { toast.success(t('Darj ho gaya')); refreshBakery([RAW_KEY, 'pur']); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi ho saka'))),
  });
  const bad = mode === 'adjust' ? newStock === null || !reason.trim()
    : mode === 'purchase' ? n <= 0 || !((rate ?? 0) > 0) || paid > total || (owe > 0 && !supplierId)
      : n <= 0 || !reason.trim();
  const reasons = mode === 'waste' ? [t('Kharab ho gaya'), t('Gir gaya'), t('Expire ho gaya'), t('Keera lag gaya')] : [];
  return (
    <Sheet open onClose={onClose} title={meta.title} description={t('{{name}} · abhi {{currentStock}} {{unit}}', { name: item.name, currentStock: fmtQty(item.currentStock), unit: item.unit })}
      footer={<Button fullWidth size="lg" variant={mode === 'waste' ? 'danger' : 'primary'} icon={meta.icon} disabled={bad} loading={save.isPending} onPress={() => save.mutate()}>{meta.btn}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {mode === 'adjust'
          ? <NumberInput size="lg" label={t('Gin kar kitna nikla ({{unit}})', { unit: item.unit })} value={newStock} onChangeValue={setNewStock}
            hint={newStock !== null ? t('Farq: {{fmtQty}} {{unit}}', { fmtQty: fmtQty((newStock ?? 0) - item.currentStock), unit: item.unit }) : undefined} />
          : <NumberInput size="lg" label={t('Kitna ({{unit}})', { unit: item.unit })} value={qty} onChangeValue={setQty}
            hint={mode === 'waste' && n > item.currentStock ? t('Stock sirf {{currentStock}} hai — 0 ho jayega', { currentStock: fmtQty(item.currentStock) }) : undefined} />}
        {mode === 'purchase' && (
          <>
            <MoneyInput label={t('Ek {{unit}} kitne ka aaya', { unit: item.unit })} value={rate} onChangeValue={setRate} />
            <Input label={t('Kahan se aaya')} value={vendor} onChangeText={setVendor} placeholder={t('Supplier / dukaan')} />
            {rate !== null && Math.abs(rate - item.costPerUnit) > 0.001 && (
              <Card tone="warning"><Text size="xs">{t('Rate {{costPerUnit}} se {{formatPKR}} ho raha hai. Recipe wali cheezon ki cost "Recipe aur cost" tab me dobara dekh lein.', { costPerUnit: formatMoney(item.costPerUnit), formatPKR: formatMoney(rate) })}</Text></Card>
            )}
            <Card tone="muted" title={t('Paisa kaise diya')} action={<Amount value={total} weight="bold" />}>
              <View style={{ gap: th.space(2) }}>
                <ChipGroup wrap value={payMode} onChange={setPayMode} options={[{ value: 'FULL', label: t('Poora diya') }, { value: 'PARTIAL', label: t('Kuch diya') }, { value: 'UDHAAR', label: t('Poora udhaar') }]} />
                {payMode === 'PARTIAL' && <MoneyInput label={t('Abhi kitna diya')} value={paidNow} onChangeValue={setPaidNow} error={paid > total ? t('Kul rakam se zyada nahi') : undefined} />}
                {paid > 0 && <ChipGroup wrap value={payWay} onChange={setPayWay} options={PAY_METHODS.map((m) => ({ value: m.id, label: t(m.label) }))} />}
                {owe > 0 && <SupplierPicker value={supplierId} onChange={(s) => setSupplierId(s.id)} onNew={() => router.push('/suppliers/new' as never)} />}
                <Text size="xs" tone="muted">{paid > 0 && owe > 0 ? t('Supplier ka bill banega: diya hua paisa galle se ghatega, baqi supplier ke khate me.')
                  : owe > 0 ? t('Poori rakam supplier ke khate me jayegi — galle par asar nahi.')
                    : payWay === 'CASH' ? t('Supplier ka bill banega aur cash galle se khud ghatega.') : t('Supplier ka bill banega. Cash nahi diya, is liye galle par asar nahi.')}</Text>
              </View>
            </Card>
          </>
        )}
        {(mode === 'waste' || mode === 'adjust') && (
          <>
            <Input label={t('Wajah')} value={reason} onChangeText={setReason} placeholder={mode === 'waste' ? t('Kharab ho gaya, gir gaya, keera lag gaya…') : t('Mahine ki ginti me farq')} />
            {reasons.length > 0 && <Row gap={2} wrap>{reasons.map((r) => <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />)}</Row>}
            {mode === 'waste' && n > 0 && <Text size="xs" tone="danger">{t('Nuqsaan: {{formatPKR}}', { formatPKR: formatMoney(n * item.costPerUnit) })}</Text>}
          </>
        )}
      </View>
    </Sheet>
  );
}

const KIND: Record<string, { label: string; tone: 'success' | 'neutral' | 'danger' | 'accent' }> = {
  PURCHASE: { label: msg('Maal aaya'), tone: 'success' }, CONSUMPTION: { label: msg('Istemal'), tone: 'neutral' }, WASTE: { label: msg('Waste'), tone: 'danger' }, ADJUSTMENT: { label: msg('Ginti'), tone: 'accent' },
};
const kindOf = (k: string) => KIND[k] ?? { label: k, tone: 'neutral' as const };

export function RawHistorySheet({ item, onClose }: { item: Ingredient; onClose: () => void }) {
  const th = useTheme();
  const q = useQuery({ queryKey: [RAW_KEY, 'history', item.id], queryFn: () => ingredientsApi.transactions(item.id) });
  const rows = q.data ?? [];
  return (
    <Sheet open onClose={onClose} title={t('{{name}} — record', { name: item.name })} description={t('Abhi {{currentStock}} {{unit}} · aakhri 100 cheezein', { currentStock: fmtQty(item.currentStock), unit: item.unit })}>
      {q.isLoading ? <Skeleton height={120} /> : !rows.length ? <Text tone="muted" align="center" style={{ padding: th.space(6) }}>{t('Abhi koi record nahi')}</Text> : (
        <View>
          {rows.map((r, i) => (
            <ListRow key={r.id} dense divider={i < rows.length - 1} title={<Badge tone={kindOf(r.transactionType).tone}>{t(kindOf(r.transactionType).label)}</Badge>}
              subtitle={`${r.reason || r.notes || '—'}\n${formatDateTime(r.createdAt)}`} trailing={<Text weight="semibold" ltr>{`${fmtQty(r.quantity)} ${r.unit}`}</Text>} />
          ))}
        </View>
      )}
    </Sheet>
  );
}

export type RecipeFilter = 'all' | 'low' | 'off' | 'missing';
export const useRecipes = () => useQuery({ queryKey: [RAW_KEY, 'recipes'], queryFn: ingredientsApi.recipes, staleTime: 60_000 });

export function RecipeCosting({ search, filter }: { search: string; filter: RecipeFilter }) {
  const th = useTheme();
  const q = useRecipes();
  const s = search.trim().toLowerCase();
  const rows = useMemo(() => (q.data?.rows ?? []).filter((r) => {
    if (s && !r.name.toLowerCase().includes(s) && !r.lines.some((l) => l.name.toLowerCase().includes(s))) return false;
    if (filter === 'low') return r.margin?.pct != null && r.margin.pct < 20;
    if (filter === 'off') return !!r.cost && (r.cost.current > 0 ? Math.abs(r.cost.diff) / r.cost.current > 0.05 : r.cost.perUnit > 0);
    if (filter === 'missing') return r.missing > 0;
    return true;
  }), [q.data, s, filter]);
  if (!q.data) return <View style={{ gap: th.space(2) }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={64} />)}</View>;
  if (!q.data.rows.length) {
    return <EmptyState icon={Wheat} title={t('Abhi kisi cheez ki recipe nahi bani')}
      message={t('Product kholein → Badlein → "Recipe" me likhein ke ek dafa me kitna maida, cheeni, makhan lagta hai. Phir yahan aaj ke rate se har cheez ki cost aur profit dikhega.')}
      action={<Button onPress={() => router.push('/products' as never)}>{t('Products kholein')}</Button>} />;
  }
  if (!rows.length) return <EmptyState icon={Wheat} title={t('Is filter me koi recipe nahi')} />;
  return <View style={{ gap: th.space(2) }}>{rows.map((r) => <RecipeRow key={r.productId} r={r} />)}</View>;
}

function RecipeRow({ r }: { r: RecipeCost }) {
  const th = useTheme();
  const can = usePermission();
  const { cost, costHidden } = useCostMask();
  const [open, setOpen] = useState(false);
  const pct = r.margin?.pct;
  const off = !!r.cost && (r.cost.current > 0 ? Math.abs(r.cost.diff) / r.cost.current > 0.05 : r.cost.perUnit > 0);
  const apply = useMutation({
    mutationFn: () => productsApi.update(r.productId, { costPrice: r.cost!.perUnit }),
    onSuccess: () => { toast.success(t('{{name}}: cost {{perUnit}} laga di', { name: r.name, perUnit: formatMoney(r.cost!.perUnit) })); refreshBakery([RAW_KEY, 'inv']); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  return (
    <Card flush>
      <ListRow icon={Wheat} iconTone="warning" onPress={() => setOpen((v) => !v)}
        title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{r.name}</Text>
          {r.ratesChanged > 0 && <Badge tone="warning">{t('{{ratesChanged}} rate badle', { ratesChanged: r.ratesChanged })}</Badge>}
          {r.missing > 0 && <Badge tone="danger">{t('{{missing}} saamaan nahi mila', { missing: r.missing })}</Badge>}</Row>}
        subtitle={t('Ek dafa me {{yieldQty}} {{unit}} · {{count}} cheezein{{value}}', { yieldQty: fmtQty(r.yieldQty), unit: r.unit, count: r.lines.length, value: r.canMake !== null ? t(' · gudaam se {{canMake}} ban sakte', { canMake: fmtQty(r.canMake) }) : '' })}
        trailing={<View style={{ alignItems: 'flex-end' }}>
          <Text size="2xs" tone="muted">{t('Cost')} · {t('Profit')}</Text>
          <Text weight="bold" ltr>{costHidden || !r.cost ? '••••' : cost(r.cost.perUnit)}</Text>
          <Text size="xs" weight="semibold" tone={pct == null ? 'muted' : pct < 20 ? 'danger' : 'success'}>{costHidden || pct == null ? '—' : `${pct}%`}</Text>
        </View>} />
      {open && (
        <View style={{ paddingHorizontal: th.space(4), paddingBottom: th.space(3), gap: th.space(2) }}>
          {r.lines.map((l) => (
            <Row key={l.ingredientId} justify="between">
              <Text size="sm" tone={l.missing ? 'danger' : 'default'} style={{ flex: 1 }} numberOfLines={1}>{l.name}{l.missing ? t(' (nahi mila)') : ''}</Text>
              <Text size="sm" tone="muted" ltr>{`${fmtQty(l.qty)} ${l.unit}`}</Text>
              <Text size="sm" weight="semibold" ltr style={{ minWidth: 80, textAlign: 'right' }}>{l.cost && !costHidden ? cost(l.cost.line) : '••••'}</Text>
            </Row>
          ))}
          {r.cost && !costHidden && (
            <Text size="xs" tone="secondary">{t('Poori dafa {{batch}} · ek {{unit}} {{perUnit}} · product par likhi cost {{current}}', { batch: cost(r.cost.batch), unit: r.unit, perUnit: cost(r.cost.perUnit), current: cost(r.cost.current) })}</Text>
          )}
          <Row gap={2} wrap>
            <Text size="xs" tone="muted">{t('Bechte')} <Amount value={r.price} size="xs" /></Text>
            {can(P.PRODUCTS_EDIT) && off && !costHidden && r.cost && <Button size="sm" loading={apply.isPending} onPress={() => apply.mutate()}>{t('Cost {{perUnit}} product par laga dein', { perUnit: cost(r.cost.perUnit) })}</Button>}
            {can(P.PRODUCTS_EDIT) && <Button size="sm" variant="secondary" icon={Pencil} onPress={() => router.push(`/products/${r.productId}/edit` as never)}>{t('Recipe badlein')}</Button>}
          </Row>
        </View>
      )}
    </Card>
  );
}

const KIND_FILTER: Array<{ value: '' | MovementKind; label: string }> = [
  { value: '', label: msg('Sab') }, { value: 'PURCHASE', label: msg('Maal aaya') }, { value: 'CONSUMPTION', label: msg('Banane me laga') }, { value: 'WASTE', label: msg('Waste') }, { value: 'ADJUSTMENT', label: msg('Ginti ka farq') },
];

export function MovementRecord({ period, search }: { period: Period; search: string }) {
  const th = useTheme();
  const { cost } = useCostMask();
  const [kind, setKind] = useState<'' | MovementKind>('');
  const range = period.from === 'all' ? { to: period.to } : period;
  const q = useQuery({ queryKey: [RAW_KEY, 'movements', range, kind], queryFn: () => ingredientsApi.movements({ ...range, type: kind || undefined }), placeholderData: (p) => p });
  const s = search.trim().toLowerCase();
  const rows = (q.data?.rows ?? []).filter((r) => !s || r.ingredient.name.toLowerCase().includes(s) || (r.reason ?? '').toLowerCase().includes(s));
  return (
    <View style={{ gap: th.space(3) }}>
      <ChipGroup value={kind} onChange={setKind} style={{ marginHorizontal: -th.space(4) }} options={KIND_FILTER.map((k) => ({ value: k.value, label: t(k.label) }))} />
      {!q.data ? <Skeleton height={140} /> : !rows.length ? <EmptyState icon={Wheat} title={t('Is period me koi record nahi')} /> : (
        <Card flush>
          {rows.slice(0, 200).map((r, i) => (
            <ListRow key={r.id} dense divider={i < Math.min(rows.length, 200) - 1} title={r.ingredient.name} subtitle={`${t(kindOf(r.transactionType).label)} · ${r.reason || r.notes || ''} · ${formatDateTime(r.createdAt)}`}
              trailing={<View style={{ alignItems: 'flex-end' }}><Text weight="semibold" ltr>{`${fmtQty(r.quantity)} ${r.unit}`}</Text>{r.cost != null && <Text size="2xs" tone="muted" ltr>{cost(r.cost)}</Text>}</View>} />
          ))}
        </Card>
      )}
    </View>
  );
}

export function RawAnalytics({ period }: { period: Period }) {
  const th = useTheme();
  const { cost, costHidden } = useCostMask();
  const range = period.from === 'all' ? { to: period.to } : period;
  const q = useQuery({ queryKey: [RAW_KEY, 'movements', range, ''], queryFn: () => ingredientsApi.movements(range), placeholderData: (p) => p });
  const d = q.data;
  if (!d) return <Skeleton height={180} />;
  const money = (n?: number) => (costHidden || n == null ? '••••' : cost(n));
  return (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={ArrowDownToLine} tone="success" label={t('Maal aaya')} value={money(d.totals.PURCHASE?.cost)} hint={t('{{count}} dafa', { count: d.totals.PURCHASE?.count ?? 0 })} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Wheat} tone="warning" label={t('Banane me laga')} value={money(d.totals.CONSUMPTION?.cost)} hint={t('{{count}} dafa', { count: d.totals.CONSUMPTION?.count ?? 0 })} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Trash2} tone="danger" label={t('Waste')} value={money(d.totals.WASTE?.cost)} hint={t('{{count}} dafa', { count: d.totals.WASTE?.count ?? 0 })} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Scale} tone="accent" label={t('Ginti ka farq')} value={money(d.totals.ADJUSTMENT?.cost)} hint={t('{{count}} dafa', { count: d.totals.ADJUSTMENT?.count ?? 0 })} />
      </Row>
      {d.byIngredient.length > 0 && (
        <Card title={t('Kis saamaan par sab se zyada kharcha')}>
          <HBarList rows={d.byIngredient.slice(0, 10).map((b) => ({ key: b.id, label: b.name, value: b.cost ?? b.used, display: <Text size="xs" tone="muted" ltr>{`${fmtQty(b.used)} ${b.unit}${b.wasted ? ` · ${t('Waste')} ${fmtQty(b.wasted)}` : ''}`}</Text> }))} />
        </Card>
      )}
    </View>
  );
}

