/**
 * The counter, like the web POS at phone width. Phones: a light catalog
 * (search + camera, Products / Combos / Quick, categories, most sold, tiles)
 * and one "View bill" bar that opens the full bill; tablets: the catalog and
 * the bill side by side. Search and scan from the phone's own
 * database (works offline), one-tap cash, full checkout, hold/resume and
 * the after-sale receipt. Industries plug in through PosIndustryConfig;
 * they never get a counter of their own.
 */

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Camera, Gift, LayoutGrid, ShoppingCart, Store } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { inCartBy, looksLikeBarcode, parseQtyPrefix } from '@nafaa/core/pos';
import { t } from '@/core/i18n';
import { useSyncStatus } from '@/core/net';
import { offline, type ProductRow } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Badge, Button, Chip, EmptyState, Icon, PressableScale, ProgressBar, Row, SearchBar, Segmented, Sheet, Text,
  toast, useDebouncedValue, useLayout, useTabBarSpace, useTheme, withAlpha,
} from '@/design';
import { SyncChip } from '@/modules/shell/components/SyncStatus';
import { useShellUi } from '@/modules/shell/hooks/useShellUi';
import { useBill } from '../engine/bill';
import { useCategories, useCatalog, useCombos, useQuickKeys, useRecentItems, type PosCombo } from '../engine/catalog';
import { checkoutBlock, completeSale } from '../engine/checkout';
import { useDistributionPricing } from '../engine/useDistributionPricing';
import type { PosShelf } from '../engine/industry';
import { closeAllSheets, openSheet, usePos, usePosUi } from '../engine/usePos';
import { CartPanel, useCartSummary } from '../components/CartPanel';
import { ChargesSheet, useChargesSync } from '../components/ChargesSheet';
import { CheckoutSheet, useSaleContext } from '../components/CheckoutSheet';
import { CustomerSheet } from '../components/CustomerSheet';
import { DiscountSheet, usePromoRecheck } from '../components/DiscountSheet';
import { DoneSheet } from '../components/DoneSheet';
import { HeldSheet, useHeldBills } from '../components/HeldSheet';
import { LineSheet } from '../components/LineSheet';
import { MoreSheet } from '../components/MoreSheet';
import { NoteSheet } from '../components/NoteSheet';
import { PickerHost } from '../components/Pickers';
import { ProductGrid } from '../components/ProductGrid';
import { ScannerSheet } from '../components/ScannerSheet';

type View_ = 'products' | 'recent' | 'combos' | 'keys' | 'extra';

/** Counter without industry shelf additions. */
const EMPTY_SHELF: PosShelf = {};
const noShelf = (): PosShelf => EMPTY_SHELF;

export function PosScreen() {
  const api = usePos();
  const can = usePermission();
  if (!can(P.POS_USE)) {
    return <Frame><EmptyState icon={Store} title={t('You do not have access to the POS')} message={t('Ask the owner to give you POS access.')} /></Frame>;
  }
  if (!api.shopId) return <PickShop />;
  const IndustryScreen = api.config.Screen;
  if (IndustryScreen) return <IndustryScreen />;
  return <Counter />;
}

function Frame({ children }: { children: React.ReactNode }) {
  const th = useTheme();
  const insets = useSafeAreaInsets();
  return <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: th.colors.canvas, justifyContent: 'center' }}>{children}</View>;
}

function PickShop() {
  const open = useShellUi((s) => s.open);
  return (
    <Frame>
      <EmptyState icon={Store} title={t('Choose a shop to sell from')} message={t('Bills, stock and the cash register belong to one shop.')}
        action={<Button icon={Store} onPress={() => open('shop')}>{t('Choose shop')}</Button>} />
    </Frame>
  );
}

