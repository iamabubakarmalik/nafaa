/**
 * Restaurant menu board (web RestaurantMenuBoard): every dish, bought item
 * and raw material with what a restaurant needs — on the menu today or "86"
 * at this branch, served now, plates the store still covers, plate cost and
 * food cost, sales in the last 30 days — plus menu analytics (star,
 * workhorse, puzzle, dog). Search, tabs, category and sort run on the server.
 * Long-press picks dishes for bulk on/off or adding to the menu. Cost and
 * profit need cost.view.
 */

import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  AlertTriangle, ArrowDownWideNarrow, BarChart3, BookOpen, CircleSlash, Clock, Flame, LayoutList, ListPlus, Pencil, Plus, Power, ShoppingCart, Sparkles, Wheat, X,
  type LucideIcon,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { clock12 } from '@nafaa/core/restaurant';
import { apiErrorMessage } from '@/core/api/errors';
import { formatPKR } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Badge, Button, Card, ChipGroup, EmptyState, IconButton, ListRow, ListTemplate, Row, Sheet, Skeleton, StatTile, Text, toast, useDebouncedValue, useTheme,
} from '@/design';
import { ProductThumb } from '@/modules/inventory/components/ProductThumb';
import { useCostMask } from '@/modules/inventory/lib/shared';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { menuItemsApi } from '../../api';
import { boardApi, switchDishes, type BoardItem, type BoardQuery, type BoardSort, type BoardState, type DishClass } from '../api';
import { CLASS, MENU_KEYS, fmt, foodTone, offLabel, refreshMenu, spiceOf } from '../meta';

const LIMIT = 40;
type Tab = Exclude<BoardState, 'inactive'> | 'analytics';

const STATES: Array<{ id: Exclude<BoardState, 'inactive'>; label: string; icon: LucideIcon }> = [
  { id: 'all', label: msg('Sab menu'), icon: LayoutList },
  { id: 'live', label: msg('Mil rahi'), icon: Power },
  { id: 'off', label: msg('Band (86)'), icon: CircleSlash },
  { id: 'cantmake', label: msg('Ban nahi sakti'), icon: AlertTriangle },
  { id: 'norecipe', label: msg('Recipe nahi'), icon: BookOpen },
  { id: 'notonpos', label: msg('Menu se bahar'), icon: ListPlus },
  { id: 'raw', label: msg('Raw material'), icon: Wheat },
];

const SORTS: Array<{ value: BoardSort; label: string }> = [
  { value: 'name', label: msg('Naam A–Z') }, { value: 'sold', label: msg('Zyada bikne wali') }, { value: 'profit', label: msg('Zyada profit') },
  { value: 'foodCost', label: msg('Food cost zyada pehle') }, { value: 'canMake', label: msg('Kam plate bachi pehle') },
  { value: 'priceHigh', label: msg('Mehngi pehle') }, { value: 'priceLow', label: msg('Sasti pehle') }, { value: 'new', label: msg('Nayi pehle') },
];

const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

