/**
 * Product library (same endpoints as the web): ready-made products for the
 * shop's industry, such as DRAP medicines with formula and MRP or the
 * grocery catalog. Search (or scan a barcode), filter by category and
 * company, pick rows or every result, set the margin and opening stock, then
 * add them in a background job with live progress. Needs internet.
 */

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Beaker, BookOpen, CheckCircle2, CheckSquare, Package, PackagePlus, Search, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/core/auth/store';
import { formatPKR } from '@/core/format';
import { Scanner } from '@/core/hardware/scanner';
import { t } from '@/core/i18n';
import { onlineNeededText } from '@/core/offline';
import {
  Badge, Button, Card, Checkbox, ChipGroup, EmptyState, ListRow, ListTemplate, ProgressBar, Row, Select, Sheet, StatTile, Text, toast, useTheme,
} from '@/design';
import { NumberInput } from '../components/fields';
import { ProductThumb } from '../components/ProductThumb';
import { INV, useOnline, useRefreshInventory } from '../lib/shared';
import { libraryApi, type LibraryFilters, type LibraryItem, type LibraryJob } from './api';

const ALL = '__all';

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

const saltLine = (it: LibraryItem) => (it.salts ?? []).map((s) => [s.name, s.strength].filter(Boolean).join(' ')).join(' + ');