function Counter() {
  const th = useTheme();
  const insets = useSafeAreaInsets();
  const { isTablet, width } = useLayout();
  const tabSpace = useTabBarSpace();
  const api = usePos();
  const ctx = useSaleContext();
  const sync = useSyncStatus();
  const lines = useBill((s) => s.lines);
  const parts = api.counter.parts;
  const cartOpen = usePosUi((s) => s.sheet === 'cart');

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [shelfPick, setShelfPick] = useState<Record<string, string>>({});
  const [view, setView] = useState<View_>('products');
  const query = useDebouncedValue(parseQtyPrefix(search).rest, 80);
  const catalog = useCatalog(view === 'products' ? query : '', categoryId);
  const categories = useCategories();
  const counts = useCategoryCounts(!!sync.ready);
  const combos = useCombos(api.config.combos !== false);
  const keys = useQuickKeys(api.shopId, api.config.quickKeys !== false && parts.showQuickKeys);
  const recentTick = useLastTick();
  const recent = useRecentItems(api.shopId, recentTick);
  const held = useHeldBills(api.shopId);
  const heldCount = held.data?.length ?? 0;
  const inCart = useMemo(() => inCartBy(lines), [lines]);
  const productInfo = useMemo(() => {
    const map = new Map((catalog.data ?? []).map((p) => [p.id, p]));
    return (id: string) => { const p = map.get(id); return p ? { name: p.name, unit: p.unit, image: p.imageUrl ?? undefined } : undefined; };
  }, [catalog.data]);
  useDistributionPricing(productInfo);
  usePromoRecheck();
  useChargesSync();

  const tap = (p: ProductRow) => { void api.addProduct(p.id); };
  const minus = (p: ProductRow) => {
    const line = [...lines].reverse().find((l) => l.productId === p.id && l.type === 'product');
    if (line) api.step(line.id, -1);
  };

  // Search box Enter: a code scans; otherwise the first result goes on the bill. "3*" in front sets the quantity.
  const submit = async () => {
    const { qty, rest } = parseQtyPrefix(search);
    if (!rest) return;
    if (looksLikeBarcode(rest) || /^[A-Za-z0-9-]{4,}$/.test(rest)) {
      if (await api.handleCode(rest, { qty, combos, quiet: !looksLikeBarcode(rest) })) { setSearch(''); return; }
    }
    const first = catalog.data?.[0];
    if (first && view === 'products') { void api.addProduct(first.id, qty ? { qty } : {}); setSearch(''); return; }
    toast.error(t('"{{q}}" not found', { q: rest }));
  };

  const instantCash = async () => {
    const block = checkoutBlock(ctx, 'full');
    if (block) { toast.error(block); return; }
    await completeSale(ctx, { paymentMethod: 'CASH', paidAmount: ctx.totals.total, isCredit: false, depositExtra: false });
  };

  const total = counts.all;
  const tabs: Array<{ value: View_; label: string }> = [
    { value: 'products', label: total ? `${t('Products')} ${total}` : t('Products') },
    ...(combos.length ? [{ value: 'combos' as const, label: `${t('Combos')} ${combos.length}` }] : []),
    ...(keys.keys.length ? [{ value: 'keys' as const, label: `${t('Quick')} ${keys.keys.length}` }] : []),
    ...(api.config.extraView ? [{ value: 'extra' as const, label: t(api.config.extraView.label) }] : []),
  ];

  const shelf = (api.config.useShelf ?? noShelf)();
  const shelfFilters = shelf.filters ?? [];
  const shelfRows = (rows: ProductRow[] | undefined) => {
    if (!rows) return rows;
    const picked = shelfFilters.filter((f) => shelfPick[f.key]);
    if (!api.config.hideProduct && !picked.length) return rows;
    return rows.filter((p) => !api.config.hideProduct?.(p) && picked.every((f) => f.match(p, shelfPick[f.key])));
  };
  const aksar = view === 'products' && !query && parts.recentItems ? (shelfRows(recent.data) ?? []) : [];

  const firstSync = !sync.ready && !(catalog.data?.length);
  const finder = (
    <View style={{ paddingHorizontal: th.space(3), paddingTop: th.space(2), gap: th.space(2), paddingBottom: th.space(2) }}>
      <Row gap={2}>
        <View style={{ flex: 1 }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder={t(api.config.searchHint ?? 'Search or scan')} onSubmit={() => void submit()} />
        </View>
        <PressableScale onPress={() => openSheet('scanner')} haptic="tap" accessibilityLabel={t('Scan barcode')}
          style={{ width: 48, height: 48, borderRadius: th.radius('lg'), alignItems: 'center', justifyContent: 'center', backgroundColor: th.colors.text }}>
          <Icon icon={Camera} size={20} color={th.colors.canvas} />
        </PressableScale>
        {sync.state !== 'online' && <SyncChip />}
      </Row>
      {tabs.length > 1 && <Segmented size="sm" options={tabs} value={view} onChange={(v) => setView(v)} />}
      {view === 'products' && parts.showCategories && categories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: th.space(2) }}>
          <Chip label={t('All')} icon={LayoutGrid} count={total || undefined} selected={!categoryId} onPress={() => setCategoryId(null)} />
          {categories.filter((c) => counts.by[c.id] || categoryId === c.id).map((c) => (
            <Chip key={c.id} label={c.name} count={counts.by[c.id]} selected={categoryId === c.id} onPress={() => setCategoryId(categoryId === c.id ? null : c.id)} />
          ))}
        </ScrollView>
      )}
      {view === 'products' && shelfFilters.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: th.space(2), alignItems: 'center' }}>
          {shelfFilters.map((f) => (
            <View key={f.key} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
              {!!f.label && <Text size="xs" tone="muted">{f.label}</Text>}
              {f.options.map((o) => (
                <Chip key={o.value} label={o.label} selected={shelfPick[f.key] === o.value}
                  onPress={() => setShelfPick((cur) => ({ ...cur, [f.key]: cur[f.key] === o.value ? '' : o.value }))} />
              ))}
            </View>
          ))}
        </ScrollView>
      )}
      {aksar.length > 0 && <Aksar items={aksar} onPress={tap} />}
      {firstSync && sync.progress && (
        <View style={{ gap: 4 }}>
          <Text size="xs" tone="muted">{t('Getting your products ready on this phone…')}</Text>
          <ProgressBar value={sync.progress.total ? sync.progress.done / sync.progress.total : 0} />
        </View>
      )}
    </View>
  );

  const barSpace = isTablet ? 0 : tabSpace + BAR_HEIGHT;
  const Extra = api.config.extraView?.Component;
  const body = view === 'extra' && Extra ? (
    <Extra padBottom={barSpace} />
  ) : view === 'combos' ? (
    <CombosGrid combos={combos} padBottom={barSpace} />
  ) : view === 'keys' ? (
    <KeysGrid groups={keys.groups} combos={combos} padBottom={barSpace} />
  ) : (
    <ProductGrid
      data={shelfRows(view === 'recent' ? recent.data : catalog.data)}
      loading={view === 'recent' ? recent.isLoading : catalog.isLoading || firstSync}
      size={th.appearance.mobile.posGrid}
      inCart={inCart}
      showStock={parts.showStock}
      showImages={parts.showImages}
      subline={shelf.subline}
      onPress={tap}
      onMinus={minus}
      query={view === 'products' ? query : undefined}
      padBottom={barSpace}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: th.colors.canvas, paddingTop: insets.top }}>
      {isTablet ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>{finder}{body}</View>
          <View style={{ width: Math.min(460, Math.max(380, width * 0.4)), borderStartWidth: 1, borderStartColor: th.colors.border, backgroundColor: th.colors.surface, paddingTop: th.space(3) }}>
            <CartPanel heldCount={heldCount} onCash={() => void instantCash()} />
          </View>
        </View>
      ) : (
        <>
          {finder}
          {body}
          <BillBar bottom={tabSpace} heldCount={heldCount} />
          <Sheet open={cartOpen} onClose={closeAllSheets} height={0.96} scrollable={false} hideClose>
            <CartPanel heldCount={heldCount} onClose={closeAllSheets} onCash={() => { closeAllSheets(); void instantCash(); }} onHeld={closeAllSheets} />
          </Sheet>
        </>
      )}
      <PickerHost />
      <LineSheet />
      <CustomerSheet />
      <DiscountSheet />
      <ChargesSheet />
      <NoteSheet />
      <CheckoutSheet />
      <HeldSheet />
      <MoreSheet />
      <DoneSheet />
      <ScannerSheet combos={combos} />
      {api.config.Overlay ? <api.config.Overlay /> : null}
    </View>
  );
}

