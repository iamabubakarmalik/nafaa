/** Reorder list (web ReorderRulesPage): items at or below their reorder point (out of stock first), how much to order and from whom. Points are set here or in the item editor's stock step. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, CheckCircle2, PackageX, Pencil, Plus, RefreshCw, ShoppingCart, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Share, View } from 'react-native';
import { SEVERITY_ORDER, qty, ruleProblem } from '@nafaa/core/industries/hardware';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, ChipGroup, EmptyState, IconButton, Input, ListRow, ListTemplate, Row, Sheet, StatTile, StatusPill, Text, confirm, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { OfflineNote, errText, opt, useDeskOnline } from '../../_shared/trade/desk';
import { reorderRulesApi, type ReorderRule } from '../api';
import { KEYS, refreshHardware, severityMeta } from '../meta';

type Tab = 'need' | 'out' | 'ok' | 'all';

export function ReorderScreen() {
  const th = useTheme();
  const can = usePermission();
  const manage = can(P.PRODUCTS_EDIT) || can(P.LOW_STOCK_VIEW);
  const { guard } = useDeskOnline('hardwareDesk');
  const [tab, setTab] = useState<Tab>('need');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<ReorderRule | 'new' | null>(null);
  const list = useQuery({ queryKey: [KEYS.reorder], queryFn: () => reorderRulesApi.list({ active: true }) });
  const all = useMemo(() => [...(list.data ?? [])].sort((a, b) => (SEVERITY_ORDER[a.severity ?? 'OK'] - SEVERITY_ORDER[b.severity ?? 'OK']) || (a.product?.name ?? '').localeCompare(b.product?.name ?? '')), [list.data]);
  const term = search.trim().toLowerCase();
  const rows = all.filter((r) => (tab === 'need' ? r.needsReorder : tab === 'out' ? r.severity === 'OUT_OF_STOCK' : tab === 'ok' ? !r.needsReorder : true) && (!term || [r.product?.name, r.preferredSupplier].some((v) => (v ?? '').toLowerCase().includes(term))));
  const need = all.filter((r) => r.needsReorder);
  const counts = { need: need.length, out: all.filter((r) => r.severity === 'OUT_OF_STOCK').length, ok: all.length - need.length, all: all.length };

  const share = () => {
    const by = new Map<string, ReorderRule[]>();
    for (const r of need) by.set(r.preferredSupplier || t('Supplier tay nahi'), [...(by.get(r.preferredSupplier || t('Supplier tay nahi')) ?? []), r]);
    const text = [t('Mangwane ki list'), ...[...by.entries()].flatMap(([s, l]) => ['', `*${s}*`, ...l.map((r) => `• ${r.product?.name ?? '—'} — ${qty(r.reorderQty)} ${r.product?.unit ?? ''} (${t('stock')} ${qty(r.currentStock ?? 0)})`)])].join('\n');
    void Share.share({ message: text });
  };
  const remove = (r: ReorderRule) => guard(async () => {
    if (!(await confirm({ title: t('Reorder point hatayein?'), message: t('{{value}} ab reorder list me nahi aayega. Stock par koi asar nahi.', { value: r.product?.name ?? 'Item' }), confirmLabel: t('Hatayein'), tone: 'danger' }))) return;
    try { await reorderRulesApi.remove(r.id); refreshHardware([KEYS.reorder]); toast.success(t('Point hata diya')); } catch (e) { toast.error(errText(e, t('Nahi hata'))); }
  });

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={PackageX} tone={counts.out ? 'danger' : 'neutral'} label={t('Khatam')} loading={list.isLoading} value={String(counts.out)} onPress={() => setTab('out')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={AlertTriangle} tone={counts.need ? 'warning' : 'neutral'} label={t('Mangwana hai')} loading={list.isLoading} value={String(counts.need)} onPress={() => setTab('need')} />
      </Row>
      <ChipGroup value={tab} onChange={(v) => setTab(v as Tab)} style={{ marginHorizontal: -th.space(4) }} options={[{ value: 'need', label: `${t('Mangwana hai')} (${counts.need})` }, { value: 'out', label: `${t('Khatam')} (${counts.out})` }, { value: 'ok', label: `${t('Theek')} (${counts.ok})` }, { value: 'all', label: `${t('Sab')} (${counts.all})` }]} />
      <Row gap={2} wrap>
        <Button size="sm" variant="soft" icon={ShoppingCart} disabled={!need.length} onPress={share}>{t('Mangwane ki list')}</Button>
        <Button size="sm" variant="soft" icon={RefreshCw} onPress={() => router.push('/purchases/new' as never)}>{t('Purchase')}</Button>
      </Row>
      <OfflineNote feature="hardwareDesk" />
    </View>
  );
  return (
    <>
      <ListTemplate<ReorderRule>
        title={t('Reorder')} grouped={false} search={{ value: search, onChange: setSearch, placeholder: t('Item ya supplier…') }} summary={header}
        data={rows} loading={list.isLoading} error={list.error} onRetry={() => void list.refetch()} refreshing={list.isRefetching} onRefresh={() => void list.refetch()} keyExtractor={(r) => r.id}
        renderItem={({ item: r }) => {
          const sv = severityMeta(r.severity);
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
              <ListRow onPress={() => router.push(`/products/${r.productId}` as never)} chevron
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{r.product?.name ?? '—'}</Text><StatusPill tone={sv.tone}>{sv.label}</StatusPill></Row>}
                subtitle={<View style={{ gap: 2 }}>
                  <Text size="xs" tone={r.needsReorder ? 'danger' : 'muted'}>{t('Stock {{s}} · point {{p}} · mangwana {{q}}', { s: `${qty(r.currentStock ?? 0)} ${r.product?.unit ?? ''}`, p: qty(r.reorderPoint), q: qty(r.reorderQty) })}</Text>
                  {r.preferredSupplier ? <Badge>{r.preferredSupplier}</Badge> : null}
                  {manage && <Row gap={1}><IconButton icon={Pencil} label={t('Badlein')} onPress={() => setForm(r)} /><IconButton icon={Trash2} label={t('Point hatayein')} variant="danger" onPress={() => remove(r)} /></Row>}
                </View>} />
            </View>
          );
        }}
        empty={<EmptyState icon={CheckCircle2} title={tab === 'need' ? t('Abhi kuch mangwana nahi') : t('Is list me kuch nahi')} message={t('Zaroori items par reorder point lagayein taake waqt par pata chale.')} />}
        fab={manage ? { icon: Plus, label: t('Naya point'), onPress: () => guard(() => setForm('new')) } : undefined}
      />
      <RuleSheet rule={form} onClose={() => setForm(null)} />
    </>
  );
}

function RuleSheet({ rule, onClose }: { rule: ReorderRule | 'new' | null; onClose: () => void }) {
  const th = useTheme();
  const open = rule !== null;
  const cur = rule && rule !== 'new' ? rule : null;
  const [item, setItem] = useState<{ id: string; name: string; unit: string } | null>(null);
  const [pick, setPick] = useState(false);
  const [point, setPoint] = useState<number | null>(null);
  const [min, setMin] = useState<number | null>(null);
  const [orderQty, setOrderQty] = useState<number | null>(null);
  const [supplier, setSupplier] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setItem(cur ? { id: cur.productId, name: cur.product?.name ?? '', unit: cur.product?.unit ?? '' } : null); setPoint(cur?.reorderPoint ?? null); setMin(cur?.minStock ?? null); setOrderQty(cur?.reorderQty ?? null); setSupplier(cur?.preferredSupplier ?? ''); setError('');
  }, [open, cur]);
  const run = async () => {
    const p = ruleProblem({ reorderPoint: point ?? 0, minStock: min ?? 0, reorderQty: orderQty ?? 0 });
    if (!item) return setError(t('Item chunein'));
    if (p === 'point') return setError(t('Reorder point 0 se zyada likhein'));
    if (p === 'min') return setError(t('Kam se kam wali had reorder point se bari nahi'));
    if (p === 'qty') return setError(t('Kitna mangwana hai likhein'));
    setBusy(true);
    try { await reorderRulesApi.upsert({ productId: item.id, reorderPoint: point ?? 0, minStock: min ?? 0, reorderQty: orderQty ?? 0, preferredSupplier: opt(supplier), isActive: true }); refreshHardware([KEYS.reorder]); toast.success(t('Reorder point save')); onClose(); }
    catch (e) { toast.error(errText(e, t('Save nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={cur ? t('Reorder point badlein') : t('Naya reorder point')} footer={<Button fullWidth size="lg" loading={busy} onPress={() => void run()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <ListRow title={item?.name ?? t('Item chunein')} chevron={!cur} onPress={cur ? undefined : () => setPick(true)} />
        <NumberInput label={t('Reorder point')} value={point} onChangeValue={setPoint} hint={item ? t('Itna {{unit}} reh jaye', { unit: item.unit }) : undefined} />
        <NumberInput label={t('Kam se kam')} value={min} onChangeValue={setMin} hint={t('Is se neeche laal')} />
        <NumberInput label={t('Kitna mangwana')} value={orderQty} onChangeValue={setOrderQty} />
        <Input label={t('Supplier')} value={supplier} onChangeText={setSupplier} placeholder={t('Naam / phone')} />
        {error ? <Text size="sm" tone="danger">{error}</Text> : null}
      </View>
      <ProductPicker open={pick} onClose={() => setPick(false)} includeRaw={false} variants={false} title={t('Item chunein')} onPick={(p) => setItem({ id: p.product.id, name: p.product.name, unit: p.product.unit })} />
    </Sheet>
  );
}