export function MenuScreen() {
  const th = useTheme();
  const can = usePermission();
  const { cost, costHidden } = useCostMask();
  const canMenu = can(P.RESTAURANT_MENU_MANAGE);
  const canCreate = can(P.PRODUCTS_CREATE);
  const online = useOnlineStatus();
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim(), 300);
  const [categoryId, setCategoryId] = useState<string>('all');
  const [sort, setSort] = useState<BoardSort>('name');
  const [inactive, setInactive] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [days, setDays] = useState('30');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [offFor, setOffFor] = useState<BoardItem | null>(null);
  const guard = (run: () => void) => { if (!online) { toast.warning(onlineNeededText('restaurantOrders')); return; } run(); };

  const state: BoardState = inactive ? 'inactive' : tab === 'analytics' ? 'all' : tab;
  const query: BoardQuery = { search: term || undefined, categoryId: categoryId === 'all' ? undefined : categoryId, state, sort };
  const board = useInfiniteQuery({
    queryKey: [MENU_KEYS.board, query],
    queryFn: ({ pageParam }) => boardApi.board({ ...query, page: pageParam, limit: LIMIT }),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.page * l.limit < l.count ? l.page + 1 : undefined),
    placeholderData: (p) => p,
  });
  const analytics = useQuery({ queryKey: [MENU_KEYS.analytics, days], queryFn: () => boardApi.analytics(Number(days)), enabled: tab === 'analytics' });
  const first = board.data?.pages[0];
  const st = first?.stats;
  const items = board.data?.pages.flatMap((p) => p.items) ?? [];
  const forbidden = (board.error as { response?: { status?: number } } | null)?.response?.status === 403;
  const refresh = () => refreshMenu(MENU_KEYS.board, MENU_KEYS.items, MENU_KEYS.cook);

  const setOne = useMutation({
    mutationFn: ({ item, on, until }: { item: BoardItem; on: boolean; until?: string | null }) => switchDishes([{ menuItemId: item.menuItemId!, offHere: item.offHere }], on, until),
    onSuccess: (_r, v) => { toast.success(v.on ? t('Chalu — counter par aa gayi') : t('Aaj ke liye band (86) — kal khud chalu ho jayegi')); setOffFor(null); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi badla'))),
  });
  const setMany = useMutation({
    mutationFn: ({ list, on }: { list: Array<{ menuItemId: string; offHere?: boolean }>; on: boolean }) => switchDishes(list, on),
    onSuccess: (n, v) => { toast.success(`${n} ${v.on ? t('chalu') : t('aaj ke liye band (86)')}`); setPicked(new Set()); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi badla'))),
  });
  const addToMenu = useMutation({
    mutationFn: (productIds: string[]) => menuItemsApi.addToMenu(productIds),
    onSuccess: (r) => { toast.success(r.added ? t('{{added}} cheez menu par aa gayi', { added: r.added }) : t('Pehle se menu par thi')); setPicked(new Set()); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Menu par nahi aayi'))),
  });
  const dishesOf = (list: Array<{ menuItemId: string | null; offHere?: boolean }>) => list.filter((i): i is { menuItemId: string; offHere?: boolean } => !!i.menuItemId);
  const pickedItems = items.filter((i) => picked.has(i.productId));
  const flip = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Power} tone="success" label={t('Menu par mil rahi')} loading={!st} value={st ? `${st.live} / ${st.dishes}` : ''} hint={t('dish aur cheezein')} />
        <StatTile style={{ flex: 1 }} icon={Flame} tone="warning" label={t('Ausat food cost')} loading={!st} value={!st ? '' : costHidden ? '••••' : st.avgFoodCost === null ? '—' : `${st.avgFoodCost}%`}
          hint={st?.highFoodCost && !costHidden ? t('{{highFoodCost}} me 45% se zyada', { highFoodCost: st.highFoodCost }) : undefined} onPress={() => { setTab('all'); setSort('foodCost'); }} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={ShoppingCart} tone="info" label={t('Biki · {{value}} din', { value: first?.windowDays ?? 30 })} loading={!st} value={st ? fmt(st.sold) : ''} hint={t('plate / adad')} onPress={() => { setTab('all'); setSort('sold'); }} />
        <StatTile style={{ flex: 1 }} icon={Wheat} tone="accent" label={t('Raw material ki value')} loading={!st} value={st ? cost(st.rawValue) : ''} hint={st?.rawLow ? t('{{rawLow}} kam', { rawLow: st.rawLow }) : undefined} onPress={() => setTab('raw')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={AlertTriangle} tone="danger" label={t('Menu par, ban nahi sakti')} loading={!st} value={String(st?.liveButCantMake.length ?? 0)} hint={t('Saamaan khatam · dabayein')} onPress={() => setTab('cantmake')} />
        <StatTile style={{ flex: 1 }} icon={Clock} tone="warning" label={t('Thori bachi')} loading={!st} value={String(st?.running ?? 0)} hint={t('5 plate ya kam')} onPress={() => { setTab('all'); setSort('canMake'); }} />
      </Row>
      {!!st?.liveButCantMake.length && tab !== 'analytics' && (
        <Card tone="danger">
          <View style={{ gap: th.space(2) }}>
            <Text size="sm"><Text size="sm" weight="bold">{t('{{count}} dish', { count: st.liveButCantMake.length })}</Text> {t('menu par hain magar saamaan khatam hai: {{value}}{{value2}}', {
              value: st.liveButCantMake.slice(0, 4).map((x) => `${x.name}${x.blocker ? ` (${x.blocker})` : ''}`).join(', '), value2: st.liveButCantMake.length > 4 ? '…' : '',
            })}</Text>
            {canMenu && <Button size="sm" variant="critical" loading={setMany.isPending} onPress={() => guard(() => setMany.mutate({ list: dishesOf(st.liveButCantMake), on: false }))}>{t('Sab aaj band karein (86)')}</Button>}
          </View>
        </Card>
      )}
      {!!st?.unitProblems && tab !== 'analytics' && (
        <ListRow icon={AlertTriangle} iconTone="warning" title={t('{{unitProblems}} recipe me unit stock se nahi milti (maslan "cup" jabke stock kilo me hai) — un ka saamaan sahi nahi katta.', { unitProblems: st.unitProblems })}
          chevron onPress={() => router.push('/restaurant/recipes' as never)} />
      )}
      <ChipGroup value={tab} onChange={(v) => { setTab(v); setInactive(false); setPicked(new Set()); }} style={{ marginHorizontal: -th.space(4) }}
        options={[...STATES.map((s) => ({ value: s.id as Tab, label: t(s.label), icon: s.icon, count: inactive ? undefined : first?.tabs?.[s.id] })), { value: 'analytics' as Tab, label: t('Menu analytics'), icon: BarChart3 }]} />
      {tab !== 'analytics' && (first?.categories.length ?? 0) > 0 && (
        <ChipGroup value={categoryId} onChange={setCategoryId} style={{ marginHorizontal: -th.space(4) }}
          options={[{ value: 'all', label: t('Sab category') }, ...(first?.categories ?? []).map((c) => ({ value: c.id, label: c.name, count: c.count }))]} />
      )}
      {picked.size > 0 && (
        <Card tone="brand">
          <Row gap={1.5} wrap>
            <Text weight="semibold">{t('{{size}} chuni', { size: picked.size })}</Text>
            {canMenu && pickedItems.some((i) => i.menuItemId) && <>
              <Button size="sm" variant="success" onPress={() => guard(() => setMany.mutate({ list: dishesOf(pickedItems), on: true }))}>{t('Chalu karein')}</Button>
              <Button size="sm" variant="critical" onPress={() => guard(() => setMany.mutate({ list: dishesOf(pickedItems), on: false }))}>{t('Aaj band (86)')}</Button>
            </>}
            {canMenu && pickedItems.some((i) => !i.onPos && i.kind !== 'raw') && (
              <Button size="sm" variant="secondary" onPress={() => guard(() => addToMenu.mutate(pickedItems.filter((i) => !i.onPos && i.kind !== 'raw').map((i) => i.productId)))}>{t('Menu par daalein')}</Button>
            )}
            <IconButton icon={X} label={t('Chhorein')} size="sm" onPress={() => setPicked(new Set())} />
          </Row>
        </Card>
      )}
      {tab !== 'analytics' && <CachedNote query={board} />}
      {tab === 'analytics' && <MenuEngineering days={days} setDays={setDays} q={analytics} cost={cost} costHidden={costHidden} />}
    </View>
  );

  if (forbidden) {
    return <ListTemplate title={t('Menu')} data={[]} renderItem={() => null} keyExtractor={() => ''}
      empty={<EmptyState icon={CircleSlash} title={t('Menu dekhne ki permission nahi')} message={t('Malik se "Menu dekhna" (restaurant.menu.view) ki permission lein.')} />} />;
  }

  return (
    <>
      <ListTemplate<BoardItem>
        title={t('Menu')}
        grouped={false}
        actions={<Row gap={1}>
          <IconButton icon={ArrowDownWideNarrow} label={t('Sort')} badge={sort !== 'name' || inactive ? 1 : undefined} onPress={() => setSortOpen(true)} />
          <IconButton icon={BookOpen} label={t('Recipes')} onPress={() => router.push('/restaurant/recipes' as never)} />
        </Row>}
        search={tab !== 'analytics' ? { value: search, onChange: setSearch, placeholder: t('Dish, raw material, SKU ya barcode…') } : undefined}
        summary={header}
        data={tab === 'analytics' ? [] : items}
        loading={tab !== 'analytics' && board.isLoading}
        error={tab !== 'analytics' && !board.data ? board.error : undefined}
        onRetry={() => void board.refetch()}
        refreshing={board.isRefetching && !board.isFetchingNextPage}
        onRefresh={() => { void board.refetch(); void analytics.refetch(); }}
        onEndReached={() => { if (board.hasNextPage && !board.isFetchingNextPage) void board.fetchNextPage(); }}
        keyExtractor={(i) => i.productId}
        renderItem={({ item }) => (
          <MenuRow item={item} cost={cost} costHidden={costHidden} canMenu={canMenu} picked={picked.has(item.productId)} picking={picked.size > 0}
            onPick={() => flip(item.productId)}
            onToggle={() => guard(() => (item.available ? setOffFor(item) : setOne.mutate({ item, on: true })))}
            onAdd={() => guard(() => addToMenu.mutate([item.productId]))} />
        )}
        empty={tab === 'analytics' ? undefined : <Empty tab={tab} filtered={!!(term || categoryId !== 'all' || inactive)} canCreate={canCreate} />}
        fab={canCreate ? { icon: Plus, label: t('Nayi dish'), onPress: () => router.push('/products/new' as never) } : undefined}
      />
      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} title={t('Sort')}>
        <View style={{ gap: th.space(2) }}>
          <View>{SORTS.map((s) => <ListRow key={s.value} icon={ArrowDownWideNarrow} title={t(s.label)} selected={sort === s.value} onPress={() => { setSort(s.value); setSortOpen(false); }} />)}</View>
          <ListRow icon={CircleSlash} title={t('Band products')} subtitle={t('Jo band kiye gaye')} selected={inactive} onPress={() => { setInactive((v) => !v); setSortOpen(false); }} />
        </View>
      </Sheet>
      {offFor && (
        <Sheet open onClose={() => setOffFor(null)} title={t('Kab tak band rahe?')} description={t('Sirf is branch me band hoti hai (sab branch dekh rahe hon to har branch me). Waqt poora hote hi khud chalu.')}>
          <View>
            {([[msg('Aaj din khatam tak'), undefined], [msg('1 ghanta'), 1], [msg('2 ghante'), 2], [msg('Jab tak chalu na karein'), null]] as Array<[string, number | null | undefined]>).map(([label, h]) => (
              <ListRow key={label} icon={CircleSlash} iconTone="danger" title={t(label)} onPress={() => setOne.mutate({ item: offFor, on: false, until: h === undefined ? undefined : h === null ? null : inHours(h) })} />
            ))}
            <ListRow icon={Power} destructive title={t('Menu se hi band karein (har branch, khud chalu nahi hogi)')}
              onPress={() => { const id = offFor.menuItemId; setOffFor(null); if (id) void menuItemsApi.setAvailable(id, false).then(() => { toast.success(t('Menu se band — har branch me')); refresh(); }).catch((e) => toast.error(apiErrorMessage(e))); }} />
          </View>
        </Sheet>
      )}
    </>
  );
}