export function LibraryScreen() {
  const th = useTheme();
  const online = useOnline();
  const refreshInv = useRefreshInventory();
  const shopId = useAuthStore((s) => s.currentShopId);
  const [library, setLibrary] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 350);
  const [category, setCategory] = useState(ALL);
  const [company, setCompany] = useState(ALL);
  const [formula, setFormula] = useState<{ key: string; label: string } | null>(null);
  const [selected, setSelected] = useState<Map<string, LibraryItem>>(new Map());
  const [allMode, setAllMode] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [review, setReview] = useState(false);
  const [margin, setMargin] = useState<number | null>(null);
  const [stock, setStock] = useState<number | null>(null);
  const [genBarcodes, setGenBarcodes] = useState(false);
  const [scan, setScan] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const meta = useQuery({ queryKey: [INV, 'library-meta', library ?? ''], queryFn: () => libraryApi.meta(library), staleTime: 5 * 60_000 });
  const m = meta.data;
  const pharmacy = m?.kind === 'pharmacy';
  useEffect(() => { if (m?.defaultMargin != null && margin == null) setMargin(m.defaultMargin); }, [m?.defaultMargin]); // eslint-disable-line react-hooks/exhaustive-deps

  const filters: LibraryFilters = useMemo(() => ({
    library: m?.library, q: q || undefined, category: category === ALL ? undefined : category,
    manufacturer: company === ALL ? undefined : company, formula: formula?.key,
  }), [m?.library, q, category, company, formula]);
  useEffect(() => setAllMode(false), [filters]);

  const list = useInfiniteQuery({
    queryKey: [INV, 'library-items', filters],
    queryFn: ({ pageParam }) => libraryApi.items(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    enabled: !!m?.available,
  });
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data]);
  const total = list.data?.pages[0]?.total ?? 0;

  const job = useQuery({
    queryKey: [INV, 'library-job', jobId],
    queryFn: () => libraryApi.job(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => (query.state.data?.status === 'running' || !query.state.data ? 800 : false),
  });
  const finished = !!job.data && job.data.status !== 'running';
  useEffect(() => {
    if (finished && job.data!.created > 0) { void refreshInv(); void list.refetch(); }
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (it: LibraryItem) => {
    if (it.alreadyAdded) return;
    setAllMode(false);
    setSelected((cur) => { const n = new Map(cur); if (n.has(it.id)) n.delete(it.id); else n.set(it.id, it); return n; });
  };
  const count = allMode ? total : selected.size;
  const marginNum = Math.min(99, Math.max(0, margin ?? 0));

  const start = async () => {
    if (!online) { toast.warning(onlineNeededText('settings')); return; }
    if (!m) return;
    setStarting(true);
    try {
      const res = await libraryApi.startImport({
        library: m.library,
        ...(allMode ? { all: { ...filters, library: undefined } } : { ids: [...selected.keys()] }),
        marginPercent: marginNum,
        shopId: shopId ?? undefined,
        openingStock: stock && stock > 0 ? stock : undefined,
        prices: Object.fromEntries(Object.entries(prices).filter(([, v]) => v > 0).map(([id, v]) => [id, { price: v }])),
        generateBarcodes: genBarcodes,
      });
      setReview(false);
      setJobId(res.id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('Add nahi hue — dobara koshish karein'));
    } finally {
      setStarting(false);
    }
  };

  const header = (
    <View style={{ gap: th.space(3) }}>
      {m?.available && (
        <Row gap={2}>
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={pharmacy ? t('Dawaiyan') : t('Products')} value={<Text size="xl" weight="bold">{(m.total ?? 0).toLocaleString('en-PK')}</Text>}
            hint={pharmacy ? `${m.source ?? ''} ${m.updated ?? ''}`.trim() : t(m.label)} />
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={t('Chune')} value={<Text size="xl" weight="bold">{count.toLocaleString('en-PK')}</Text>} />
        </Row>
      )}
      {(m?.libraries.length ?? 0) > 1 && (
        <Select label={t('Library')} value={m?.library ?? null} onChange={(v) => { setLibrary(v); setCategory(ALL); setCompany(ALL); setFormula(null); setSelected(new Map()); }}
          options={(m?.libraries ?? []).map((l) => ({ value: l.key, label: `${t(l.label)} (${l.count})` }))} />
      )}
      {m?.available && (
        <>
          <ChipGroup value={category} onChange={setCategory} style={{ marginHorizontal: -th.space(4) }}
            options={[{ value: ALL, label: pharmacy ? t('Har form') : t('Sab') }, ...(m.categories ?? []).slice(0, 40).map((c) => ({ value: c.name, label: t(c.name), count: c.count }))]} />
          <Select label={pharmacy ? t('Company') : t('Brand')} value={company} onChange={setCompany} searchable
            options={[{ value: ALL, label: pharmacy ? t('Har company') : t('Har brand') }, ...(m.companies ?? []).map((c) => ({ value: c.name, label: `${c.name} (${c.count})` }))]} />
          {formula && (
            <Button size="sm" variant="secondary" icon={X} onPress={() => setFormula(null)}>{t('Same formula: {{name}}', { name: formula.label })}</Button>
          )}
          {m.estimates && <Card tone="warning"><Text size="sm">{t('Andaza price — apni price check kar lein')}</Text></Card>}
          <Row gap={2} wrap>
            {allMode
              ? <Button size="sm" variant="ghost" icon={X} onPress={() => setAllMode(false)}>{t('Sab {{total}} results chune (jo pehle se hain wo chhoot jayenge)', { total: total.toLocaleString('en-PK') })}</Button>
              : <Button size="sm" variant="secondary" icon={CheckSquare} disabled={!total} onPress={() => { setSelected(new Map()); setAllMode(true); }}>{t('Sab {{total}} results chunein', { total: total.toLocaleString('en-PK') })}</Button>}
            {selected.size > 0 && !allMode && <Button size="sm" variant="ghost" onPress={() => setSelected(new Map())}>{t('Saaf karein')}</Button>}
          </Row>
          <Text size="xs" tone="muted">{t('{{total}} mile', { total: total.toLocaleString('en-PK') })}</Text>
        </>
      )}
    </View>
  );

  return (
    <>
      <ListTemplate
        title={t('Library se products')}
        subtitle={pharmacy ? t('DRAP ki dawaiyan — formula, company aur MRP ke saath') : t('Tayyar products — chunein aur add karein')}
        search={m?.available ? { value: search, onChange: setSearch, placeholder: pharmacy ? t('Naam, formula, company ya reg. no…') : t('Naam, brand ya barcode…'), onScan: () => setScan(true) } : undefined}
        summary={header}
        data={m?.available ? items : []}
        loading={meta.isLoading || (list.isLoading && !!m?.available)}
        error={meta.error ?? list.error}
        onRetry={() => { void meta.refetch(); void list.refetch(); }}
        onEndReached={() => { if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage(); }}
        keyExtractor={(it) => it.id}
        renderItem={({ item: it }) => {
          const on = allMode ? !it.alreadyAdded : selected.has(it.id);
          return (
            <ListRow leading={<ProductThumb name={it.name} category={it.category ?? undefined} url={it.imageUrl ?? undefined} size={40} />}
              title={it.name} selected={on} disabled={it.alreadyAdded}
              subtitle={[pharmacy ? saltLine(it) : it.category && t(it.category), it.company, pharmacy ? it.pack : null].filter(Boolean).join(' · ')}
              trailing={it.alreadyAdded ? <Badge tone="success">{t('Added')}</Badge> : (
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {it.needsPrice ? <Text size="xs" tone="warning" weight="semibold">{prices[it.id] ? formatPKR(prices[it.id]) : t('Price likhein')}</Text> : <Text size="sm" weight="semibold" ltr>{formatPKR(it.price)}</Text>}
                  {pharmacy && (it.sameFormula ?? 0) > 1 && it.formulaKey && formula?.key !== it.formulaKey
                    ? <Button size="xs" variant="ghost" icon={Beaker} onPress={() => setFormula({ key: it.formulaKey!, label: saltLine(it) })}>{t('Same formula ({{count}})', { count: it.sameFormula })}</Button>
                    : on ? <CheckCircle2 size={20} color={th.colors.brand.solid} /> : null}
                </View>
              )}
              onPress={() => toggle(it)} />
          );
        }}
        empty={m && !m.available
          ? <EmptyState icon={BookOpen} title={t('Coming soon')} message={t('{{label}} ke liye tayyar products ki list abhi ban rahi hai. Tab tak "Naya" ya Excel import se products daalein.', { label: t(m.label) })} />
          : <EmptyState icon={Search} title={t('Kuch nahi mila')} message={t('Doosra lafz likhein ya filter hatayein.')} />}
        fab={count ? { icon: PackagePlus, label: t('{{count}} add karein', { count: count.toLocaleString('en-PK') }), onPress: () => setReview(true) } : undefined}
      />

      {scan && <Scanner title={t('Barcode scan')} onClose={() => setScan(false)} onCode={(code: string) => { setScan(false); setSearch(code); }} />}

      <Sheet open={review} onClose={() => setReview(false)} title={t('{{count}} add karein', { count: count.toLocaleString('en-PK') })}
        footer={<Button fullWidth icon={PackagePlus} loading={starting} onPress={() => void start()}>{t('{{count}} add karein', { count: count.toLocaleString('en-PK') })}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <NumberInput label={pharmacy ? t('Margin % (MRP se)') : t('Margin % (jin ki cost nahi)')} value={margin} onChangeValue={setMargin} />
          <NumberInput label={t('Opening stock (har ek)')} value={stock} onChangeValue={setStock} />
          <Checkbox value={genBarcodes} onChange={setGenBarcodes} label={t('Jin ka barcode nahi, un ka Nafaa barcode bana do')} />
          {!allMode && [...selected.values()].filter((i) => i.needsPrice).slice(0, 100).map((i) => (
            <NumberInput key={i.id} label={t('{{name}} — price', { name: i.name })} value={prices[i.id] ?? null} onChangeValue={(v) => setPrices((p) => ({ ...p, [i.id]: v ?? 0 }))} />
          ))}
          <Text size="xs" tone="muted">{pharmacy ? t('Sale price = MRP. Cost = MRP se aap ka margin kam.') : t('Jo pehle se hai wo dobara nahi banta.')}</Text>
          {m?.openFoodFacts && <Text size="xs" tone="muted">{t('Barcodes: Open Food Facts (ODbL)')}</Text>}
        </View>
      </Sheet>

      <Sheet open={!!jobId} onClose={() => { if (finished) setJobId(null); }} title={finished ? t('Kaam mukammal') : t('Products ban rahe hain…')}
        footer={finished ? (
          <Row gap={2}>
            <Button variant="secondary" onPress={() => { setJobId(null); setSelected(new Map()); setAllMode(false); }}>{t('Aur chunein')}</Button>
            <Button style={{ flex: 1 }} icon={Package} onPress={() => { setJobId(null); router.replace('/products' as never); }}>{t('Products dekhein')}</Button>
          </Row>
        ) : undefined}>
        <JobView job={job.data} />
      </Sheet>
    </>
  );
}

function JobView({ job }: { job?: LibraryJob }) {
  const th = useTheme();
  const pct = job && job.total ? job.done / job.total : 0;
  return (
    <View style={{ gap: th.space(3) }}>
      <ProgressBar value={job?.status === 'running' || !job ? Math.max(pct, 0.03) : 1} height={10} />
      <Text size="sm" tone="muted">{job ? t('{{done}} / {{total}} dekhe', { done: job.done, total: job.total }) : t('Shuru ho raha hai…')}</Text>
      {job && (
        <Row gap={2} wrap>
          <StatTile style={{ flex: 1, minWidth: 120 }} tone="success" label={t('Naye bane')} value={<Text size="xl" weight="bold">{job.created}</Text>} />
          <StatTile style={{ flex: 1, minWidth: 120 }} label={t('Pehle se the')} value={<Text size="xl" weight="bold">{job.skipped}</Text>} />
          {job.needsPrice > 0 && <StatTile style={{ flex: 1, minWidth: 120 }} tone="warning" label={t('Price nahi thi')} value={<Text size="xl" weight="bold">{job.needsPrice}</Text>} />}
          {job.saltsCreated > 0 && <StatTile style={{ flex: 1, minWidth: 120 }} tone="info" label={t('Naye salts')} value={<Text size="xl" weight="bold">{job.saltsCreated}</Text>} />}
        </Row>
      )}
      {job?.error && <Card tone="danger"><Text size="sm">{job.error}</Text></Card>}
    </View>
  );
}
