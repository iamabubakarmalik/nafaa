/**
 * Bulk edit (same rules and API as the web spreadsheet), adapted for the
 * phone: every product and variant line with its price, cost and stock
 * inline; tap a line for every field (name, category, brand, unit, barcode,
 * tier prices, low-stock alert, status). Filters by branch, category, an
 * earlier import, low stock and missing cost; a tool fills cost as a percent
 * of the sale price. Save shows every change first; a changed stock becomes a
 * stock adjustment ("Bulk edit"). Without internet only price and cost
 * changes are kept, on the phone, and sent later.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { AlertTriangle, Boxes, Percent, RotateCcw, Save } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/core/auth/store';
import { formatPKR } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { enqueuePriceChange, onlineNeededText } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Badge, Button, Card, Checkbox, Chip, EmptyState, Input, ListRow, ListTemplate, Row, Select, Sheet, StatTile, Text, confirm, toast, useDebouncedValue, useTheme,
} from '@/design';
import { BranchSelect } from '../../components/Pickers';
import { NumberInput } from '../../components/fields';
import { useCostMask, useOnline, useRefreshInventory } from '../../lib/shared';
import { bulkEditApi, importApi, type BulkEditChange, type BulkEditRow } from '../api/import';

type Key = 'name' | 'category' | 'brand' | 'price' | 'wholesalePrice' | 'creditPrice' | 'costPrice' | 'unit' | 'barcode' | 'lowStockAlert' | 'isActive' | 'stock';
type Draft = Partial<Record<Key, string>>;
const PRODUCT_ONLY: Key[] = ['name', 'category', 'brand', 'unit', 'isActive'];
const UNITS = ['pcs', 'kg', 'gram', 'liter', 'ml', 'dozen', 'meter', 'packet', 'box', 'carton', 'bottle', 'strip', 'pair', 'bag'];
const LABEL: Record<Key, string> = {
  name: msg('Name'), category: msg('Category'), brand: msg('Brand'), price: msg('Retail Price'), wholesalePrice: msg('Wholesale Price'), creditPrice: msg('Credit Price'),
  costPrice: msg('Cost Price'), unit: msg('Unit'), barcode: msg('Barcode'), lowStockAlert: msg('Low Stock Alert'), isActive: msg('Status'), stock: msg('Stock'),
};
const SAVE_CHUNK = 100;
const STOCK_CHUNK = 200;
const fmt = (n: number) => String(Number(Number(n).toFixed(3)));
const num = (v: string): number | null => { const s = v.replace(/rs\.?|pkr|,|\s|\/-$/gi, ''); return /^-?\d*\.?\d+$/.test(s) ? Number(s) : null; };

const original = (r: BulkEditRow): Draft => ({
  name: r.name, category: r.category, brand: r.brand, price: fmt(r.price),
  wholesalePrice: Number(r.wholesalePrice) > 0 ? fmt(Number(r.wholesalePrice)) : '', creditPrice: Number(r.creditPrice) > 0 ? fmt(Number(r.creditPrice)) : '',
  costPrice: r.costPrice === undefined ? '' : fmt(r.costPrice), unit: r.unit, barcode: r.barcode, lowStockAlert: fmt(r.lowStockAlert), isActive: r.isActive ? 'on' : 'off', stock: fmt(r.stock),
});

function cellError(key: Key, v: string): string | null {
  if (key === 'name' && !v.trim()) return t('Naam khaali nahi ho sakta');
  if (key === 'price' || key === 'costPrice' || key === 'lowStockAlert' || key === 'stock') {
    if (!v.trim()) return key === 'stock' ? t('Stock likhein (0 bhi chalega)') : t('Number likhein');
    const n = num(v);
    if (n === null) return t('"{{v}}" number nahi', { v });
    if (n < 0) return t('Minus nahi ho sakta');
    if (key === 'price' && n === 0) return t('Price 0 nahi ho sakti');
  }
  if ((key === 'wholesalePrice' || key === 'creditPrice') && v.trim()) {
    const n = num(v);
    if (n === null) return t('"{{v}}" number nahi', { v });
    if (n < 0) return t('Minus nahi ho sakta');
  }
  if (key === 'barcode' && /\s/.test(v)) return t('Barcode me khali jagah nahi');
  return null;
}

export function BulkEditScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ nocost?: string; job?: string; jobId?: string; category?: string; low?: string }>();
  const can = usePermission();
  const canStock = can(P.STOCK_ADJUSTMENTS_MANAGE);
  const online = useOnline();
  const refreshInv = useRefreshInventory();
  const { costHidden } = useCostMask();
  const activeShop = useAuthStore((s) => s.currentShopId);
  const [shopId, setShopId] = useState<string | null>(activeShop);
  const [categoryId, setCategoryId] = useState(params.category ?? '');
  const [jobId, setJobId] = useState(params.jobId ?? params.job ?? '');
  const [lowStock, setLowStock] = useState(params.low === '1');
  const [noCost, setNoCost] = useState(params.nocost === '1');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 400);
  const [drafts, setDrafts] = useState<Map<number, Draft>>(new Map());
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [review, setReview] = useState(false);
  const [costTool, setCostTool] = useState(false);
  const [costPct, setCostPct] = useState<number | null>(null);
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);
  const [failures, setFailures] = useState<Map<number, string>>(new Map());

  const sheetQ = useQuery({
    queryKey: ['inv', 'bulk-edit', shopId, categoryId, lowStock, noCost, jobId, query],
    queryFn: () => bulkEditApi.rows({ shopId: shopId ?? undefined, categoryId, lowStock, noCost, jobId, search: query }),
  });
  const jobs = useQuery({ queryKey: ['inv', 'import-jobs'], queryFn: importApi.jobs, staleTime: 60_000 });
  const rows = useMemo(() => sheetQ.data?.rows ?? [], [sheetQ.data]);
  const baseOf = useMemo(() => rows.map(original), [rows]);
  const valueOf = (i: number, k: Key) => drafts.get(i)?.[k] ?? baseOf[i]?.[k] ?? '';
  const setCell = (i: number, k: Key, v: string) => setDrafts((m) => { const n = new Map(m); n.set(i, { ...(n.get(i) ?? {}), [k]: v }); return n; });
  const lockOf = (i: number, k: Key): string | null => {
    const r = rows[i];
    if (!r) return null;
    if (r.variantId && PRODUCT_ONLY.includes(k)) return t('Ye product ki line par badlein (variant ki nahi)');
    if (k === 'stock') {
      if (!canStock) return t('Stock adjustment ki ijazat nahi');
      if (r.stockLock === 'variants') return t('Is product ka stock har variant ki line par hai');
      if (r.stockLock === 'imei') return t('Phone ka stock IMEI se chalta hai — IMEI stock page se badlein');
      if (r.stockLock === 'service') return t('Service ka stock nahi hota');
    }
    if (k === 'costPrice' && costHidden) return t('Cost lock');
    return null;
  };
  const changedKeys = (i: number) => (Object.keys(drafts.get(i) ?? {}) as Key[]).filter((k) => (drafts.get(i)![k] ?? '') !== (baseOf[i]?.[k] ?? ''));
  const changed = rows.map((_, i) => i).filter((i) => changedKeys(i).length > 0);

  const plan = useMemo(() => {
    const byProduct = new Map<string, BulkEditChange>();
    const stock: Array<{ productId: string; variantId?: string; counted: number; label: string; from: number; idx: number }> = [];
    const lines: Array<{ idx: number; label: string; key: Key; from: string; to: string }> = [];
    let errors = 0;
    for (const i of changed) {
      const src = rows[i];
      const label = src.variantId ? `${src.name} (${src.variant})` : src.name;
      const key = `${src.productId}:${src.variantId ?? ''}`;
      for (const k of changedKeys(i)) {
        const to = valueOf(i, k);
        if (cellError(k, to) || lockOf(i, k)) { errors++; continue; }
        lines.push({ idx: i, label, key: k, from: baseOf[i][k] ?? '', to });
        if (k === 'stock') { stock.push({ productId: src.productId, ...(src.variantId ? { variantId: src.variantId } : {}), counted: num(to)!, label, from: src.stock, idx: i }); continue; }
        const ch = byProduct.get(key) ?? { productId: src.productId, ...(src.variantId ? { variantId: src.variantId } : {}) };
        if (k === 'price' || k === 'costPrice' || k === 'lowStockAlert') ch[k] = num(to)!;
        else if (k === 'wholesalePrice' || k === 'creditPrice') ch[k] = to.trim() && Number(num(to)) > 0 ? num(to) : null;
        else if (k === 'isActive') ch.isActive = to === 'on';
        else ch[k] = to.trim();
        byProduct.set(key, ch);
      }
    }
    const products = new Set([...byProduct.values()].map((c) => c.productId).concat(stock.map((s) => s.productId))).size;
    return { changes: [...byProduct.values()], stock, lines, products, errors };
  }, [drafts, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const costTargets = rows.map((_, i) => i).filter((i) => !(Number(num(valueOf(i, 'costPrice'))) > 0) && Number(num(valueOf(i, 'price'))) > 0 && !lockOf(i, 'costPrice'));
  const applyCostPct = () => {
    if (!(costPct && costPct > 0 && costPct <= 100) || !costTargets.length) return;
    for (const i of costTargets) setCell(i, 'costPrice', String(Math.round(((num(valueOf(i, 'price'))! * costPct) / 100) * 100) / 100));
    setCostTool(false);
    toast.success(t('{{count}} lines mein Cost bhar di — "Dekh kar save karein" se save karein', { count: costTargets.length }));
  };

  const save = async () => {
    setReview(false);
    const fail = new Map<number, string>();
    // Offline: only price and cost changes, kept on the phone and sent later.
    if (!online) {
      const priceOnly = plan.changes.filter((c) => !c.variantId && Object.keys(c).every((k) => ['productId', 'price', 'costPrice', 'wholesalePrice', 'creditPrice'].includes(k)));
      if (priceOnly.length < plan.changes.length || plan.stock.length) toast.warning(onlineNeededText('settings'));
      for (const c of priceOnly) {
        await enqueuePriceChange(c.productId, { price: c.price, costPrice: c.costPrice, wholesalePrice: c.wholesalePrice, creditPrice: c.creditPrice }).catch(() => undefined);
      }
      if (priceOnly.length) toast.info(t('Phone par save ho gaya — internet aane par bhej diya jayega'));
      return;
    }
    const total = plan.changes.length + plan.stock.length;
    setSaving({ done: 0, total });
    let done = 0;
    const idOf = (productId: string, variantId?: string | null) => rows.findIndex((r) => r.productId === productId && (r.variantId ?? null) === (variantId ?? null));
    try {
      for (let i = 0; i < plan.changes.length; i += SAVE_CHUNK) {
        const res = await bulkEditApi.save(plan.changes.slice(i, i + SAVE_CHUNK));
        for (const r of res.results) if (!r.ok) { const idx = idOf(r.productId, r.variantId); if (idx >= 0) fail.set(idx, r.error ?? t('Save nahi hua')); }
        done += Math.min(SAVE_CHUNK, plan.changes.length - i);
        setSaving({ done, total });
      }
      if (plan.stock.length && sheetQ.data?.shop) {
        for (let i = 0; i < plan.stock.length; i += STOCK_CHUNK) {
          const part = plan.stock.slice(i, i + STOCK_CHUNK);
          try { await bulkEditApi.setStock(sheetQ.data.shop.id, part.map(({ productId, variantId, counted }) => ({ productId, variantId, counted }))); }
          catch (e) { const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message?.toString() ?? t('Stock nahi badla'); for (const s of part) fail.set(s.idx, m); }
          done += part.length;
          setSaving({ done, total });
        }
      }
    } catch (e) {
      const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message?.toString() ?? t('Internet ya server ka masla');
      toast.error(t('{{msg}} — jo save ho gaya wo save hai, baqi dobara karein', { msg: m }));
    }
    setSaving(null);
    setFailures(fail);
    void refreshInv();
    await sheetQ.refetch();
    setDrafts((m) => new Map([...m].filter(([i]) => fail.has(i))));
    void qc.invalidateQueries({ queryKey: ['inv'] });
    if (fail.size) toast.error(t('{{value}} save hue, {{failed}} nahi — laal lines dekhein', { value: total - fail.size, failed: fail.size }));
    else toast.success(t('{{products}} products save ho gaye{{value}}', { products: plan.products, value: plan.stock.length ? t(' · {{count}} stock adjustments', { count: plan.stock.length }) : '' }));
  };
  const resetAll = async () => {
    if (!changed.length || await confirm({ title: t('Tabdeeliyan save nahi huin'), message: t('{{count}} lines ki tabdeeliyan mit jayengi.', { count: changed.length }), confirmLabel: t('Mita dein'), tone: 'danger' })) setDrafts(new Map());
  };

  const visible = (onlyChanged ? changed : rows.map((_, i) => i));
  const stockUp = plan.stock.reduce((s, x) => s + Math.max(0, x.counted - x.from), 0);
  const stockDown = plan.stock.reduce((s, x) => s + Math.max(0, x.from - x.counted), 0);
  const header = (
    <View style={{ gap: th.space(3) }}>
      {!activeShop && <BranchSelect label={t('Stock kis branch ka')} value={shopId} onChange={setShopId} />}
      <Select label={t('Category')} value={categoryId} onChange={setCategoryId} searchable
        options={[{ value: '', label: t('Sab categories') }, { value: 'none', label: t('Bina category') }, ...(sheetQ.data?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
      {(jobs.data?.length ?? 0) > 0 && (
        <Select label={t('Import')} value={jobId} onChange={setJobId}
          options={[{ value: '', label: t('Sab products') }, ...(jobs.data ?? []).filter((j) => j.jobType === 'PRODUCTS').map((j) => ({ value: j.id, label: `${j.fileName} · ${new Date(j.createdAt).toLocaleDateString('en-PK')}` }))]} />
      )}
      <Row gap={3} wrap>
        <Checkbox label={t('Sirf low stock')} value={lowStock} onChange={setLowStock} />
        {!costHidden && <Checkbox label={t('Sirf jin ki Cost nahi')} value={noCost} onChange={setNoCost} />}
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Badle hue')} tone="warning" value={<Text size="xl" weight="bold">{changed.length}</Text>} onPress={() => setOnlyChanged((v) => !v)} hint={onlyChanged ? t('Sab dikhayein') : undefined} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Boxes} label={t('Stock adjustments')} value={<Text size="xl" weight="bold">{plan.stock.length}</Text>} hint={plan.stock.length ? `+${fmt(stockUp)} / −${fmt(stockDown)}` : undefined} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={AlertTriangle} tone="danger" label={t('Ghalti')} value={<Text size="xl" weight="bold">{plan.errors}</Text>} />
      </Row>
      {!costHidden && (noCost || costTargets.length > 0) && (
        <Card tone={noCost ? 'warning' : 'muted'} title={noCost ? t('In cheezon ki Cost nahi likhi — in ki poori sale Profit gini ja rahi hai') : t('Cost jaldi bharein')}
          action={<Button size="sm" variant="secondary" icon={Percent} disabled={!costTargets.length} onPress={() => setCostTool(true)}>{t('Cost = Sale price ka %')}</Button>} />
      )}
      {!canStock && <Text size="xs" tone="muted">{t('Stock column band hai — Stock adjustment ki ijazat wale user hi stock badal sakte hain.')}</Text>}
      {sheetQ.data?.truncated && <Text size="xs" tone="warning">{t('Pehli 10,000 — filter lagayein')}</Text>}
    </View>
  );

  return (
    <>
      <ListTemplate
        title={t('Bulk edit')}
        subtitle={sheetQ.data?.job ? t('Import: {{fileName}}', { fileName: sheetQ.data.job.fileName }) : sheetQ.data?.shop?.name}
        actions={changed.length ? <Button size="sm" variant="ghost" icon={RotateCcw} onPress={() => void resetAll()}>{t('Sab wapas')}</Button> : undefined}
        search={{ value: search, onChange: setSearch, placeholder: t('Naam, SKU ya barcode') }}
        summary={header}
        data={visible}
        loading={sheetQ.isLoading}
        error={sheetQ.data ? undefined : sheetQ.error}
        onRetry={sheetQ.refetch}
        refreshing={sheetQ.isRefetching}
        onRefresh={sheetQ.refetch}
        keyExtractor={(i) => `${rows[i]?.productId}:${rows[i]?.variantId ?? ''}`}
        renderItem={({ item: i }) => {
          const r = rows[i];
          const keys = changedKeys(i);
          const bad = keys.some((k) => cellError(k, valueOf(i, k)) || lockOf(i, k)) || failures.has(i);
          return (
            <View style={{ padding: th.space(3), gap: th.space(2), backgroundColor: keys.length ? (bad ? th.colors.danger.soft : th.colors.warning.soft) : undefined }}>
              <Row gap={2}>
                <View style={{ flex: 1 }}>
                  <Text weight="semibold" numberOfLines={1}>{r.variantId ? `${r.name} (${r.variant})` : r.name}</Text>
                  <Text size="xs" tone="muted" numberOfLines={1}>{[valueOf(i, 'category'), r.sku, valueOf(i, 'isActive') === 'off' ? t('Band') : null].filter(Boolean).join(' · ')}</Text>
                </View>
                {keys.length > 0 && <Badge tone={bad ? 'danger' : 'warning'}>{bad ? t('Ghalti') : t('Badla')}</Badge>}
                <Button size="sm" variant="ghost" onPress={() => setEditing(i)}>{t('Sab')}</Button>
              </Row>
              <Row gap={2}>
                <Input containerStyle={{ flex: 1 }} label={t('Price')} value={valueOf(i, 'price')} keyboardType="decimal-pad" ltr onChangeText={(v) => setCell(i, 'price', v)} error={cellError('price', valueOf(i, 'price'))} />
                {!costHidden && <Input containerStyle={{ flex: 1 }} label={t('Cost')} value={valueOf(i, 'costPrice')} keyboardType="decimal-pad" ltr onChangeText={(v) => setCell(i, 'costPrice', v)} />}
                <Input containerStyle={{ flex: 1 }} label={t('Stock')} value={valueOf(i, 'stock')} keyboardType="decimal-pad" ltr disabled={!!lockOf(i, 'stock')} onChangeText={(v) => setCell(i, 'stock', v)} />
              </Row>
              {failures.has(i) && <Text size="xs" tone="danger">{failures.get(i)}</Text>}
            </View>
          );
        }}
        empty={<EmptyState icon={Boxes} title={onlyChanged ? t('Abhi kuch nahi badla') : t('Is filter me koi product nahi')} />}
      />
      {plan.products > 0 && (
        <View style={{ position: 'absolute', bottom: th.space(6), start: th.space(4), end: th.space(4) }}>
          <Button size="lg" icon={Save} loading={!!saving} onPress={() => setReview(true)}>
            {saving ? t('Save ho raha hai… {{done}} / {{total}}', { done: saving.done, total: saving.total }) : t('Dekh kar save karein')}
          </Button>
        </View>
      )}

      {editing !== null && rows[editing] && (
        <Sheet open onClose={() => setEditing(null)} title={rows[editing].variantId ? `${rows[editing].name} (${rows[editing].variant})` : rows[editing].name}
          footer={<Button fullWidth onPress={() => setEditing(null)}>{t('Theek hai')}</Button>}>
          <View style={{ gap: th.space(3) }}>
            {(['name', 'price', 'wholesalePrice', 'creditPrice', 'costPrice', 'stock', 'lowStockAlert', 'barcode'] as Key[]).filter((k) => !(k === 'costPrice' && costHidden)).map((k) => {
              const lock = lockOf(editing, k);
              return <Input key={k} label={t(LABEL[k])} value={valueOf(editing, k)} disabled={!!lock} hint={lock ?? (k === 'stock' ? t('Badalne par farq ka Stock adjustment ("Bulk edit") banta hai') : k === 'wholesalePrice' || k === 'creditPrice' ? t('Khaali ho to Retail price lagegi') : undefined)}
                error={cellError(k, valueOf(editing, k))} ltr={k !== 'name'} keyboardType={k === 'name' || k === 'barcode' ? 'default' : 'decimal-pad'} onChangeText={(v) => setCell(editing, k, v)} />;
            })}
            {!rows[editing].variantId && (
              <>
                <Select label={t(LABEL.category)} value={valueOf(editing, 'category')} onChange={(v) => setCell(editing, 'category', v)} searchable
                  options={[{ value: '', label: t('Koi nahi') }, ...(sheetQ.data?.categories ?? []).map((c) => ({ value: c.name, label: c.name }))]} />
                <Select label={t(LABEL.brand)} value={valueOf(editing, 'brand')} onChange={(v) => setCell(editing, 'brand', v)} searchable
                  options={[{ value: '', label: t('Koi nahi') }, ...(sheetQ.data?.brands ?? []).map((b) => ({ value: b, label: b }))]} />
                <Select label={t(LABEL.unit)} value={valueOf(editing, 'unit')} onChange={(v) => setCell(editing, 'unit', v)} options={[...new Set([valueOf(editing, 'unit'), ...UNITS])].filter(Boolean).map((u) => ({ value: u, label: u }))} />
                <Select label={t(LABEL.isActive)} value={valueOf(editing, 'isActive')} onChange={(v) => setCell(editing, 'isActive', v)} options={[{ value: 'on', label: t('Active') }, { value: 'off', label: t('Band') }]} />
              </>
            )}
          </View>
        </Sheet>
      )}

      <Sheet open={costTool} onClose={() => setCostTool(false)} title={t('Cost = Sale price ka %')}
        description={t('{{count}} lines: {{value}}. Save se pehle sab dikhega.', { count: costTargets.length, value: t('jin ki Cost khaali hai') })}
        footer={<Row gap={2}>
          <Button variant="secondary" style={{ flex: 1 }} onPress={() => setCostTool(false)}>{t('Rehne dein')}</Button>
          <Button style={{ flex: 1 }} disabled={!(costPct && costPct > 0 && costPct <= 100) || !costTargets.length} onPress={applyCostPct}>{t('Cost bharein')}</Button>
        </Row>}>
        <View style={{ gap: th.space(3) }}>
          <NumberInput label={t('Sale price ka kitna % Cost hai')} value={costPct} onChangeValue={setCostPct} placeholder={t('Maslan 85')} trailing={<Percent size={16} color={th.colors.textMuted} />} />
          <Row gap={1.5} wrap>{[60, 70, 75, 80, 85, 90].map((v) => <Chip key={v} label={`${v}%`} selected={costPct === v} onPress={() => setCostPct(v)} />)}</Row>
          <Text size="xs" tone="muted">{t('Andaza hai — asal Cost maloom ho to cell me likh dein. Pehle se likhi Cost tab hi badlegi jab line chuni hui ho.')}</Text>
        </View>
      </Sheet>

      <Sheet open={review} onClose={() => setReview(false)} title={t('{{products}} products badlenge — dekh lein', { products: plan.products })}
        description={plan.errors ? t('{{errors}} ghalat cells save nahi honge.', { errors: plan.errors }) : t('Sirf badli hui cheezein save hongi.')}
        footer={<Row gap={2}>
          <Button variant="secondary" style={{ flex: 1 }} onPress={() => setReview(false)}>{t('Wapas')}</Button>
          <Button style={{ flex: 1 }} icon={Save} onPress={() => void save()}>{t('Save karein')}</Button>
        </Row>}>
        <View style={{ gap: th.space(2) }}>
          {plan.stock.length > 0 && (
            <Card tone="warning" title={t('{{count}} stock adjustments — {{value}}', { count: plan.stock.length, value: sheetQ.data?.shop?.name ?? '' })}>
              <Text size="xs">{t('Stock seedha nahi likha jata: har badli hui line ka farq Stock adjustment ("Bulk edit") ban kar jata hai aur stock report me dikhta hai. Kul +{{stockUp}} / −{{stockDown}}.', { stockUp: fmt(stockUp), stockDown: fmt(stockDown) })}</Text>
            </Card>
          )}
          {plan.lines.slice(0, 300).map((l) => (
            <ListRow key={`${l.idx}${l.key}`} dense title={l.label} subtitle={t(LABEL[l.key])}
              trailing={<Text size="sm" ltr>{['price', 'costPrice', 'wholesalePrice', 'creditPrice'].includes(l.key) ? `${l.from ? formatPKR(num(l.from) ?? 0) : '—'} → ${l.to ? formatPKR(num(l.to) ?? 0) : '—'}` : `${l.from || '—'} → ${l.to || '—'}`}</Text>} />
          ))}
          {plan.lines.length > 300 && <Text size="xs" tone="muted">{t('aur {{value}}…', { value: plan.lines.length - 300 })}</Text>}
        </View>
      </Sheet>
    </>
  );
}

