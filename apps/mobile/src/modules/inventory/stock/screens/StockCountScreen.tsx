/**
 * Physical stock count (web StockCountPanel), made for the phone: scan the
 * shelf with the camera (each scan adds one, or opens the line to type the
 * count), search, or add a whole category; type what is on the shelf and see
 * the system figure, the difference and its value live. A summary is shown
 * before saving. Online the server books each difference (extra = Stock
 * faida, short = Stock nuksan, at cost; a data correction moves stock only).
 * Offline every changed line is saved on the phone and sent later. The count
 * in progress is kept on the phone until it is saved.
 */

import { router } from 'expo-router';
import { CheckCircle2, ClipboardCheck, FolderOpen, Minus, Plus, ScanLine, Search, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { cleanCode, countLine, countSummary, REASONS } from '@nafaa/core/inventory';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { haptic } from '@/core/device/haptics';
import { t } from '@/core/i18n';
import { enqueueStockAdjustment, offline, OfflineRuleError } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { kv } from '@/core/storage/kv';
import {
  Button, Card, Checkbox, EmptyState, Icon, IconButton, Input, PressableScale, Row, Screen, Select, Sheet, StatTile, Switch, Text, TextArea, confirm, toast, useTheme,
} from '@/design';
import { Scanner } from '@/core/hardware/scanner';
import { BranchSelect, useCategories } from '../../components/Pickers';
import { ProductPicker } from '../../components/ProductPicker';
import { CORRECTION_WARNING, qty, useCostMask, useOnline, useRefreshInventory } from '../../lib/shared';
import { adjustmentsApi, type StockCountResult } from '../api';

interface CountRow { key: string; productId: string; variantId?: string; name: string; unit: string; system: number; cost: number; counted: string }

const CATEGORY_LIMIT = 150;

export function StockCountScreen() {
  const th = useTheme();
  const can = usePermission();
  const online = useOnline();
  const refresh = useRefreshInventory();
  const { cost } = useCostMask();
  const activeShop = useAuthStore((s) => s.currentShopId);
  const canCorrect = can(P.STOCK_ADJUSTMENTS_CORRECT);
  const [shopId, setShopId] = useState<string | null>(activeShop);
  const draftKey = `nafaa.inv.count.${shopId ?? 'none'}`;
  const [rows, setRows] = useState<CountRow[]>(() => kv.get<CountRow[]>(`nafaa.inv.count.${activeShop ?? 'none'}`, []));
  const [note, setNote] = useState('');
  const [correction, setCorrection] = useState(false);
  const [step, setStep] = useState<'count' | 'confirm'>('count');
  const [result, setResult] = useState<StockCountResult | null>(null);
  const [picker, setPicker] = useState(false);
  const [scan, setScan] = useState(false);
  const [tally, setTally] = useState(true);
  const [last, setLast] = useState<string | null>(null);
  const [category, setCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [onlyChanged, setOnlyChanged] = useState(false);
  const categories = useCategories();
  const listRef = useRef<FlatList<CountRow>>(null);

  useEffect(() => { kv.set(draftKey, rows); }, [rows, draftKey]);

  /** Rows for a product: one per variant, or the product itself. */
  const rowsFor = async (productId: string, onlyVariant?: string | null): Promise<CountRow[]> => {
    const d = await offline.products.get(productId, shopId);
    if (!d) return [];
    if (d.variants.length) {
      return d.variants.filter((v) => !onlyVariant || v.id === onlyVariant).map((v) => ({
        key: `${d.id}:${v.id}`, productId: d.id, variantId: v.id, name: `${d.name} · ${v.name}`, unit: d.unit,
        system: Number(v.stock ?? 0), cost: Number(v.costPrice ?? d.costPrice) || 0, counted: '',
      }));
    }
    return [{ key: d.id, productId: d.id, name: d.name, unit: d.unit, system: Number(d.stock ?? 0), cost: Number(d.costPrice) || 0, counted: '' }];
  };

  const addRows = (list: CountRow[], bump?: string) => setRows((prev) => {
    const have = new Map(prev.map((r) => [r.key, r]));
    const next = [...prev];
    for (const r of list) if (!have.has(r.key)) next.unshift(r);
    if (bump) return next.map((r) => (r.key === bump ? { ...r, counted: String((Number(r.counted) || 0) + 1) } : r));
    return next;
  });

  const onCode = async (raw: string) => {
    const hit = await offline.products.byBarcode(cleanCode(raw), shopId);
    if (!hit) { toast.error(t('"{{term}}" kisi cheez par nahi mila', { term: cleanCode(raw) })); return false; }
    const list = await rowsFor(hit.product.id, hit.variantId);
    if (!list.length) return false;
    const key = hit.variantId ? `${hit.product.id}:${hit.variantId}` : list.length === 1 ? list[0].key : null;
    addRows(list, tally && key ? key : undefined);
    setLast(list.find((r) => r.key === key)?.name ?? hit.product.name);
    if (!tally) setScan(false);
    return true;
  };

  const addCategory = async (categoryId: string) => {
    setCategory(false);
    const products = await offline.products.search({ categoryId, shopId, limit: CATEGORY_LIMIT, includeRaw: true });
    const all = (await Promise.all(products.map((p) => rowsFor(p.id)))).flat();
    addRows(all);
    toast.success(t('{{count}} cheezein ginti me', { count: all.length }));
  };

  const lines = rows.map((r) => ({ system: r.system, counted: r.counted === '' ? null : Number(r.counted), cost: r.cost }));
  const sum = countSummary(lines);
  const entered = rows.filter((r) => r.counted !== '');
  const shown = onlyChanged ? rows.filter((r) => r.counted !== '' && Number(r.counted) !== r.system) : rows;

  const save = async () => {
    if (!shopId || saving) return;
    setSaving(true);
    try {
      if (online) {
        const r = await adjustmentsApi.count({
          shopId, note: note.trim() || undefined, ...(correction && canCorrect ? { correction: true } : {}),
          items: entered.map((x) => ({ productId: x.productId, variantId: x.variantId, counted: Number(x.counted) })),
        });
        setResult(r);
        toast.success(r.changed ? t('Ginti save — {{changed}} cheezon ka stock theek hua', { changed: r.changed }) : t('Ginti save — sab theek tha'));
      } else {
        let changed = 0;
        for (const x of entered) {
          const c = countLine(x.system, Number(x.counted), correction && canCorrect);
          if (!c.type || !c.code) continue;
          await enqueueStockAdjustment({
            productId: x.productId, variantId: x.variantId, shopId, type: c.type, quantity: Math.abs(c.delta), reason: REASONS[c.code].label, reasonCode: c.code,
            note: note.trim() || t('Stock ginti'),
          });
          changed++;
        }
        setResult({ groupRef: '', checked: entered.length, changed, gained: sum.gainValue, lost: sum.lossValue, net: sum.net, correction: correction && canCorrect });
        toast.success(t('Phone par save ho gaya — internet aane par bhej diya jayega'));
      }
      haptic('success');
      kv.remove(draftKey);
      void refresh();
    } catch (e) {
      toast.error(e instanceof OfflineRuleError ? e.message : apiErrorMessage(e, t('Ginti save nahi hui')));
    } finally {
      setSaving(false);
    }
  };

  const clearAll = async () => {
    if (await confirm({ title: t('Ginti saaf karein?'), message: t('Likha hua mit jayega.'), tone: 'danger', confirmLabel: t('Saaf karein') })) setRows([]);
  };

  if (result) {
    return (
      <Screen title={t('Stock ginti')} footer={<Button size="lg" onPress={() => router.back()}>{t('Theek hai')}</Button>}>
        <View style={{ alignItems: 'center', gap: th.space(2), paddingVertical: th.space(6) }}>
          <Icon icon={CheckCircle2} size={52} tone="success" />
          <Text size="lg" weight="bold">{t('Ginti save ho gayi')}</Text>
          <Text size="sm" tone="muted" align="center">{t('Ref {{groupRef}} · {{checked}} cheezein gini · {{changed}} me farq tha', { groupRef: result.groupRef || '—', checked: result.checked, changed: result.changed })}</Text>
        </View>
        <Row gap={2}>
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={result.correction ? t('Zyada nikla') : t('Stock faida')} value={`+${cost(result.gained)}`} />
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="danger" label={result.correction ? t('Kam nikla') : t('Stock nuksan')} value={`−${cost(result.lost)}`} />
        </Row>
        <StatTile tone={result.net >= 0 ? 'success' : 'danger'} label={result.correction ? t('Kul farq') : t('Profit par asar')} value={`${result.net >= 0 ? '+' : '−'}${cost(Math.abs(result.net))}`} style={{ marginTop: th.space(2) }} />
        <Text size="xs" tone="muted" style={{ marginTop: th.space(3) }}>
          {result.correction ? t('Data correction — stock theek hua, Profit par asar nahi.') : t('Zyada nikla maal Stock faida (Profit mein plus), kam nikla Stock nuksan (Profit se minus) — cost par.')}
        </Text>
      </Screen>
    );
  }

  if (step === 'confirm') {
    return (
      <Screen title={t('Khulasa')} subtitle={t('Stock ginti')} footer={<Row gap={2}>
        <Button variant="secondary" size="lg" style={{ flex: 1 }} onPress={() => setStep('count')}>{t('Wapas')}</Button>
        <Button size="lg" style={{ flex: 1 }} loading={saving} onPress={() => void save()}>{t('Haan, stock theek karein')}</Button>
      </Row>}>
        <View style={{ gap: th.space(3) }}>
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="neutral" label={t('Gini')} value={String(sum.counted)} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="warning" label={t('Farq wali')} value={String(sum.changed)} />
          </Row>
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={correction ? t('Zyada nikla') : t('Stock faida')} value={`+${cost(sum.gainValue)}`} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="danger" label={correction ? t('Kam nikla') : t('Stock nuksan')} value={`−${cost(sum.lossValue)}`} />
          </Row>
          {canCorrect && sum.changed > 0 && (
            <Card tone={correction ? 'warning' : 'default'}>
              <Checkbox value={correction} onChange={setCorrection} label={t(REASONS.CORRECTION.label)} description={t(CORRECTION_WARNING)} />
            </Card>
          )}
          {!sum.changed && <Card tone="success"><Text size="sm">{t('Har cheez system ke barabar hai — save karne se sirf ginti ka record banega, stock nahi badlega.')}</Text></Card>}
          {rows.filter((r) => r.counted !== '' && Number(r.counted) !== r.system).map((r) => {
            const d = Number(r.counted) - r.system;
            return (
              <Row key={r.key} justify="between" gap={2}>
                <Text size="sm" style={{ flex: 1 }} numberOfLines={1}>{r.name}</Text>
                <Text size="sm" tone="muted" ltr>{`${qty(r.system)} → ${qty(Number(r.counted))}`}</Text>
                <Text size="sm" weight="bold" tone={d > 0 ? 'success' : 'danger'} ltr>{`${d > 0 ? '+' : ''}${qty(d)}`}</Text>
              </Row>
            );
          })}
          <TextArea label={t('Note')} value={note} onChangeText={setNote} placeholder={t('Marzi hai — kya hua, kis ne dekha, kahan rakha tha…')} />
          {!online && <Text size="xs" tone="muted">{t('Internet nahi — har farq phone par save hoga aur internet aane par bhej diya jayega.')}</Text>}
        </View>
      </Screen>
    );
  }

  return (
    <Screen title={t('Stock ginti')} subtitle={t('Shelf par jitna maal hai woh likhein — farq khud barhaya ya kam kiya jayega')} scroll={false}
      actions={rows.length ? <IconButton icon={Trash2} label={t('Saaf karein')} onPress={() => void clearAll()} /> : undefined}
      footer={<Button size="lg" icon={ClipboardCheck} disabled={!entered.length || !shopId} onPress={() => setStep('confirm')}>
        {t('Aage — khulasa dekhein ({{count}})', { count: entered.length })}
      </Button>}>
      <View style={{ flex: 1, gap: th.space(3) }}>
        {!activeShop && <BranchSelect value={shopId} onChange={(id) => { setShopId(id); setRows(kv.get<CountRow[]>(`nafaa.inv.count.${id}`, [])); }} />}
        <Row gap={2}>
          <Button style={{ flex: 1 }} icon={ScanLine} onPress={() => setScan(true)} disabled={!shopId}>{t('Scan')}</Button>
          <Button style={{ flex: 1 }} variant="secondary" icon={Search} onPress={() => setPicker(true)} disabled={!shopId}>{t('Search')}</Button>
          <IconButton icon={FolderOpen} label={t('Poori category')} variant="secondary" size="lg" onPress={() => setCategory(true)} disabled={!shopId} />
        </Row>
        <Switch value={tally} onChange={setTally} label={t('Har scan par +1')} description={t('Band ho to scan ke baad ginti khud likhein')} />
        {rows.length > 0 && (
          <Row justify="between">
            <Text size="sm" tone="muted">{t('{{entered}} / {{all}} gini · {{changed}} me farq', { entered: entered.length, all: rows.length, changed: sum.changed })}</Text>
            <Checkbox value={onlyChanged} onChange={setOnlyChanged} label={t('Sirf farq')} />
          </Row>
        )}
        <FlatList
          ref={listRef}
          data={shown}
          keyExtractor={(r) => r.key}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: th.space(2), paddingBottom: th.space(6) }}
          ListEmptyComponent={<EmptyState compact icon={ClipboardCheck} title={t('Scan karein ya search karein')} message={t('Har cheez ki shelf wali ginti likhein. System ka figure saath dikhega.')} />}
          renderItem={({ item: r }) => <CountRowView row={r} cost={cost} onChange={(counted) => setRows((prev) => prev.map((x) => (x.key === r.key ? { ...x, counted } : x)))}
            onRemove={() => setRows((prev) => prev.filter((x) => x.key !== r.key))} />}
        />
      </View>
      <ProductPicker open={picker} onClose={() => setPicker(false)} keepOpen variants={false} title={t('Stock ginti')} pickedIds={new Set(rows.map((r) => r.productId))}
        onPick={(p) => void rowsFor(p.product.id).then((list) => addRows(list))} />
      <Sheet open={category} onClose={() => setCategory(false)} title={t('Poori category ginein')} description={t('Category ki sab cheezein list me aa jayengi (zyada se zyada {{n}})', { n: CATEGORY_LIMIT })}>
        <Select label={t('Category')} value={null} onChange={(id) => void addCategory(id)} options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))} searchable />
      </Sheet>
      {scan && (
        <Scanner title={t('Stock ginti')} continuous={tally} onClose={() => setScan(false)} onCode={onCode}
          footer={last ? (
            <Row justify="between">
              <Text weight="semibold" color={th.colors.neutral.onSolid} numberOfLines={1} style={{ flex: 1 }}>{last}</Text>
              <Text weight="bold" color={th.colors.neutral.onSolid} ltr>{t('{{n}} gini', { n: entered.length })}</Text>
            </Row>
          ) : <Text color={th.colors.neutral.onSolid}>{tally ? t('Har scan par ek gina jata hai') : t('Scan karein')}</Text>} />
      )}
    </Screen>
  );
}

