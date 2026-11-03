/**
 * Multi-units (same as the web page): every product with its packs (dozen,
 * carton, bori). One tap adds a ready pack priced from the loose rate; a pack
 * opens its editor (price, quick discounts, cost, wholesale, barcode with
 * scan or a new in-store code, variant, POS default, on/off). Select products
 * to add one pack to many at once. Analytics shows pack coverage and price
 * problems. Readable offline (last saved); changes need internet.
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BarChart3, Boxes, Check, Layers, PackagePlus, Plus, ScanLine, Square, SquareCheck, Star, Trash2, Wand2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatPKR, formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { onlineNeededText, useCachedNotice } from '@/core/offline';
import {
  Badge, Button, Card, Chip, ChipGroup, EmptyState, IconButton, Input, ListRow, ListTemplate, MoneyInput, PressableScale, Row, SearchBar, Segmented, Select, Sheet,
  SkeletonRows, StatTile, Switch, Text, confirm, toast, useDebouncedValue, useTheme,
} from '@/design';
import { useIndustry } from '@/modules/shell/hooks/useIndustry';
import { Scanner } from '@/core/hardware/scanner';
import { useCategories } from '../../components/Pickers';
import { ProductThumb } from '../../components/ProductThumb';
import { NumberInput } from '../../components/fields';
import { INV, qty, useCostMask, useOnline, useRefreshInventory } from '../../lib/shared';
import { unitsPageApi, type OverviewProduct, type OverviewUnit, type PackType, type UnitsAnalytics, type UnitsFilter } from '../api/units';
import { PRESETS, presetRange, useDayStart, type Preset as RangePreset } from '../lib/range';
import { presetsFor, roundedPackPrice, TYPE_LABEL, TYPE_ORDER } from '../lib/units';

const KEY = [INV, 'units'];

export function ProductUnitsScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const online = useOnline();
  const refreshInv = useRefreshInventory();
  const { costHidden } = useCostMask();
  const { id: industryId } = useIndustry();
  const categories = useCategories();
  const dayStart = useDayStart();
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 300);
  const [filter, setFilter] = useState<UnitsFilter>('all');
  const [categoryId, setCategoryId] = useState('');
  const [tab, setTab] = useState<'list' | 'analytics'>('list');
  const [range, setRange] = useState<RangePreset>('month');
  const [editing, setEditing] = useState<{ product: OverviewProduct; unit: OverviewUnit | null } | null>(null);
  const [selected, setSelected] = useState<Map<string, OverviewProduct>>(new Map());
  const [bulk, setBulk] = useState(false);
  const [scan, setScan] = useState(false);

  const filters = { search: query || undefined, filter, categoryId: categoryId || undefined };
  const listQ = useInfiniteQuery({
    queryKey: [...KEY, 'list', filters],
    queryFn: ({ pageParam }) => unitsPageApi.overview({ ...filters, page: pageParam, limit: 25 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    placeholderData: (p) => p,
  });
  const cached = useCachedNotice(listQ);
  const first = listQ.data?.pages[0];
  const items = useMemo(() => listQ.data?.pages.flatMap((p) => p.items) ?? [], [listQ.data]);
  const tt = first?.totals;
  const period = presetRange(range, dayStart);
  const analyticsQ = useQuery({ queryKey: [...KEY, 'analytics', period.from, period.to], queryFn: () => unitsPageApi.analytics(period), enabled: tab === 'analytics' });

  const invalidate = () => { void qc.invalidateQueries({ queryKey: KEY }); void refreshInv(); };
  const guard = () => { if (online) return true; toast.warning(onlineNeededText('settings')); return false; };
  const quickAdd = useMutation({
    // Price and cost are left out, so the server sets loose rate × quantity.
    mutationFn: ({ product, name, rate, type }: { product: OverviewProduct; name: string; rate: number; type: PackType }) =>
      unitsPageApi.create({ productId: product.id, unitName: name, unitLabel: `${name} (${qty(rate)} ${product.unit})`, conversionType: type, conversionRate: rate }),
    onSuccess: (u) => { invalidate(); toast.success(t('{{unitName}} jur gaya — qeemat {{price}}', { unitName: u.unitName, price: formatPKR(u.price) })); },
  });
  const defaultM = useMutation({
    mutationFn: (u: OverviewUnit) => unitsPageApi.update(u.id, { isDefault: !u.isDefault }),
    onSuccess: (u) => { invalidate(); toast.success(u.isDefault ? t('POS par ab pehle {{unitName}}', { unitName: u.unitName }) : t('POS par asal unit pehle')); },
  });
  const remove = async (product: OverviewProduct, u: OverviewUnit) => {
    if (!guard()) return;
    const ok = await confirm({
      title: t('{{unitName}} mitayein?', { unitName: u.unitName }), tone: 'danger', confirmLabel: t('Mita dein'),
      message: `${t('{{name}} ka ye pack POS, purchase aur labels se hat jayega. Purane bills par asar nahi.', { name: product.name })}\n\n${t('Kuch der ke liye rokna ho to mitane ki bajaye pack ko band kar dein.')}`,
    });
    if (!ok) return;
    await unitsPageApi.remove(u.id);
    invalidate();
    toast.success(t('Pack mita diya'));
  };
  const toggleSel = (p: OverviewProduct) => setSelected((m) => { const n = new Map(m); if (n.has(p.id)) n.delete(p.id); else n.set(p.id, p); return n; });
  const FILTERS: Array<{ value: UnitsFilter; label: string; count?: number }> = [
    { value: 'all', label: t('Sab products'), count: tt?.products },
    { value: 'with', label: t('Pack wale'), count: tt?.withPacks },
    { value: 'without', label: t('Bina pack'), count: tt ? Math.max(0, tt.products - tt.withPacks) : undefined },
    { value: 'noBarcode', label: t('Barcode nahi'), count: tt?.noBarcode },
    { value: 'priceIssue', label: t('Qeemat ke masle'), count: tt?.priceIssues },
  ];

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'list', label: t('Products'), icon: Layers }, { value: 'analytics', label: t('Analytics'), icon: BarChart3 }]} />
      {tt && (
        <Row gap={2}>
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Layers} tone="success" label={t('Pack wale products')} value={<Text size="xl" weight="bold">{tt.withPacks}</Text>} hint={`${Math.round(tt.coverage)}%`} />
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Boxes} label={t('Kul packs')} value={<Text size="xl" weight="bold">{tt.packs}</Text>} hint={tt.priceIssues ? `${t('Qeemat ke masle')}: ${tt.priceIssues}` : undefined} />
        </Row>
      )}
      {tab === 'list' ? (
        <>
          <Row gap={2}>
            <SearchBar value={search} onChangeText={setSearch} placeholder={t('Product ka naam, SKU ya barcode (pack ka bhi)…')} style={{ flex: 1 }} />
            <IconButton icon={ScanLine} label={t('Scan')} variant="soft" size="lg" onPress={() => setScan(true)} />
          </Row>
          <ChipGroup options={FILTERS} value={filter} onChange={setFilter} style={{ marginHorizontal: -th.space(4) }} />
          {(categories.data?.length ?? 0) > 0 && (
            <Select label={t('Category')} value={categoryId} onChange={setCategoryId} searchable
              options={[{ value: '', label: t('Sab categories') }, ...(categories.data ?? []).filter((c) => c.isActive !== false).map((c) => ({ value: c.id, label: c.name }))]} />
          )}
          <Row gap={2} wrap>
            <Button size="sm" variant="secondary" icon={items.length && items.every((p) => selected.has(p.id)) ? SquareCheck : Square}
              onPress={() => setSelected(items.every((p) => selected.has(p.id)) ? new Map() : new Map(items.map((p) => [p.id, p])))}>{t('Is safhe ke sab')}</Button>
            <Button size="sm" icon={Boxes} onPress={() => { if (!selected.size) { toast.info(t('Pehle products ke aage nishan lagayein, phir "Kai products me pack"')); return; } if (guard()) setBulk(true); }}>
              {selected.size ? t('{{size}} chune', { size: selected.size }) + ' · ' + t('Sab me pack jorein') : t('Kai products me pack')}
            </Button>
            {selected.size > 0 && <Button size="sm" variant="ghost" onPress={() => setSelected(new Map())}>{t('saaf')}</Button>}
          </Row>
          {cached.fromCache && cached.updatedAt && <Text size="xs" tone="muted">{t('Last updated {{time}}', { time: formatRelative(cached.updatedAt) })}</Text>}
        </>
      ) : (
        <>
          <ChipGroup options={PRESETS.map((p) => ({ value: p.value, label: t(p.label) }))} value={range} onChange={setRange} style={{ marginHorizontal: -th.space(4) }} />
          <UnitsAnalyticsView data={analyticsQ.data} loading={analyticsQ.isLoading} costHidden={costHidden} />
        </>
      )}
    </View>
  );

  return (
    <>
      <ListTemplate
        title={t('Multi-units')}
        subtitle={t('Pack · dozen · carton')}
        summary={header}
        grouped={false}
        data={tab === 'list' ? items : []}
        loading={tab === 'list' && listQ.isLoading}
        error={listQ.data ? undefined : listQ.error}
        onRetry={listQ.refetch}
        refreshing={listQ.isRefetching}
        onRefresh={listQ.refetch}
        onEndReached={() => { if (listQ.hasNextPage && !listQ.isFetchingNextPage) void listQ.fetchNextPage(); }}
        footer={listQ.isFetchingNextPage ? <View style={{ padding: 16 }}><SkeletonRows count={2} /></View> : undefined}
        keyExtractor={(p) => p.id}
        renderItem={({ item: p }) => (
          <ProductUnitsCard p={p} industryId={industryId} costHidden={costHidden} selected={selected.has(p.id)} busy={quickAdd.isPending || defaultM.isPending}
            onSelect={() => toggleSel(p)}
            onQuickAdd={(name, rate, type) => { if (guard()) quickAdd.mutate({ product: p, name, rate, type }); }}
            onEdit={(u) => { if (guard()) setEditing({ product: p, unit: u }); }}
            onDefault={(u) => { if (guard()) defaultM.mutate(u); }}
            onDelete={(u) => void remove(p, u)} />
        )}
        empty={tab === 'list' ? (
          <EmptyState icon={Layers} title={filter !== 'all' || query || categoryId ? t('Is filter me koi product nahi') : t('Abhi koi product nahi')}
            message={t('Pehle products banayein, phir yahan un ke pack (dozen, carton, bori) jorein.')} />
        ) : <View />}
      />
      {editing && <UnitEditorSheet product={editing.product} unit={editing.unit} industryId={industryId} costHidden={costHidden} onDone={() => { setEditing(null); invalidate(); }} />}
      {bulk && <BulkAddSheet products={[...selected.values()]} onClose={() => setBulk(false)} onDone={() => { setBulk(false); setSelected(new Map()); invalidate(); }} />}
      {scan && <Scanner title={t('Product ya pack scan')} onClose={() => setScan(false)} onCode={(c) => { setTab('list'); setFilter('all'); setSearch(c.trim()); }} />}
    </>
  );
}

function ProductUnitsCard({ p, industryId, costHidden, selected, busy, onSelect, onQuickAdd, onEdit, onDefault, onDelete }: {
  p: OverviewProduct; industryId: string | null; costHidden: boolean; selected: boolean; busy: boolean; onSelect: () => void;
  onQuickAdd: (name: string, rate: number, type: PackType) => void; onEdit: (u: OverviewUnit | null) => void; onDefault: (u: OverviewUnit) => void; onDelete: (u: OverviewUnit) => void;
}) {
  const th = useTheme();
  const have = new Set(p.units.map((u) => u.unitName.toLowerCase()));
  const quick = presetsFor(p.unit, industryId).filter((x) => !have.has(x.name.toLowerCase()));
  return (
    <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2) }}>
      <Card style={selected ? { borderWidth: 2, borderColor: th.colors.brand.solid } : undefined}>
        <View style={{ gap: th.space(2) }}>
          <Row gap={2}>
            <PressableScale onPress={onSelect} accessibilityLabel={t('Chunein')} accessibilityState={{ selected }} hitSlop={6}>
              {selected ? <SquareCheck size={22} color={th.colors.brand.solid} /> : <Square size={22} color={th.colors.textMuted} />}
            </PressableScale>
            <ProductThumb name={p.name} category={p.category?.name} url={p.image} size={40} />
            <View style={{ flex: 1 }}>
              <Text weight="semibold" numberOfLines={1}>{p.name}</Text>
              <Text size="xs" tone="muted" numberOfLines={1}>{`${formatPKR(p.price)} / ${p.unit} · ${t('Stock')} ${qty(p.stock)} ${p.unit}${p.category ? ` · ${p.category.name}` : ''}`}</Text>
            </View>
            <Button size="sm" variant="secondary" icon={Plus} onPress={() => onEdit(null)}>{t('Pack')}</Button>
          </Row>
          {quick.length > 0 && (
            <Row gap={1.5} wrap>
              {quick.map((x) => <Chip key={x.name} icon={Plus} label={`${x.name} · ${qty(x.rate)} ${p.unit}`} disabled={busy || !(p.price > 0)} onPress={() => onQuickAdd(x.name, x.rate, x.type)} />)}
            </Row>
          )}
          {p.units.map((u) => (
            <PressableScale key={u.id} onPress={() => onEdit(u)} style={{ borderRadius: th.radius('lg'), backgroundColor: u.isBase ? th.colors.brand.soft : th.colors.surfaceMuted, padding: th.space(2.5), gap: 4, opacity: u.isActive ? 1 : 0.6 }}>
              <Row gap={2}>
                <View style={{ flex: 1 }}>
                  <Text size="sm" weight="semibold">{u.unitName}{u.variantName ? ` · ${u.variantName}` : ''} <Text size="xs" tone="muted">{u.isBase ? t('asal unit') : `= ${qty(u.conversionRate)} ${p.unit}`}</Text></Text>
                </View>
                <Text size="sm" weight="bold" ltr>{formatPKR(u.price)}</Text>
                <IconButton icon={Star} label={t('POS par pehle')} size="sm" color={u.isDefault ? th.colors.warning.solid : th.colors.textSubtle} onPress={() => onDefault(u)} />
                {!u.isBase && <IconButton icon={Trash2} label={t('Mitayein')} size="sm" onPress={() => onDelete(u)} />}
              </Row>
              <Row gap={1.5} wrap>
                {!u.isBase && u.saving > 0.5 && <Badge tone="success">{t('{{saving}} bachat', { saving: formatPKR(u.saving) })}</Badge>}
                {u.dearer && <Badge tone="warning">{t('khule se mehnga')}</Badge>}
                {u.loss && !costHidden && <Badge tone="danger">{t('cost se kam')}</Badge>}
                {!u.isActive && <Badge>{t('band')}</Badge>}
                {!u.isBase && <Text size="2xs" tone="muted">{t('stock {{inStock}}', { inStock: qty(u.inStock) })}</Text>}
                {u.barcode ? <Text size="2xs" tone="muted" ltr>{u.barcode}</Text> : !u.isBase && <Text size="2xs" tone="warning">{t('barcode nahi')}</Text>}
              </Row>
            </PressableScale>
          ))}
        </View>
      </Card>
    </View>
  );
}

function UnitEditorSheet({ product, unit, industryId, costHidden, onDone }: { product: OverviewProduct; unit: OverviewUnit | null; industryId: string | null; costHidden: boolean; onDone: () => void }) {
  const th = useTheme();
  const isBase = !!unit?.isBase;
  const [name, setName] = useState(unit?.unitName ?? '');
  const [type, setType] = useState<PackType>(unit?.conversionType ?? 'PACK');
  const [rate, setRate] = useState<number | null>(unit ? Number(unit.conversionRate) : null);
  const [price, setPrice] = useState<number | null>(unit ? Number(unit.price) : null);
  const [cost, setCost] = useState<number | null>(unit?.costPrice ? Number(unit.costPrice) : null);
  const [wholesale, setWholesale] = useState<number | null>(unit?.wholesalePrice ? Number(unit.wholesalePrice) : null);
  const [barcode, setBarcode] = useState(unit?.barcode ?? '');
  const [variantId, setVariantId] = useState(unit?.variantId ?? '');
  const [isDefault, setDefault] = useState(!!unit?.isDefault);
  const [isActive, setActive] = useState(unit?.isActive ?? true);
  const [scan, setScan] = useState(false);
  const variant = product.variants.find((v) => v.id === variantId);
  const basePrice = Number(variant?.price ?? product.price) || 0;
  const baseCost = Number(product.costPrice) || 0;
  const r = Number(rate) || 0;
  const loose = r > 0 ? basePrice * r : 0;
  const p = Number(price) || 0;
  const c = cost != null ? cost : baseCost * r;
  const saving = loose - p;
  const margin = p > 0 ? ((p - c) / p) * 100 : 0;
  const problem = !name.trim() ? t('Pack ka naam likhein') : !isBase && !(r > 0) ? t('Ek pack me kitne — 0 se zyada likhein') : !isBase && r === 1 ? t('Rate 1 matlab asal unit hi — 1 se alag likhein') : null;

  const save = useMutation({
    mutationFn: () => {
      const data = {
        unitName: name.trim(), unitLabel: isBase ? undefined : `${name.trim()} (${qty(r)} ${product.unit})`, conversionType: isBase ? 'BASE' : type,
        conversionRate: isBase ? 1 : r, price: p, costPrice: cost != null ? cost : 0, wholesalePrice: wholesale ?? null, barcode: barcode.trim() || null, isDefault, isActive,
      };
      return unit ? unitsPageApi.update(unit.id, data) : unitsPageApi.create({ ...data, productId: product.id, variantId: variantId || null });
    },
    onSuccess: () => { toast.success(unit ? t('Pack save ho gaya') : t('{{value}} jur gaya', { value: name.trim() })); onDone(); },
  });
  const gen = useMutation({ mutationFn: () => unitsPageApi.generateBarcode(unit!.id), onSuccess: (u) => { setBarcode(u.barcode ?? ''); toast.success(t('Barcode ban gaya')); } });

  return (
    <Sheet open onClose={onDone} title={unit ? t('{{unitName}} badlein', { unitName: unit.unitName }) : t('Naya pack')} description={product.name}
      footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={onDone}>{t('Rehne dein')}</Button>
        <Button style={{ flex: 1 }} loading={save.isPending} disabled={!!problem} onPress={() => save.mutate()}>{unit ? t('Save') : t('Pack jorein')}</Button>
      </Row>}>
      <View style={{ gap: th.space(3) }}>
        {!unit && (
          <Row gap={1.5} wrap>
            {presetsFor(product.unit, industryId).map((ps) => (
              <Chip key={ps.name} label={`${ps.name} · ${qty(ps.rate)} ${product.unit}`} selected={name === ps.name}
                onPress={() => { setName(ps.name); setRate(ps.rate); setType(ps.type); setPrice(roundedPackPrice(basePrice, ps.rate)); }} />
            ))}
          </Row>
        )}
        <Input label={t('Naam *')} value={name} onChangeText={setName} disabled={isBase} hint={t('Jaise counter par bolte hain — carton, dabba, bori')} />
        <NumberInput label={t('Ek me kitne {{unit}} *', { unit: product.unit })} value={isBase ? 1 : rate} disabled={isBase} onChangeValue={setRate}
          hint={isBase ? t('Asal unit hamesha 1 hota hai') : r > 0 ? `1 ${name || 'pack'} = ${qty(r)} ${product.unit}` : t('Misaal: carton me 24')} />
        <MoneyInput label={t('Bechne ki qeemat')} value={price} onChangeValue={setPrice}
          hint={loose > 0 ? t('Khula lene par {{loose}}{{value}}', { loose: formatPKR(loose), value: saving > 0.5 ? t(' — {{saving}} bachat', { saving: formatPKR(saving) }) : '' }) : undefined} />
        {loose > 0 && !isBase && (
          <Row gap={1.5} wrap>
            {[0, 2, 3, 5].map((off) => <Chip key={off} label={off ? t('{{off}}% kam', { off }) : t('Barabar')} onPress={() => setPrice(roundedPackPrice(basePrice, r, off))} />)}
          </Row>
        )}
        {!costHidden && <MoneyInput label={t('Cost')} value={cost} placeholder={String(Math.round(baseCost * r))} onChangeValue={setCost} hint={t('Khali = {{formatPKR}} (cost × quantity)', { formatPKR: formatPKR(baseCost * r) })} />}
        <MoneyInput label={t('Wholesale qeemat')} value={wholesale} onChangeValue={setWholesale} hint={t('Thok wale customer ke liye (ikhtiyari)')} />
        <Input label={t('Barcode')} value={barcode} onChangeText={setBarcode} ltr keyboardType="number-pad" hint={t('Carton par chhapa barcode scan karein — POS par seedha ye pack aata hai')}
          trailing={<Row gap={1}>
            <IconButton icon={ScanLine} label={t('Scan')} size="sm" variant="soft" onPress={() => setScan(true)} />
            {unit && !barcode && <IconButton icon={Wand2} label={t('Naya barcode banayein')} size="sm" variant="soft" disabled={gen.isPending} onPress={() => gen.mutate()} />}
          </Row>} />
        {product.variants.length > 0 && !unit && (
          <Select label={t('Type')} hint={t('Sirf ek type ka pack ho to chunein')} value={variantId} onChange={setVariantId}
            options={[{ value: '', label: t('Sab types') }, ...product.variants.map((v) => ({ value: v.id, label: v.name }))]} />
        )}
        {!isBase && (
          <Select label={t('Type')} hint={t('Reports me chhantne ke liye')} value={type} onChange={(v) => setType(v as PackType)}
            options={TYPE_ORDER.map((x) => ({ value: x, label: t(TYPE_LABEL[x]) }))} />
        )}
        <Switch label={t('POS par pehle ye')} description={t('Product chunte hi yahi pack khulega')} value={isDefault} onChange={setDefault} />
        {!isBase && <Switch label={t('Chalu')} description={t('Band pack POS aur purchase me nahi aata')} value={isActive} onChange={setActive} />}
        {!costHidden && p > 0 && <Text size="sm" weight="semibold" tone={margin < 0 ? 'danger' : 'success'}>{t('Margin {{margin}}% · profit {{formatPKR}}', { margin: Math.round(margin), formatPKR: formatPKR(p - c) })}</Text>}
        {r > 0 && !isBase && <Text size="xs" tone="muted">{t('Stock me {{qtyText}} {{value}}', { qtyText: qty(Math.floor(product.stock / r)), value: name || 'pack' })}</Text>}
        {!isBase && loose > 0 && p > loose + 0.5 && <Card tone="warning"><Text size="sm">{t('Pack khula lene se mehnga hai ({{formatPKR}} vs {{loose}}) — customer khula le lega.', { formatPKR: formatPKR(p), loose: formatPKR(loose) })}</Text></Card>}
        {!costHidden && p > 0 && p < c && <Card tone="danger"><Text size="sm">{t('Qeemat cost se kam hai — har pack par nuqsan.')}</Text></Card>}
      </View>
      {scan && <Scanner title={t('Pack ka barcode')} onClose={() => setScan(false)} onCode={(code) => { setBarcode(code.trim()); }} />}
    </Sheet>
  );
}

const ROUND = [1, 5, 10, 50, 100] as const;

function BulkAddSheet({ products, onClose, onDone }: { products: OverviewProduct[]; onClose: () => void; onDone: () => void }) {
  const th = useTheme();
  const [name, setName] = useState('');
  const [rate, setRate] = useState<number | null>(null);
  const [type, setType] = useState<PackType>('CARTON');
  const [off, setOff] = useState<number | null>(0);
  const [roundTo, setRoundTo] = useState<(typeof ROUND)[number]>(1);
  const [overwrite, setOverwrite] = useState(false);
  const r = Number(rate) || 0;
  const bases = [...new Set(products.map((p) => p.unit))];
  const mixed = bases.length > 1;
  const existing = products.filter((p) => p.units.some((u) => u.unitName.toLowerCase() === name.trim().toLowerCase())).length;
  const run = useMutation({
    mutationFn: () => unitsPageApi.bulkAdd({ productIds: products.map((p) => p.id), unitName: name.trim(), conversionType: type, conversionRate: r, discountPercent: off ?? 0, roundTo, overwrite }),
    onSuccess: (res) => {
      toast.success(t('{{created}} products me {{value}} jur gaya{{value2}}{{value3}}', { created: res.created, value: name.trim(), value2: res.updated ? t(', {{updated}} update', { updated: res.updated }) : '', value3: res.skipped ? t(' · {{skipped}} chhor diye', { skipped: res.skipped }) : '' }));
      onDone();
    },
  });
  const problem = !name.trim() ? t('Pack ka naam likhein') : !(r > 0) || r === 1 ? t('Ek pack me kitne — 1 se alag likhein') : null;
  return (
    <Sheet open onClose={onClose} title={t('{{count}} products me ek pack jorein', { count: products.length })}
      description={t('Misaal: sab cold drinks me carton = 24. Qeemat har product ke khule rate se khud banti hai.')}
      footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={onClose}>{t('Rehne dein')}</Button>
        <Button style={{ flex: 1 }} icon={Layers} loading={run.isPending} disabled={!!problem} onPress={() => run.mutate()}>{t('Sab me jorein')}</Button>
      </Row>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Pack ka naam *')} value={name} onChangeText={setName} maxLength={40} placeholder={t('Carton')} autoFocus
          hint={existing ? t('{{existing}} products me ye pack pehle se hai', { existing }) : t('Har product me isi naam se jurega')} />
        <NumberInput label={t('Ek pack me kitne *')} value={rate} onChangeValue={setRate} hint={mixed ? t('Products ke asal unit alag hain — rate har ek ke apne unit me lagega') : t('{{base}} me', { base: bases[0] ?? '' })} />
        <NumberInput label={t('Khule rate se kitna kam (%)')} value={off} onChangeValue={setOff} hint={t('0 = khule ke barabar. Pack par discount dene ke liye 2–5%')} />
        <Select label={t('Qeemat gol karein')} value={String(roundTo)} onChange={(v) => setRoundTo(Number(v) as (typeof ROUND)[number])} hint={t('Misaal: 1,437 → 1,440 (10 ke hisaab se)')}
          options={ROUND.map((n) => ({ value: String(n), label: n === 1 ? t('Poore rupay') : t('{{n}} ke hisaab se', { n }) }))} />
        <Select label={t('Type')} value={type} onChange={(v) => setType(v as PackType)} hint={t('Sirf reports ke liye')} options={TYPE_ORDER.map((x) => ({ value: x, label: t(TYPE_LABEL[x]) }))} />
        <Switch label={t('Pehle se ho to update karein')} description={t('Rate aur qeemat naye hisaab se badal dein')} value={overwrite} onChange={setOverwrite} />
        <Card title={t('Jhalak (pehle 6)')} flush>
          {products.slice(0, 6).map((p) => (
            <ListRow key={p.id} dense title={p.name} subtitle={r > 0 ? `${name || 'pack'} = ${qty(r)} ${p.unit}` : undefined}
              trailing={r > 0 ? <Text size="sm" weight="semibold" ltr>{formatPKR(roundedPackPrice(p.price, r, off ?? 0, roundTo))}</Text> : undefined} />
          ))}
          {products.length > 6 && <Text size="xs" tone="muted" style={{ padding: 12 }}>{t('aur {{value}}…', { value: products.length - 6 })}</Text>}
        </Card>
      </View>
    </Sheet>
  );
}

function UnitsAnalyticsView({ data: d, loading, costHidden }: { data?: UnitsAnalytics; loading: boolean; costHidden: boolean }) {
  if (loading || !d) return <SkeletonRows count={5} />;
  const tt = d.totals;
  const packShare = tt.purchaseLines ? Math.round((tt.packLines / tt.purchaseLines) * 100) : 0;
  return (
    <View style={{ gap: 12 }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Barcode nahi')} tone={tt.noBarcode ? 'warning' : 'success'} value={<Text size="xl" weight="bold">{tt.noBarcode}</Text>} hint={t('Pack scan nahi ho sakte')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Qeemat ke masle')} tone={tt.priceIssues ? 'danger' : 'success'} value={<Text size="xl" weight="bold">{tt.priceIssues}</Text>} hint={t('Khule se mehnga ya cost se kam')} />
      </Row>
      <Card title={t('Purchase kis unit me')} description={tt.purchaseLines ? t('Is period ki {{purchaseLines}} purchase lines me se {{packShare}}% pack me aayin', { purchaseLines: tt.purchaseLines, packShare }) : t('Is period me koi purchase nahi')} flush>
        {d.bought.map((x) => <ListRow key={x.name} dense title={x.name} subtitle={t('{{lines}} lines · {{qty}} {{name}}', { lines: x.lines, qty: qty(x.qty), name: x.name })} trailing={costHidden ? undefined : <Text size="sm" ltr>{formatPKR(x.value)}</Text>} />)}
      </Card>
      <Card title={t('Pack ki type')} flush>
        {!d.byType.length ? <Text tone="muted" size="sm" style={{ padding: 12 }}>{t('Abhi koi pack nahi')}</Text>
          : d.byType.map((x) => <ListRow key={x.type} dense title={t(TYPE_LABEL[x.type] ?? x.type)} trailing={<Text weight="semibold">{x.count}</Text>} />)}
      </Card>
      <Card title={t('Qeemat check karein')} flush>
        {!d.issues.length ? <Text tone="muted" size="sm" style={{ padding: 12 }}>{t('Sab packs ki qeemat theek hai')}</Text> : d.issues.map((x) => (
          <ListRow key={`${x.productId}${x.unit}`} icon={AlertTriangle} iconTone={x.kind === 'loss' ? 'danger' : 'warning'} dense title={`${x.product} · ${x.unit}`}
            subtitle={x.kind === 'loss' ? t('Cost {{value}} se kam', { value: costHidden ? '••••' : formatPKR(x.cost) }) : t('Khula {{loose}} — pack mehnga', { loose: formatPKR(x.loose) })}
            trailing={<Text size="sm" weight="semibold" ltr>{formatPKR(x.price)}</Text>} />
        ))}
      </Card>
      <Card title={t('Zyada bikte hain, pack nahi')} flush>
        {!d.topWithoutPacks.length ? <Text tone="muted" size="sm" style={{ padding: 12 }}>{t('Top bikne wale sab products ke pack hain')}</Text> : d.topWithoutPacks.map((x) => (
          <ListRow key={x.id} icon={PackagePlus} dense title={x.name} subtitle={t('{{qty}} {{unit}} bika · {{revenue}}', { qty: qty(x.qty), unit: x.unit, revenue: formatPKR(x.revenue) })} />
        ))}
      </Card>
      <Card title={t('Sab se zyada istemal hone wale pack')} flush>
        {!d.byName.length ? <Text tone="muted" size="sm" style={{ padding: 12 }}>{t('Abhi koi pack nahi')}</Text> : d.byName.map((x) => (
          <ListRow key={x.name} icon={Check} dense title={x.name} subtitle={t('{{count}} products · aam {{commonRate}}', { count: x.count, commonRate: qty(x.commonRate) })} />
        ))}
      </Card>
      <Text size="xs" tone="muted">{t('Sale har bill me asal unit me likhi jati hai, is liye "kis pack me bika" ka hisaab nahi banta. Purchase ka hisaab pack ke sath hota hai.')}</Text>
    </View>
  );
}

