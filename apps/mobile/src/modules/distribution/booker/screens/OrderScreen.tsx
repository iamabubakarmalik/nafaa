/**
 * Booking screen: fast product search, packs plus loose pieces per line,
 * list prices and live schemes from the copied server pricing, free goods,
 * totals and the credit warning. Saving queues the order with a new
 * clientRef (and its visit); it can then be shared on WhatsApp.
 * `redo` opens an order the server refused, to fix and save as a new one.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, CheckCircle2, Gift, Lock, MessageCircle, Plus, ShoppingCart, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Button, Card, ChipGroup, EmptyState, Icon, IconButton, List, ListRow, MoneyInput, Row, Screen, SearchBar, StatusPill, Text, TextArea, useDebouncedValue, useTheme } from '@/design';
import { splitPacks } from '@/modules/distribution/lib/logistics';
import { creditFor, orderPayload, orderText, priceCart, type CartItem } from '../core/order';
import {
  customerDay, getCustomer, getQueuedOrder, pricingFor, productsByIds, queueOrder, safeJson, searchProducts,
  type CustomerPricing, type ProductHit,
} from '../core/repo';
import type { OrderPayload } from '../core/types';
import { newClientRef, openWhatsApp } from '../native/device';
import { useBookerStore, useDbQuery } from '../store';
import { qtyText, Stepper } from '../ui/shared';
import { checkInOrNow, visitPayload } from '../visit';

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

export function BookerOrderScreen() {
  const th = useTheme();
  const { customerId, redo } = useLocalSearchParams<{ customerId: string; redo?: string }>();
  const router = useRouter();
  const tenant = useAuthStore((s) => s.tenant);
  const { db, manifest, today, bump, sync } = useBookerStore();
  const canOverride = !!manifest?.me.canOverridePrice;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Record<string, ProductHit>>({});
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search, 150);
  const [picking, setPicking] = useState(!redo);
  const [note, setNote] = useState('');
  const [pricing, setPricing] = useState<CustomerPricing | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ payload: OrderPayload; text: string; total: number } | null>(null);

  const { data: customer } = useDbQuery((d) => getCustomer(d, customerId), [customerId]);
  const { data: hits = [] } = useDbQuery((d) => searchProducts(d, q, 40), [q]);

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

  if (!db || !manifest || !customer) return <Screen title={t('Order')}><View /></Screen>;

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
  const nameOf = (id: string) => products[id]?.name ?? t('Item');
  const freeText = (productId: string, freeProductId: string | null, base: number) => {
    const p = products[freeProductId ?? productId];
    if (!p) return `${qtyText(base)} pcs`;
    return splitPacks(base, p.packs.filter((k) => !k.variantId), p.unit || 'pcs').text;
  };

  const canSave = !!priced && priced.lines.length > 0 && !saving;
  const subtitle = [pricing?.listName ? t('Price list: {{name}}', { name: pricing.listName }) : null, manifest.me.canSeeBalance && customer.balance != null ? t('Khata {{value}}', { value: formatMoney(customer.balance) }) : null].filter(Boolean).join(' · ') || undefined;

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
      setSaved({ payload, text, total: priced.total });
      bump();
      sync({ quiet: true });
    } finally {
      setSaving(false);
    }
  };

  /* ───────────── saved ───────────── */
  if (saved) {
    return (
      <Screen title={t('Order save ho gaya')} subtitle={customer.businessName || customer.name} onBack={() => router.replace(`/booker/customer/${customer.id}`)}>
        <EmptyState
          icon={CheckCircle2}
          tone="brand"
          title={formatMoney(saved.total)}
          message={t('Phone par save hai. Internet milte hi office chala jayega.')}
        />
        <Button size="xl" fullWidth icon={MessageCircle} onPress={() => openWhatsApp(saved.text, customer.phone)}>{t('WhatsApp par bhejein')}</Button>
        <Button size="lg" variant="secondary" fullWidth onPress={() => router.replace('/booker')}>{t('Agli dukaan')}</Button>
        <Button size="lg" variant="secondary" fullWidth onPress={() => router.replace(`/booker/customer/${customer.id}`)}>{t('Is dukaan par wapas')}</Button>
      </Screen>
    );
  }

  /* ───────────── booking ───────────── */
  const footer = (
    <Row gap={3} align="center">
      <View style={{ flex: 1 }}>
        <Text size="xs" tone="muted">{t('{{count}} items', { count: cart.length })}</Text>
        <Amount value={priced?.total ?? 0} size="xl" weight="bold" />
      </View>
      {picking && cart.length > 0 ? (
        <Button size="xl" variant="secondary" icon={ShoppingCart} onPress={() => { setSearch(''); setPicking(false); }}>{t('Cart dekhein')}</Button>
      ) : (
        <Button size="xl" icon={CheckCircle2} disabled={!canSave} loading={saving} onPress={save}>{t('Save order')}</Button>
      )}
    </Row>
  );

  return (
    <Screen title={customer.businessName || customer.name} subtitle={subtitle} header scroll={false} footer={footer} keyboard={false} contentStyle={{ paddingHorizontal: th.space(4), gap: th.space(3) }}>
      <SearchBar
        value={search}
        onChangeText={(v) => { setSearch(v); setPicking(true); }}
        placeholder={t('Product ka naam, SKU ya barcode')}
        autoFocus={!redo}
      />
      {picking ? (
        <List<ProductHit>
          data={hits}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: th.space(4) }}
          renderItem={({ item }) => {
            const inCart = cart.find((c) => c.productId === item.id);
            const big = defaultPack(item, item.variants[0]?.id ?? null);
            return (
              <ListRow
                title={item.name}
                subtitle={[item.brandName, big ? `${big.unitName} = ${qtyText(big.conversionRate)} ${item.unit || 'pcs'}` : null, t('Stock {{value}}', { value: qtyText(item.stockQty) })].filter(Boolean).join(' · ')}
                trailing={(
                  <Row gap={2}>
                    {inCart && <StatusPill tone="success">{t('Cart me')}</StatusPill>}
                    <Icon icon={Plus} tone="brand" />
                  </Row>
                )}
                onPress={() => add(item)}
                divider
              />
            );
          }}
          empty={<EmptyState compact icon={ShoppingCart} title={t('Koi product nahi mila')} />}
        />
      ) : (
        <List<number>
          data={cart.map((_, i) => i)}
          extraData={{ cart, priced, products }}
          keyExtractor={(i) => `${cart[i].productId}-${i}`}
          contentContainerStyle={{ paddingBottom: th.space(4) }}
          ItemSeparatorComponent={() => <View style={{ height: th.space(3) }} />}
          renderItem={({ item: i }) => {
            const c = cart[i];
            const p = products[c.productId];
            const packs = (p?.packs ?? []).filter((k) => !k.variantId || k.variantId === c.variantId);
            const lines = linesFor(i);
            return (
              <Card>
                <View style={{ gap: th.space(3) }}>
                  <Row gap={2} align="start">
                    <Text weight="semibold" style={{ flex: 1 }}>{c.name}</Text>
                    <IconButton icon={Trash2} label={t('Delete')} variant="danger" onPress={() => remove(i)} />
                  </Row>
                  {!!p?.variants.length && (
                    <ChipGroup
                      style={{ marginHorizontal: -th.space(4) }}
                      options={p.variants.map((v) => ({ value: v.id, label: v.name }))}
                      value={c.variantId ?? ''}
                      onChange={(id) => {
                        const pack = defaultPack(p, id);
                        update(i, { variantId: id, packId: pack?.id ?? null, packName: pack?.unitName ?? null, packSize: pack?.conversionRate ?? 1 });
                      }}
                    />
                  )}
                  {packs.length > 1 && (
                    <ChipGroup
                      wrap
                      options={packs.filter((k) => k.conversionRate > 1).map((k) => ({ value: k.id, label: `${k.unitName} (${qtyText(k.conversionRate)})` }))}
                      value={c.packId ?? ''}
                      onChange={(id) => { const k = packs.find((x) => x.id === id)!; update(i, { packId: k.id, packName: k.unitName, packSize: k.conversionRate }); }}
                    />
                  )}
                  <Row gap={3}>
                    {c.packId && <Stepper label={c.packName ?? t('Pack')} value={c.packQty} onChange={(v) => update(i, { packQty: v })} />}
                    <Stepper label={c.baseUnit} value={c.pcsQty} onChange={(v) => update(i, { pcsQty: v })} />
                  </Row>
                  {canOverride && (
                    <Row gap={3}>
                      {c.packId && <MoneyInput containerStyle={{ flex: 1 }} label={t('Rate / {{unit}}', { unit: c.packName })} value={c.packPrice ?? null} onChangeValue={(v) => update(i, { packPrice: v })} placeholder={t('List wala')} />}
                      <MoneyInput containerStyle={{ flex: 1 }} label={t('Rate / {{unit}}', { unit: c.baseUnit })} value={c.pcsPrice ?? null} onChangeValue={(v) => update(i, { pcsPrice: v })} placeholder={t('List wala')} />
                    </Row>
                  )}
                  <View style={{ gap: th.space(1) }}>
                    {lines.map((l) => (
                      <View key={l.index} style={{ gap: 2 }}>
                        <Row justify="between" gap={2}>
                          <Row gap={1} style={{ flex: 1 }}>
                            {!canOverride && <Icon icon={Lock} size={12} tone="subtle" />}
                            <Text size="xs" tone="muted" ltr>{qtyText(l.qty)} {l.unitName ?? c.baseUnit} × {formatMoney(l.price, { decimals: 2 })}</Text>
                          </Row>
                          <Amount value={l.total} weight="bold" />
                        </Row>
                        {!!l.schemeNote && (
                          <Text size="xs" tone="success" weight="semibold">{l.schemeNote}{l.schemeDiscount > 0 ? ` (−${formatMoney(l.schemeDiscount)})` : ''}</Text>
                        )}
                        {l.freeBaseQty > 0 && (
                          <Row gap={1}>
                            <Icon icon={Gift} size={13} tone="success" />
                            <Text size="xs" tone="success" weight="semibold">{t('Free')}: {freeText(l.productId, l.freeProductId, l.freeBaseQty)}{l.freeProductId ? ` ${nameOf(l.freeProductId)}` : ''}</Text>
                          </Row>
                        )}
                      </View>
                    ))}
                    {lines.length === 0 && <Text size="xs" tone="subtle">{t('Quantity dalein')}</Text>}
                  </View>
                </View>
              </Card>
            );
          }}
          ListFooterComponent={cart.length > 0 ? (
            <View style={{ gap: th.space(3), marginTop: th.space(3) }}>
              {!!priced?.warnings.length && (
                <Card tone="warning">{priced.warnings.map((w, i) => <Text key={i} size="sm" tone="warning">{t(w)}</Text>)}</Card>
              )}
              <Card>
                <View style={{ gap: th.space(2) }}>
                  <TotalRow label={t('Amount')} value={priced?.subtotal ?? 0} />
                  {(priced?.schemeDiscount ?? 0) > 0 && <TotalRow label={t('Scheme discount')} value={-(priced?.schemeDiscount ?? 0)} good />}
                  {(priced?.discount ?? 0) > 0 && <TotalRow label={t('Discount')} value={-(priced?.discount ?? 0)} good />}
                  <TotalRow label={t('Total')} value={priced?.total ?? 0} strong />
                  <Text size="xs" tone="subtle">{t('Final price office lagayega; phone wala total andaza hai.')}</Text>
                  {credit?.message && (
                    <Row gap={2} align="start">
                      <Icon icon={AlertTriangle} size={16} tone="danger" />
                      <Text size="sm" tone="danger" style={{ flex: 1 }}>{credit.message}</Text>
                    </Row>
                  )}
                </View>
              </Card>
              <TextArea label={t('Note')} labelHint={t('(optional)')} value={note} onChangeText={setNote} maxLength={500} numberOfLines={2} placeholder={t('delivery ka waqt, khaas baat')} />
            </View>
          ) : undefined}
          empty={<EmptyState compact icon={ShoppingCart} title={t('Upar se product dhoond kar add karein')} />}
        />
      )}
    </Screen>
  );
}

function TotalRow({ label, value, strong, good }: { label: string; value: number; strong?: boolean; good?: boolean }) {
  return (
    <Row justify="between">
      <Text size={strong ? 'md' : 'sm'} weight={strong ? 'bold' : 'regular'} tone={strong ? 'default' : 'muted'}>{label}</Text>
      <Amount value={value} size={strong ? 'lg' : 'sm'} weight={strong ? 'bold' : 'semibold'} tone={good ? 'success' : undefined} />
    </Row>
  );
}