function MenuRow({ item: i, cost, costHidden, canMenu, picked, picking, onPick, onToggle, onAdd }: {
  item: BoardItem; cost: (n: number) => string; costHidden: boolean; canMenu: boolean; picked: boolean; picking: boolean; onPick: () => void; onToggle: () => void; onAdd: () => void;
}) {
  const th = useTheme();
  const spice = spiceOf(i.spiceLevel);
  const low = i.kind !== 'dish' && i.stock !== null && i.stock <= i.lowStockAlert;
  const hours = i.hours.from || i.hours.to ? `${clock12(i.hours.from) || '…'}–${clock12(i.hours.to) || '…'}` : null;
  const tags = [
    i.kind === 'raw' ? t('Raw') : i.kind === 'bought' ? t('Bani banai') : null,
    i.chefSpecial ? t('Chef special') : null,
    spice?.chillies || null,
    i.prepTime ? t('{{prepTime}} min', { prepTime: i.prepTime }) : null,
    hours ? `${hours}${!i.servingNow ? t(' · abhi nahi') : ''}` : null,
    i.addOnGroups > 0 ? `${i.addOnGroups} add-on` : null,
    i.recipe?.unitProblems.length ? t('Unit ghalat') : null,
  ].filter(Boolean).join(' · ');
  const make = i.kind === 'dish'
    ? (!i.recipe ? t('Recipe nahi') : i.canMake === null ? '—' : i.canMake === 0 ? t('Nahi · {{name}} khatam', { name: i.blocker?.name ?? '' }) : t('{{canMake}} plate', { canMake: i.canMake }))
    : `${fmt(i.stock ?? 0)} ${i.unit}${low ? t(' · kam') : ''}`;
  const makeTone = i.kind === 'dish' ? (!i.recipe ? 'info' : i.canMake === 0 ? 'danger' : i.canMake != null && i.canMake <= 5 ? 'warning' : 'secondary') : low ? 'danger' : 'secondary';
  const switchLabel = !i.onPos ? null : i.available ? (i.canMake === 0 ? t('Mil rahi?') : t('Mil rahi')) : i.offHere ? offLabel(i.offUntil) : t('Band (86)');
  return (
    <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: picked ? th.colors.brand.soft : th.colors.surface, borderWidth: picked ? 2 : th.isDark ? 1 : 0.5, borderColor: picked ? th.colors.brand.solid : th.colors.border, opacity: i.isActive ? 1 : 0.6 }}>
      <ListRow onPress={picking ? onPick : () => router.push(`/products/${i.productId}` as never)} onLongPress={onPick}
        leading={<ProductThumb name={i.name} category={i.category?.name} url={i.image} size={44} />}
        title={i.name}
        subtitle={[i.category?.name, tags].filter(Boolean).join(' · ') || undefined}
        trailing={i.kind === 'raw' ? undefined : <Amount value={i.price} weight="bold" />} />
      <Row gap={2} wrap style={{ paddingHorizontal: th.space(3), paddingBottom: th.space(3) }}>
        <Text size="xs" tone={makeTone as 'secondary'} weight="semibold" style={{ flex: 1 }}>{make}{i.kind === 'dish' && i.canMake != null && i.canMake > 0 && i.canMake <= 5 && i.blocker ? ` · ${i.blocker.name}` : ''}</Text>
        {!costHidden && i.kind !== 'raw' && i.foodCostPct !== null && <Badge tone={foodTone(i.foodCostPct)}>{`${cost(i.cost)} · ${i.foodCostPct}%`}</Badge>}
        {i.kind !== 'raw' && <Text size="xs" tone="muted">{t('Biki')} {fmt(i.sold)}</Text>}
        {i.kind !== 'raw' && (switchLabel
          ? <Button size="sm" variant={i.available ? (i.canMake === 0 ? 'soft' : 'success') : 'danger'} icon={Power} disabled={!canMenu} onPress={onToggle}>{switchLabel}</Button>
          : canMenu ? <Button size="sm" variant="secondary" icon={Plus} onPress={onAdd}>{t('+ Menu')}</Button> : <Text size="xs" tone="muted">{t('Menu se bahar')}</Text>)}
        {canMenu && <IconButton icon={Pencil} label={t('Badlein')} size="sm" onPress={() => router.push(`/products/${i.productId}/edit` as never)} />}
      </Row>
    </View>
  );
}

