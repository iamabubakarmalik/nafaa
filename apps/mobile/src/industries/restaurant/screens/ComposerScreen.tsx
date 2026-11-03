/**
 * Taking an order (web OrderComposer): dine-in on a table, takeaway,
 * delivery or a counter order with a token. Dishes come from the menu with
 * their options; the order goes to the kitchen (one ticket per station) and
 * can be paid at once (counter / fast food) or later from the table. With
 * `orderId` the same screen adds dishes to a running order and only the new
 * ones go to the kitchen.
 *
 * Phones: the menu with a bill bar that opens the bill; tablets: menu and
 * bill side by side. Without internet a counter order is paid as a normal
 * bill through the offline engine, and a kitchen order is kept on the phone
 * (ticket printed here) and sent when the connection is back.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { router, useLocalSearchParams } from 'expo-router';
import { ChefHat, CloudOff, Flame, MapPin, NotebookPen, Percent, Phone, Send, Star, Store, Trash2, UserRound, Users, Wallet } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ORDER_MODES, composerProblem, extrasText, orderBill, sameLine, unitPrice, type DishSize, type OrderMode, type PickedModifier,
} from '@nafaa/core/restaurant';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { OfflineRuleError, enqueueSale, useOfflineList } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { currentPrinter, systemPrinter } from '@/core/receipt';
import { kv } from '@/core/storage/kv';
import {
  Amount, Badge, Button, Checkbox, Chip, EmptyState, Icon, IconButton, Input, PressableScale, Row, ScreenHeader, SearchBar, Segmented, Select, Sheet,
  Skeleton, Text, TextArea, toast, useDebouncedValue, useLayout, useTabBarSpace, useTheme, withAlpha,
} from '@/design';
import { usePos } from '@/modules/pos/engine/usePos';
import { useCounter } from '@/modules/pos/engine/counter';
import { Stepper } from '@/modules/pos/components/parts';
import { useShellUi } from '@/modules/shell/hooks/useShellUi';
import { happyQuote, ordersApi, tablesApi, type FloorTable, type Kot, type NewOrder, type OrderItem, type RestaurantOrder } from '../api';
import { useMenu, type MenuEntry } from '../menu';
import { FLOOR_KEY, MODE_META, ORDER_KEY, apiError, orderTitle, refreshOrders } from '../meta';
import { queueOrder, useOrderQueueSync } from '../offlineOrders';
import { printKot } from '../slips';
import { DishSheet, type PickedDish } from '../components/DishSheet';
import { TablePickerSheet } from '../components/TablePickerSheet';
import { usePayOrder } from '../components/PaySheet';

interface Line { key: string; entry: MenuEntry; size?: DishSize; quantity: number; modifiers: PickedModifier[]; note: string }
type PickedTable = Pick<FloorTable, 'id' | 'tableNumber' | 'section' | 'capacity'>;

const PREF_KEY = 'nafaa.restaurant.order';
const lineUnit = (l: Line) => unitPrice(l.entry.price, l.size, l.modifiers);

/** Restaurant counter inside the POS tab (cafe / fast food quick mode). */
export function CounterScreen() {
  return <ComposerScreen counter />;
}

/** /restaurant/orders/new ?mode=TAKEAWAY · ?tableId=… · ?orderId=… */
export function NewOrderScreen() {
  const p = useLocalSearchParams<{ mode?: string; tableId?: string; orderId?: string }>();
  const mode = ORDER_MODES.includes(p.mode as OrderMode) ? (p.mode as OrderMode) : undefined;
  const pos = usePos();
  const open = useShellUi((s) => s.open);
  if (!pos.shopId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState icon={Store} title={t('Choose a shop to sell from')} action={<Button icon={Store} onPress={() => open('shop')}>{t('Choose shop')}</Button>} />
      </View>
    );
  }
  return <ComposerScreen key={p.orderId ?? 'new'} initialMode={mode} initialTableId={p.tableId} orderId={p.orderId} />;
}

