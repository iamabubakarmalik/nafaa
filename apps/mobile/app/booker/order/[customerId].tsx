/**
 * Booking screen: fast product search, packs plus loose pieces per line,
 * list prices and live schemes from the copied server pricing, free goods,
 * totals and the credit warning. Saving queues the order with a new
 * clientRef (and its visit); it can then be shared on WhatsApp.
 * `redo` opens an order the server refused, to fix and save as a new one.
 */

import { useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, CheckCircle2, Gift, Lock, MessageCircle, Minus, Plus, Search, ShoppingCart, Trash2, X } from 'lucide-react-native';
import { cn } from '@/lib/cn';
import { splitPacks } from '@/lib/distribution/logistics';
import { useAuthStore } from '@/store/auth.store';
import { useBookerStore, useDbQuery } from '@/features/booker/store';
import {
  customerDay, getCustomer, getQueuedOrder, pricingFor, productsByIds, queueOrder, safeJson, searchProducts,
  type CustomerPricing, type ProductHit,
} from '@/features/booker/core/repo';
import { creditFor, orderPayload, orderText, priceCart, type CartItem } from '@/features/booker/core/order';
import type { OrderPayload } from '@/features/booker/core/types';
import { checkInOrNow, visitPayload } from '@/features/booker/visit';
import { newClientRef, openWhatsApp } from '@/features/booker/native/device';
import { ActionButton, ACCENT, Row, ScreenHeader, qtyText, rs } from '@/features/booker/ui/parts';

function defaultPack(p: ProductHit, variantId: string | null) {
  const packs = p.packs.filter((k) => !k.variantId || k.variantId === variantId);
  return packs.find((k) => k.isDefault && k.conversionRate > 1) ?? [...packs].sort((a, b) => b.conversionRate - a.conversionRate)[0] ?? null;
}

function toCartItem(p: ProductHit): CartItem {
  const variantId = p.variants[0]?.id ?? null;
  const pack = defaultPack(p, variantId);
  return {
    productId: p.id, name: p.name, baseUnit: p.unit || 'pcs', variantId,
    packId: pack?.id ?? null, packName: pack?.unitName ?? null, packSize: pack?.conversionRate ?? 1,
    packQty: pack ? 1 : 0, pcsQty: pack ? 0 : 1,
  };
}