/** Ticks after each sale so "Most sold" refreshes. */
function useLastTick() {
  const sheet = usePosUi((s) => s.sheet);
  const [tick, setTick] = useState(0);
  const prev = useRef(sheet);
  useEffect(() => { if (sheet === 'done' && prev.current !== 'done') setTick((x) => x + 1); prev.current = sheet; }, [sheet]);
  return tick;
}

/** Active products per category from the phone's database (refreshed with each sync). */
function useCategoryCounts(ready: boolean) {
  const q = useQuery({
    queryKey: ['offline', 'pos', 'category-counts', ready],
    queryFn: () => offline.products.countByCategory(),
    networkMode: 'always',
    staleTime: 60_000,
  });
  return useMemo(() => {
    const by = q.data ?? {};
    return { by, all: Object.values(by).reduce((s, n) => s + n, 0) };
  }, [q.data]);
}

/** Height the phone's "View bill" bar takes above the tab bar. */
const BAR_HEIGHT = 72;

/**
 * Phone: one green bar above the tabs, like the web: "View bill" with the
 * item count and the total; opens the full bill. Quiet when the bill is
 * empty (still opens it for held bills and the customer).
 */
function BillBar({ bottom, heldCount }: { bottom: number; heldCount: number }) {
  const th = useTheme();
  const { count, total } = useCartSummary();
  const pulse = usePosUi((s) => s.pulse);
  const scale = useSharedValue(1);
  const motion = th.motion;
  useEffect(() => { if (pulse && motion) scale.value = withSequence(withSpring(1.03, { damping: 8, stiffness: 400 }), withSpring(1)); }, [pulse]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const empty = count === 0;
  const fg = empty ? th.colors.textMuted : th.colors.brand.onSolid;
  return (
    <Animated.View style={[{ position: 'absolute', start: th.space(3), end: th.space(3), bottom: bottom + th.space(2) }, style]}>
      <PressableScale onPress={() => openSheet('cart')} haptic="tap" accessibilityLabel={t('View bill')} scaleTo={0.98}
        style={{ height: 56, borderRadius: th.radius('xl'), paddingHorizontal: th.space(4), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: empty ? th.colors.surfaceRaised : th.colors.brand.solid, borderWidth: empty ? 1 : 0, borderColor: th.colors.border,
          shadowColor: th.colors.shadow, shadowOpacity: empty ? 0.08 : 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: empty ? 3 : 10 }}>
        <Row gap={3}>
          <View>
            <Icon icon={ShoppingCart} size={20} color={fg} />
            {!empty && (
              <View style={{ position: 'absolute', top: -7, end: -9, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: th.colors.brand.onSolid }}>
                <Text size="2xs" weight="bold" color={th.colors.brand.solid} ltr>{count}</Text>
              </View>
            )}
          </View>
          <Text size="base" weight="semibold" color={fg}>
            {empty ? (heldCount ? t('{{count}} held bills', { count: heldCount }) : t('Bill is empty')) : t('View bill')}
          </Text>
        </Row>
        <Row gap={2}>
          {!empty && <Amount value={total} size="lg" weight="bold" color={fg} />}
          <Icon icon={ArrowRight} size={20} color={fg} flip />
        </Row>
      </PressableScale>
    </Animated.View>
  );
}

/** "Most sold" in one line, like the web's Aksar row. */
function Aksar({ items, onPress }: { items: ProductRow[]; onPress: (p: ProductRow) => void }) {
  const th = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: th.space(1.5), alignItems: 'center' }}>
      <Text size="2xs" weight="semibold" tone="subtle" uppercase>{t('Most sold')}</Text>
      {items.slice(0, 10).map((p) => (
        <PressableScale key={p.id} onPress={() => onPress(p)} haptic="tap" accessibilityLabel={`${p.name}, ${p.price}`}
          style={{ height: 34, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: th.space(2.5), borderRadius: th.radius('md'), backgroundColor: th.colors.surface, borderWidth: 1, borderColor: th.colors.border }}>
          <Text size="xs" weight="medium" numberOfLines={1} style={{ maxWidth: 130 }}>{p.name}</Text>
          <Amount value={p.price} size="xs" color={th.colors.textMuted} decimals={0} />
        </PressableScale>
      ))}
    </ScrollView>
  );
}

