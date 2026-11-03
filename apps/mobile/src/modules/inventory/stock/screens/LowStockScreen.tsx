/**
 * Low stock and reorder (web LowStockPage): what is out, low, running out
 * soon or near expiry per branch, with days of cover, lost sales and the
 * quantity to order; the reorder list per supplier with editable quantities
 * that opens a purchase order or a WhatsApp message. Swipe a line to add
 * stock, change its alert level, hide it or message the supplier; long-press
 * to pick many. The last loaded list stays readable offline.
 */

import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, BellRing, CheckCircle2, EyeOff, MessageCircle, PackagePlus, Plus, Settings2, ShoppingCart, SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { groupBySupplier, orderMessage, itemMessage, whatsappLink, type OrderGroup } from '@nafaa/core/inventory';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { kv } from '@/core/storage/kv';
import {
  Badge, Button, Card, ChipGroup, EmptyState, IconButton, ListRow, ListTemplate, Row, Segmented, Select, Sheet, SwipeRow, Text, toast, useDebouncedValue, useTheme,
} from '@/design';
import { NumberInput } from '../../components/fields';
import { ProductThumb } from '../../components/ProductThumb';
import { StockSheet, type StockTarget } from '../../components/StockSheet';
import { INV, qty, useCostMask } from '../../lib/shared';
import { lowStockApi, type LowQuery, type LowRow, type LowSettings, type LowSort, type LowStatusFilter } from '../api';
import { LOW_STATUS } from '../meta';
import { OnlineOnly, StatStrip } from '../components/parts';
import { usePaged } from '../usePaged';

const SETTINGS_KEY = 'nafaa.inv.low-stock.settings';
const DEFAULTS: LowSettings = { days: 30, targetDays: 30, soonDays: 7, expiryDays: 30 };
const daysText = (d: number | null) => (d === null ? '—' : d < 1 ? t('aaj') : t('{{d}} din', { d: Math.round(d) }));

