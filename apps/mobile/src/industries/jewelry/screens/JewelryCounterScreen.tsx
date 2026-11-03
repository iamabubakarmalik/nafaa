/**
 * Jewelry counter (web JewelryPosPage), shown in place of the shared counter.
 * Every piece is priced from its weight at today's rate for its karat, plus
 * banwai, kaat and stones; the cashier can change the rate or banwai while
 * bargaining, or add a piece by hand. Old gold from the customer is weighed in
 * first (it goes into metal stock as a JEX- record) and goes on the bill as a
 * TRADE_IN payment naming that record. The bill is saved through the jewelry
 * API, which posts the shared sale (stock, khata, drawer, reports) and keeps
 * the weight breakdown for the receipt. The jewelry bill needs the server.
 */

import { router } from 'expo-router';
import { Coins, Gem, Plus, Receipt, Repeat, ShoppingCart, Sparkles, TrendingUp, UserRound } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COMMON_PURITIES, GOLD_KARATS, billTotals, lineTotal, metalOf, r2, rateFor } from '@nafaa/core/industries/jewelry';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useProductSearch } from '@/core/offline';
import { withManagerPin } from '@/core/security/ManagerPin';
import { Amount, Badge, Button, Card, Chip, EmptyState, Icon, IconButton, Input, List, ListRow, MoneyInput, PressableScale, Row, ScreenHeader, SearchBar, Sheet, Text, toast, useDebouncedValue, useTabBarSpace, useTheme } from '@/design';
import { OfflineNote, errorText, useDeskOnline } from '@/industries/_shared/deskKit';
import { CustomerPickerSheet } from '@/modules/customers/components/CustomerPickerSheet';
import { usePos } from '@/modules/pos/engine/usePos';
import { jewelrySalesApi } from '../api';
import { buildSaleBody, newKey, useJewelryBill, type Line } from '../components/billStore';
import { HandPieceSheet, LineSheet, OldGoldSheet, PaymentSheet, type PayChoice } from '../components/CounterSheets';
import { KaratBadge } from '../components/ui';
import { CATEGORY_LABEL, KEYS, MAIN_CATEGORIES, categoryLabel, grams, purityLabel, refreshJewelry, useJewelryFacts } from '../meta';

