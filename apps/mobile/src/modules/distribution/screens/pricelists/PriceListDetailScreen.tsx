/**
 * The rate grid of one price list: every item and its packs with the rule
 * price and the list's own rate. Typed rates are kept as a draft until Save;
 * an empty rate hands the row back to the rule. "Base ± %" fills every loaded
 * row at once. Quantity breaks are added per item. Excel import is a web
 * feature.
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Pencil, Save, Star, Trash2, Users, Wand2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Button, Card, confirm, EmptyState, IconButton, Input, ListRow, ListTemplate, Row, Segmented, Select, StatusPill, Text, toast, useDebouncedValue, useTheme,
} from '@/design';
import {
  DIST_KEY, distSetupApi, type ListBase, type PriceGrid, type PriceGridRow, type PriceList, type PriceListItemRow, type SavePriceList,
} from '../../api/distribution.api';
import { lookups, useCustomerRoster } from '../../api/setup-lookups';
import { DistributionGate } from '../../components/DistributionGate';
import { PriceListFormSheet } from '../../components/PriceListFormSheet';
import { keyOf, PriceRatesSheet } from '../../components/PriceRatesSheet';
import { CachedNote } from '../../components/parts';
import { CustomerPickSheet } from '../../components/SetupPickers';
import { rs } from '../../lib/meta';
import { inBatches, num, PRICE_LISTS_KEY, ruleText } from '../../lib/setup';

const LIMIT = 50;
type GridProduct = PriceGrid['products'][number];

export function PriceListDetailScreen() {
  return <DistributionGate title={t('Price lists')}><Body /></DistributionGate>;
}

function Body() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listsQ = useQuery({ queryKey: PRICE_LISTS_KEY, queryFn: distSetupApi.priceLists });
  const list = listsQ.data?.find((l) => l.id === id);
  if (listsQ.isLoading || !list) {
    return <ListTemplate<never> title={t('Price lists')} data={[]} loading={listsQ.isLoading} error={listsQ.error} onRetry={listsQ.refetch} keyExtractor={() => ''} renderItem={() => null} empty={<EmptyState title={t('Abhi koi price list nahi')} />} />;
  }
  return <Editor key={list.id} list={list} />;
}

function Editor({ list }: { list: PriceList }) {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const canManage = can(P.DISTRIBUTION_PRICELISTS_MANAGE);
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim(), 300);
  const [categoryId, setCategoryId] = useState('');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [fillBase, setFillBase] = useState<ListBase>(list.basedOn);
  const [fillPct, setFillPct] = useState(String(list.adjustPct ?? 0));
  const [open, setOpen] = useState<GridProduct | null>(null);
  const [editing, setEditing] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const gridQ = useInfiniteQuery({
    queryKey: [DIST_KEY, 'price-grid', list.id, q, categoryId],
    queryFn: ({ pageParam }) => distSetupApi.priceGrid(list.id, { search: q || undefined, categoryId: categoryId || undefined, page: pageParam, limit: LIMIT }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (all.length * LIMIT < last.total ? all.length + 1 : undefined),
    placeholderData: (p) => p,
  });
  const itemsQ = useQuery({
    queryKey: [DIST_KEY, 'price-items', list.id],
    queryFn: async () => {
      const out: PriceListItemRow[] = [];
      for (let p = 1; p <= 20; p++) {
        const r = await distSetupApi.priceItems(list.id, { page: p, limit: 500 });
        out.push(...r.items);
        if (out.length >= r.total || !r.items.length) break;
      }
      return out;
    },
  });
  const catsQ = useQuery({ queryKey: ['categories', 'names'], queryFn: lookups.categories, staleTime: 5 * 60_000 });
  const rosterQ = useCustomerRoster(assigning && canManage);

  const products = useMemo(() => gridQ.data?.pages.flatMap((p) => p.products) ?? [], [gridQ.data]);
  const rowsLoaded = useMemo(() => products.flatMap((p) => p.rows.map((r) => ({ p, r }))), [products]);
  const showCost = rowsLoaded.some((x) => x.r.cost !== undefined);

  const breaks = useMemo(() => {
    const m = new Map<string, PriceListItemRow[]>();
    for (const it of itemsQ.data ?? []) {
      if (!(Number(it.minQty) > 0) || it.variantId) continue;
      const k = keyOf(it.productId, it.unitId ?? null);
      m.set(k, [...(m.get(k) ?? []), it].sort((a, b) => Number(a.minQty) - Number(b.minQty)));
    }
    return m;
  }, [itemsQ.data]);

  const dirtyKeys = Object.keys(draft);
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: [DIST_KEY, 'price-grid', list.id] });
    void qc.invalidateQueries({ queryKey: [DIST_KEY, 'price-items', list.id] });
    void qc.invalidateQueries({ queryKey: PRICE_LISTS_KEY });
  };

  const save = useMutation({
    mutationFn: () => distSetupApi.savePriceItems(list.id, Object.entries(draft).map(([k, v]) => {
      const [productId, unitId] = k.split('|');
      return { productId, unitId: unitId || null, price: num(v) ?? 0 };
    })),
    onSuccess: (r) => {
      setDraft({});
      invalidate();
      toast.success(t('{{saved}} rate save{{value}}', { saved: r.saved, value: r.removed ? t(' · {{removed}} rule par wapas', { removed: r.removed }) : '' }));
    },
  });
  const update = useMutation({
    mutationFn: (body: Partial<SavePriceList>) => distSetupApi.updatePriceList(list.id, body),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: [DIST_KEY] }); setEditing(false); toast.success(t('Save ho gaya')); },
  });
  const del = useMutation({
    mutationFn: () => distSetupApi.deletePriceList(list.id),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: [DIST_KEY] });
      toast.success(r.deleted ? t('List mita di') : t('List band kar di — {{customers}} customer ya Settings is par the', { customers: r.customers }));
      router.back();
    },
  });
  const assign = useMutation({
    mutationFn: async (ids: string[]) => {
      const roster = rosterQ.data ?? [];
      const initial = new Set(roster.filter((c) => c.priceListId === list.id).map((c) => c.id));
      const added = ids.filter((x) => !initial.has(x));
      const removed = [...initial].filter((x) => !ids.includes(x));
      const failed = await inBatches([...added.map((cid) => ({ cid, v: list.id })), ...removed.map((cid) => ({ cid, v: null as string | null }))], 5, (x) => distSetupApi.patchCustomer(x.cid, { priceListId: x.v }));
      return { changed: added.length + removed.length, failed };
    },
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: [DIST_KEY] });
      ['customers', 'customers-for-pos', 'customer-directory'].forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));
      if (r.failed) toast.error(t('{{failed}} customers save nahi hue — dobara koshish karein', { failed: r.failed }));
      else { toast.success(t('{{value}} customers badle', { value: r.changed })); setAssigning(false); }
    },
  });

  const baseOf = (r: PriceGridRow, b: ListBase) => (b === 'COST' ? r.cost ?? null : b === 'WHOLESALE' ? r.wholesale ?? r.retail : r.retail);
  const fill = () => {
    const pct = Number(fillPct);
    if (!Number.isFinite(pct)) return;
    const next = { ...draft };
    let n = 0;
    for (const { p, r } of rowsLoaded) {
      const base = baseOf(r, fillBase);
      if (!(base && base > 0)) continue;
      next[keyOf(p.productId, r.unitId)] = String(Math.round(base * (1 + pct / 100)));
      n++;
    }
    setDraft(next);
    toast.success(t('{{n}} rates bhar diye — dekh kar Save karein', { n }));
  };
  const clearLoaded = () => {
    const next = { ...draft };
    for (const { p, r } of rowsLoaded) if (r.listPrice != null) next[keyOf(p.productId, r.unitId)] = '';
    setDraft(next);
  };
  const applyChanges = (ch: Record<string, string | null>) => setDraft((d) => {
    const n = { ...d };
    for (const [k, v] of Object.entries(ch)) { if (v === null) delete n[k]; else n[k] = v; }
    return n;
  });

  const confirmDelete = async () => {
    if (await confirm({ title: t('{{name}} mitayein?', { name: list.name }), message: t('Customers ya Settings is list par hon to list sirf band hogi, mitegi nahi.'), confirmLabel: t('Mitayein'), tone: 'danger' })) del.mutate();
  };

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <Card>
        <Row gap={2} justify="between">
          <View style={{ flex: 1 }}>
            <Text size="sm" tone="muted">{t('List me na ho to: {{rule}} · {{rates}} apne rates · {{customers}} customers', { rule: ruleText(list), rates: list.itemCount ?? 0, customers: list.customerCount ?? 0 })}</Text>
          </View>
          {list.isDefault && <StatusPill tone="warning" icon={Star}>{t('Default')}</StatusPill>}
          {!list.isActive && <StatusPill tone="danger">{t('Band')}</StatusPill>}
        </Row>
        {canManage && <Button style={{ marginTop: th.space(3) }} variant="secondary" icon={Users} onPress={() => setAssigning(true)}>{t('Customers')}</Button>}
      </Card>
      {canManage && (
        <Card title={t('Jaldi bharein')} description={t('Is page ke sab rows: base ± % (poore rupay)')}>
          <View style={{ gap: th.space(3) }}>
            <Segmented size="sm" value={fillBase} onChange={setFillBase}
              options={[{ value: 'PRICE', label: t('Retail') }, { value: 'WHOLESALE', label: t('Wholesale') }, ...(showCost ? [{ value: 'COST' as ListBase, label: t('Cost') }] : [])]} />
            <Row gap={2} align="end">
              <Input containerStyle={{ flex: 1 }} ltr label={t('Percent')} value={fillPct} onChangeText={(v) => setFillPct(v.replace(/[^\d.-]/g, ''))} keyboardType="numbers-and-punctuation" prefix="%" />
              <Button icon={Wand2} onPress={fill} disabled={!rowsLoaded.length}>{t('Bharein')}</Button>
            </Row>
            <Button variant="ghost" size="sm" onPress={clearLoaded} disabled={!rowsLoaded.some((x) => x.r.listPrice != null)}>{t('Sab rule par')}</Button>
          </View>
        </Card>
      )}
      <Select value={categoryId} onChange={setCategoryId} options={[{ value: '', label: t('Sab categories') }, ...(catsQ.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
      <CachedNote query={gridQ} />
    </View>
  );

  return (
    <>
      <ListTemplate<GridProduct>
        title={list.name}
        subtitle={ruleText(list)}
        actions={canManage ? (
          <Row gap={1}>
            <IconButton icon={Pencil} label={t('Badlein')} onPress={() => setEditing(true)} />
            <IconButton icon={Trash2} label={t('List mitayein')} variant="danger" onPress={confirmDelete} />
          </Row>
        ) : undefined}
        search={{ value: search, onChange: setSearch, placeholder: t('Item, SKU ya barcode') }}
        summary={summary}
        data={products}
        loading={gridQ.isLoading}
        error={gridQ.error}
        onRetry={gridQ.refetch}
        refreshing={gridQ.isRefetching}
        onRefresh={gridQ.refetch}
        onEndReached={() => { if (gridQ.hasNextPage && !gridQ.isFetchingNextPage) void gridQ.fetchNextPage(); }}
        keyExtractor={(p) => p.productId}
        renderItem={({ item: p }) => (
          <ListRow
            title={p.name}
            subtitle={<View style={{ gap: 2 }}>
              {p.rows.map((r) => {
                const k = keyOf(p.productId, r.unitId);
                const typed = draft[k];
                const value = typed ?? (r.listPrice != null ? String(r.listPrice) : '');
                const edited = typed !== undefined;
                const nb = breaks.get(k)?.length ?? 0;
                return (
                  <Row key={k} gap={2} justify="between">
                    <Text size="xs" tone="muted">{r.conversionRate > 1 ? `${r.unitName} (${r.conversionRate})` : r.unitName}{nb ? ` · ${nb}×` : ''}</Text>
                    <Text size="sm" weight={value ? 'bold' : 'regular'} tone={edited ? 'warning' : value ? 'default' : 'muted'}>
                      {value ? rs(Number(value)) : `${t('Rule')} ${rs(r.rulePrice)}`}
                    </Text>
                  </Row>
                );
              })}
            </View>}
            chevron divider onPress={() => setOpen(p)}
          />
        )}
        empty={<EmptyState icon={Pencil} title={q || categoryId ? t('Is search me koi item nahi') : t('Koi item nahi — pehle Products me maal daalein')} />}
        fab={canManage && dirtyKeys.length ? { icon: Save, label: t('Save karein ({{count}})', { count: dirtyKeys.length }), onPress: () => save.mutate() } : undefined}
      />
      {open && (
        <PriceRatesSheet list={list} product={open} draft={draft} breaks={breaks} canManage={canManage} onClose={() => setOpen(null)} onApply={applyChanges} />
      )}
      {editing && <PriceListFormSheet list={list} saving={update.isPending} onClose={() => setEditing(false)} onSave={(b) => update.mutate(b)} />}
      {assigning && (
        <CustomerPickSheet
          open onClose={() => setAssigning(false)} title={t('{{name}} — customers', { name: list.name })}
          description={t('Nishan wale customers is list ke rate par khareedte hain — POS aur booker app dono par.')}
          customers={rosterQ.data ?? []} loading={rosterQ.isLoading} initial={(rosterQ.data ?? []).filter((c) => c.priceListId === list.id).map((c) => c.id)}
          allowEmpty confirmLabel={t('Save karein')} busy={assign.isPending}
          views={[
            { value: 'all', label: t('Sab'), test: () => true },
            { value: 'on', label: t('Is list wale'), test: (c, picked) => picked.has(c.id) },
          ]}
          onConfirm={(ids) => assign.mutate(ids)}
        />
      )}
    </>
  );
}