function Empty({ tab, filtered, canCreate }: { tab: Tab; filtered: boolean; canCreate: boolean }) {
  const text: Partial<Record<Tab, [string, string]>> = {
    cantmake: [msg('Har dish ban sakti hai'), msg('Kisi recipe ka saamaan khatam nahi.')],
    off: [msg('Koi dish band nahi'), msg('Jo dish khatam ho jaye use "Mil rahi" dabakar band karein.')],
    norecipe: [msg('Har dish ki recipe hai'), msg('Bikne par saamaan stock se katta hai.')],
    notonpos: [msg('Sab menu par hai'), msg('Products list ki har bikne wali cheez restaurant counter par aati hai.')],
    raw: [msg('Raw material nahi'), msg('Chicken, chawal, oil jaisi cheezein "Raw material" bana kar daalein — recipe me lagti hain.')],
  };
  const [title, sub] = filtered ? [msg('Is filter me kuch nahi'), msg('Filter badal kar dekhein')] : text[tab] ?? [msg('Menu khali hai'), msg('Pehli dish jorein — naam, rate, size aur recipe.')];
  return <EmptyState icon={Sparkles} title={t(title)} message={t(sub)}
    action={!filtered && canCreate && (tab === 'all' || tab === 'raw') ? <Button icon={Plus} onPress={() => router.push('/products/new' as never)}>{t('Nayi dish')}</Button> : undefined} />;
}