export function ComposerScreen({ counter = false, initialMode, initialTableId, orderId }: {
  counter?: boolean; initialMode?: OrderMode; initialTableId?: string; orderId?: string;
}) {
  const th = useTheme();
  const insets = useSafeAreaInsets();
  const { isTablet, width } = useLayout();
  const tabBar = useTabBarSpace();
  const tabSpace = counter ? tabBar : 0;
  const online = useOnlineStatus();
  const can = usePermission();
  const pos = usePos();
  const rules = useCounter();
  const me = useAuthStore((s) => s.user);
  const shopName = useAuthStore((s) => s.tenant?.name) || t('Restaurant');
  const queue = useOrderQueueSync();
  const { data: sellers = [] } = useOfflineList<{ userId: string; name: string }>('seller');

  const [mode, setMode] = useState<OrderMode>(initialMode ?? (counter ? 'PICKUP' : 'DINE_IN'));
  const [table, setTable] = useState<PickedTable | null>(null);
  const [guests, setGuests] = useState(2);
  const [waiterId, setWaiterId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [packing, setPacking] = useState('');
  const [discount, setDiscount] = useState('');
  const [servicePct, setServicePct] = useState<string | null>(null);
  const [taxPct, setTaxPct] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [picking, setPicking] = useState<MenuEntry | null>(null);
  const [noteFor, setNoteFor] = useState<Line | null>(null);
  const [sheet, setSheet] = useState<'bill' | 'charges' | 'table' | null>(null);
  const [kotPrint, setKotPrint] = useState(() => kv.get<{ kotPrint?: boolean }>(PREF_KEY, {}).kotPrint ?? currentPrinter() !== systemPrinter);
  const q = useDebouncedValue(search.trim().toLowerCase(), 120);

  const menu = useMenu();
  const adding = !!orderId;
  const existingQ = useQuery({ queryKey: [ORDER_KEY, orderId], queryFn: () => ordersApi.getOne(orderId!), enabled: adding });
  const existing = existingQ.data;
  const floorQ = useQuery({ queryKey: [FLOOR_KEY], queryFn: () => tablesApi.floor(), enabled: !adding && mode === 'DINE_IN', staleTime: 15_000 });
  const hasTables = (floorQ.data?.tables.length ?? 0) > 0;

  // Tax follows the shop's tax setting unless prices already include it.
  useEffect(() => {
    if (!taxPct && rules.tax.on && !rules.tax.inclusive && rules.tax.rate > 0) setTaxPct(String(rules.tax.rate));
  }, [rules.tax.on, rules.tax.rate]); // eslint-disable-line react-hooks/exhaustive-deps

  // A table chosen on the floor arrives by id.
  useEffect(() => {
    if (!initialTableId || table) return;
    const x = floorQ.data?.tables.find((tb) => tb.id === initialTableId);
    if (x) setTable({ id: x.id, tableNumber: x.tableNumber, section: x.section, capacity: x.capacity });
  }, [initialTableId, floorQ.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => menu.entries.filter((e) => (category === 'all' || e.category?.id === category) && (!q || e.name.toLowerCase().includes(q) || e.sku?.toLowerCase().includes(q))), [menu.entries, q, category]);
  const inCart = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lines) m.set(l.entry.productId, (m.get(l.entry.productId) ?? 0) + l.quantity);
    return m;
  }, [lines]);

  const subtotal = lines.reduce((s, l) => s + lineUnit(l) * l.quantity, 0);
  const happyCart = useMemo(() => {
    const qty = new Map<string, { productId: string; variantId?: string; quantity: number }>();
    lines.forEach((l) => {
      const key = `${l.entry.productId}:${l.size?.id ?? ''}`;
      const row = qty.get(key) ?? { productId: l.entry.productId, variantId: l.size?.id, quantity: 0 };
      qty.set(key, { ...row, quantity: row.quantity + l.quantity });
    });
    return [...qty.values()];
  }, [lines]);
  const happyQ = useQuery({
    queryKey: ['restaurant-happy-quote', happyCart, mode],
    queryFn: () => happyQuote(happyCart, mode).catch(() => null),
    enabled: online && !adding && happyCart.length > 0 && rules.rules.allowDiscount,
    staleTime: 30_000,
  });
  const serviceText = servicePct ?? (rules.serviceChargePct ? String(rules.serviceChargePct) : '');
  const bill = orderBill({
    mode, subtotal, happy: !adding && lines.length ? happyQ.data?.discount ?? 0 : 0, servicePct: Number(serviceText) || 0, taxPct: Number(taxPct) || 0,
    deliveryFee: Number(deliveryFee) || 0, packing: Number(packing) || 0, discount: Number(discount) || 0,
  });
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  const problemCode = composerProblem({ lines: lines.length, adding, mode, address, phone: customerPhone, bill });
  const problem = problemCode === 'empty' ? t('Menu se item chunein') : problemCode === 'address' ? t('Delivery ka pata likhein')
    : problemCode === 'phone' ? t('Delivery ke liye phone likhein') : problemCode === 'discount' ? t('Discount bill se zyada hai') : null;

  const add = (entry: MenuEntry, picked?: PickedDish) => {
    const modifiers = picked?.modifiers ?? [];
    const note = picked?.note ?? '';
    const size = picked?.size;
    setLines((prev) => {
      const same = prev.find((l) => sameLine({ productId: l.entry.productId, sizeId: l.size?.id, modifiers: l.modifiers, note: l.note }, { productId: entry.productId, sizeId: size?.id, modifiers, note }));
      if (same) return prev.map((l) => (l === same ? { ...l, quantity: l.quantity + (picked?.quantity ?? 1) } : l));
      return [...prev, { key: `${entry.productId}-${Date.now()}-${prev.length}`, entry, size, quantity: picked?.quantity ?? 1, modifiers, note }];
    });
  };
  const tap = (entry: MenuEntry) => (entry.groups.length || entry.sizes.length ? setPicking(entry) : add(entry));
  const setQty = (key: string, n: number) => setLines((prev) => (n <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(n, 999) } : l))));

  const items = (): OrderItem[] => lines.map((l) => ({
    productId: l.entry.productId, variantId: l.size?.id, quantity: l.quantity, unit: l.entry.unit,
    specialInstructions: l.note || undefined,
    modifiers: l.modifiers.map((m) => ({ modifierOptionId: m.modifierOptionId, quantity: m.quantity })),
  }));

  const reset = () => {
    setLines([]); setTable(null); setCustomerName(''); setCustomerPhone(''); setAddress(''); setDeliveryNotes('');
    setDeliveryFee(''); setPacking(''); setDiscount(''); setOrderNote(''); setGuests(2); setSearch(''); setServicePct(null); setSheet(null);
  };

  const body = (): NewOrder => ({
    mode,
    tableId: mode === 'DINE_IN' ? table?.id : undefined,
    numberOfGuests: mode === 'DINE_IN' ? guests : undefined,
    waiterId: waiterId || undefined,
    customerName: customerName.trim() || undefined,
    customerPhone: customerPhone.trim() || undefined,
    deliveryAddress: mode === 'DELIVERY' ? address.trim() : undefined,
    deliveryNotes: mode === 'DELIVERY' ? deliveryNotes.trim() || undefined : undefined,
    deliveryFee: bill.fee || undefined,
    packagingFee: bill.pack || undefined,
    serviceChargePct: mode === 'DINE_IN' ? Number(serviceText) || 0 : undefined,
    taxPct: Number(taxPct) || undefined,
    discount: bill.discount || undefined,
    specialRequests: orderNote.trim() || undefined,
    items: items(),
  });

  /** Kitchen ticket from the phone's copy (order kept for later). */
  const localKot = (title: string): Pick<Kot, 'kotNumber' | 'station' | 'status' | 'createdAt' | 'notes' | 'itemsSnapshot' | 'order'> => ({
    kotNumber: `OFF-${Date.now().toString().slice(-5)}`, station: null, status: 'PENDING', createdAt: new Date().toISOString(), notes: null, order: null,
    itemsSnapshot: {
      orderNumber: title, mode, guests: mode === 'DINE_IN' ? guests : null, customerName: customerName || null, specialRequests: orderNote || null,
      table: mode === 'DINE_IN' && table ? { tableNumber: table.tableNumber, section: table.section } : null,
      items: lines.map((l) => ({ name: `${l.entry.name}${l.size ? ` · ${l.size.name}` : ''}`, quantity: l.quantity, modifiers: l.modifiers.map((m) => m.name), specialInstructions: l.note || null })),
    },
  });

  const printNewKots = (order: RestaurantOrder, before: string[] = []) => {
    const fresh = (order.kots ?? []).filter((k) => !before.includes(k.id) && k.status !== 'CANCELLED');
    if (kotPrint) fresh.slice().reverse().forEach((k) => printKot({ ...k, order: { ...(k.order ?? {}), token: order.token } as Kot['order'] }, shopName));
    return fresh.length;
  };

  const payment = usePayOrder(() => { if (counter) reset(); });

  /** Counter order paid without internet: a normal bill through the offline engine. */
  const payOffline = async () => {
    if (!pos.shopId) return;
    const extras: Array<{ type: string; label: string; amount: number }> = [
      ...(bill.service > 0 ? [{ type: 'SERVICE', label: 'Service charge', amount: bill.service }] : []),
      ...(bill.pack > 0 ? [{ type: 'PACKING', label: 'Packing', amount: bill.pack }] : []),
      ...(bill.fee > 0 ? [{ type: 'DELIVERY', label: 'Delivery', amount: bill.fee }] : []),
    ];
    const { saleId } = await enqueueSale({
      shopId: pos.shopId, paymentMethod: rules.defaultMethod, paidAmount: bill.total, discount: bill.discount || undefined,
      note: [t(MODE_META[mode].label), customerName.trim(), orderNote.trim()].filter(Boolean).join(' · '),
      serviceCharges: extras.length ? extras : undefined,
      items: lines.map((l) => ({ productId: l.entry.productId, variantId: l.size?.id, quantity: l.quantity, priceOverride: lineUnit(l), note: [extrasText(l.modifiers), l.note].filter(Boolean).join(' · ') || undefined })),
    }, { allowOversell: true });
    if (kotPrint) printKot(localKot(t('Counter order')), shopName);
    toast.success(t('Bill ban gaya — internet aane par bheja jayega'));
    reset();
    router.push(`/pos/receipt/${saleId}` as never);
  };

  const save = useMutation({
    mutationFn: async ({ kitchen }: { kitchen: boolean; pay?: boolean }) => {
      if (adding) {
        const before = (existing?.kots ?? []).map((k) => k.id);
        const order = await ordersApi.addItems(orderId!, items(), kitchen);
        return { order, kots: printNewKots(order, before) };
      }
      const order = await ordersApi.create({ ...body(), sendToKitchen: kitchen });
      return { order, kots: printNewKots(order) };
    },
    onSuccess: ({ order, kots }, { pay }) => {
      refreshOrders();
      const where = orderTitle(order);
      toast.success(kots ? t('{{where}} — kitchen ko {{kots}} ticket gaye', { where, kots }) : t('{{where}} — order save ho gaya', { where }));
      if (pay) { reset(); payment.open(order, null); return; }
      if (adding) { router.replace(`/restaurant/orders/${order.id}` as never); return; }
      if (counter) { reset(); return; }
      router.replace((order.mode === 'DINE_IN' ? '/tables' : `/restaurant/orders/${order.id}`) as never);
    },
    onError: (e) => toast.error(apiError(e, t('Order save nahi hua'))),
  });

  const submit = async (kitchen: boolean, pay = false) => {
    if (save.isPending) return;
    if (problem) { toast.error(problem); return; }
    if (!online) {
      if (adding) { toast.error(t('Is ke liye internet chahiye')); return; }
      if (pay) {
        try { await payOffline(); } catch (e) { toast.error(e instanceof OfflineRuleError ? e.message : apiError(e)); }
        return;
      }
      const title = mode === 'DINE_IN' && table ? t('Table {{tableNumber}}', { tableNumber: table.tableNumber }) : customerName.trim() || t(MODE_META[mode].label);
      queueOrder({ ...body(), sendToKitchen: kitchen }, title, bill.total);
      if (kitchen && kotPrint) printKot(localKot(title), shopName);
      toast.success(t('Order phone par rakha — internet aate hi kitchen ko jayega'));
      reset();
      return;
    }
    if (!adding && mode === 'DINE_IN' && !table && hasTables) { setSheet('table'); return; }
    save.mutate({ kitchen, pay });
  };

  const toggleKotPrint = (v: boolean) => { setKotPrint(v); kv.set(PREF_KEY, { kotPrint: v }); };

  const title = adding
    ? t('{{value}} — aur item', { value: existing ? orderTitle(existing) : '…' })
    : counter ? t('Counter order') : t('Naya order');
  const cols = isTablet ? (width >= 1100 ? 4 : 3) : width >= 400 ? 3 : 2;

  // ── Pieces ──
  const modeBar = !adding && (
    <Segmented value={mode} onChange={setMode} size="sm"
      options={ORDER_MODES.map((m) => ({ value: m, label: t(MODE_META[m].short), icon: MODE_META[m].icon }))} />
  );

  const orderHead = adding ? (
    existing ? (
      <View style={{ padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted, gap: 2 }}>
        <Text size="sm" weight="semibold">{t('Pehle se: {{count}} item · {{total}}', { count: existing.items.filter((i) => !i.isReturned).length, total: formatMoney(existing.total) })}</Text>
        <Text size="xs" tone="secondary" numberOfLines={2}>{existing.items.filter((i) => !i.isReturned).map((i) => `${i.quantity}× ${i.product?.name ?? ''}`).join(', ')}</Text>
        <Text size="xs" tone="muted">{t('Sirf naye item kitchen jayenge.')}</Text>
      </View>
    ) : <Skeleton height={64} />
  ) : (
    <View style={{ gap: th.space(2) }}>
      {mode === 'DINE_IN' ? (
        <Row gap={2}>
          <PressableScale onPress={() => setSheet('table')} haptic="tap" style={{ flex: 1, minHeight: 48, borderRadius: th.radius('lg'), paddingHorizontal: th.space(3), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: table ? th.colors.success.soft : th.colors.surface, borderWidth: 1, borderColor: table ? th.colors.success.border : th.colors.borderStrong }}>
            <Text weight="semibold" color={table ? th.colors.success.text : undefined}>{table ? t('Table {{tableNumber}}{{value}}', { tableNumber: table.tableNumber, value: table.section ? ` · ${table.section}` : '' }) : t('Table chunein')}</Text>
            <Text size="xs" tone="muted">{t('badlein')}</Text>
          </PressableScale>
          <Stepper compact value={guests} unit={t('Mehman')} onMinus={() => setGuests((g) => Math.max(1, g - 1))} onPlus={() => setGuests((g) => Math.min(200, g + 1))} />
        </Row>
      ) : (
        <Row gap={2}>
          <Input containerStyle={{ flex: 1 }} icon={UserRound} value={customerName} onChangeText={setCustomerName} placeholder={t('Naam (token par)')} size="sm" />
          <Input containerStyle={{ flex: 1 }} icon={Phone} value={customerPhone} onChangeText={(v) => setCustomerPhone(v.replace(/[^\d+\s-]/g, ''))} placeholder={t('03xx…')} keyboardType="phone-pad" ltr size="sm" />
        </Row>
      )}
      {mode === 'DELIVERY' && (
        <>
          <TextArea icon={MapPin} value={address} onChangeText={(v) => setAddress(v.slice(0, 300))} placeholder={t('Ghar ka pata, gali, nishani…')} />
          <Row gap={2}>
            <Input containerStyle={{ flex: 1 }} value={deliveryNotes} onChangeText={(v) => setDeliveryNotes(v.slice(0, 300))} placeholder={t('Rider ke liye note')} size="sm" />
            <Input containerStyle={{ flex: 1 }} value={deliveryFee} onChangeText={(v) => setDeliveryFee(v.replace(/[^\d.]/g, ''))} placeholder={t('Delivery charge')} keyboardType="decimal-pad" ltr size="sm" />
          </Row>
        </>
      )}
      {sellers.length > 1 && (
        <Select label={undefined} value={waiterId} onChange={(v) => setWaiterId(String(v))}
          options={[{ value: '', label: t('Waiter: {{value}}', { value: me?.fullName ?? '' }) }, ...sellers.filter((s) => s.userId !== me?.id).map((s) => ({ value: s.userId, label: s.name }))]} />
      )}
    </View>
  );

  const lineList = !lines.length ? (
    <View style={{ alignItems: 'center', paddingVertical: th.space(8), gap: th.space(1) }}>
      <Icon icon={NotebookPen} size={36} tone="subtle" />
      <Text size="sm" weight="medium" tone="secondary">{t('Menu se dish dabayein')}</Text>
      <Text size="xs" tone="muted" align="center">{t('Options wali dish par size aur add-on poochay jayenge')}</Text>
    </View>
  ) : (
    <View>
      {lines.map((l) => (
        <View key={l.key} style={{ paddingVertical: th.space(2), borderBottomWidth: 1, borderBottomColor: th.colors.divider, gap: th.space(1.5) }}>
          <Row gap={2} align="start">
            <View style={{ flex: 1 }}>
              <Text weight="semibold" numberOfLines={1}>{l.entry.name}{l.size ? <Text tone="muted">{` · ${l.size.name}`}</Text> : null}</Text>
              {l.modifiers.length > 0 && <Text size="xs" tone="muted" numberOfLines={2}>{extrasText(l.modifiers)}</Text>}
              {!!l.note && <Text size="xs" italic color={th.colors.warning.text} numberOfLines={2}>“{l.note}”</Text>}
            </View>
            <Amount value={lineUnit(l) * l.quantity} weight="bold" />
          </Row>
          <Row gap={2}>
            <Stepper compact value={l.quantity} onMinus={() => setQty(l.key, l.quantity - 1)} onPlus={() => setQty(l.key, l.quantity + 1)} />
            <Button size="sm" variant="ghost" onPress={() => setNoteFor(l)}>{l.note ? t('Note badlein') : t('Note')}</Button>
            <View style={{ flex: 1 }} />
            <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => setQty(l.key, 0)} />
          </Row>
        </View>
      ))}
    </View>
  );

  const totals = (
    <View style={{ gap: 2 }}>
      <Row justify="between"><Text size="sm" tone="secondary">{t('{{count}} item', { count })}</Text><Amount value={bill.subtotal} size="sm" /></Row>
      {bill.happy > 0 && <Row justify="between"><Text size="sm" color={th.colors.success.text} numberOfLines={1} style={{ flex: 1 }}>{t('Happy hour{{value}}', { value: happyQ.data?.rules.length ? ` (${happyQ.data.rules.map((r) => r.name).join(', ')})` : '' })}</Text><Text size="sm" ltr color={th.colors.success.text}>{`−${formatMoney(bill.happy)}`}</Text></Row>}
      {!adding && bill.service > 0 && <Row justify="between"><Text size="sm" tone="secondary">{t('Service {{svcPct}}%', { svcPct: Number(serviceText) })}</Text><Amount value={bill.service} size="sm" /></Row>}
      {!adding && bill.tax > 0 && <Row justify="between"><Text size="sm" tone="secondary">{t('Tax')}</Text><Amount value={bill.tax} size="sm" /></Row>}
      {!adding && bill.fee + bill.pack > 0 && <Row justify="between"><Text size="sm" tone="secondary">{t('Delivery / packing')}</Text><Amount value={bill.fee + bill.pack} size="sm" /></Row>}
      {!adding && bill.discount > 0 && <Row justify="between"><Text size="sm" color={th.colors.danger.text}>{t('Discount')}</Text><Text size="sm" ltr color={th.colors.danger.text}>{`−${formatMoney(bill.discount)}`}</Text></Row>}
      <Row justify="between" style={{ paddingTop: 4 }}><Text weight="semibold">{adding ? t('Naye item') : t('Kul')}</Text><Amount value={adding ? bill.subtotal : bill.total} size="2xl" weight="bold" /></Row>
    </View>
  );

  const actions = (
    <View style={{ gap: th.space(2) }}>
      {!adding && (
        <PressableScale onPress={() => setSheet('charges')} haptic="tap" style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), minHeight: 44, paddingHorizontal: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
          <Icon icon={Percent} size={16} tone="muted" />
          <Text size="sm" weight="semibold" style={{ flex: 1 }}>{t('Charges, discount aur note')}</Text>
          <Text size="xs" tone="muted" numberOfLines={1}>{[Number(serviceText) && mode === 'DINE_IN' ? t('Service {{value}}%', { value: serviceText }) : '', Number(taxPct) ? t('Tax {{value}}%', { value: taxPct }) : '', bill.discount ? t('Discount {{value}}', { value: formatMoney(bill.discount) }) : ''].filter(Boolean).join(' · ') || t('kholein')}</Text>
        </PressableScale>
      )}
      {totals}
      <Checkbox value={kotPrint} onChange={toggleKotPrint} label={t('Kitchen ticket (KOT) print karein')} />
      <Row gap={2}>
        <Button size="lg" icon={Send} style={{ flex: adding ? 1 : counter ? 1 : 1.4 }} variant={counter && !adding ? 'secondary' : 'primary'} loading={save.isPending && !save.variables?.pay} disabled={!lines.length} onPress={() => void submit(true)}>{t('Kitchen bhejein')}</Button>
        {!adding && can(P.POS_USE) && (
          <Button size="lg" icon={Wallet} style={{ flex: counter ? 1.4 : 1 }} variant={counter ? 'primary' : 'secondary'} loading={save.isPending && !!save.variables?.pay} disabled={!lines.length || save.isPending} onPress={() => void submit(true, true)}>{t('Payment')}</Button>
        )}
      </Row>
      {!adding && !counter && (
        <Button size="sm" variant="ghost" disabled={!lines.length || save.isPending} onPress={() => void submit(false)}>{t('Abhi kitchen nahi — sirf order save karein')}</Button>
      )}
    </View>
  );

  const billPanel = (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: th.space(4), gap: th.space(3) }}>
      {orderHead}
      {lineList}
      {actions}
    </ScrollView>
  );

  const header = (
    <View>
      <ScreenHeader title={title} compact onBack={counter ? null : undefined}
        actions={<>
          {(!online || queue.items.length > 0) && (
            <Badge tone={online ? 'info' : 'warning'} icon={CloudOff}>{queue.items.length ? String(queue.items.length) : t('Offline')}</Badge>
          )}
          {counter && can(P.RESTAURANT_ORDERS_VIEW) && <IconButton icon={Users} label={t('Tables')} onPress={() => router.push('/tables' as never)} />}
          {counter && can(P.RESTAURANT_KITCHEN_VIEW) && <IconButton icon={ChefHat} label={t('Kitchen')} onPress={() => router.push('/kitchen' as never)} />}
          {counter && can(P.RESTAURANT_ORDERS_VIEW) && <IconButton icon={NotebookPen} label={t('Orders')} onPress={() => router.push('/restaurant/orders' as never)} />}
        </>} />
      <View style={{ paddingHorizontal: th.space(3), gap: th.space(2), paddingBottom: th.space(2) }}>
        {modeBar}
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('Dish ka naam ya code…')} onSubmit={() => { if (shown.length) tap(shown[0]); }} />
        {menu.categories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: th.space(2) }}>
            <Chip label={t('Sab · {{count}}', { count: menu.entries.length })} selected={category === 'all'} onPress={() => setCategory('all')} />
            {menu.categories.map((c) => <Chip key={c.id} label={c.name} selected={category === c.id} onPress={() => setCategory(c.id)} />)}
          </ScrollView>
        )}
      </View>
    </View>
  );

  const barSpace = isTablet ? 0 : tabSpace + (counter ? 0 : insets.bottom) + 84;
  const grid = menu.loading ? (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2), padding: th.space(3) }}>
      {Array.from({ length: 9 }, (_, i) => <Skeleton key={i} width={`${100 / cols - 2}%`} height={120} radius={th.radius('xl')} />)}
    </View>
  ) : !shown.length ? (
    <EmptyState icon={ChefHat} title={menu.entries.length ? t('Is search me koi dish nahi') : t('Menu khaali hai')} message={menu.entries.length ? t('Naam badal kar dekhein') : t('Pehle menu me dishes daalein')}
      action={!menu.entries.length && can(P.RESTAURANT_MENU_VIEW) ? <Button variant="soft" onPress={() => router.push('/restaurant/menu' as never)}>{t('Menu kholein →')}</Button> : undefined} />
  ) : (
    <FlashList
      data={shown}
      numColumns={cols}
      keyExtractor={(e) => e.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: th.space(2), paddingBottom: barSpace + th.space(2) }}
      renderItem={({ item: e }) => <DishTile e={e} count={inCart.get(e.productId) ?? 0} onPress={() => tap(e)} />}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: th.colors.canvas, paddingTop: insets.top }}>
      <View style={{ flex: 1, flexDirection: isTablet ? 'row' : 'column' }}>
        <View style={{ flex: 1 }}>
          {header}
          {grid}
        </View>
        {isTablet && (
          <View style={{ width: Math.min(420, width * 0.4), borderStartWidth: 1, borderStartColor: th.colors.border, backgroundColor: th.colors.surface, paddingBottom: insets.bottom }}>
            {billPanel}
          </View>
        )}
      </View>

      {!isTablet && (
        <View style={{ position: 'absolute', start: th.space(3), end: th.space(3), bottom: tabSpace + (counter ? th.space(2) : Math.max(insets.bottom, th.space(3))) }}>
          <PressableScale onPress={() => setSheet('bill')} haptic="tap" scaleTo={0.98}
            style={{ minHeight: 60, borderRadius: th.radius('xl'), paddingHorizontal: th.space(4), flexDirection: 'row', alignItems: 'center', gap: th.space(3), backgroundColor: lines.length ? th.colors.brand.solid : th.colors.surfaceMuted, borderWidth: lines.length ? 0 : 1, borderColor: th.colors.border }}>
            <View style={{ minWidth: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: lines.length ? withAlpha('#ffffff', 0.2) : th.colors.surface }}>
              <Text weight="bold" ltr color={lines.length ? th.colors.brand.onSolid : undefined}>{String(count)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text weight="semibold" color={lines.length ? th.colors.brand.onSolid : undefined} numberOfLines={1}>
                {adding ? t('Naye item') : mode === 'DINE_IN' ? (table ? t('Table {{tableNumber}}', { tableNumber: table.tableNumber }) : t('Table chunein')) : t(MODE_META[mode].label)}
              </Text>
              <Text size="xs" color={lines.length ? withAlpha(th.colors.brand.onSolid, 0.8) : th.colors.textMuted}>{lines.length ? t('Bill dekhein') : t('Menu se dish dabayein')}</Text>
            </View>
            <Amount value={adding ? bill.subtotal : bill.total} size="xl" weight="bold" color={lines.length ? th.colors.brand.onSolid : undefined} />
          </PressableScale>
        </View>
      )}

      <Sheet open={sheet === 'bill' && !isTablet} onClose={() => setSheet(null)} height={0.9} title={title} scrollable={false}>
        {billPanel}
      </Sheet>

      <Sheet open={sheet === 'charges'} onClose={() => setSheet(null)} title={t('Charges, discount aur note')}
        footer={<Button size="lg" fullWidth onPress={() => setSheet(null)}>{t('Done')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          {mode === 'DINE_IN' && <Input label={t('Service charge %')} value={serviceText} onChangeText={(v) => setServicePct(v.replace(/[^\d.]/g, '').slice(0, 5))} keyboardType="decimal-pad" ltr
            hint={rules.serviceChargePct ? t('Dukaan ka {{shopService}}% (Settings) — sirf is order ke liye badlein', { shopService: rules.serviceChargePct }) : t('Sirf is order ke liye; dukaan ka Settings → Counter rules me')} />}
          <Input label={t('Tax %')} value={taxPct} onChangeText={(v) => setTaxPct(v.replace(/[^\d.]/g, '').slice(0, 5))} keyboardType="decimal-pad" ltr />
          <Input label={t('Discount (Rs)')} value={discount} onChangeText={(v) => setDiscount(v.replace(/[^\d.]/g, '').slice(0, 9))} keyboardType="decimal-pad" ltr hint={t('Had se zyada ho to payment par PIN')} />
          {mode !== 'DINE_IN' && <Input label={t('Packing (Rs)')} value={packing} onChangeText={(v) => setPacking(v.replace(/[^\d.]/g, '').slice(0, 9))} keyboardType="decimal-pad" ltr />}
          <Input label={t('Poore order ka note')} value={orderNote} onChangeText={(v) => setOrderNote(v.slice(0, 500))} placeholder={t('Jaise: bachon ki plate pehle')} />
        </View>
      </Sheet>

      <Sheet open={!!noteFor} onClose={() => setNoteFor(null)} title={t('Kitchen note')} footer={<Button size="lg" fullWidth onPress={() => setNoteFor(null)}>{t('Done')}</Button>}>
        {noteFor && (
          <Input autoFocus value={lines.find((x) => x.key === noteFor.key)?.note ?? ''} placeholder={t('Jaise: kam mirch')}
            onChangeText={(v) => setLines((prev) => prev.map((x) => (x.key === noteFor.key ? { ...x, note: v.slice(0, 300) } : x)))} />
        )}
      </Sheet>

      <DishSheet item={picking} onClose={() => setPicking(null)} onConfirm={(d) => { if (picking) add(picking, d); setPicking(null); }} />
      <TablePickerSheet open={sheet === 'table'} value={table?.id} onClose={() => setSheet(null)}
        onPick={(x) => { setTable({ id: x.id, tableNumber: x.tableNumber, section: x.section, capacity: x.capacity }); setSheet(null); }}
        onOpenOrder={(id) => { setSheet(null); router.push(`/restaurant/orders/new?orderId=${id}` as never); }} />
      {payment.sheet}
    </View>
  );
}

function DishTile({ e, count, onPress }: { e: MenuEntry; count: number; onPress: () => void }) {
  const th = useTheme();
  const color = e.category?.color ?? th.colors.textMuted;
  return (
    <View style={{ padding: th.space(1) }}>
      <PressableScale onPress={onPress} haptic="tap" scaleTo={0.96} accessibilityLabel={`${e.name}, ${formatMoney(e.price)}`}
        style={{ borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: count ? 2 : 1, borderColor: count ? th.colors.brand.solid : th.colors.border, minHeight: 128 }}>
        {e.image
          ? <Image source={{ uri: e.image }} style={{ height: 72, width: '100%' }} resizeMode="cover" />
          : <View style={{ height: 72, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(color, 0.12) }}><Icon icon={ChefHat} size={26} color={color} /></View>}
        {count > 0 && (
          <View style={{ position: 'absolute', top: 6, end: 6, minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: th.colors.brand.solid }}>
            <Text size="xs" weight="bold" ltr color={th.colors.brand.onSolid}>{String(count)}</Text>
          </View>
        )}
        <Row gap={1} style={{ position: 'absolute', top: 6, start: 6 }}>
          {e.chefSpecial && <View style={{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: th.colors.warning.solid }}><Icon icon={Star} size={12} color="#fff" /></View>}
          {!!e.spiceLevel && e.spiceLevel !== 'NONE' && <View style={{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: th.colors.danger.solid }}><Icon icon={Flame} size={12} color="#fff" /></View>}
        </Row>
        <View style={{ padding: th.space(2), gap: 2, flex: 1 }}>
          <Text size="sm" weight="semibold" numberOfLines={2}>{e.name}</Text>
          <Row justify="between" style={{ marginTop: 'auto' }}>
            <Amount value={e.price} size="sm" weight="bold" />
            {(e.groups.length > 0 || e.sizes.length > 0) && <Text size="2xs" weight="medium" color={th.colors.brand.text}>{e.sizes.length ? t('{{count}} size', { count: e.sizes.length }) : t('options')}</Text>}
          </Row>
        </View>
      </PressableScale>
    </View>
  );
}

