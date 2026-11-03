/**
 * Order from one supplier: the supplier's catalog at this shop's own prices
 * (price list and schemes), "Stock kam hai" suggestions from the shop's low
 * stock, and a cart priced by the supplier's server before the order is
 * sent. The cart is kept per supplier on the phone.
 */

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { BadgePercent, Minus, Package, Plus, Send, ShoppingCart, Sparkles, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { kv } from '@/core/storage/kv';
import { t } from '@/core/i18n';
import {
  Amount, Button, Card, EmptyState, ErrorState, Icon, IconButton, ListTemplate, PressableScale, Row, Segmented, Sheet, Text, TextArea, confirm, toast, useDebouncedValue, useTheme,
} from '@/design';
import { rs } from '@/modules/distribution/lib/meta';
import { TRADE_KEY, tradeApi, tradeError, type CartLine, type CatalogItem, type CartPreview, type Pack } from '../api/trade.api';
import { CachedLine, Pill, useOverview } from '../components/shared';

interface CartRow { productId: string; unitId: string | null; qty: number; name: string; unitName: string; price: number; conversionRate: number }
const key = (p: string, u: string | null) => `${p}|${u ?? ''}`;
const cartKey = (linkId: string) => `nafaa-trade-cart-${linkId}`;
const newRef = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function OrderScreen() {
  const th = useTheme();
  const { linkId = '' } = useLocalSearchParams<{ linkId: string }>();
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const term = useDebouncedValue(search.trim(), 250);
  const [cart, setCart] = useState<Map<string, CartRow>>(() => new Map(kv.get<CartRow[]>(cartKey(linkId), []).map((r) => [key(r.productId, r.unitId), r])));
  const [cartOpen, setCartOpen] = useState(false);
  const [note, setNote] = useState('');
  const [clientRef] = useState(newRef);
  useEffect(() => { kv.set(cartKey(linkId), [...cart.values()]); }, [linkId, cart]);

  const q = useInfiniteQuery({
    queryKey: [TRADE_KEY, 'catalog', linkId, term, categoryId],
    queryFn: ({ pageParam }) => tradeApi.catalog(linkId, { search: term || undefined, categoryId: categoryId || undefined, page: pageParam, limit: 40 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const sug = useQuery({ queryKey: [TRADE_KEY, 'suggestions', linkId], queryFn: () => tradeApi.suggestions(linkId), retry: false, staleTime: 60_000 });
  const first = q.data?.pages[0];
  const items = useMemo(() => q.data?.pages.flatMap((p) => p.items) ?? [], [q.data]);

  const lines: CartLine[] = useMemo(() => [...cart.values()].map((r) => ({ productId: r.productId, unitId: r.unitId, qty: r.qty })), [cart]);
  const preview = useQuery({
    queryKey: [TRADE_KEY, 'preview', linkId, lines],
    queryFn: () => tradeApi.preview(linkId, lines),
    enabled: lines.length > 0, placeholderData: keepPreviousData, retry: false,
  });
  const place = useMutation({
    mutationFn: () => tradeApi.place({ linkId, items: lines, note: note.trim() || undefined, clientRef }),
    onSuccess: (r) => {
      toast.success(t('Order {{value}} bhej diya', { value: r.order.orderNumber ?? '' }));
      r.warnings.forEach((w) => toast.warning(w));
      setCart(new Map()); setCartOpen(false); setNote('');
      router.replace(`/network/orders/${r.order.id}`);
    },
    onError: (e) => toast.error(tradeError(e)),
  });

  const setQty = (item: { productId: string; name: string }, pack: Pack, qty: number) => setCart((prev) => {
    const next = new Map(prev);
    const k = key(item.productId, pack.unitId);
    if (qty <= 0) next.delete(k);
    else next.set(k, { productId: item.productId, unitId: pack.unitId, qty, name: item.name, unitName: pack.unitName, price: pack.price, conversionRate: pack.conversionRate });
    return next;
  });

  const count = cart.size;
  const total = preview.data?.total ?? [...cart.values()].reduce((s, r) => s + r.qty * r.price, 0);
  const minOrder = first?.minOrderValue ?? 0;
  const short = minOrder > 0 && total < minOrder;

  const suggestions = sug.data?.items ?? [];
  const addSuggestions = () => {
    setCart((prev) => {
      const n = new Map(prev);
      for (const s of suggestions) {
        const k = key(s.seller.productId, s.suggest.unitId);
        if (!n.has(k)) n.set(k, { productId: s.seller.productId, unitId: s.suggest.unitId, qty: s.suggest.qty, name: s.seller.name, unitName: s.suggest.unitName, price: s.suggest.price, conversionRate: s.suggest.conversionRate });
      }
      return n;
    });
    toast.success(t('Kam stock wale items cart me daal diye'));
  };

  const summary = (
    <View style={{ gap: th.space(3) }}>
      {first && (
        <Text size="xs" tone="muted">
          {t('{{value}}{{total}} items{{value2}}', {
            value: first.priceListName ? t('Aap ki price list: {{priceListName}} · ', { priceListName: first.priceListName }) : '',
            total: first.total, value2: minOrder ? t(' · Kam se kam Order {{minOrder}}', { minOrder: rs(minOrder) }) : '',
          })}
        </Text>
      )}
      <CachedLine query={q} />
      {suggestions.length > 0 && !term && !categoryId && (
        <Card tone="warning" title={t('Stock kam hai')} action={<Button size="sm" variant="secondary" onPress={addSuggestions}>{t('Add all')}</Button>}>
          {suggestions.slice(0, 5).map((s) => (
            <Row key={s.mine.productId} gap={2} style={{ paddingVertical: 4 }}>
              <Icon icon={Sparkles} size={14} tone="subtle" />
              <View style={{ flex: 1 }}>
                <Text size="sm" weight="semibold" numberOfLines={1}>{s.seller.name}</Text>
                <Text size="2xs" tone="muted" numberOfLines={1}>{t('Aap ke paas {{stock}} {{unit}} · had {{lowStockAlert}}', { stock: s.mine.stock, unit: s.mine.unit, lowStockAlert: s.mine.lowStockAlert })}</Text>
              </View>
              <Text size="xs" weight="semibold">{`${s.suggest.qty} ${s.suggest.unitName}`}</Text>
            </Row>
          ))}
        </Card>
      )}
    </View>
  );

  if (q.isError && !q.data) {
    return (
      <ListTemplate<CatalogItem> title={t('Order')} data={[]} keyExtractor={(i) => i.productId} renderItem={() => null}
        empty={<ErrorState error={q.error} onRetry={q.refetch} />} />
    );
  }

  return (
    <>
      <ListTemplate<CatalogItem>
        title={first?.seller?.name ?? t('Order')}
        subtitle={t('Order from supplier')}
        search={{ value: search, onChange: setSearch, placeholder: t('Item ka naam, SKU ya barcode') }}
        filters={first && first.categories.length > 0 ? { value: categoryId, onChange: setCategoryId, options: [{ value: '', label: t('Sab categories') }, ...first.categories.map((c) => ({ value: c.id, label: c.name }))] } : undefined}
        summary={summary}
        data={items}
        loading={q.isLoading}
        refreshing={q.isRefetching}
        onRefresh={q.refetch}
        onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage(); }}
        keyExtractor={(i) => i.productId}
        renderItem={({ item }) => <ItemRow item={item} cart={cart} onSet={setQty} />}
        empty={<EmptyState icon={Package} title={t('Is talaash me koi item nahi.')} />}
        fab={count ? { icon: ShoppingCart, label: `${t('{{count}} items', { count })} · ${rs(total)}`, onPress: () => setCartOpen(true) } : undefined}
      />
      <Sheet open={cartOpen} onClose={() => setCartOpen(false)} title={t('Cart')}
        footer={(
          <View style={{ gap: th.space(2) }}>
            {short && <Text size="xs" weight="medium" tone="warning">{t('Kam se kam Order {{minOrder}} ka hona chahiye.', { minOrder: rs(minOrder) })}</Text>}
            <Button fullWidth size="xl" icon={Send} loading={place.isPending} disabled={short || !preview.data?.lines.length} onPress={() => place.mutate()}>{t('Send order')}</Button>
          </View>
        )}>
        <CartPanel cart={cart} preview={preview.data} loading={preview.isFetching} note={note} setNote={setNote}
          onQty={(r, qty) => setCart((prev) => { const n = new Map(prev); const k = key(r.productId, r.unitId); if (qty <= 0) n.delete(k); else n.set(k, { ...r, qty }); return n; })}
          onClear={async () => { if (await confirm({ title: t('Clear'), tone: 'danger', confirmLabel: t('Clear') })) setCart(new Map()); }} />
      </Sheet>
    </>
  );
}

function Stepper({ qty, onChange }: { qty: number; onChange: (q: number) => void }) {
  const th = useTheme();
  const btn = { width: 44, height: 44, borderRadius: th.radius('lg'), alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: th.colors.surface };
  return (
    <Row gap={1} style={{ backgroundColor: th.colors.surfaceMuted, borderRadius: th.radius('lg'), padding: 2 }}>
      <PressableScale accessibilityLabel={t('Kam')} onPress={() => onChange(qty - 1)} style={btn}><Icon icon={Minus} size={18} /></PressableScale>
      <Text weight="bold" ltr tabular align="center" style={{ minWidth: 36 }}>{String(qty)}</Text>
      <PressableScale accessibilityLabel={t('Zyada')} onPress={() => onChange(qty + 1)} style={btn}><Icon icon={Plus} size={18} /></PressableScale>
    </Row>
  );
}

function ItemRow({ item, cart, onSet }: { item: CatalogItem; cart: Map<string, CartRow>; onSet: (i: CatalogItem, p: Pack, q: number) => void }) {
  const th = useTheme();
  const [packIdx, setPackIdx] = useState(() => Math.max(0, item.packs.length - 1));
  const pack = item.packs[packIdx] ?? item.packs[0];
  if (!pack) return null;
  const inCart = cart.get(key(item.productId, pack.unitId))?.qty ?? 0;
  const sub = [item.brandName, item.sku].filter(Boolean).join(' · ');
  return (
    <View style={{ padding: th.space(3), gap: th.space(2), borderBottomWidth: 1, borderBottomColor: th.colors.border }}>
      <Row gap={3} align="start">
        <View style={{ width: 48, height: 48, borderRadius: th.radius('md'), backgroundColor: th.colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
          <Icon icon={Package} size={22} tone="subtle" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text weight="semibold" numberOfLines={2}>{item.name}</Text>
          {!!sub && <Text size="xs" tone="muted" numberOfLines={1}>{sub}</Text>}
        </View>
      </Row>
      <Row gap={1.5} wrap>
        {!item.inStock && <Pill tone="rose">{t('Supplier ke paas khatam')}</Pill>}
        {item.schemes.slice(0, 2).map((s) => <Pill key={s.id} tone="green">{s.label}</Pill>)}
        {item.mine && <Pill tone={item.mine.low ? 'amber' : 'slate'}>{t('Aap ke paas {{stock}}', { stock: item.mine.stock })}</Pill>}
      </Row>
      {item.packs.length > 1 && (
        <Segmented size="sm" value={String(packIdx)} onChange={(v) => setPackIdx(Number(v))}
          options={item.packs.map((p, i) => ({ value: String(i), label: p.conversionRate > 1 ? `${p.unitName} (${p.conversionRate})` : p.unitName }))} />
      )}
      <Row gap={3} justify="between">
        <View style={{ flexShrink: 1 }}>
          <Row gap={1} align="end">
            <Amount value={pack.price} size="lg" weight="bold" />
            <Text size="xs" tone="muted">{`/ ${pack.unitName}`}</Text>
          </Row>
          {pack.retail > pack.price && <Text size="2xs" tone="muted">{t('Retail {{retail}}', { retail: rs(pack.retail) })}</Text>}
        </View>
        {inCart ? <Stepper qty={inCart} onChange={(q) => onSet(item, pack, q)} />
          : <Button icon={Plus} size="lg" onPress={() => onSet(item, pack, 1)}>{t('Add')}</Button>}
      </Row>
    </View>
  );
}

function CartPanel({ cart, preview, loading, note, setNote, onQty, onClear }: {
  cart: Map<string, CartRow>; preview?: CartPreview; loading: boolean; note: string; setNote: (v: string) => void;
  onQty: (r: CartRow, q: number) => void; onClear: () => void;
}) {
  const th = useTheme();
  const rows = [...cart.values()];
  const priced = (r: CartRow) => preview?.lines.find((l) => l.productId === r.productId && (l.unitId ?? null) === r.unitId);
  if (!rows.length) return <EmptyState compact icon={ShoppingCart} title={t('Cart khali hai')} message={t('Items ke saamne \'Daalein\' dabayein.')} />;
  return (
    <View style={{ gap: th.space(3) }}>
      {rows.map((r) => {
        const l = priced(r);
        return (
          <Row key={key(r.productId, r.unitId)} gap={2} align="start">
            <View style={{ flex: 1, gap: 2 }}>
              <Text weight="semibold" numberOfLines={2}>{r.name}</Text>
              <Text size="xs" tone="muted">{`${r.qty} ${r.unitName} × ${rs(l?.price ?? r.price)}`}</Text>
              {l?.schemeNote && <Text size="xs" weight="medium" tone="success">{l.schemeNote}{l.freeBaseQty > 0 ? t(' · {{freeBaseQty}} free', { freeBaseQty: l.freeBaseQty }) : ''}</Text>}
              <View style={{ alignSelf: 'flex-start', marginTop: 4 }}><Stepper qty={r.qty} onChange={(q) => onQty(r, q)} /></View>
            </View>
            <Amount value={l?.total ?? r.qty * r.price} weight="semibold" />
            <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => onQty(r, 0)} />
          </Row>
        );
      })}
      <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: th.colors.border, paddingTop: th.space(3) }}>
        <Row justify="between"><Text size="sm" tone="muted">{t('Items')}</Text><Amount value={preview?.subtotal ?? 0} size="sm" /></Row>
        {(preview?.schemeDiscount ?? 0) > 0 && <Row justify="between"><Text size="sm" tone="success">{t('Scheme')}</Text><Amount value={-(preview?.schemeDiscount ?? 0)} size="sm" tone="success" /></Row>}
        <Row justify="between" style={{ opacity: loading ? 0.6 : 1 }}><Text weight="bold">{t('Total')}</Text><Amount value={preview?.total ?? 0} size="lg" weight="bold" /></Row>
      </View>
      {!!preview?.warnings.length && <Card tone="warning"><Text size="sm">{preview.warnings[0]}</Text></Card>}
      <TextArea numberOfLines={2} placeholder={t('Supplier ke liye note (marzi)')} value={note} onChangeText={setNote} />
      <Text size="xs" tone="muted" align="center">{t('Final price supplier ki Invoice par lagti hai.')}</Text>
      <Button variant="ghost" icon={Trash2} onPress={onClear}>{t('Clear')}</Button>
    </View>
  );
}
