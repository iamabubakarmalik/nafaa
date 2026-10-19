/**
 * Taking an order: dine-in on a table, takeaway, delivery or a counter
 * order with a token. Dishes come from the menu with their options; the
 * order goes to the kitchen (one ticket per station) and can be paid at
 * once (counter / fast food) or later from the table. With `orderId` the
 * same screen adds more dishes to a running order and only the new ones
 * go to the kitchen.
 *
 * Keys: / search · F9 kitchen · F12 pay · Esc clear search.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, ChefHat, Flame, MapPin, Minus, NotebookPen, Percent, Phone, Plus, Printer, Search, Send, Star, Trash2, UserRound, Users, Wallet, X,
} from 'lucide-react';
import { Button, Kbd, Skeleton } from '@/design-system/components';
import { PosCustomerAddModal, PosCustomerPicker } from '@modules/pos/components';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { teamApi } from '@modules/organization/team/api/team.api';
import { useAuthStore } from '@core/stores/auth.store';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { isDialogOpen } from '@core/lib/shortcuts';
import { ordersApi, type OrderItem, type OrderMode, type RestaurantOrder } from '../api/orders.api';
import { tablesApi, type FloorTable } from '../api/tables.api';
import { happyHoursApi } from '../api/happy-hours.api';
import type { Kot } from '../api/kot.api';
import { useMenu, type MenuEntry, type MenuSize } from '../hooks/useMenu';
import { useOrderPayment } from '../hooks/useOrderPayment';
import { RestaurantModifierPicker, type PickedDish, type PickedModifier } from '../pos-extensions/RestaurantModifierPicker';
import { TablePickerModal } from './TablePickerModal';
import { MODE_META, ORDER_KEYS, ORDER_MODES, apiError, lineExtras } from '../lib/orderMeta';
import { printKot } from '../lib/slips';

interface Line { key: string; entry: MenuEntry; size?: MenuSize; quantity: number; modifiers: PickedModifier[]; note: string }

const r2 = (n: number) => Math.round(n * 100) / 100;
const PREF_KEY = 'nafaa.restaurant.order';

/** Per-counter choice: print kitchen tickets automatically. */
function readPrefs(): { kotPrint: boolean } {
  try {
    const v = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    return { kotPrint: v.kotPrint !== false };
  } catch { return { kotPrint: true }; }
}
function savePrefs(p: { kotPrint: boolean }) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* storage blocked */ }
}

const lineUnit = (l: Line) => (l.size?.price ?? l.entry.price) + l.modifiers.reduce((s, m) => s + m.priceAdjustment * m.quantity, 0);