function CountRowView({ row: r, cost, onChange, onRemove }: { row: CountRow; cost: (n: number) => string; onChange: (v: string) => void; onRemove: () => void }) {
  const th = useTheme();
  const done = r.counted !== '';
  const diff = done ? Number(r.counted) - r.system : 0;
  const step = (d: number) => onChange(String(Math.max(0, (Number(r.counted) || 0) + d)));
  return (
    <Card tone={!done ? 'default' : diff === 0 ? 'success' : diff > 0 ? 'info' : 'warning'}>
      <View style={{ gap: th.space(2) }}>
        <Row gap={2} align="start">
          <View style={{ flex: 1 }}>
            <Text size="sm" weight="semibold" numberOfLines={2}>{r.name}</Text>
            <Text size="xs" tone="muted">{t('System: {{n}} {{unit}}', { n: qty(r.system), unit: r.unit })}</Text>
          </View>
          <IconButton icon={Trash2} label={t('Hatayein')} size="sm" onPress={onRemove} />
        </Row>
        <Row gap={2} align="center">
          <PressableScale onPress={() => step(-1)} haptic="tap" accessibilityLabel={t('Kam karein')}
            style={{ width: 44, height: 44, borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
            <Icon icon={Minus} />
          </PressableScale>
          <Input containerStyle={{ flex: 1 }} value={r.counted} onChangeText={(v) => onChange(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder={t('Ginti')} ltr size="lg" />
          <PressableScale onPress={() => step(1)} haptic="tap" accessibilityLabel={t('Barhayein')}
            style={{ width: 44, height: 44, borderRadius: th.radius('lg'), backgroundColor: th.colors.brand.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon icon={Plus} tone="brand" />
          </PressableScale>
          <Button size="sm" variant="ghost" onPress={() => onChange(String(r.system))}>{t('Barabar')}</Button>
        </Row>
        {done && diff !== 0 && (
          <Text size="xs" weight="semibold" tone={diff > 0 ? 'success' : 'danger'} ltr>{`${diff > 0 ? '+' : ''}${qty(diff)} ${r.unit} · ${diff > 0 ? '+' : '−'}${cost(Math.abs(diff) * r.cost)}`}</Text>
        )}
      </View>
    </Card>
  );
}
