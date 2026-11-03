/**
 * Recipe editor used by the dish editor and the recipes screen (web
 * RecipeLinesEditor): pick raw material, write each line in a unit that fits
 * its stock unit, add wastage on top, set how many plates the batch makes,
 * how much of the recipe each size uses, and see plate cost and food cost
 * live. Draft helpers turn an API recipe into a draft and back.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers, Percent, Plus, Trash2, Wheat } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  cookUnit, emptyRecipe, foodCostPct, grossQty, lineStockQty, platesFromStock, recipeProblem, recipeTotals, sizeKey, unitChoices,
  type RecipeDraft, type RecipeLineDraft,
} from '@nafaa/core/restaurant';
import { apiErrorMessage } from '@/core/api/errors';
import { formatPKR } from '@/core/format';
import { msg, t } from '@/core/i18n';
import {
  Amount, Button, Card, Checkbox, Chip, ChipGroup, EmptyState, IconButton, Input, ListRow, Row, SearchBar, Segmented, Select, Sheet, Skeleton, Text,
  TextArea, toast, useDebouncedValue, useTheme,
} from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { catalogApi } from '@/modules/inventory/api/catalog';
import { productsApi } from '@/modules/inventory/api/products';
import type { Recipe, RecipeInput } from '../api';
import { fmt, foodTone, unitLabel } from '../meta';

export type { RecipeDraft, RecipeLineDraft };
export { emptyRecipe, recipeTotals };

export function recipeFromApi(r: Recipe | null | undefined): RecipeDraft {
  if (!r) return emptyRecipe();
  return {
    yieldQuantity: Number(r.yieldQuantity) || 1,
    preparationSteps: r.preparationSteps ?? '',
    cookingTime: r.cookingTime ?? null,
    sizeFactors: Object.fromEntries((r.sizeFactors ?? []).filter((f) => f.variant?.name).map((f) => [sizeKey(f.variant!.name), Number(f.factor) || 1])),
    lines: [...r.ingredients].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)).map((i) => ({
      ingredientProductId: i.ingredientProductId,
      name: i.ingredient?.name ?? t('Saamaan'),
      stockUnit: i.ingredient?.unit ?? i.unit,
      rate: Number(i.ingredient?.costPrice) || Number(i.costPerUnit) || 0,
      stock: i.ingredient?.stock != null ? Number(i.ingredient.stock) : null,
      quantity: Number(i.quantity) || 0,
      unit: i.unit,
      wastagePercent: Number(i.wastagePercent) || 0,
      isOptional: !!i.isOptional,
      notes: i.notes ?? '',
    })),
  };
}

/** The API payload; with `sizes` (the dish's saved sizes) the size factors replace the saved ones. */
export function recipeInput(menuItemId: string, d: RecipeDraft, sizes?: Array<{ id: string; name: string }>): RecipeInput {
  return {
    ...(sizes && { sizeFactors: sizes.filter((s) => d.sizeFactors[sizeKey(s.name)] > 0).map((s) => ({ variantId: s.id, factor: d.sizeFactors[sizeKey(s.name)] })) }),
    menuItemId,
    yieldQuantity: d.yieldQuantity || 1,
    yieldUnit: 'portion',
    preparationSteps: d.preparationSteps.trim() || undefined,
    cookingTime: d.cookingTime ?? undefined,
    ingredients: d.lines.map((l, i) => ({
      ingredientProductId: l.ingredientProductId, quantity: l.quantity, unit: l.unit, wastagePercent: l.wastagePercent || 0, costPerUnit: l.rate,
      isOptional: l.isOptional, notes: l.notes.trim() || undefined, displayOrder: i,
    })),
  };
}

/** The first problem in words, or null. */
export function recipeProblemText(d: RecipeDraft): string | null {
  const p = recipeProblem(d);
  if (!p) return null;
  if (p.code === 'quantity') return t('{{name}}: quantity likhein', { name: p.name });
  if (p.code === 'wastage') return t('{{name}}: wastage 0 se 100% ke beech', { name: p.name });
  return t('Kitni plate banti hain — 0 se zyada likhein');
}