export function OrderComposer({ counter = false, initialMode, initialTableId, orderId }: {
  /** Counter / cafe quick mode: pay right after ordering, next order starts at once. */
  counter?: boolean;
  initialMode?: OrderMode;
  initialTableId?: string;
  /** Add dishes to this running order. */
  orderId?: string;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Restaurant';
  const searchRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<OrderMode>(initialMode ?? (counter ? 'PICKUP' : 'DINE_IN'));
  const [table, setTable] = useState<Pick<FloorTable, 'id' | 'tableNumber' | 'section' | 'capacity'> | null>(null);
  const [tablePicker, setTablePicker] = useState(false);
  const [guests, setGuests] = useState(2);
  const [waiterId, setWaiterId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [packing, setPacking] = useState('');
  const [discount, setDiscount] = useState('');
  const [prefs, setPrefs] = useState(readPrefs);
  // Starts at the shop's dine-in service charge (Settings → Counter rules); this order may change it.
  const [servicePct, setServicePct] = useState<string | null>(null);
  const [taxPct, setTaxPct] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [picking, setPicking] = useState<MenuEntry | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [addCustomer, setAddCustomer] = useState<{ name: string; phone: string } | null>(null);

  const menu = useMenu();
  const existingQ = useQuery({ queryKey: ['restaurant-order', orderId], queryFn: () => ordersApi.getOne(orderId!), enabled: !!orderId });
  const existing = existingQ.data;
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.get(), staleTime: 5 * 60_000 });
  const { data: rules } = useQuery({ queryKey: ['counter-rules'], queryFn: () => settingsApi.counter(), staleTime: 5 * 60_000 });
  const shopService = rules?.serviceChargePct ?? settings?.settings?.serviceChargePct ?? 0;
  const serviceText = servicePct ?? (shopService ? String(shopService) : '');
  const { data: team = [] } = useQuery({ queryKey: ['team'], queryFn: () => teamApi.list().catch(() => []), staleTime: 5 * 60_000 });
  const { data: customersData } = useQuery({ queryKey: ['customers-for-pos'], queryFn: () => customersApi.list({ limit: 500 }), staleTime: 60_000 });
  const customers = customersData?.items ?? [];
  const customer = customers.find((c) => c.id === customerId);
  const waiters = team.filter((m) => m.isActive);

  // Tax follows the shop's tax setting unless prices already include it.
  useEffect(() => {
    const s = settings?.settings;
    if (s && !taxPct && s.enableTax && !s.taxInclusive && s.taxRate > 0) setTaxPct(String(s.taxRate));
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  // A regular delivery customer brings their saved address.
  useEffect(() => {
    if (mode === 'DELIVERY' && customer?.address && !address.trim()) setAddress(customer.address);
  }, [customerId, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const floorQ = useQuery({ queryKey: ['restaurant-floor'], queryFn: () => tablesApi.floor(), enabled: !orderId && mode === 'DINE_IN', staleTime: 15_000 });
  const hasTables = (floorQ.data?.tables.length ?? 0) > 0;

  // A table chosen on the floor arrives by id.
  useEffect(() => {
    if (!initialTableId || table) return;
    const t = floorQ.data?.tables.find((x) => x.id === initialTableId);
    if (t) setTable({ id: t.id, tableNumber: t.tableNumber, section: t.section, capacity: t.capacity });
  }, [initialTableId, floorQ.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menu.entries.filter((e) => (category === 'all' || e.category?.id === category) && (!q || e.name.toLowerCase().includes(q) || e.sku?.toLowerCase().includes(q)));
  }, [menu.entries, search, category]);

  const adding = !!orderId;
  const subtotal = r2(lines.reduce((s, l) => s + lineUnit(l) * l.quantity, 0));

  // Happy hour running now: the server applies it when the order is saved;
  // this preview uses the same rules. Added dishes are priced on the order page.
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
    queryFn: () => happyHoursApi.quote(happyCart, mode).catch(() => null),
    enabled: !adding && happyCart.length > 0 && settings?.settings?.allowDiscount !== false,
    staleTime: 30_000,
  });
  const happy = !adding && lines.length ? r2(Math.min(happyQ.data?.discount ?? 0, subtotal)) : 0;
  const itemsNet = r2(subtotal - happy);

  const svcPct = mode === 'DINE_IN' ? Number(serviceText) || 0 : 0;
  const service = r2(itemsNet * svcPct / 100);
  const tax = r2((itemsNet + service) * (Number(taxPct) || 0) / 100);
  const fee = mode === 'DELIVERY' ? Number(deliveryFee) || 0 : 0;
  const pack = mode !== 'DINE_IN' ? Number(packing) || 0 : 0;
  const disc = Number(discount) || 0;
  const total = r2(Math.max(itemsNet + service + tax + fee + pack - disc, 0));
  const count = lines.reduce((s, l) => s + l.quantity, 0);

  const add = (entry: MenuEntry, picked?: PickedDish) => {
    const modifiers = picked?.modifiers ?? [];
    const note = picked?.note ?? '';
    const size = picked?.size;
    setLines((prev) => {
      const same = prev.find((l) => l.entry.productId === entry.productId && l.size?.id === size?.id && !note && !l.note
        && JSON.stringify(l.modifiers.map((m) => m.modifierOptionId).sort()) === JSON.stringify(modifiers.map((m) => m.modifierOptionId).sort()));
      if (same) return prev.map((l) => (l === same ? { ...l, quantity: l.quantity + (picked?.quantity ?? 1) } : l));
      return [...prev, { key: `${entry.productId}-${Date.now()}-${prev.length}`, entry, size, quantity: picked?.quantity ?? 1, modifiers, note }];
    });
  };
  const tap = (entry: MenuEntry) => (entry.groups.length || entry.sizes.length ? setPicking(entry) : add(entry));
  const setQty = (key: string, q: number) => setLines((prev) => (q <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, quantity: Math.min(q, 999) } : l))));

  const problem = (() => {
    if (!lines.length) return 'Menu se item chunein';
    if (!adding && mode === 'DELIVERY' && !address.trim()) return 'Delivery ka pata likhein';
    if (!adding && mode === 'DELIVERY' && !(customerPhone.trim() || customer?.phone)) return 'Delivery ke liye phone likhein';
    if (disc > itemsNet + service + tax + fee + pack) return 'Discount bill se zyada hai';
    return null;
  })();

  const items = (): OrderItem[] => lines.map((l) => ({
    productId: l.entry.productId,
    variantId: l.size?.id,
    quantity: l.quantity,
    unit: l.entry.unit,
    specialInstructions: l.note || undefined,
    modifiers: l.modifiers.map((m) => ({ modifierOptionId: m.modifierOptionId, quantity: m.quantity })),
  }));

  const reset = () => {
    setLines([]); setTable(null); setCustomerId(''); setCustomerName(''); setCustomerPhone(''); setAddress(''); setDeliveryNotes('');
    setDeliveryFee(''); setPacking(''); setDiscount(''); setOrderNote(''); setGuests(2); setSearch('');
  };

  /** New tickets of this order, printed when the counter has KOT print on. */
  const printNewKots = (order: RestaurantOrder, before: string[] = []) => {
    const fresh = (order.kots ?? []).filter((k: Kot) => !before.includes(k.id) && k.status !== 'CANCELLED') as Kot[];
    if (prefs.kotPrint) fresh.slice().reverse().forEach((k) => printKot({ ...k, order: { ...(k.order ?? {}), token: order.token } as Kot['order'] }, shopName));
    return fresh.length;
  };

  const refresh = () => ORDER_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const payment = useOrderPayment(() => reset(), 'Order khula hai — Orders me us par se payment lein');

  const save = useMutation({
    mutationFn: async ({ kitchen }: { kitchen: boolean; pay?: boolean }) => {
      if (adding) {
        const before = (existing?.kots ?? []).map((k) => k.id);
        const order = await ordersApi.addItems(orderId!, items(), kitchen);
        return { order, kots: printNewKots(order, before) };
      }
      const order = await ordersApi.create({
        mode,
        tableId: mode === 'DINE_IN' ? table?.id : undefined,
        numberOfGuests: mode === 'DINE_IN' ? guests : undefined,
        waiterId: waiterId || undefined,
        customerId: customerId || undefined,
        customerName: (customerName || customer?.name)?.trim() || undefined,
        customerPhone: (customerPhone || customer?.phone || '').trim() || undefined,
        deliveryAddress: mode === 'DELIVERY' ? address.trim() : undefined,
        deliveryNotes: mode === 'DELIVERY' ? deliveryNotes.trim() || undefined : undefined,
        deliveryFee: fee || undefined,
        packagingFee: pack || undefined,
        // Sent as typed (0 too), so clearing it on one order is kept.
        serviceChargePct: mode === 'DINE_IN' ? svcPct : undefined,
        taxPct: Number(taxPct) || undefined,
        discount: disc || undefined,
        specialRequests: orderNote.trim() || undefined,
        items: items(),
        sendToKitchen: kitchen,
      } as Parameters<typeof ordersApi.create>[0]);
      return { order, kots: printNewKots(order) };
    },
    onSuccess: ({ order, kots }, { pay }) => {
      refresh();
      setServicePct(null);
      const where = order.table ? `Table ${order.table.tableNumber}` : order.token ? `Token ${order.token}` : order.orderNumber;
      toast.success(kots ? `${where} — kitchen ko ${kots} ticket gaye` : `${where} — order save ho gaya`);
      if (pay) {
        // The order exists now; the screen is cleared so it cannot be sent twice.
        const who = customer ? { id: customer.id, name: customer.name, balance: Number(customer.balance || 0) } : null;
        reset();
        payment.open(order, who);
        return;
      }
      if (adding) { navigate(`/restaurant/orders/${order.id}`); return; }
      if (counter) { reset(); return; }
      navigate(order.mode === 'DINE_IN' ? '/restaurant/tables' : `/restaurant/orders/${order.id}`);
    },
    onError: (e) => toast.error(apiError(e, 'Order save nahi hua')),
  });

  const submit = (kitchen: boolean, pay = false) => {
    if (save.isPending) return;
    if (problem) { toast.error(problem); return; }
    if (!adding && mode === 'DINE_IN' && !table && hasTables) { setTablePicker(true); return; }
    save.mutate({ kitchen, pay });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isDialogOpen()) return;
      if (e.key === '/' && document.activeElement !== searchRef.current && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F9') { e.preventDefault(); submit(true); }
      if (e.key === 'F12' && !adding) { e.preventDefault(); submit(true, true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const toggleKotPrint = () => { const p = { ...prefs, kotPrint: !prefs.kotPrint }; setPrefs(p); savePrefs(p); };

  const createCustomer = useMutation({
    mutationFn: (v: { name: string; phone?: string }) => customersApi.create({ name: v.name.trim(), phone: v.phone?.trim() || undefined }),
    onSuccess: (c) => { qc.invalidateQueries({ queryKey: ['customers-for-pos'] }); setCustomerId(c.id); setAddCustomer(null); toast.success(`${c.name} jur gaya`); },
    onError: (e) => toast.error(apiError(e, 'Customer nahi bana')),
  });

  const ModeIcon = MODE_META[mode].icon;
  const title = adding
    ? `${existing ? (existing.table ? `Table ${existing.table.tableNumber}` : existing.token ? `Token ${existing.token}` : existing.orderNumber) : '…'} — aur item`
    : counter ? 'Counter order' : 'Naya order';

  return (
    <div className="grid h-[calc(100dvh-7rem)] min-h-[34rem] gap-3 lg:grid-cols-[minmax(0,1fr)_25rem]">
      {payment.modal}
      {picking && <RestaurantModifierPicker item={picking} onClose={() => setPicking(null)} onConfirm={(d) => { add(picking, d); setPicking(null); }} />}
      {tablePicker && (
        <TablePickerModal value={table?.id} onClose={() => setTablePicker(false)}
          onPick={(t) => { setTable({ id: t.id, tableNumber: t.tableNumber, section: t.section, capacity: t.capacity }); setTablePicker(false); }}
          onOpenOrder={(id) => { setTablePicker(false); navigate(`/restaurant/orders/new?orderId=${id}`); }} />
      )}
      {addCustomer && (
        <PosCustomerAddModal value={addCustomer} onChange={setAddCustomer} saving={createCustomer.isPending}
          onSubmit={(v) => createCustomer.mutate(v)} onClose={() => setAddCustomer(null)} />
      )}

      {/* Menu */}
      <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <header className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2.5 sm:px-4">
          <button type="button" onClick={() => navigate(adding ? `/restaurant/orders/${orderId}` : counter ? '/restaurant/orders' : '/restaurant/tables')} aria-label="Wapas"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"><ArrowLeft className="h-4 w-4" /></button>
          <h1 className="mr-auto truncate text-[1.0625rem] font-bold text-slate-900">{title}</h1>
          {!adding && (
            <div role="tablist" className="inline-flex rounded-xl bg-slate-100 p-1">
              {ORDER_MODES.map((m) => {
                const Icon = MODE_META[m].icon;
                return (
                  <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                    className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-semibold transition', mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}>
                    <Icon className="h-4 w-4" style={{ color: mode === m ? MODE_META[m].color : undefined }} /><span className="hidden sm:inline">{MODE_META[m].label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </header>
        <div className="space-y-2 border-b border-slate-100 px-3 py-2.5 sm:px-4">
          <label className="group relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setSearch(''); if (e.key === 'Enter' && shown.length) tap(shown[0]); }}
              placeholder="Dish ka naam ya code…" aria-label="Menu search"
              className="h-10 w-full rounded-xl bg-slate-100/80 pl-10 pr-10 text-[0.875rem] outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-brand-500" />
            {search ? <button type="button" onClick={() => setSearch('')} aria-label="Saaf" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200"><X className="h-4 w-4" /></button>
              : <Kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>}
          </label>
          {menu.categories.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              <button type="button" onClick={() => setCategory('all')}
                className={cn('h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-semibold', category === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>Sab · {menu.entries.length}</button>
              {menu.categories.map((c) => (
                <button key={c.id} type="button" onClick={() => setCategory(c.id)}
                  className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-semibold', category === c.id ? 'text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
                  style={category === c.id ? { backgroundColor: c.color } : undefined}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category === c.id ? '#fff' : c.color }} />{c.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-3">
          {menu.loading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
          ) : !shown.length ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <ChefHat className="h-10 w-10 text-slate-300" />
              <p className="mt-3 text-[0.9375rem] font-semibold text-slate-800">{menu.entries.length ? 'Is search me koi dish nahi' : 'Menu khaali hai'}</p>
              <p className="mt-1 text-[0.8125rem] text-slate-500">{menu.entries.length ? 'Naam badal kar dekhein' : 'Pehle menu me dishes daalein'}</p>
              {!menu.entries.length && <Link to="/restaurant/menu" className="mt-3 text-[0.8125rem] font-semibold text-brand-700 hover:underline">Menu kholein →</Link>}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {shown.map((e) => {
                const inCart = lines.filter((l) => l.entry.productId === e.productId).reduce((s, l) => s + l.quantity, 0);
                return (
                  <button key={e.id} type="button" onClick={() => tap(e)}
                    className={cn('group relative flex flex-col overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md',
                      inCart ? 'ring-2 ring-brand-500' : 'ring-slate-200/80')}>
                    {e.image
                      ? <img src={e.image} alt="" loading="lazy" className="h-20 w-full object-cover" />
                      : <span className="flex h-20 w-full items-center justify-center" style={{ backgroundColor: `${e.category?.color ?? '#64748b'}14` }}><ChefHat className="h-7 w-7" style={{ color: e.category?.color ?? '#94a3b8' }} /></span>}
                    {inCart > 0 && <span className="absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[0.75rem] font-bold text-white shadow">{inCart}</span>}
                    <span className="absolute left-1.5 top-1.5 flex gap-1">
                      {e.chefSpecial && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white" title="Chef special"><Star className="h-3 w-3" /></span>}
                      {e.spiceLevel && e.spiceLevel !== 'NONE' && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white" title={e.spiceLevel}><Flame className="h-3 w-3" /></span>}
                    </span>
                    <span className="flex flex-1 flex-col px-2.5 py-2">
                      <span className="line-clamp-2 text-[0.8125rem] font-semibold leading-snug text-slate-900">{e.name}</span>
                      <span className="mt-auto flex items-center justify-between pt-1">
                        <span className="text-[0.875rem] font-bold tabular-nums text-slate-900">{formatPKR(e.price)}</span>
                        {(e.groups.length > 0 || e.sizes.length > 0) && <span className="text-[0.6875rem] font-medium text-brand-700">{e.sizes.length ? `${e.sizes.length} size` : 'options'}</span>}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Order */}
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <div className="space-y-2 border-b border-slate-100 px-4 py-3">
          {adding ? (
            existing && (
              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">
                <p className="font-semibold text-slate-900">Pehle se: {existing.items.filter((i) => !i.isReturned).length} item · {formatPKR(existing.total)}</p>
                <p className="mt-0.5 line-clamp-2">{existing.items.filter((i) => !i.isReturned).map((i) => `${i.quantity}× ${i.product?.name ?? ''}`).join(', ')}</p>
                <p className="mt-1 text-[0.75rem] text-slate-500">Sirf naye item kitchen jayenge.</p>
              </div>
            )
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${MODE_META[mode].color}17`, color: MODE_META[mode].color }}><ModeIcon className="h-4 w-4" /></span>
                {mode === 'DINE_IN' ? (
                  <>
                    <button type="button" onClick={() => setTablePicker(true)}
                      className={cn('inline-flex h-9 flex-1 items-center justify-between rounded-xl px-3 text-[0.875rem] font-semibold ring-1', table ? 'bg-emerald-50 text-emerald-900 ring-emerald-200' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50')}>
                      {table ? `Table ${table.tableNumber}${table.section ? ` · ${table.section}` : ''}` : 'Table chunein'}<span className="text-[0.75rem] font-medium text-slate-500">badlein</span>
                    </button>
                    <div className="inline-flex items-center rounded-xl bg-slate-100 p-0.5" title="Mehman">
                      <button type="button" aria-label="Mehman kam" onClick={() => setGuests((g) => Math.max(1, g - 1))} className="flex h-8 w-7 items-center justify-center rounded-lg hover:bg-white"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="inline-flex w-9 items-center justify-center gap-0.5 text-[0.8125rem] font-bold tabular-nums"><Users className="h-3 w-3 text-slate-500" />{guests}</span>
                      <button type="button" aria-label="Mehman zyada" onClick={() => setGuests((g) => Math.min(200, g + 1))} className="flex h-8 w-7 items-center justify-center rounded-lg hover:bg-white"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  </>
                ) : (
                  <div className="min-w-0 flex-1">
                    <PosCustomerPicker customers={customers} customerId={customerId} setCustomerId={setCustomerId} selectedCustomer={customer}
                      onAddCustomer={() => setAddCustomer({ name: customerName, phone: customerPhone })} />
                  </div>
                )}
              </div>
              {mode !== 'DINE_IN' && !customerId && (
                <div className="grid grid-cols-2 gap-2">
                  <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Naam (token par)" aria-label="Customer ka naam"
                    className="h-9 rounded-xl border border-slate-200 px-3 text-[0.8125rem] outline-none focus:border-brand-500" />
                  <label className="relative">
                    <Phone className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/[^\d+\s-]/g, ''))} placeholder="03xx…" inputMode="tel" aria-label="Phone"
                      className="h-9 w-full rounded-xl border border-slate-200 pl-8 pr-2 text-[0.8125rem] outline-none focus:border-brand-500" />
                  </label>
                </div>
              )}
              {mode === 'DELIVERY' && (
                <div className="space-y-2">
                  <label className="relative block">
                    <MapPin className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <textarea value={address} onChange={(e) => setAddress(e.target.value.slice(0, 300))} rows={2} placeholder="Ghar ka pata, gali, nishani…" aria-label="Delivery ka pata"
                      className="w-full resize-none rounded-xl border border-slate-200 py-2 pl-8 pr-2 text-[0.8125rem] outline-none focus:border-brand-500" />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value.slice(0, 300))} placeholder="Rider ke liye note" aria-label="Rider note"
                      className="h-9 rounded-xl border border-slate-200 px-3 text-[0.8125rem] outline-none focus:border-brand-500" />
                    <input value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="Delivery charge" aria-label="Delivery charge"
                      className="h-9 rounded-xl border border-slate-200 px-3 text-[0.8125rem] tabular-nums outline-none focus:border-brand-500" />
                  </div>
                </div>
              )}
              {waiters.length > 1 && (
                <label className="flex items-center gap-2 text-[0.8125rem] text-slate-600">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  <select value={waiterId} onChange={(e) => setWaiterId(e.target.value)} aria-label="Waiter"
                    className="h-8 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem]">
                    <option value="">Waiter: {me?.fullName ?? 'main'}</option>
                    {waiters.filter((w) => w.id !== me?.id).map((w) => <option key={w.id} value={w.id}>{w.fullName}</option>)}
                  </select>
                </label>
              )}
            </>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {!lines.length ? (
            <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center text-slate-500">
              <NotebookPen className="h-9 w-9 text-slate-300" />
              <p className="mt-2 text-[0.875rem] font-medium">Menu se dish dabayein</p>
              <p className="text-[0.75rem]">Options wali dish par size aur add-on poochay jayenge</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lines.map((l) => (
                <li key={l.key} className="py-2">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.875rem] font-semibold text-slate-900">{l.entry.name}{l.size && <span className="font-medium text-slate-500"> · {l.size.name}</span>}</p>
                      {l.modifiers.length > 0 && <p className="truncate text-[0.75rem] text-slate-500">{lineExtras({ modifiers: l.modifiers.map((m) => ({ quantity: m.quantity, modifierOption: { name: m.name } })) })}</p>}
                      {l.note && noteFor !== l.key && <p className="truncate text-[0.75rem] italic text-amber-700">“{l.note}”</p>}
                    </div>
                    <span className="shrink-0 text-[0.875rem] font-bold tabular-nums text-slate-900">{formatPKR(lineUnit(l) * l.quantity)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5">
                      <button type="button" aria-label="Kam" onClick={() => setQty(l.key, l.quantity - 1)} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-white"><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-8 text-center text-[0.8125rem] font-bold tabular-nums">{l.quantity}</span>
                      <button type="button" aria-label="Zyada" onClick={() => setQty(l.key, l.quantity + 1)} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-white"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <button type="button" onClick={() => setNoteFor(noteFor === l.key ? null : l.key)} className="text-[0.75rem] font-semibold text-brand-700 hover:underline">{l.note ? 'Note badlein' : 'Note'}</button>
                    <button type="button" onClick={() => setQty(l.key, 0)} aria-label="Hatayein" className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  {noteFor === l.key && (
                    <input autoFocus value={l.note} onChange={(e) => setLines((prev) => prev.map((x) => (x.key === l.key ? { ...x, note: e.target.value.slice(0, 300) } : x)))}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setNoteFor(null); }} placeholder="Jaise: kam mirch" aria-label="Kitchen note"
                      className="mt-1.5 h-8 w-full rounded-lg border border-slate-200 px-2 text-[0.8125rem] outline-none focus:border-brand-500" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
          {!adding && (
            <details className="group rounded-xl bg-white ring-1 ring-slate-200">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[0.8125rem] font-semibold text-slate-700">
                <Percent className="h-4 w-4 text-slate-400" /> Charges, discount aur note
                <span className="ml-auto text-[0.75rem] font-medium text-slate-500">{[svcPct ? `Service ${svcPct}%` : '', Number(taxPct) ? `Tax ${taxPct}%` : '', disc ? `Discount ${formatPKR(disc)}` : ''].filter(Boolean).join(' · ') || 'kholein'}</span>
              </summary>
              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3">
                {mode === 'DINE_IN' && <NumField label="Service charge %" value={serviceText} onChange={setServicePct} hint={shopService ? `Dukaan ka ${shopService}% (Settings) — sirf is order ke liye badlein` : 'Sirf is order ke liye; dukaan ka Settings → Counter rules me'} />}
                <NumField label="Tax %" value={taxPct} onChange={setTaxPct} />
                <NumField label="Discount (Rs)" value={discount} onChange={setDiscount} hint="Had se zyada ho to payment par PIN" />
                {mode !== 'DINE_IN' && <NumField label="Packing (Rs)" value={packing} onChange={setPacking} />}
                <label className="col-span-2 text-[0.75rem] font-medium text-slate-600">Poore order ka note
                  <input value={orderNote} onChange={(e) => setOrderNote(e.target.value.slice(0, 500))} placeholder="Jaise: bachon ki plate pehle"
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem] font-normal outline-none focus:border-brand-500" />
                </label>
              </div>
            </details>
          )}
          <dl className="space-y-0.5 text-[0.8125rem]">
            <div className="flex justify-between text-slate-600"><dt>{count} item</dt><dd className="tabular-nums">{formatPKR(subtotal)}</dd></div>
            {happy > 0 && (
              <div className="flex justify-between text-success-700">
                <dt className="truncate">Happy hour{happyQ.data?.rules.length ? ` (${happyQ.data.rules.map((r) => r.name).join(', ')})` : ''}</dt>
                <dd className="tabular-nums">−{formatPKR(happy)}</dd>
              </div>
            )}
            {!adding && service > 0 && <div className="flex justify-between text-slate-600"><dt>Service {svcPct}%</dt><dd className="tabular-nums">{formatPKR(service)}</dd></div>}
            {!adding && tax > 0 && <div className="flex justify-between text-slate-600"><dt>Tax</dt><dd className="tabular-nums">{formatPKR(tax)}</dd></div>}
            {!adding && fee + pack > 0 && <div className="flex justify-between text-slate-600"><dt>Delivery / packing</dt><dd className="tabular-nums">{formatPKR(fee + pack)}</dd></div>}
            {!adding && disc > 0 && <div className="flex justify-between text-rose-600"><dt>Discount</dt><dd className="tabular-nums">−{formatPKR(disc)}</dd></div>}
            <div className="flex items-baseline justify-between pt-1"><dt className="font-semibold text-slate-900">{adding ? 'Naye item' : 'Kul'}</dt><dd className="text-[1.375rem] font-bold tabular-nums text-slate-900">{formatPKR(adding ? subtotal : total)}</dd></div>
          </dl>
          <label className="flex cursor-pointer items-center gap-2 text-[0.75rem] text-slate-600">
            <input type="checkbox" checked={prefs.kotPrint} onChange={toggleKotPrint} className="h-4 w-4 accent-[rgb(var(--brand-600))]" />
            <Printer className="h-3.5 w-3.5" /> Kitchen ticket (KOT) print karein
          </label>
          <div className={cn('grid gap-2', adding ? 'grid-cols-1' : counter ? 'grid-cols-[1fr_1.4fr]' : 'grid-cols-[1.4fr_1fr]')}>
            <Button size="lg" variant={counter && !adding ? 'secondary' : 'primary'} loading={save.isPending && !payment.paying} disabled={!lines.length} onClick={() => submit(true)}>
              <Send className="h-4 w-4" /> Kitchen bhejein <Kbd className="ml-1 hidden bg-white/20 text-current lg:inline-flex">F9</Kbd>
            </Button>
            {!adding && (
              <Button size="lg" variant={counter ? 'primary' : 'secondary'} disabled={!lines.length || save.isPending} onClick={() => submit(true, true)}>
                <Wallet className="h-4 w-4" /> Payment <Kbd className="ml-1 hidden lg:inline-flex">F12</Kbd>
              </Button>
            )}
          </div>
          {!adding && !counter && (
            <button type="button" disabled={!lines.length || save.isPending} onClick={() => submit(false)}
              className="w-full text-center text-[0.75rem] font-medium text-slate-500 hover:text-slate-800 disabled:opacity-50">
              Abhi kitchen nahi — sirf order save karein
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function NumField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="text-[0.75rem] font-medium text-slate-600">{label}
      <input value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, '').slice(0, 9))} inputMode="decimal" placeholder="0"
        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem] font-normal tabular-nums outline-none focus:border-brand-500" />
      {hint && <span className="mt-0.5 block text-[0.6875rem] font-normal text-slate-400">{hint}</span>}
    </label>
  );
}
