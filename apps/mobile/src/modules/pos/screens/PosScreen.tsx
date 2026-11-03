/**
 * The counter. Phones: the catalog with a slide-up bill bar; tablets: the
 * catalog and the bill side by side. Search and scan from the phone's own
 * database (works offline), one-tap cash, full checkout, hold/resume and
 * the after-sale receipt. Industries plug in through PosIndustryConfig;
 * they never get a counter of their own.
 */

import { Flame, Gift, LayoutGrid, MoreHorizontal, Package, PauseCircle, ScanBarcode, Store, Zap } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { inCartBy, looksLikeBarcode, parseQtyPrefix } from '@nafaa/core/pos';
import { t } from '@/core/i18n';
import { useSyncStatus } from '@/core/net';
import type { ProductRow } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Badge, Button, Chip, EmptyState, Icon, IconButton, PressableScale, ProgressBar, Row, ScreenHeader, SearchBar, Sheet, Text,
  toast, useDebouncedValue, useLayout, useTabBarSpace, useTheme, withAlpha,
} from '@/design';
import { useShellUi } from '@/modules/shell/hooks/useShellUi';
import { SyncChip } from '@/modules/shell/components/SyncStatus';
import { useBill } from '../engine/bill';
import { useCategories, useCatalog, useCombos, useQuickKeys, useRecentItems, type PosCombo } from '../engine/catalog';
import { checkoutBlock, completeSale } from '../engine/checkout';
import { useDistributionPricing } from '../engine/useDistributionPricing';
import type { PosShelf } from '../engine/industry';
import { closeSheet, openCheckoutSheet, openSheet, usePos, usePosUi } from '../engine/usePos';
import { CartPanel, useCartSummary } from '../components/CartPanel';
import { ChargesSheet, useChargesSync } from '../components/ChargesSheet';
import { CheckoutSheet, useSaleContext } from '../components/CheckoutSheet';
import { CustomerSheet } from '../components/CustomerSheet';
import { DiscountSheet, usePromoRecheck } from '../components/DiscountSheet';
import { DoneSheet } from '../components/DoneSheet';
import { HeldSheet, useHeldBills } from '../components/HeldSheet';
import { LineSheet } from '../components/LineSheet';
import { MoreSheet } from '../components/MoreSheet';
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
  const combos = useCombos(api.config.combos !== false);
  const keys = useQuickKeys(api.shopId, api.config.quickKeys !== false && parts.showQuickKeys);
  const recentTick = useLastTick();
  const recent = useRecentItems(api.shopId, recentTick);
  const held = useHeldBills(api.shopId);
  const inCart = useMemo(() => inCartBy(lines), [lines]);
  const productInfo = useMemo(() => {
    const map = new Map((catalog.data ?? []).map((p) => [p.id, p]));
    return (id: string) => { const p = map.get(id); return p ? { name: p.name, unit: p.unit, image: p.imageUrl ?? undefined } : undefined; };
  }, [catalog.data]);
  useDistributionPricing(productInfo);
  usePromoRecheck();
  useChargesSync();

  const tap = (p: ProductRow) => { void api.addProduct(p.id); };

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

  const tabs: Array<{ id: View_; label: string; icon: typeof Package; show: boolean }> = [
    { id: 'products', label: t('Products'), icon: LayoutGrid, show: true },
    { id: 'recent', label: t('Most sold'), icon: Flame, show: parts.recentItems },
    { id: 'combos', label: t('Combos'), icon: Gift, show: combos.length > 0 },
    { id: 'keys', label: t('Quick keys'), icon: Zap, show: keys.keys.length > 0 },
    ...(api.config.extraView ? [{ id: 'extra' as const, label: t(api.config.extraView.label), icon: api.config.extraView.icon, show: true }] : []),
  ];

  const shelf = (api.config.useShelf ?? noShelf)();
  const shelfFilters = shelf.filters ?? [];
  const shelfRows = (rows: ProductRow[] | undefined) => {
    if (!rows) return rows;
    const picked = shelfFilters.filter((f) => shelfPick[f.key]);
    if (!api.config.hideProduct && !picked.length) return rows;
    return rows.filter((p) => !api.config.hideProduct?.(p) && picked.every((f) => f.match(p, shelfPick[f.key])));
  };

  const firstSync = !sync.ready && !(catalog.data?.length);
  const header = (
    <View>
      <ScreenHeader
        title={t('POS')}
        onBack={null}
        compact
        actions={
          <>
            <SyncChip />
            <IconButton icon={PauseCircle} label={t('Held bills')} badge={held.data?.length || undefined} onPress={() => openSheet('held')} />
            <IconButton icon={MoreHorizontal} label={t('More')} onPress={() => openSheet('more')} />
          </>
        }
      />
      <View style={{ paddingHorizontal: th.space(3), gap: th.space(2), paddingBottom: th.space(2) }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t(api.config.searchHint ?? 'Search or scan')} onScan={() => openSheet('scanner')} onSubmit={() => void submit()} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: th.space(2) }}>
          {tabs.filter((x) => x.show).map((x) => (
            <Chip key={x.id} label={x.label} icon={x.icon} selected={view === x.id} onPress={() => setView(x.id)} />
          ))}
          {view === 'products' && parts.showCategories && categories.length > 0 && <View style={{ width: 1, backgroundColor: th.colors.border, marginVertical: 6 }} />}
          {view === 'products' && parts.showCategories && categories.map((c) => (
            <Chip key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(categoryId === c.id ? null : c.id)} />
          ))}
        </ScrollView>
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
        {firstSync && sync.progress && (
          <View style={{ gap: 4 }}>
            <Text size="xs" tone="muted">{t('Getting your products ready on this phone…')}</Text>
            <ProgressBar value={sync.progress.total ? sync.progress.done / sync.progress.total : 0} />
          </View>
        )}
      </View>
    </View>
  );

  const barSpace = isTablet ? 0 : tabSpace + 76;
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
      query={view === 'products' ? query : undefined}
      padBottom={barSpace}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: th.colors.canvas, paddingTop: insets.top }}>
      {isTablet ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>{header}{body}</View>
          <View style={{ width: Math.min(440, Math.max(360, width * 0.38)), borderStartWidth: 1, borderStartColor: th.colors.border, backgroundColor: th.colors.surface, paddingTop: th.space(3) }}>
            <CartPanel onPay={() => openCheckoutSheet('full')} onCash={() => void instantCash()} />
          </View>
        </View>
      ) : (
        <>
          {header}
          {body}
          <CartBar bottom={tabSpace} onCash={() => void instantCash()} />
          <Sheet open={cartOpen} onClose={closeSheet} height={0.9} scrollable={false} title={t('Bill')}>
            <CartPanel onPay={() => openCheckoutSheet('full')} onCash={() => { closeSheet(); void instantCash(); }} onHeld={closeSheet} />
          </Sheet>
        </>
      )}
      <PickerHost />
      <LineSheet />
      <CustomerSheet />
      <DiscountSheet />
      <ChargesSheet />
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