export function LowStockScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const { cost, costHidden } = useCostMask();
  const shopName = useAuthStore((s) => s.tenant?.name ?? '');
  const currentShop = useAuthStore((s) => s.currentShopId);
  const setCurrentShop = useAuthStore((s) => s.setCurrentShop);
  const [settings, setSettingsRaw] = useState<LowSettings>(() => ({ ...DEFAULTS, ...kv.get<Partial<LowSettings>>(SETTINGS_KEY, {}) }));
  const setSettings = (s: LowSettings) => { setSettingsRaw(s); kv.set(SETTINGS_KEY, s); };
  const [view, setView] = useState<'alerts' | 'reorder'>('alerts');
  const [status, setStatus] = useState<LowStatusFilter>('all');
  const [sort, setSort] = useState<LowSort>('urgency');
  const [categoryId, setCategoryId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), 250);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<'filters' | 'settings' | null>(null);
  const [stockOf, setStockOf] = useState<StockTarget | null>(null);
  const [alertOf, setAlertOf] = useState<LowRow | null>(null);
  const [edits, setEdits] = useState<Record<string, number>>({});

  const f: LowQuery = { ...settings, status: view === 'reorder' ? 'all' : status, sort, categoryId: categoryId || undefined, supplierId: supplierId || undefined, search: query || undefined, view };
  const list = usePaged([INV, 'low', f], (page) => lowStockApi.list({ ...f, page, limit: view === 'reorder' ? 200 : 40 }));
  const first = list.first;
  const qtyOf = (r: LowRow) => edits[r.key] ?? r.suggestQty;
  const groups = useMemo(() => (view === 'reorder' ? groupBySupplier(list.items.filter((r) => !r.made)) : []), [view, list.items]);
  const pickedRows = list.items.filter((r) => picked.has(r.key));
  const toggle = (key: string) => setPicked((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const reload = () => qc.invalidateQueries({ queryKey: [INV, 'low'] });

  const order = (g: OrderGroup<LowRow>) => {
    const lines = g.rows.filter((r) => !r.made && qtyOf(r) > 0).map((r) => ({ productId: r.productId, qty: qtyOf(r), cost: r.lastCost }));
    if (!lines.length) { toast.error(t('Mangwane ke liye koi quantity nahi')); return; }
    if (currentShop !== g.shopId) { setCurrentShop(g.shopId); toast.success(t('{{shopName}} khul gayi — order isi branch ka banega', { shopName: g.shopName })); }
    const params = new URLSearchParams({ from: 'low-stock', order: '1', lines: JSON.stringify(lines), ...(g.supplier ? { supplierId: g.supplier.id } : {}) });
    router.push(`/purchases/new?${params.toString()}` as never);
  };
  const whatsapp = (g: OrderGroup<LowRow>) => void Linking.openURL(whatsappLink(g.supplier?.phone, orderMessage(g, shopName, qtyOf)));
  const hide = async (rows: LowRow[], ignore = true) => {
    try {
      for (const r of rows) await lowStockApi.ignore(r.productId, ignore, r.shopId);
      toast.success(ignore ? t('{{count}} line chhup gayi — stock theek hone par khud hat jayengi', { count: rows.length }) : t('Line wapas aa gayi'));
      setPicked(new Set());
      await reload();
    } catch (e) { toast.error(apiErrorMessage(e, t('Nahi ho saka'))); }
  };

  const counts = first?.counts;
  const statuses: LowStatusFilter[] = ['all', 'out', 'low', 'soon', 'expiry', 'ordered', 'ignored'];
  const tot = first?.totals;
  const summary = (
    <View style={{ gap: th.space(3) }}>
      {tot && (
        <StatStrip items={[
          { label: t('Kya khatam ho raha hai'), value: String((counts?.out ?? 0) + (counts?.low ?? 0)), hint: t('alert level se neeche'), tone: 'warning', onPress: () => setStatus('low') },
          { label: t('Order ka expense'), value: cost(tot.orderValue), hint: t('{{orderLines}} cheezein · {{targetDays}} din ka maal', { orderLines: tot.orderLines, targetDays: settings.targetDays }), tone: 'brand', onPress: () => setView('reorder') },
          { label: t('Ruki hui sale'), value: cost(tot.lostPerDay), hint: t('roz — khatam maal ki wajah se'), tone: 'danger', onPress: () => setStatus('out') },
          { label: t('Expiry ka maal'), value: cost(tot.expiryValue), hint: t('{{expiryDays}} din me expiry', { expiryDays: settings.expiryDays }), tone: 'accent', onPress: () => setStatus('expiry') },
        ]} />
      )}
      <Segmented value={view} onChange={(v) => { setView(v); setPicked(new Set()); }} options={[{ value: 'alerts', label: t('Alerts') }, { value: 'reorder', label: t('Reorder list') }]} />
      {view === 'alerts' && (
        <ChipGroup value={status} onChange={setStatus} style={{ marginHorizontal: -th.space(4) }}
          options={statuses.map((s) => ({
            value: s, count: counts?.[s],
            label: s === 'all' ? t('Sab') : s === 'ordered' ? t('Order me') : s === 'ignored' ? t('Chhupi hui') : t(LOW_STATUS[s].label),
          }))} />
      )}
      {view === 'reorder' && <Text size="xs" tone="muted">{t('Sale {{days}} din · order {{targetDays}} din ka', { days: settings.days, targetDays: settings.targetDays })}</Text>}
      {picked.size > 0 && (
        <Card tone="brand">
          <Row gap={2} wrap>
            <Text size="sm" weight="semibold" style={{ flex: 1 }}>{t('{{size}} chuni', { size: picked.size })}</Text>
            {can(P.PURCHASES_CREATE) && <Button size="sm" icon={ShoppingCart} onPress={() => { const gs = groupBySupplier(pickedRows); if (gs[0]) order(gs[0]); }}>{t('Purchase order banayein')}</Button>}
            <Button size="sm" variant="secondary" icon={MessageCircle} onPress={() => { const gs = groupBySupplier(pickedRows); if (gs[0]) whatsapp(gs[0]); }}>{t('WhatsApp list')}</Button>
            <Button size="sm" variant="ghost" icon={EyeOff} onPress={() => void hide(pickedRows)}>{t('Chhupayein')}</Button>
          </Row>
        </Card>
      )}
      <OnlineOnly feature="reports" updatedAt={list.cached.fromCache ? list.cached.updatedAt : null} />
    </View>
  );

  const alertRow = (r: LowRow) => {
    const st = LOW_STATUS[r.status];
    const line2 = [
      t('{{perDay}} / din', { perDay: qty(r.perDay) }), r.daysLeft !== null ? t('{{daysLeft}} ka maal', { daysLeft: daysText(r.daysLeft) }) : null,
      r.onOrder > 0 ? t('{{onOrder}} order me', { onOrder: qty(r.onOrder) }) : null, r.lostPerDay > 0 ? t('Roz {{lostPerDay}} ki sale ruki', { lostPerDay: cost(r.lostPerDay) }) : null,
      r.supplier?.name, currentShop ? null : r.shopName,
    ].filter(Boolean).join(' · ');
    return (
      <SwipeRow end={[
        ...(can(P.STOCK_ADJUSTMENTS_MANAGE) && currentShop === r.shopId ? [{ icon: Plus, label: t('Stock'), tone: 'brand' as const, onPress: () => setStockOf({ id: r.productId, name: r.name, unit: r.unit, stock: r.stock, price: r.price }) }] : []),
        { icon: BellRing, label: t('Alert level'), tone: 'warning', onPress: () => setAlertOf(r) },
        { icon: EyeOff, label: r.ignored ? t('Wapas dikhayein') : t('Chhupayein'), tone: 'neutral', onPress: () => void hide([r], !r.ignored) },
      ]} start={[{ icon: MessageCircle, label: t('WhatsApp'), tone: 'success', onPress: () => void Linking.openURL(whatsappLink(r.supplier?.phone, itemMessage(r, shopName))) }]}>
        <ListRow
          selected={picked.has(r.key)}
          leading={<ProductThumb name={r.name} category={r.category?.name} url={r.image} size={42} />}
          title={r.name}
          subtitle={line2}
          trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text weight="bold" tone={r.stock <= 0 ? 'danger' : 'warning'} ltr>{`${qty(r.stock)} ${r.unit}`}</Text>
            <Badge tone={st.tone}>{t(st.label)}</Badge>
            {r.suggestQty > 0 && <Text size="2xs" tone="muted">{t('Mangwana')}: {qty(r.suggestQty)}</Text>}
          </View>}
          onLongPress={() => toggle(r.key)}
          onPress={picked.size ? () => toggle(r.key) : () => router.push(`/products/${r.productId}` as never)}
        />
      </SwipeRow>
    );
  };

  return (
    <>
      <ListTemplate<LowRow | OrderGroup<LowRow>>
        title={t('Low stock aur reorder')}
        actions={<Row gap={1}>
          <IconButton icon={SlidersHorizontal} label={t('Filters')} badge={!!categoryId || !!supplierId} onPress={() => setSheet('filters')} />
          <IconButton icon={Settings2} label={t('Hisaab ki settings')} onPress={() => setSheet('settings')} />
        </Row>}
        search={{ value: search, onChange: setSearch, placeholder: t('Naam, SKU, barcode ya supplier…') }}
        summary={summary}
        data={view === 'reorder' ? groups : list.items}
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        refreshing={list.refreshing}
        onRefresh={list.refetch}
        onEndReached={view === 'alerts' ? list.loadMore : undefined}
        footer={list.loadingMore ? <ActivityIndicator style={{ margin: 16 }} /> : undefined}
        grouped={view === 'alerts'}
        keyExtractor={(x) => ('rows' in x ? x.key : x.key)}
        renderItem={({ item }) => ('rows' in item
          ? <ReorderCard g={item} qtyOf={qtyOf} cost={cost} costHidden={costHidden} canOrder={can(P.PURCHASES_CREATE)}
              onQty={(key, v) => setEdits((e) => ({ ...e, [key]: v }))} onOrder={() => order(item)} onWhatsApp={() => whatsapp(item)} />
          : alertRow(item))}
        empty={view === 'reorder'
          ? <EmptyState icon={CheckCircle2} tone="brand" title={t('Abhi kuch mangwane ki zaroorat nahi')} message={t('Jo maal kam hai woh ya to order me hai, ya bik nahi raha. Settings me "kitne din ka maal" badal kar dekhein.')} />
          : <EmptyState icon={CheckCircle2} title={t('Sab stock theek hai')} message={t('Kuch khatam, kam ya expiry ke qareeb nahi. Alert level product par ya yahan line par badal sakte hain.')} />}
      />
      <StockSheet item={stockOf} open={!!stockOf} onClose={() => setStockOf(null)} onSaved={() => void reload()} />
      <AlertSheet row={alertOf} onClose={() => setAlertOf(null)} onDone={() => void reload()} />
      <Sheet open={sheet === 'filters'} onClose={() => setSheet(null)} title={t('Filters')}
        footer={<Button fullWidth onPress={() => setSheet(null)}>{t('Dekhein')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <Select label={t('Category')} value={categoryId} onChange={setCategoryId} options={[{ value: '', label: t('Sab category') }, ...(first?.facets.categories ?? []).map((c) => ({ value: c.id, label: `${c.name ?? ''} (${c.count})` }))]} />
          <Select label={t('Supplier')} value={supplierId} onChange={setSupplierId} options={[{ value: '', label: t('Sab supplier') }, ...(first?.facets.suppliers ?? []).map((c) => ({ value: c.id, label: `${c.name ?? ''} (${c.count})` }))]} />
          <Select<LowSort> label={t('Sort')} value={sort} onChange={setSort} options={[
            { value: 'urgency', label: t('Sab se zaroori pehle') }, { value: 'daysLeft', label: t('Kam din ka maal pehle') }, { value: 'value', label: t('Bara order pehle') },
            { value: 'lost', label: t('Zyada ruki sale pehle') }, { value: 'stock', label: t('Kam stock pehle') }, { value: 'name', label: t('Naam (A–Z)') },
          ]} />
        </View>
      </Sheet>
      <SettingsSheet open={sheet === 'settings'} value={settings} onClose={() => setSheet(null)} onSave={setSettings} />
    </>
  );
}

function ReorderCard({ g, qtyOf, cost, costHidden, canOrder, onQty, onOrder, onWhatsApp }: {
  g: OrderGroup<LowRow>; qtyOf: (r: LowRow) => number; cost: (n: number) => string; costHidden: boolean; canOrder: boolean;
  onQty: (key: string, v: number) => void; onOrder: () => void; onWhatsApp: () => void;
}) {
  const th = useTheme();
  const total = g.rows.reduce((s, r) => s + qtyOf(r) * r.lastCost, 0);
  return (
    <Card style={{ marginHorizontal: th.space(4), marginBottom: th.space(3) }}
      title={g.supplier?.name ?? t('Supplier chunna hai')}
      description={`${g.shopName} · ${t('{{count}} cheezein · {{total}}', { count: g.rows.length, total: costHidden ? '' : cost(total) })}`}
      footer={<Row gap={2}>
        <Button variant="secondary" icon={MessageCircle} style={{ flex: 1 }} onPress={onWhatsApp}>{t('WhatsApp')}</Button>
        {canOrder && <Button icon={PackagePlus} style={{ flex: 1 }} onPress={onOrder}>{t('Order banayein')}</Button>}
      </Row>}>
      <View style={{ gap: th.space(2) }}>
        {g.rows.map((r) => (
          <Row key={r.key} gap={2}>
            <View style={{ flex: 1 }}>
              <Text size="sm" weight="semibold" numberOfLines={1}>{r.name}</Text>
              <Text size="xs" tone="muted">{`${t('Abhi')} ${qty(r.stock)} · ${t('{{perDay}} / din', { perDay: qty(r.perDay) })}${r.lastCost ? ` · ${cost(r.lastCost)}` : ''}`}</Text>
            </View>
            <NumberInput containerStyle={{ width: 96 }} value={qtyOf(r)} onChangeValue={(v) => onQty(r.key, v ?? 0)} trailing={<Text size="xs" tone="muted">{r.unit}</Text>} />
          </Row>
        ))}
        {!g.supplier && <Text size="xs" tone="warning">{t('Pehle kabhi nahi khareeda — order me supplier chunein')}</Text>}
      </View>
    </Card>
  );
}

function AlertSheet({ row, onClose, onDone }: { row: LowRow | null; onClose: () => void; onDone: () => void }) {
  const th = useTheme();
  const [value, setValue] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  if (!row) return null;
  const save = async () => {
    setBusy(true);
    try {
      await lowStockApi.setAlert(row.productId, value ?? row.alert, row.shopId);
      toast.success(t('Alert level badal gaya'));
      onDone();
      onClose();
    } catch (e) { toast.error(apiErrorMessage(e, t('Alert level nahi badla'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open onClose={() => { setValue(null); onClose(); }} title={row.name} description={t('Alert level ({{from}})', { from: row.alertFrom === 'branch' ? t('is branch ka') : row.alertFrom === 'agri' ? t('agri profile') : t('product ka') })}
      footer={<Button fullWidth loading={busy} onPress={() => void save()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <NumberInput label={t('Alert level')} value={value ?? row.alert} onChangeValue={setValue} trailing={<Text tone="muted">{row.unit}</Text>} autoFocus />
        <Text size="xs" tone="muted">{t('Itna ya kam bachne par "Kam" ki patti lagegi')}</Text>
      </View>
    </Sheet>
  );
}

function SettingsSheet({ open, value, onClose, onSave }: { open: boolean; value: LowSettings; onClose: () => void; onSave: (s: LowSettings) => void }) {
  const th = useTheme();
  const [s, setS] = useState(value);
  const field = (k: keyof LowSettings, label: string, hint: string) => (
    <NumberInput label={label} hint={hint} integer value={s[k]} onChangeValue={(v) => setS((x) => ({ ...x, [k]: Math.max(1, v ?? 1) }))} trailing={<Text tone="muted">{t('din')}</Text>} />
  );
  return (
    <Sheet open={open} onClose={onClose} title={t('Hisaab ki settings')} description={t('Ye number sirf is device par yaad rehte hain')}
      footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={() => setS(DEFAULTS)}>{t('Pehle jaisa')}</Button>
        <Button style={{ flex: 1 }} onPress={() => { onSave(s); onClose(); }}>{t('Save')}</Button>
      </Row>}>
      <View style={{ gap: th.space(3) }}>
        {field('days', t('Sale ka hisaab kitne din se'), t('Pichhle itne din ki sale se roz ki ausat nikalti hai. 30 aam hai; mausami maal ho to 14.'))}
        {field('targetDays', t('Order kitne din ka'), t('Order itna banta hai ke maal itne din chale. Supplier jaldi deta ho to kam rakhein.'))}
        {field('soonDays', t('"Jaldi khatam" kab kahein'), t('Jo maal itne din ya kam me khatam ho jayega, woh "Jaldi khatam" me aata hai — supplier ko jitne din lagte hain utna rakhein.'))}
        {field('expiryDays', t('Expiry kitne din pehle dikhayein'), t('Jis batch ki expiry itne din me hai, woh "Expiry" me dikhta hai.'))}
        <Row gap={1.5}><AlertTriangle size={14} color={th.colors.textMuted} /><Text size="xs" tone="muted">{t('Alert level product par ya yahan line par badal sakte hain.')}</Text></Row>
      </View>
    </Sheet>
  );
}