function CombosGrid({ combos, padBottom }: { combos: PosCombo[]; padBottom: number }) {
  const th = useTheme();
  const api = usePos();
  return (
    <ScrollView contentContainerStyle={{ padding: th.space(2), paddingBottom: padBottom + th.space(4), flexDirection: 'row', flexWrap: 'wrap' }}>
      {combos.map((c) => (
        <View key={c.id} style={{ width: '50%', padding: th.space(1) }}>
          <PressableScale onPress={() => void api.addCombo(c)} style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surface, borderWidth: 1, borderColor: th.colors.border, gap: th.space(1), minHeight: 104 }}>
            <Row gap={1.5}><Icon icon={Gift} size={16} tone="brand" /><Text size="sm" weight="bold" numberOfLines={2} style={{ flex: 1 }}>{c.name}</Text></Row>
            <Text size="xs" tone="muted">{t('{{count}} items', { count: c.items.length })}</Text>
            <Row justify="between" style={{ marginTop: 'auto' }}>
              <Amount value={c.price} weight="bold" color={th.colors.brand.text} />
              {!!c.savings && c.savings > 0 && <Badge tone="success" size="sm">{t('Save {{pct}}%', { pct: Math.round(c.savingsPct ?? 0) })}</Badge>}
            </Row>
          </PressableScale>
        </View>
      ))}
    </ScrollView>
  );
}