export interface RawPick { id: string; name: string; unit: string; costPrice: number; stock: number }

/** Search for raw material (or anything) to put in a recipe or on an add-on. */
export function IngredientSheet({ open, onClose, onPick, exclude = [], allowAll = true }: {
  open: boolean; onClose: () => void; onPick: (p: RawPick) => void; exclude?: string[]; allowAll?: boolean;
}) {
  const th = useTheme();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const [adding, setAdding] = useState(false);
  const term = useDebouncedValue(q.trim(), 250);
  const search = useQuery({
    queryKey: ['restaurant-ingredient-search', term, all],
    queryFn: () => catalogApi.list({ search: term || undefined, stock: 'all', active: 'active', sort: 'name', kindOf: all ? undefined : 'raw' }, 1, 40),
    enabled: open,
    staleTime: 30_000,
  });
  const options = (search.data?.items ?? []).filter((i) => !exclude.includes(i.id));
  return (
    <Sheet open={open} onClose={onClose} title={t('Raw material search')} height={0.85}>
      <View style={{ gap: th.space(3) }}>
        <SearchBar value={q} onChangeText={setQ} placeholder={t('Chicken, chawal, oil, tamatar…')} />
        <Row gap={2} wrap>
          {allowAll && <Chip label={all ? t('Sab maal') : t('Sirf raw material')} selected={all} onPress={() => setAll((v) => !v)} />}
          <Chip icon={Plus} label={t('Naya raw material')} selected={adding} onPress={() => setAdding((v) => !v)} />
        </Row>
        {adding && <QuickRawMaterial initialName={q.trim()} onDone={(p) => { setAdding(false); if (p) { void qc.invalidateQueries({ queryKey: ['restaurant-ingredient-search'] }); onPick(p); } }} />}
        {search.isLoading ? <Skeleton height={160} /> : !options.length ? (
          <Text size="sm" tone="muted">{term ? t('"{{term}}" nahi mila — "Naya raw material" se banayein', { term }) : t('Koi raw material nahi. Pehle chicken, chawal, oil jaisi cheezein "Raw material" bana kar daalein.')}</Text>
        ) : (
          <Card flush>
            {options.map((i, n) => (
              <ListRow key={i.id} divider={n < options.length - 1} icon={Wheat} iconTone="warning" title={i.name}
                subtitle={`${i.costPrice > 0 ? `${formatPKR(i.costPrice)}/${unitLabel(i.unit)}` : t('cost nahi')} · ${t('Stock')} ${fmt(i.stock)} ${unitLabel(i.unit)}`}
                trailing={<IconButton icon={Plus} label={t('Jorein')} size="sm" variant="soft" onPress={() => onPick({ id: i.id, name: i.name, unit: i.unit, costPrice: i.costPrice, stock: i.stock })} />}
                onPress={() => onPick({ id: i.id, name: i.name, unit: i.unit, costPrice: i.costPrice, stock: i.stock })} />
            ))}
          </Card>
        )}
      </View>
    </Sheet>
  );
}

const RAW_UNITS = [
  { value: 'kg', label: msg('Kilo') }, { value: 'gram', label: msg('Gram') }, { value: 'liter', label: msg('Litre') },
  { value: 'ml', label: msg('ML') }, { value: 'pcs', label: msg('Adad (pcs)') }, { value: 'dozen', label: msg('Darjan') },
];