function MenuEngineering({ days, setDays, q, cost, costHidden }: {
  days: string; setDays: (d: string) => void; q: ReturnType<typeof useQuery<Awaited<ReturnType<typeof boardApi.analytics>>>>; cost: (n: number) => string; costHidden: boolean;
}) {
  const th = useTheme();
  const [cls, setCls] = useState<DishClass | 'all'>('all');
  const data = q.data;
  const rows = useMemo(() => (data?.rows ?? []).filter((r) => cls === 'all' || r.class === cls), [data, cls]);
  const tt = data?.totals;
  return (
    <View style={{ gap: th.space(3) }}>
      <ChipGroup value={days} onChange={setDays} options={['7', '30', '90'].map((d) => ({ value: d, label: t('{{d}} din', { d }) }))} />
      <Text size="xs" tone="muted">{t('Wohi hisaab jo Profit report me — return aur bill ka Discount kaat kar')}</Text>
      {q.isLoading || !tt ? <Skeleton height={140} /> : (
        <>
          <Row gap={2}>
            <StatTile style={{ flex: 1 }} icon={ShoppingCart} tone="info" label={t('Dishes ki sale')} value={<Amount value={tt.dishRevenue} size="lg" weight="bold" compact />} hint={t('{{plates}} plate · {{bills}} bill', { plates: fmt(tt.plates), bills: tt.bills })} />
            <StatTile style={{ flex: 1 }} icon={Wheat} tone="warning" label={t('Saamaan ki cost')} value={cost(tt.dishCost)} hint={costHidden || tt.foodCostPct === null ? undefined : t('{{foodCostPct}}% food cost', { foodCostPct: tt.foodCostPct })} />
          </Row>
          <Row gap={2}>
            <StatTile style={{ flex: 1 }} icon={Sparkles} tone="success" label={t('Gross profit')} value={cost(tt.dishProfit)} hint={t('Dishes se')} />
            <StatTile style={{ flex: 1 }} icon={BarChart3} tone="brand" label={t('Net sale (report)')} value={<Amount value={tt.netSales} size="lg" weight="bold" compact />}
              hint={tt.serviceCharges ? t('{{serviceCharges}} service charge shamil', { serviceCharges: formatPKR(tt.serviceCharges) }) : undefined} />
          </Row>
        </>
      )}
      <Row gap={2} wrap>
        {(Object.keys(CLASS) as DishClass[]).map((k) => (
          <View key={k} style={{ width: '48%' }}>
            <StatTile icon={CLASS[k].icon} tone={CLASS[k].tone} label={`${t(CLASS[k].label)} · ${data?.counts[k] ?? 0}`} value={<Text size="xs" tone="secondary">{t(CLASS[k].hint)}</Text>} onPress={() => setCls(cls === k ? 'all' : k)} />
          </View>
        ))}
      </Row>
      {!q.isLoading && !rows.length ? <Text tone="muted" align="center">{t('Is period me koi dish nahi biki')}</Text> : (
        <Card flush>
          {rows.map((r, i) => (
            <ListRow key={r.productId} divider={i < rows.length - 1} title={r.name}
              subtitle={`${fmt(r.qty)} ${t('plate')} (${r.share}%) · ${formatPKR(r.revenue)} · ${t('Profit')} ${cost(r.profit)} · ${t('Fi plate')} ${cost(r.perPlate)}`}
              trailing={<Badge tone={CLASS[r.class].tone}>{t(CLASS[r.class].label)}</Badge>} onPress={() => router.push(`/products/${r.productId}` as never)} />
          ))}
        </Card>
      )}
    </View>
  );
}