function KeysGrid({ groups, combos, padBottom }: { groups: Array<[string, Array<{ id: string; label: string; color?: string | null; productId?: string | null; comboId?: string | null; variantId?: string | null; unitId?: string | null; isActive: boolean; position: number }>]>; combos: PosCombo[]; padBottom: number }) {
  const th = useTheme();
  const api = usePos();
  return (
    <ScrollView contentContainerStyle={{ padding: th.space(3), paddingBottom: padBottom + th.space(4), gap: th.space(3) }}>
      {groups.map(([g, list]) => (
        <View key={g || 'general'} style={{ gap: th.space(2) }}>
          {!!g && <Text size="xs" weight="semibold" tone="muted" uppercase>{g}</Text>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
            {list.map((k) => {
              const tint = k.color || th.colors.brand.solid;
              return (
                <PressableScale key={k.id} onPress={() => void api.addQuickKey(k, combos)} haptic="tap"
                  style={{ width: '31.6%', minHeight: 72, borderRadius: th.radius('lg'), padding: th.space(2), justifyContent: 'center', alignItems: 'center', backgroundColor: withAlpha(tint, th.isDark ? 0.28 : 0.14), borderWidth: 1, borderColor: withAlpha(tint, 0.5) }}>
                  <Text size="sm" weight="bold" align="center" numberOfLines={3}>{k.label}</Text>
                </PressableScale>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