/** Adds a raw material (name, stock unit, cost) without leaving the recipe. Needs the server. */
function QuickRawMaterial({ initialName, onDone }: { initialName: string; onDone: (p: RawPick | null) => void }) {
  const th = useTheme();
  const [name, setName] = useState(initialName);
  const [unit, setUnit] = useState('kg');
  const [rate, setRate] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const p = await productsApi.create({ name: name.trim(), unit, price: 0, costPrice: rate ?? 0, stock: 0, isRawMaterial: true });
      toast.success(t('{{name}} raw material me jur gaya — stock purchase se aayega', { name: p.name }));
      onDone({ id: p.id, name: p.name, unit: p.unit, costPrice: Number(p.costPrice) || 0, stock: 0 });
    } catch (e) {
      toast.error(apiErrorMessage(e, t('Raw material nahi bana')));
    } finally { setBusy(false); }
  };
  return (
    <Card tone="warning">
      <View style={{ gap: th.space(2) }}>
        <Input label={t('Naam')} value={name} onChangeText={setName} placeholder={t('Maslan: Chicken boneless')} error={!name.trim() ? t('Naam likhein') : undefined} />
        <Select label={t('Stock kis me')} value={unit} onChange={setUnit} options={RAW_UNITS.map((u) => ({ value: u.value, label: t(u.label) }))} />
        <NumberInput label={t('Cost fi {{unit}}', { unit: unitLabel(unit) })} value={rate} onChangeValue={setRate} prefix="Rs" />
        <Row gap={2}>
          <Button variant="secondary" style={{ flex: 1 }} onPress={() => onDone(null)}>{t('Band')}</Button>
          <Button style={{ flex: 1 }} loading={busy} disabled={!name.trim()} onPress={() => void save()}>{t('Jorein')}</Button>
        </Row>
      </View>
    </Card>
  );
}