export default function BookerOrder() {
  const { customerId, redo } = useLocalSearchParams<{ customerId: string; redo?: string }>();
  const router = useRouter();
  const tenant = useAuthStore((s) => s.tenant);
  const { db, manifest, today, bump, sync } = useBookerStore();
  const canOverride = !!manifest?.me.canOverridePrice;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Record<string, ProductHit>>({});
  const [search, setSearch] = useState('');
  const [picking, setPicking] = useState(true);
  const [note, setNote] = useState('');
  const [pricing, setPricing] = useState<CustomerPricing | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ payload: OrderPayload; text: string } | null>(null);

  const { data: customer } = useDbQuery((d) => getCustomer(d, customerId), [customerId]);
  const { data: hits = [] } = useDbQuery((d) => searchProducts(d, search, 40), [search]);

  // Reopen a refused order with its lines.
  useEffect(() => {
    if (!db || !redo) return;
    (async () => {
      const row = await getQueuedOrder(db, redo);
      if (!row) return;
      const payload = safeJson<OrderPayload | null>(row.payload, null);
      if (!payload) return;
      const found = await productsByIds(db, payload.items.map((i) => i.productId));
      const byId = Object.fromEntries(found.map((p) => [p.id, p]));
      const items: CartItem[] = [];
      for (const l of payload.items) {
        const p = byId[l.productId];
        if (!p) continue;
        let item = items.find((c) => c.productId === l.productId && c.variantId === (l.variantId ?? null));
        if (!item) {
          item = { ...toCartItem(p), variantId: l.variantId ?? null, packQty: 0, pcsQty: 0 };
          items.push(item);
        }
        const pack = l.unitId ? p.packs.find((k) => k.id === l.unitId) : null;
        if (pack) Object.assign(item, { packId: pack.id, packName: pack.unitName, packSize: pack.conversionRate, packQty: l.qty });
        else item.pcsQty += l.qty;
      }
      setProducts((m) => ({ ...m, ...byId }));
      setCart(items);
      setNote(payload.note ?? '');
      setPicking(false);
    })();
  }, [db, redo]);

  // Pricing inputs for the products in the cart (plus free goods names).
  const productKey = cart.map((c) => c.productId).sort().join(',');
  useEffect(() => {
    if (!db || !customer) return;
    let alive = true;
    pricingFor(db, customer, cart.map((c) => c.productId)).then((p) => { if (alive) setPricing(p); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, customer, productKey]);

  const result = useMemo(() => (pricing && cart.length ? priceCart(cart, pricing, canOverride) : null), [pricing, cart, canOverride]);
  const priced = result?.priced ?? null;

  const freeIds = useMemo(() => [...new Set((priced?.lines ?? []).map((l) => l.freeProductId).filter((x): x is string => !!x && !products[x]))], [priced, products]);
  useEffect(() => {
    if (!db || !freeIds.length) return;
    productsByIds(db, freeIds).then((rows) => setProducts((m) => ({ ...m, ...Object.fromEntries(rows.map((p) => [p.id, p])) })));
  }, [db, freeIds]);

  const credit = useMemo(() => (customer && priced && manifest?.settings.creditMode !== 'OFF' ? creditFor(customer, priced.total) : null), [customer, priced, manifest]);

  if (!db || !manifest || !customer) {
    return <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950"><ScreenHeader title="Order" /></SafeAreaView>;
  }

  const add = (p: ProductHit) => {
    setProducts((m) => ({ ...m, [p.id]: p }));
    setCart((c) => {
      const i = c.findIndex((x) => x.productId === p.id);
      if (i < 0) return [...c, toCartItem(p)];
      const next = [...c];
      const item = { ...next[i] };
      if (item.packId) item.packQty += 1; else item.pcsQty += 1;
      next[i] = item;
      return next;
    });
    setSearch('');
    setPicking(false);
  };
  const update = (i: number, patch: Partial<CartItem>) => setCart((c) => c.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const remove = (i: number) => setCart((c) => c.filter((_, j) => j !== i));

  const linesFor = (i: number) => (priced?.lines ?? []).filter((l) => result?.map[l.index]?.item === i);
  const nameOf = (id: string) => products[id]?.name ?? 'Item';
  const freeText = (productId: string, freeProductId: string | null, base: number) => {
    const p = products[freeProductId ?? productId];
    if (!p) return `${qtyText(base)} pcs`;
    return splitPacks(base, p.packs.filter((k) => !k.variantId), p.unit || 'pcs').text;
  };

  const canSave = !!priced && priced.lines.length > 0 && !saving;

  const save = async () => {
    if (!priced || !result) return;
    setSaving(true);
    try {
      const radius = manifest.settings.checkInRadiusM || 150;
      const c = await checkInOrNow(db, customer, today, radius);
      const clientRef = newClientRef();
      const gps = c?.latitude != null && c.longitude != null ? { latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracyM } : null;
      const payload = orderPayload({ clientRef, customer, cart, canOverride, note, gps });
      const dayRows = await customerDay(db, customer.id, today);
      const hasOrderVisit = dayRows.visits.some((v) => v.outcome === 'ORDER');
      await queueOrder(db, {
        payload, dayKey: today, localTotal: priced.total, replaces: redo ?? null, distanceM: c?.distanceM ?? null,
        visit: hasOrderVisit ? null : visitPayload({ clientRef: newClientRef(), customer, outcome: 'ORDER', checkin: c, orderClientRef: clientRef }),
      });
      const text = orderText({ business: tenant?.name ?? null, customer, cart, priced, map: result.map, productName: nameOf, dayKey: today });
      setSaved({ payload, text });
      bump();
      sync({ quiet: true });
    } finally {
      setSaving(false);
    }
  };

  /* ───────────── saved ───────────── */
  if (saved) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
        <ScreenHeader title="Order save ho gaya" subtitle={customer.businessName || customer.name} onBack={() => router.replace(`/booker/customer/${customer.id}`)} />
        <View className="px-4 gap-3">
          <View className="rounded-3xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900 p-5 items-center">
            <CheckCircle2 size={40} color="#16a34a" />
            <Text className="text-2xl font-extrabold text-neutral-900 dark:text-white mt-2">{rs(priced?.total ?? 0)}</Text>
            <Text className="text-xs text-neutral-500 mt-1 text-center">Phone par save hai. Internet milte hi office chala jayega.</Text>
          </View>
          <ActionButton label="WhatsApp par bhejein" icon={MessageCircle} onPress={() => openWhatsApp(saved.text, customer.phone)} />
          <ActionButton label="Agli dukaan" tone="white" onPress={() => router.replace('/booker')} />
          <ActionButton label="Is dukaan par wapas" tone="white" onPress={() => router.replace(`/booker/customer/${customer.id}`)} />
        </View>
      </SafeAreaView>
    );
  }

  /* ───────────── booking ───────────── */
  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950" edges={['top']}>
      <ScreenHeader
        title={customer.businessName || customer.name}
        subtitle={[pricing?.listName ? `Price list: ${pricing.listName}` : null, manifest.me.canSeeBalance && customer.balance != null ? `Khata ${rs(customer.balance)}` : null].filter(Boolean).join(' · ') || 'Order'}
      />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Search */}
        <View className="px-4 mb-2">
          <View className="flex-row items-center gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 h-12">
            <Search size={18} color="#9ca3af" />
            <TextInput
              placeholder="Product ka naam, SKU ya barcode"
              placeholderTextColor="#9ca3af"
              value={search}
              onChangeText={(t) => { setSearch(t); setPicking(true); }}
              onFocus={() => setPicking(true)}
              autoFocus={!redo}
              className="flex-1 text-sm text-neutral-900 dark:text-white"
            />
            {(search.length > 0 || (picking && cart.length > 0)) && (
              <Pressable onPress={() => { setSearch(''); setPicking(false); }} hitSlop={12} className="h-7 w-7 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
                <X size={14} color="#9ca3af" />
              </Pressable>
            )}
          </View>
        </View>

        {picking ? (
          <FlatList
            data={hits}
            keyExtractor={(p) => p.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
            renderItem={({ item }) => {
              const inCart = cart.find((c) => c.productId === item.id);
              const big = defaultPack(item, item.variants[0]?.id ?? null);
              return (
                <Pressable onPress={() => add(item)} className="mb-2 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 flex-row items-center gap-3">
                  <View className="flex-1">
                    <Text numberOfLines={1} className="text-sm font-extrabold text-neutral-900 dark:text-white">{item.name}</Text>
                    <Text numberOfLines={1} className="text-[11px] text-neutral-500 mt-0.5">
                      {[item.brandName, big ? `${big.unitName} = ${qtyText(big.conversionRate)} ${item.unit || 'pcs'}` : null, `Stock ${qtyText(item.stockQty)}`].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {inCart && <Text className="text-[11px] font-extrabold text-emerald-600">Cart me</Text>}
                  <View className="h-9 w-9 rounded-xl bg-brand-600 items-center justify-center"><Plus size={18} color="#fff" /></View>
                </Pressable>
              );
            }}
            ListEmptyComponent={<Text className="text-center text-sm text-neutral-500 mt-10">Koi product nahi mila</Text>}
          />
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140, gap: 10 }}>
            {cart.length === 0 && (
              <View className="items-center py-10">
                <ShoppingCart size={32} color="#cbd5e1" />
                <Text className="text-sm text-neutral-500 mt-2">Upar se product dhoond kar add karein</Text>
              </View>
            )}
            {cart.map((c, i) => {
              const p = products[c.productId];
              const packs = (p?.packs ?? []).filter((k) => !k.variantId || k.variantId === c.variantId);
              const lines = linesFor(i);
              return (
                <View key={`${c.productId}-${i}`} className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5">
                  <View className="flex-row items-start gap-2">
                    <Text className="flex-1 text-sm font-extrabold text-neutral-900 dark:text-white">{c.name}</Text>
                    <Pressable onPress={() => remove(i)} hitSlop={10}><Trash2 size={16} color="#dc2626" /></Pressable>
                  </View>

                  {!!p?.variants.length && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} className="mt-2">
                      {p.variants.map((v) => (
                        <Pressable key={v.id} onPress={() => {
                          const pack = defaultPack(p, v.id);
                          update(i, { variantId: v.id, packId: pack?.id ?? null, packName: pack?.unitName ?? null, packSize: pack?.conversionRate ?? 1 });
                        }}
                          className={cn('h-8 px-3 rounded-full border items-center justify-center', c.variantId === v.id ? 'bg-teal-50 border-teal-600 dark:bg-teal-950' : 'border-neutral-200 dark:border-neutral-700')}>
                          <Text className="text-xs font-extrabold text-neutral-700 dark:text-neutral-200">{v.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}

                  {packs.length > 1 && (
                    <View className="flex-row flex-wrap gap-1.5 mt-2">
                      {packs.filter((k) => k.conversionRate > 1).map((k) => (
                        <Pressable key={k.id} onPress={() => update(i, { packId: k.id, packName: k.unitName, packSize: k.conversionRate })}
                          className={cn('h-8 px-3 rounded-full border items-center justify-center', c.packId === k.id ? 'bg-teal-50 border-teal-600 dark:bg-teal-950' : 'border-neutral-200 dark:border-neutral-700')}>
                          <Text className="text-xs font-extrabold text-neutral-700 dark:text-neutral-200">{k.unitName} ({qtyText(k.conversionRate)})</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  <View className="flex-row gap-3 mt-3">
                    {c.packId && (
                      <Stepper label={c.packName ?? 'Pack'} value={c.packQty} onChange={(v) => update(i, { packQty: v })} />
                    )}
                    <Stepper label={c.baseUnit} value={c.pcsQty} onChange={(v) => update(i, { pcsQty: v })} />
                  </View>

                  {canOverride && (
                    <View className="flex-row gap-3 mt-2">
                      {c.packId && <PriceInput label={`Rate / ${c.packName}`} value={c.packPrice} onChange={(v) => update(i, { packPrice: v })} />}
                      <PriceInput label={`Rate / ${c.baseUnit}`} value={c.pcsPrice} onChange={(v) => update(i, { pcsPrice: v })} />
                    </View>
                  )}

                  <View className="mt-2.5 gap-1">
                    {lines.map((l) => (
                      <View key={l.index}>
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-1 flex-1">
                            {!canOverride && <Lock size={10} color="#9ca3af" />}
                            <Text className="text-xs text-neutral-500">{qtyText(l.qty)} {l.unitName ?? c.baseUnit} × {rs(l.price, 2)}</Text>
                          </View>
                          <Text className="text-sm font-extrabold text-neutral-900 dark:text-white">{rs(l.total, 2)}</Text>
                        </View>
                        {!!l.schemeNote && (
                          <Text className="text-[11px] font-extrabold text-emerald-600 mt-0.5">
                            {l.schemeNote}{l.schemeDiscount > 0 ? ` (−${rs(l.schemeDiscount, 2)})` : ''}
                          </Text>
                        )}
                        {l.freeBaseQty > 0 && (
                          <View className="flex-row items-center gap-1 mt-0.5">
                            <Gift size={11} color="#16a34a" />
                            <Text className="text-[11px] font-extrabold text-emerald-700">
                              Free: {freeText(l.productId, l.freeProductId, l.freeBaseQty)}{l.freeProductId ? ` ${nameOf(l.freeProductId)}` : ''}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                    {lines.length === 0 && <Text className="text-[11px] text-neutral-400">Quantity dalein</Text>}
                  </View>
                </View>
              );
            })}

            {!!priced?.warnings.length && (
              <View className="rounded-2xl bg-amber-50 dark:bg-amber-950 p-3 gap-1">
                {priced.warnings.map((w, i) => <Text key={i} className="text-xs text-amber-800 dark:text-amber-200">{w}</Text>)}
              </View>
            )}

            {cart.length > 0 && (
              <View className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4">
                <Row label="Amount" value={rs(priced?.subtotal ?? 0, 2)} />
                {(priced?.schemeDiscount ?? 0) > 0 && <Row label="Scheme discount" value={`−${rs(priced?.schemeDiscount ?? 0, 2)}`} tone="green" />}
                {(priced?.discount ?? 0) > 0 && <Row label="Discount" value={`−${rs(priced?.discount ?? 0, 2)}`} tone="green" />}
                <View className="h-px bg-neutral-100 dark:bg-neutral-800 my-1.5" />
                <Row label="Total" value={rs(priced?.total ?? 0, 2)} strong />
                <Text className="text-[10px] text-neutral-400 mt-1">Final price office lagayega; phone wala total andaza hai.</Text>
                {credit?.message && (
                  <View className="mt-2 rounded-xl bg-red-50 dark:bg-red-950 p-2.5 flex-row gap-2">
                    <AlertTriangle size={14} color="#dc2626" />
                    <Text className="flex-1 text-xs text-red-700 dark:text-red-300">{credit.message}</Text>
                  </View>
                )}
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Note (delivery ka waqt, khaas baat)"
                  placeholderTextColor="#9ca3af"
                  maxLength={500}
                  className="mt-3 min-h-12 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-4 py-3 text-sm text-neutral-900 dark:text-white"
                  multiline
                />
              </View>
            )}
          </ScrollView>
        )}

        {/* Bottom bar */}
        <View className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex-row items-center gap-3">
          <Pressable onPress={() => setPicking(false)} className="flex-1">
            <Text className="text-[11px] text-neutral-500">{cart.length} items</Text>
            <Text className="text-lg font-extrabold text-neutral-900 dark:text-white">{rs(priced?.total ?? 0)}</Text>
          </Pressable>
          {picking && cart.length > 0 ? (
            <ActionButton label="Cart dekhein" icon={ShoppingCart} tone="accent" onPress={() => { setSearch(''); setPicking(false); }} />
          ) : (
            <ActionButton label="Order save karein" icon={CheckCircle2} disabled={!canSave} loading={saving} onPress={save} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [text, setText] = useState<string | null>(null);
  return (
    <View className="flex-1">
      <Text className="text-[10px] font-extrabold uppercase text-neutral-400 mb-1">{label}</Text>
      <View className="h-11 flex-row items-center rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <Pressable onPress={() => onChange(Math.max(0, value - 1))} className="h-11 w-11 items-center justify-center bg-neutral-50 dark:bg-neutral-800">
          <Minus size={16} color="#525252" />
        </Pressable>
        <TextInput
          value={text ?? qtyText(value)}
          onChangeText={setText}
          onBlur={() => {
            const n = Number((text ?? '').replace(',', '.'));
            if (text != null) onChange(Number.isFinite(n) && n >= 0 ? Math.round(n * 10000) / 10000 : value);
            setText(null);
          }}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={{ flex: 1, minWidth: 0, width: 0, textAlign: 'center' }}
          className="text-base font-extrabold text-neutral-900 dark:text-white"
        />
        <Pressable onPress={() => onChange(value + 1)} className="h-11 w-11 items-center justify-center bg-neutral-50 dark:bg-neutral-800">
          <Plus size={16} color={ACCENT} />
        </Pressable>
      </View>
    </View>
  );
}

function PriceInput({ label, value, onChange }: { label: string; value?: number | null; onChange: (v: number | null) => void }) {
  const [text, setText] = useState(value != null ? String(value) : '');
  return (
    <View className="flex-1">
      <Text className="text-[10px] font-extrabold uppercase text-neutral-400 mb-1">{label}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={() => {
          const t = text.trim();
          const n = Number(t);
          onChange(t === '' || !Number.isFinite(n) || n < 0 ? null : n);
        }}
        placeholder="List wala"
        placeholderTextColor="#9ca3af"
        keyboardType="decimal-pad"
        className="h-10 rounded-xl border border-neutral-200 dark:border-neutral-700 px-3 text-sm text-neutral-900 dark:text-white"
      />
    </View>
  );
}
