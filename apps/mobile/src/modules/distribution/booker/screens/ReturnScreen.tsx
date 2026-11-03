/**
 * Market return: stock a retailer gives back to the booker on the route
 * (good, damaged or expired). Saved on the phone and sent with the next
 * sync; the office approves it and the value is credited to the khata.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, Plus, RotateCcw, Store, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { t, msg } from '@/core/i18n';
import {
  Button, Card, ChipGroup, EmptyState, Icon, IconButton, Input, List, ListRow, Row, Screen, SearchBar, Text, TextArea, toast, useDebouncedValue, useTheme,
} from '@/design';
import { getCheckIn, getCustomer, queueReturn, searchProducts, type ProductHit } from '../core/repo';
import type { ReturnCondition, ReturnItemPayload, ReturnPayload } from '../core/types';
import { newClientRef } from '../native/device';
import { useBookerStore, useDbQuery } from '../store';
import { ShopPickerSheet } from '../ui/sheets';
import { qtyText, Stepper } from '../ui/shared';

interface Line {
  key: string;
  product: ProductHit;
  variantId: string | null;
  packId: string | null;
  packQty: number;
  pcsQty: number;
  condition: ReturnCondition;
  reason: string;
}

const CONDITIONS: { value: ReturnCondition; label: string }[] = [
  { value: 'GOOD', label: msg('Theek (shelf par)') },
  { value: 'DAMAGED', label: msg('Kharab') },
  { value: 'EXPIRED', label: msg('Expiry') },
];

function defaultPack(p: ProductHit, variantId: string | null) {
  const packs = p.packs.filter((k) => (!k.variantId || k.variantId === variantId) && k.conversionRate > 1);
  return packs.find((k) => k.isDefault) ?? packs[packs.length - 1] ?? null;
}

export function BookerReturnScreen() {
  const th = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ customerId?: string }>();
  const { db, today, bump, sync } = useBookerStore();
  const [customerId, setCustomerId] = useState<string | undefined>(params.customerId);
  const [picker, setPicker] = useState(!params.customerId);
  const [lines, setLines] = useState<Line[]>([]);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search, 150);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const { data: customer } = useDbQuery((d) => (customerId ? getCustomer(d, customerId) : Promise.resolve(null)), [customerId]);
  const { data: hits = [] } = useDbQuery((d) => searchProducts(d, q, 40), [q]);
  useEffect(() => { if (!customerId) setPicker(true); }, [customerId]);

  const update = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const add = (p: ProductHit) => {
    const variantId = p.variants[0]?.id ?? null;
    const pack = defaultPack(p, variantId);
    setLines((ls) => [...ls, { key: newClientRef(), product: p, variantId, packId: pack?.id ?? null, packQty: pack ? 1 : 0, pcsQty: pack ? 0 : 1, condition: 'EXPIRED', reason: '' }]);
    setSearch('');
    setAdding(false);
  };

  const items: ReturnItemPayload[] = lines.flatMap((l) => {
    const out: ReturnItemPayload[] = [];
    const base = { productId: l.product.id, condition: l.condition, ...(l.variantId && { variantId: l.variantId }), ...(l.reason.trim() && { reason: l.reason.trim().slice(0, 200) }) };
    if (l.packId && l.packQty > 0) out.push({ ...base, unitId: l.packId, qty: l.packQty });
    if (l.pcsQty > 0) out.push({ ...base, qty: l.pcsQty });
    return out;
  });

  const save = async () => {
    if (!db || !customer || !items.length) return;
    setSaving(true);
    try {
      const gps = await getCheckIn(db, customer.id, today);
      const payload: ReturnPayload = { clientRef: newClientRef(), customerId: customer.id, items, collectedAt: new Date().toISOString() };
      if (note.trim()) payload.note = note.trim().slice(0, 300);
      if (gps?.latitude != null && gps.longitude != null) { payload.latitude = gps.latitude; payload.longitude = gps.longitude; }
      await queueReturn(db, payload, today);
      bump();
      sync({ quiet: true });
      toast.success(t('Return save ho gaya'), { message: t('Office approve karega') });
      setDone(true);
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <Screen title={t('Market return')} onBack={() => router.replace('/booker')}>
        <EmptyState icon={CheckCircle2} tone="brand" title={t('Return save ho gaya')} message={t('Phone par save hai. Internet milte hi office chala jayega, phir approve hone par khata me credit lagega.')} />
        <Button size="lg" fullWidth onPress={() => router.replace('/booker')}>{t('Route par wapas')}</Button>
      </Screen>
    );
  }

  const footer = adding ? undefined : (
    <Button size="xl" fullWidth style={{ flex: 1 }} icon={RotateCcw} disabled={!customer || !items.length} loading={saving} onPress={save}>
      {t('Save return')}
    </Button>
  );

  return (
    <>
      <Screen title={t('Market return')} subtitle={customer ? customer.businessName || customer.name : undefined} scroll={false} footer={footer} contentStyle={{ paddingHorizontal: th.space(4), gap: th.space(3) }}>
        {adding ? (
          <>
            <SearchBar value={search} onChangeText={setSearch} placeholder={t('Product ka naam, SKU ya barcode')} autoFocus />
            <List<ProductHit>
              data={hits}
              keyExtractor={(p) => p.id}
              renderItem={({ item }) => (
                <ListRow title={item.name} subtitle={[item.brandName, t('Stock {{value}}', { value: qtyText(item.stockQty) })].filter(Boolean).join(' · ')} trailing={<Icon icon={Plus} tone="brand" />} onPress={() => add(item)} divider />
              )}
              empty={<EmptyState compact icon={RotateCcw} title={t('Koi product nahi mila')} />}
            />
          </>
        ) : (
          <List<Line>
            data={lines}
            extraData={lines}
            keyExtractor={(l) => l.key}
            contentContainerStyle={{ paddingBottom: th.space(4) }}
            ItemSeparatorComponent={() => <View style={{ height: th.space(3) }} />}
            ListHeaderComponent={(
              <View style={{ gap: th.space(3), marginBottom: th.space(3) }}>
                <ListRow
                  icon={Store}
                  title={customer ? customer.businessName || customer.name : t('Dukaan chunein')}
                  subtitle={customer?.area ?? undefined}
                  chevron
                  onPress={() => setPicker(true)}
                  style={{ borderRadius: th.radius('lg'), backgroundColor: th.colors.surface }}
                />
                <Button variant="secondary" size="lg" icon={Plus} fullWidth disabled={!customer} onPress={() => setAdding(true)}>{t('Item add karein')}</Button>
              </View>
            )}
            ListFooterComponent={lines.length ? (
              <View style={{ marginTop: th.space(3) }}>
                <TextArea label={t('Note')} labelHint={t('(optional)')} value={note} onChangeText={setNote} maxLength={300} numberOfLines={2} />
                <Text size="xs" tone="muted" style={{ marginTop: th.space(2) }}>{t('Rate customer ki pichli Invoice se lagta hai. Office approve karega.')}</Text>
              </View>
            ) : undefined}
            renderItem={({ item: l }) => {
              const packs = l.product.packs.filter((k) => (!k.variantId || k.variantId === l.variantId) && k.conversionRate > 1);
              const pack = packs.find((k) => k.id === l.packId);
              return (
                <Card>
                  <View style={{ gap: th.space(3) }}>
                    <Row gap={2} align="start">
                      <Text weight="semibold" style={{ flex: 1 }}>{l.product.name}</Text>
                      <IconButton icon={Trash2} label={t('Delete')} variant="danger" onPress={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} />
                    </Row>
                    {!!l.product.variants.length && (
                      <ChipGroup
                        style={{ marginHorizontal: -th.space(4) }}
                        options={l.product.variants.map((v) => ({ value: v.id, label: v.name }))}
                        value={l.variantId ?? ''}
                        onChange={(id) => { const k = defaultPack(l.product, id); update(l.key, { variantId: id, packId: k?.id ?? null }); }}
                      />
                    )}
                    {packs.length > 1 && (
                      <ChipGroup wrap options={packs.map((k) => ({ value: k.id, label: `${k.unitName} (${qtyText(k.conversionRate)})` }))} value={l.packId ?? ''} onChange={(id) => update(l.key, { packId: id })} />
                    )}
                    <Row gap={3}>
                      {l.packId && <Stepper label={pack?.unitName ?? t('Pack')} value={l.packQty} onChange={(v) => update(l.key, { packQty: v })} />}
                      <Stepper label={l.product.unit || 'pcs'} value={l.pcsQty} onChange={(v) => update(l.key, { pcsQty: v })} />
                    </Row>
                    <ChipGroup wrap options={CONDITIONS.map((c) => ({ value: c.value, label: t(c.label) }))} value={l.condition} onChange={(c) => update(l.key, { condition: c })} />
                    <Input value={l.reason} onChangeText={(v) => update(l.key, { reason: v })} placeholder={t('Wajah (zaroori nahi)')} maxLength={200} />
                  </View>
                </Card>
              );
            }}
            empty={customer ? <EmptyState compact icon={RotateCcw} title={t('Upar se item add karein')} /> : undefined}
          />
        )}
      </Screen>
      <ShopPickerSheet
        open={picker}
        onClose={() => { setPicker(false); if (!customerId) router.back(); }}
        onPick={(id) => { setCustomerId(id); setPicker(false); }}
      />
    </>
  );
}