export function JewelryCounterScreen() {
  const th = useTheme();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const api = usePos();
  const { guard } = useDeskOnline('jewelryDesk');
  const bill = useJewelryBill();
  const { byProduct, rates, rateList } = useJewelryFacts();
  const [search, setSearch] = useState('');
  const [karat, setKarat] = useState('');
  const [category, setCategory] = useState('');
  const [sheet, setSheet] = useState<'bill' | 'hand' | 'gold' | 'pay' | 'customer' | null>(null);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const query = useDebouncedValue(search.trim(), 120);
  const products = useProductSearch({ query: query || undefined, limit: 200 });

  const rows = useMemo(() => (products.data ?? []).map((p) => ({ p, f: byProduct.get(p.id) })).filter(({ f }) => {
    if (karat && f?.purity !== karat) return false;
    if (category === 'bridal') return !!f?.isBridalCollection;
    if (category && f?.category !== category) return false;
    return true;
  }), [products.data, byProduct, karat, category]);

  const inBill = (id: string) => bill.lines.filter((l) => l.productId === id).reduce((s, l) => s + l.qty, 0);

  const add = (id: string) => {
    const row = (products.data ?? []).find((p) => p.id === id);
    if (!row) return;
    const f = byProduct.get(id);
    const stock = row.stock;
    if (stock != null && inBill(id) + 1 > stock && !api.counter.rules.negativeStock) { toast.error(t('{{name}} stock me nahi', { name: row.name })); return; }
    const existing = bill.lines.find((l) => l.productId === id);
    if (existing) { bill.patch(existing.key, { qty: existing.qty + 1 }); return; }
    if (!f) {
      bill.add({ key: newKey(), productId: id, name: row.name, category: 'OTHER', purity: 'OTHER', grossWeight: 0, netWeight: 0, ratePerGram: 0, making: row.price, wastagePct: 0, wastageGrams: 0, stones: 0, other: 0, qty: 1, stock, plain: true });
      return;
    }
    const rate = rateFor(rates, f.metalType, f.purity);
    if (!rate) toast.warning(t('{{purity}} ka aaj ka rate set nahi — rate khud likhein', { purity: purityLabel(f.purity) }));
    const rt = rate?.ratePerGram ?? 0;
    const metal = r2(f.netWeight * rt);
    bill.add({
      key: newKey(), productId: id, name: row.name, category: f.category, purity: f.purity, grossWeight: f.grossWeight, netWeight: f.netWeight, ratePerGram: rt,
      making: r2(f.makingChargePerGram * f.netWeight + f.makingChargeFixed + (metal * f.makingChargePct) / 100), wastagePct: f.wastagePct, wastageGrams: f.wastageGrams,
      stones: r2((f.gemstones ?? []).reduce((s, g) => s + (Number(g.totalValue) || 0), 0)), other: r2(f.polishCharge + f.designerCharge + f.otherCharges + f.hallmarkCharge), hallmark: f.hallmarkNumber ?? undefined, qty: 1, stock,
    });
  };

  const totals = billTotals(bill.lines, bill.discount, bill.golds);
  const catalogLines = bill.lines.filter((l) => l.productId);
  const pieces = bill.lines.reduce((s, l) => s + l.qty, 0);

  const openPay = () => {
    if (!catalogLines.length) { toast.error(t('Kam az kam ek zewar catalog se chunein — stock usi se kam hota hai')); return; }
    if (bill.lines.some((l) => !l.plain && !(l.ratePerGram > 0))) { toast.error(t('Har zewar ka rate likhein')); return; }
    setSheet('pay');
  };

  const sell = async (pay: PayChoice) => {
    const body = buildSaleBody(bill, totals, pay);
    setBusy(true);
    try {
      const res = await withManagerPin(t('Is bill ke liye malik ka PIN'), (managerPin) => jewelrySalesApi.create({ ...body, ...(managerPin && { managerPin }) }), pay.credit ? 'credit' : 'discount');
      refreshJewelry([KEYS.metal, KEYS.exchanges, 'metal-stock-balance'], true);
      toast.success(t('Bill ban gaya — {{no}}', { no: res.saleNumber ?? res.invoiceNumber }));
      setSheet(null);
      bill.reset();
      if (res.saleId) router.push(`/pos/receipt/${res.saleId}` as never);
    } catch (e) {
      toast.error(errorText(e, t('Bill save nahi hua')));
    } finally { setBusy(false); }
  };

  const goldRates = rateList.filter((r) => r.isActive && (GOLD_KARATS as string[]).includes(r.purity));
  const silver = rateList.find((r) => r.isActive && r.purity === 'SILVER_999');
  const editing = bill.lines.find((l) => l.key === editKey) ?? null;
  const barSpace = pieces > 0 ? 76 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: th.colors.canvas, paddingTop: insets.top }}>
      <ScreenHeader title={t('Counter')} onBack={null} compact actions={<>
        <IconButton icon={Coins} label={t('Metal stock')} onPress={() => router.push('/jewelry/metal-stock' as never)} />
        <IconButton icon={Plus} label={t('Hath se piece')} onPress={() => setSheet('hand')} />
      </>} />
      <View style={{ paddingHorizontal: th.space(3), gap: th.space(2), paddingBottom: th.space(2) }}>
        <PressableScale onPress={() => router.push('/jewelry/metal-rates' as never)} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: th.space(2), padding: th.space(3), borderRadius: th.radius('xl'), backgroundColor: th.colors.warning.soft }}>
          <Icon icon={TrendingUp} size={16} color={th.colors.warning.text} />
          <Text size="sm" weight="semibold" color={th.colors.warning.text}>{t('Aaj ka rate')}</Text>
          {goldRates.length === 0 && !silver ? <Text size="sm" color={th.colors.warning.text}>{t('Set nahi —')} {t('Rate badlein')}</Text>
            : [...goldRates, ...(silver ? [silver] : [])].map((r) => <Badge key={r.id} tone="warning">{`${purityLabel(r.purity)} ${formatMoney(r.ratePerGram)}/g`}</Badge>)}
        </PressableScale>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('Naam, design number, hallmark, barcode…')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: th.space(2) }} keyboardShouldPersistTaps="handled">
          {[{ v: '', l: t('Sab karat') }, ...COMMON_PURITIES.map((p) => ({ v: p as string, l: purityLabel(p) }))].map((o) => <Chip key={o.v || 'all'} label={o.l} selected={karat === o.v} onPress={() => setKarat(o.v)} />)}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: th.space(2) }} keyboardShouldPersistTaps="handled">
          {[{ v: '', l: t('Har type') }, { v: 'bridal', l: t('Bridal collection') }, ...MAIN_CATEGORIES.map((c) => ({ v: c as string, l: t(CATEGORY_LABEL[c]) }))].map((o) => <Chip key={o.v || 'all'} label={o.l} selected={category === o.v} onPress={() => setCategory(o.v)} />)}
        </ScrollView>
        <OfflineNote feature="jewelryDesk" />
      </View>
      <List
        data={rows}
        loading={products.isLoading}
        keyExtractor={({ p }) => p.id}
        contentContainerStyle={{ paddingBottom: tabSpace + barSpace + th.space(4) }}
        empty={<EmptyState icon={Gem} title={search || karat || category ? t('Is filter me koi zewar nahi') : t('Abhi koi zewar nahi')} message={t('Products me "Add jewelry item" se zewar daalein')} />}
        renderItem={({ item: { p, f } }) => {
          const n = inBill(p.id);
          return (
            <ListRow icon={Gem} iconTone="warning" title={p.name} selected={n > 0}
              subtitle={f ? `${categoryLabel(f.category)} · ${grams(f.netWeight)}${f.price ? '' : ` · ${t('rate nahi')}`}` : t('Seedha qeemat')}
              trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Amount value={f?.price?.total ?? p.price} weight="bold" />
                <Row gap={1}>{f && <KaratBadge purity={f.purity} />}{n > 0 && <Badge tone="brand">{`× ${n}`}</Badge>}{f?.isBridalCollection && <Icon icon={Sparkles} size={14} tone="subtle" />}</Row>
              </View>}
              onPress={() => add(p.id)} />
          );
        }}
      />
      {pieces > 0 && (
        <View style={{ position: 'absolute', start: th.space(3), end: th.space(3), bottom: tabSpace + th.space(2) }}>
          <PressableScale onPress={() => setSheet('bill')} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), padding: th.space(3), borderRadius: th.radius('xl'), backgroundColor: th.colors.brand.solid }}>
            <Icon icon={ShoppingCart} size={22} color="#ffffff" />
            <View style={{ flex: 1 }}>
              <Text weight="bold" color="#ffffff">{t('Bill')} · {pieces}</Text>
              <Text size="xs" color="#ffffff" ltr>{grams(totals.weight)}{totals.oldValue > 0 ? ` · ${t('Purana sona')} −${formatMoney(totals.oldValue)}` : ''}</Text>
            </View>
            <Amount value={totals.total} size="lg" weight="bold" color="#ffffff" />
          </PressableScale>
        </View>
      )}

      <Sheet open={sheet === 'bill'} onClose={() => setSheet(null)} title={t('Bill')} height={0.9}
        footer={<Button fullWidth size="lg" variant="success" icon={Receipt} onPress={openPay}>{t('Payment lein')} · {formatMoney(totals.total)}</Button>}>
        <View style={{ gap: th.space(3) }}>
          {bill.lines.map((l) => (
            <ListRow key={l.key} dense title={l.name} subtitle={l.plain ? undefined : `${purityLabel(l.purity)} · ${grams(l.netWeight)}${l.qty > 1 ? ` × ${l.qty}` : ''}`}
              trailing={<Amount value={lineTotal(l)} weight="bold" />} chevron onPress={() => setEditKey(l.key)} />
          ))}
          <Row gap={2}>
            <Button style={{ flex: 1 }} variant="soft" icon={UserRound} onPress={() => setSheet('customer')}>{bill.customer?.name ?? t('Customer')}</Button>
            <Button style={{ flex: 1 }} variant="soft" icon={Repeat} onPress={() => setSheet('gold')}>{totals.oldValue > 0 ? `${t('Purana sona')} −${formatMoney(totals.oldValue)}` : t('Purana sona')}</Button>
          </Row>
          <MoneyInput label={t('Discount')} value={bill.discount || null} onChangeValue={(v) => bill.setDiscount(v ?? 0)} />
          <Input label={t('Bill par note (ikhtiyari)')} value={bill.notes} onChangeText={bill.setNotes} maxLength={200} />
          <Card>
            <Row justify="between"><Text tone="secondary">{t('Zewar')}</Text><Amount value={totals.subtotal} weight="semibold" /></Row>
            {totals.oldValue > 0 && <Row justify="between"><Text tone="warning">{t('Purana sona {{g}}', { g: grams(totals.oldGrams) })}</Text><Amount value={-totals.oldValue} weight="semibold" tone="warning" /></Row>}
            <Row justify="between"><Text weight="bold">{t('Customer dega')}</Text><Amount value={totals.total} size="lg" weight="bold" /></Row>
          </Card>
          <Button variant="ghost" onPress={() => { bill.reset(); setSheet(null); }}>{t('Saaf karein')}</Button>
        </View>
      </Sheet>
      <LineSheet line={editing} onClose={() => setEditKey(null)} />
      <HandPieceSheet open={sheet === 'hand'} onClose={() => setSheet(null)} />
      <OldGoldSheet open={sheet === 'gold'} onClose={() => setSheet('bill')} />
      <PaymentSheet open={sheet === 'pay'} total={totals.total} hasCustomer={!!bill.customer} busy={busy} onPickCustomer={() => setSheet('customer')} onClose={() => setSheet('bill')} onConfirm={(p) => guard(() => void sell(p))} />
      <CustomerPickerSheet open={sheet === 'customer'} title={t('Customer chunein')} onClose={() => setSheet('bill')} onPick={(c) => { bill.setCustomer(c); setSheet('bill'); }} />
    </View>
  );
}