export function RecipeEditor({ value, onChange, price, dishProductId, sizes = [], readOnly }: {
  value: RecipeDraft;
  onChange: (d: RecipeDraft) => void;
  /** Menu price of one plate, for food cost %. */
  price?: number;
  /** The dish itself, kept out of the ingredient search. */
  dishProductId?: string;
  sizes?: Array<{ name: string; price: number }>;
  readOnly?: boolean;
}) {
  const th = useTheme();
  const [picking, setPicking] = useState(false);
  const [wasteAt, setWasteAt] = useState<number | null>(null);
  const setLines = (lines: RecipeLineDraft[]) => onChange({ ...value, lines });
  const patch = (i: number, p: Partial<RecipeLineDraft>) => setLines(value.lines.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const totals = recipeTotals(value);
  const pct = foodCostPct(totals.perPlate, price ?? 0);
  const exclude = useMemo(() => [...value.lines.map((l) => l.ingredientProductId), ...(dishProductId ? [dishProductId] : [])], [value.lines, dishProductId]);

  const add = (item: RawPick) => {
    setLines([...value.lines, {
      ingredientProductId: item.id, name: item.name, stockUnit: item.unit, rate: Number(item.costPrice) || 0, stock: Number(item.stock),
      quantity: 0, unit: cookUnit(item.unit), wastagePercent: 0, isOptional: false, notes: '',
    }]);
    setPicking(false);
  };

  return (
    <View style={{ gap: th.space(3) }}>
      {!readOnly && <Button variant="secondary" icon={Plus} onPress={() => setPicking(true)}>{t('Saamaan jorein')}</Button>}
      {value.lines.length === 0 ? (
        <EmptyState icon={Wheat} title={t('Abhi recipe khali hai')} message={t('Upar se saamaan chunein. Dish bikne par yahi saamaan stock se nikalta hai aur cost isi se banti hai.')} />
      ) : value.lines.map((l, i) => {
        const units = unitChoices(l.stockUnit);
        const fits = units.includes(l.unit);
        const cost = lineStockQty(l) * l.rate;
        const plates = platesFromStock(l, value.yieldQuantity);
        return (
          <Card key={l.ingredientProductId} tone={l.quantity > 0 && fits ? 'default' : 'danger'}>
            <View style={{ gap: th.space(2) }}>
              <Row gap={2} align="start">
                <View style={{ flex: 1 }}>
                  <Text weight="semibold" numberOfLines={1}>{l.name}</Text>
                  <Text size="xs" tone="muted">
                    {l.rate > 0 ? t('{{rate}} fi {{stockUnit}}', { rate: formatPKR(l.rate), stockUnit: unitLabel(l.stockUnit) }) : t('Cost nahi — purchase se aayegi')}
                    {l.stock != null ? ` ${t('· stock {{stock}} {{stockUnit}}{{value}}', { stock: fmt(l.stock), stockUnit: unitLabel(l.stockUnit), value: plates !== null && !l.isOptional ? t(' · {{plates}} plate', { plates }) : '' })}` : ''}
                  </Text>
                </View>
                {l.isOptional ? <Text tone="muted">—</Text> : <Amount value={cost} weight="semibold" />}
                {!readOnly && <IconButton icon={Trash2} label={t('Hatayein')} size="sm" variant="ghost" onPress={() => setLines(value.lines.filter((_, j) => j !== i))} />}
              </Row>
              <Row gap={2} align="end">
                <NumberInput containerStyle={{ flex: 1 }} label={t('Kitna')} value={l.quantity || null} onChangeValue={(v) => patch(i, { quantity: v ?? 0 })} disabled={readOnly} size="md" />
                <View style={{ flex: 1.3 }}>
                  <Segmented size="sm" value={fits ? l.unit : units[0]} onChange={(u) => patch(i, { unit: u })} options={units.map((u) => ({ value: u, label: unitLabel(u) }))} />
                </View>
                {!readOnly && <IconButton icon={Percent} label={t('Wastage')} size="md" variant={wasteAt === i || l.wastagePercent > 0 ? 'soft' : 'ghost'} onPress={() => setWasteAt(wasteAt === i ? null : i)} />}
              </Row>
              {!fits && <Text size="xs" weight="medium" tone="danger">{t('Stock {{stockUnit}} me hai — {{value}} chunein', { stockUnit: unitLabel(l.stockUnit), value: units.map(unitLabel).join(' ya ') })}</Text>}
              {wasteAt === i && (
                <View style={{ gap: th.space(1.5), padding: th.space(2), borderRadius: th.radius('lg'), backgroundColor: th.colors.warning.soft }}>
                  <Row gap={1.5} wrap>{[0, 5, 10, 15, 20].map((p) => <Chip key={p} label={`${p}%`} selected={l.wastagePercent === p} onPress={() => patch(i, { wastagePercent: p })} />)}</Row>
                  <NumberInput label={t('Wastage %')} value={l.wastagePercent || null} onChangeValue={(v) => patch(i, { wastagePercent: Math.min(v ?? 0, 100) })} size="md" />
                  <Text size="xs" color={th.colors.warning.text}>{t('Saaf karne ya pakane me jo zaya hota hai (chhilka, haddi, tel). Quantity saaf maal ki likhein, wastage upar se katega.')}</Text>
                </View>
              )}
              {wasteAt !== i && l.wastagePercent > 0 && l.quantity > 0 && (
                <Text size="xs" color={th.colors.warning.text}>{t('{{wastagePercent}}% wastage — stock se {{fmtQty}} {{unit}} nikalta hai', { wastagePercent: fmt(l.wastagePercent), fmtQty: fmt(grossQty(l)), unit: unitLabel(l.unit) })}</Text>
              )}
              <Checkbox value={l.isOptional} onChange={(v) => patch(i, { isOptional: v })} disabled={readOnly} label={t('Marzi ka (grahak maange to) — stock aur cost me nahi ginta')} />
              {(!readOnly || l.notes) && <Input size="md" value={l.notes} onChangeText={(v) => patch(i, { notes: v.slice(0, 200) })} placeholder={t('Note (marzi hai)')} disabled={readOnly} />}
            </View>
          </Card>
        );
      })}

      {value.lines.length > 0 && (
        <Card tone="muted">
          <View style={{ gap: th.space(2) }}>
            <NumberInput label={t('Is saamaan se kitni plate banti hain')} value={value.yieldQuantity || null} onChangeValue={(v) => onChange({ ...value, yieldQuantity: v ?? 0 })} disabled={readOnly}
              hint={t('Degh ki recipe ho to poori degh ka saamaan likhein aur yahan plate ginein (maslan 40)')} />
            <Row gap={2}>
              <Fact label={t('Poora saamaan')} value={<Amount value={totals.batch} weight="bold" />} />
              <Fact label={t('Ek plate ki cost')} value={<Amount value={totals.perPlate} weight="bold" size="lg" />} />
              <Fact label={t('Food cost')} value={<Text weight="bold" ltr tone={pct === null ? 'muted' : undefined} color={pct === null ? undefined : th.colors[foodTone(pct)].text}>{pct === null ? '—' : `${pct.toFixed(1)}%`}</Text>}
                hint={pct === null ? t('Rate likhein') : t('Profit {{formatPKR}}', { formatPKR: formatPKR((price ?? 0) - totals.perPlate) })} />
            </Row>
          </View>
        </Card>
      )}

      {value.lines.length > 0 && sizes.length > 0 && (
        <SizeFactors sizes={sizes} perPlate={totals.perPlate} value={value.sizeFactors} readOnly={readOnly} onChange={(sizeFactors) => onChange({ ...value, sizeFactors })} />
      )}
      {value.lines.some((l) => !(l.rate > 0) && !l.isOptional) && (
        <Card tone="warning"><Text size="sm">{t('Kuch saamaan ki cost nahi likhi — plate ki cost kam dikhegi. Purchase karne par cost khud aa jati hai.')}</Text></Card>
      )}
      <IngredientSheet open={picking} onClose={() => setPicking(false)} onPick={add} exclude={exclude} />
    </View>
  );
}

function Fact({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  const th = useTheme();
  return (
    <View style={{ flex: 1, gap: 2, padding: th.space(2), borderRadius: th.radius('lg'), backgroundColor: th.colors.surface, borderWidth: 1, borderColor: th.colors.border }}>
      <Text size="2xs" tone="muted" numberOfLines={1}>{label}</Text>
      {value}
      {hint && <Text size="2xs" tone="muted" numberOfLines={1}>{hint}</Text>}
    </View>
  );
}

/** How much of the recipe one plate of each size uses: Half = 0.5, Full = 1. */
function SizeFactors({ sizes, perPlate, value, onChange, readOnly }: {
  sizes: Array<{ name: string; price: number }>; perPlate: number; value: Record<string, number>; onChange: (v: Record<string, number>) => void; readOnly?: boolean;
}) {
  const th = useTheme();
  const set = (name: string, f: number | null) => {
    const next = { ...value };
    if (f && f > 0) next[sizeKey(name)] = f; else delete next[sizeKey(name)];
    onChange(next);
  };
  return (
    <Card title={<Row gap={1.5}><Layers size={16} color={th.colors.textMuted} /><Text weight="semibold">{t('Har size me kitna saamaan')}</Text></Row>}
      description={t('Upar wali recipe ek poori plate ki hai. Half plate me aadha lagta hai to 0.5 likhein — bikne par utna hi saamaan katega aur size ki cost bhi isi se banegi. Khali = poori recipe.')}>
      <View style={{ gap: th.space(3) }}>
        {sizes.map((sz) => {
          const f = value[sizeKey(sz.name)];
          const cost = Math.round(perPlate * (f || 1) * 100) / 100;
          const pct = foodCostPct(cost, sz.price);
          return (
            <View key={sz.name} style={{ gap: th.space(1.5) }}>
              <Row justify="between"><Text weight="semibold">{sz.name}</Text>
                <Text size="xs" tone="muted">{t('Cost {{cost}}', { cost: formatPKR(cost) })}{pct !== null ? ` ${t('· food cost')} ${pct.toFixed(0)}%` : ''}</Text></Row>
              <ChipGroup value={String(f || 1)} onChange={(v) => !readOnly && set(sz.name, Number(v))} options={['0.25', '0.5', '0.75', '1', '1.5', '2'].map((x) => ({ value: x, label: `${x}×` }))} />
            </View>
          );
        })}
      </View>
    </Card>
  );
}

export function RecipeSteps({ value, onChange, readOnly }: { value: RecipeDraft; onChange: (d: RecipeDraft) => void; readOnly?: boolean }) {
  const th = useTheme();
  if (!value.lines.length) return null;
  return (
    <View style={{ gap: th.space(2) }}>
      <TextArea label={t('Banane ka tareeqa (marzi)')} value={value.preparationSteps} onChangeText={(v) => onChange({ ...value, preparationSteps: v.slice(0, 5000) })} placeholder="1. …" disabled={readOnly} />
      <NumberInput integer label={t('Pakne me (min)')} value={value.cookingTime} onChangeValue={(cookingTime) => onChange({ ...value, cookingTime })} disabled={readOnly} />
    </View>
  );
}