/** Phone: the bill as a bar above the tabs; tap opens it, Cash sells in one tap. */
function CartBar({ bottom, onCash }: { bottom: number; onCash: () => void }) {
  const th = useTheme();
  const { count, qty, total } = useCartSummary();
  const pulse = usePosUi((s) => s.pulse);
  const scale = useSharedValue(1);
  useEffect(() => { if (pulse && th.motion) scale.value = withSequence(withSpring(1.04, { damping: 8, stiffness: 400 }), withSpring(1)); }, [pulse]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const empty = count === 0;
  return (
    <Animated.View style={[{ position: 'absolute', start: th.space(3), end: th.space(3), bottom: bottom + th.space(2) }, style]}>
      <Row gap={2} style={{ padding: th.space(1.5), borderRadius: th.radius('2xl'), backgroundColor: th.colors.surfaceRaised, borderWidth: 1, borderColor: th.colors.border,
        shadowColor: th.colors.shadow, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 10 }}>
        <PressableScale onPress={() => openSheet('cart')} disabled={empty} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: th.space(2.5), paddingHorizontal: th.space(2), minHeight: 52 }}
          accessibilityLabel={t('Open the bill')}>
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: empty ? th.colors.surfaceMuted : withAlpha(th.colors.brand.solid, 0.14) }}>
            <Icon icon={Package} size={20} color={empty ? th.colors.textSubtle : th.colors.brand.text} />
            {!empty && <View style={{ position: 'absolute', top: -4, end: -6 }}><Badge tone="brand" solid size="sm">{count}</Badge></View>}
          </View>
          <View style={{ flex: 1 }}>
            <Text size="xs" tone="muted" numberOfLines={1}>{empty ? t('No items yet') : t('{{count}} items · qty {{q}}', { count: count, q: Number(qty.toFixed(2)) })}</Text>
            <Amount value={total} size="xl" weight="bold" />
          </View>
        </PressableScale>
        <IconButton icon={ScanBarcode} label={t('Scan')} variant="secondary" size="lg" onPress={() => openSheet('scanner')} />
        <Button size="lg" variant="success" disabled={empty} onPress={onCash}>{t('Cash')}</Button>
        <Button size="lg" disabled={empty} onPress={() => openCheckoutSheet('full')}>{t('Pay')}</Button>
      </Row>
    </Animated.View>
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
