/**
 * New carpet purchase (web CarpetPurchaseEditor). Roll goods are bought as
 * rolls (design, width x length, cost and rate per sqft); each roll joins
 * stock with the purchase as its source. Rugs, underlay and other goods are
 * bought by quantity. Payment, discount and the supplier's balance follow the
 * shared purchase. Needs the server (rolls are made with the purchase).
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Layers, Plus, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { isRollUnit, qtyInUnit } from '@nafaa/core/industries/carpet';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import type { PaymentMethod } from '@/core/offline';
import { Button, Card, ChipGroup, FormSection, FormTemplate, IconButton, Input, MoneyInput, Row, Text, toast, useTheme } from '@/design';
import { BranchSelect } from '@/modules/inventory/components/Pickers';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { NumberInput } from '@/modules/inventory/components/fields';
import { variantsApi } from '@/modules/inventory/api/products';
import { registerPurchaseEditor } from '@/modules/purchasing/industry/registry';
import { SupplierPicker } from '@/modules/purchasing/components/SupplierPicker';
import { PAY_METHODS } from '@/modules/purchasing/lib/meta';
import { OfflineNote, useDeskOnline } from '../_shared/deskKit';
import { carpetPurchaseApi } from './api';
import { SizeInput } from './components/SizeInput';
import { ftIn, r2, realFt, refreshCarpet, rollSqft } from './meta';

interface RollRow { variantId: string; rollNumber: string; wFt: number | null; wIn: number | null; lFt: number | null; lIn: number | null; cost: number | null; rate: number | null; rack: string }
interface Line { key: number; productId: string; name: string; unit: string; price: number; costPrice: number; rolls: RollRow[]; qty: number | null; cost: number | null }
let seq = 0;
const blankRoll = (l: Pick<Line, 'unit' | 'price' | 'costPrice'>): RollRow => ({ variantId: '', rollNumber: '', wFt: 12, wIn: null, lFt: null, lIn: null, cost: l.unit === 'sqft' && l.costPrice ? l.costPrice : null, rate: l.unit === 'sqft' && l.price ? l.price : null, rack: '' });
const sq = (r: RollRow) => rollSqft(r.wFt ?? 0, r.wIn ?? 0, r.lFt ?? 0, r.lIn ?? 0);

function Variants({ productId, value, onChange }: { productId: string; value: string; onChange: (v: string) => void }) {
  const q = useQuery({ queryKey: ['carpet-roll-variants', productId], queryFn: () => variantsApi.list(productId) });
  const active = (q.data ?? []).filter((v) => v.isActive);
  if (!active.length) return null;
  return <ChipGroup value={value} onChange={onChange} options={[{ value: '', label: t('Design') }, ...active.map((v) => ({ value: v.id, label: v.name }))]} />;
}

export function CarpetPurchaseScreen() {
  const th = useTheme();
  const { guard } = useDeskOnline('carpetDesk');
  const shopId = useAuthStore((s) => s.currentShopId) ?? undefined;
  const [supplierId, setSupplierId] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [discount, setDiscount] = useState<number | null>(null);
  const [paid, setPaid] = useState<number | null>(null);
  const [invoice, setInvoice] = useState('');
  const [notes, setNotes] = useState('');
  const [branch, setBranch] = useState(shopId ?? '');
  const [lines, setLines] = useState<Line[]>([]);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);

  const lineTotal = (l: Line) => (isRollUnit(l.unit) ? r2(l.rolls.reduce((s, r) => s + sq(r) * (r.cost ?? 0), 0)) : r2((l.qty ?? 0) * (l.cost ?? 0)));
  const subtotal = r2(lines.reduce((s, l) => s + lineTotal(l), 0));
  const total = Math.max(r2(subtotal - (discount ?? 0)), 0);
  const setLine = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const setRoll = (l: Line, i: number, patch: Partial<RollRow>) => setLine(l.key, { rolls: l.rolls.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!supplierId) e.push(t('Supplier chunein'));
    if (!lines.length) e.push(t('Kam se kam ek cheez daalein'));
    for (const l of lines) {
      if (isRollUnit(l.unit)) {
        if (!l.rolls.length) e.push(t('{{name}}: roll daalein', { name: l.name }));
        l.rolls.forEach((r, i) => {
          if (!(sq(r) > 0)) e.push(t('{{name}} roll {{value}}: chaurai aur lambai likhein', { name: l.name, value: i + 1 }));
          else if ((r.wIn ?? 0) >= 12 || (r.lIn ?? 0) >= 12) e.push(t('{{name}} roll {{value}}: inch 12 se kam', { name: l.name, value: i + 1 }));
          else if (!((r.cost ?? 0) > 0)) e.push(t('{{name}} roll {{value}}: cost / sqft likhein', { name: l.name, value: i + 1 }));
        });
      } else if (!((l.qty ?? 0) > 0) || (l.cost ?? 0) < 0) e.push(t('{{name}}: quantity likhein', { name: l.name }));
    }
    if ((discount ?? 0) > subtotal) e.push(t('Discount bill se zyada hai'));
    if (paid != null && paid > total) e.push(t('Diya gaya paisa bill se zyada hai'));
    return e;
  }, [supplierId, lines, discount, paid, subtotal, total]);

  const save = () => guard(async () => {
    setTried(true);
    if (errors.length || saving) { if (errors.length) toast.error(errors[0]); return; }
    setSaving(true);
    try {
      const p = await carpetPurchaseApi.create({
        supplierId, paymentMethod: method, shopId: branch || undefined, discount: discount || undefined, paidAmount: paid ?? undefined,
        supplierInvoiceNo: invoice.trim() || undefined, notes: notes.trim() || undefined,
        items: lines.map((l) => {
          if (!isRollUnit(l.unit)) return { productId: l.productId, quantity: l.qty ?? 0, costPrice: l.cost ?? 0 };
          // Quantity in the product's own unit (sq meter, sq gaz or sqft).
          const qty = r2(l.rolls.reduce((s, r) => s + qtyInUnit(l.unit, realFt(r.wFt ?? 0, r.wIn ?? 0), realFt(r.lFt ?? 0, r.lIn ?? 0)), 0));
          return {
            productId: l.productId, quantity: qty, costPrice: qty > 0 ? r2(lineTotal(l) / qty) : 0,
            rolls: l.rolls.map((r) => ({
              variantId: r.variantId || undefined, rollNumber: r.rollNumber.trim() || undefined, widthFt: r.wFt ?? 0, widthInch: r.wIn ?? 0,
              lengthFt: r2(realFt(r.lFt ?? 0, r.lIn ?? 0)), costPerSqft: r.cost ?? 0, salePricePerSqft: r.rate || undefined, rackNumber: r.rack.trim() || undefined,
            })),
          };
        }),
      });
      refreshCarpet(['purchases', 'products', 'suppliers']);
      toast.success(t('Purchase {{purchaseNumber}} save — rolls stock me aa gaye', { purchaseNumber: p.purchaseNumber }));
      router.replace(`/purchases/${p.id}` as never);
    } catch (e) { toast.error(apiErrorMessage(e, t('Purchase save nahi hui'))); } finally { setSaving(false); }
  });

  return (
    <FormTemplate title={t('Nayi carpet purchase')} subtitle={t('Rolls naap ke saath, baqi maal quantity se')} dirty={lines.length > 0} saving={saving} onSave={save}>
      <View style={{ gap: th.space(4) }}>
        <OfflineNote feature="carpetDesk" />
        <FormSection title={t('Maal')} description={t('Carpet chunein — roll goods par rolls ki line khulti hai')}>
          {lines.map((l) => (
            <Card key={l.key} title={l.name} description={isRollUnit(l.unit) ? t('{{count}} roll · {{r2}} sqft · {{formatPKR}}', { count: l.rolls.length, r2: r2(l.rolls.reduce((s, r) => s + sq(r), 0)), formatPKR: formatMoney(lineTotal(l)) }) : formatMoney(lineTotal(l))}
              action={<IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} />}>
              {isRollUnit(l.unit) ? (
                <View style={{ gap: th.space(3) }}>
                  {l.rolls.map((r, i) => (
                    <View key={i} style={{ gap: th.space(2), padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
                      <Variants productId={l.productId} value={r.variantId} onChange={(variantId) => setRoll(l, i, { variantId })} />
                      <Input label={t('Roll number')} value={r.rollNumber} onChangeText={(rollNumber) => setRoll(l, i, { rollNumber })} placeholder={t('Roll #')} ltr />
                      <SizeInput label={t('Chaurai')} ft={r.wFt} inch={r.wIn} onChange={(wFt, wIn) => setRoll(l, i, { wFt, wIn })} />
                      <SizeInput label={t('Lambai')} ft={r.lFt} inch={r.lIn} onChange={(lFt, lIn) => setRoll(l, i, { lFt, lIn })} />
                      <MoneyInput label={t('Cost/sqft')} value={r.cost} onChangeValue={(cost) => setRoll(l, i, { cost })} />
                      <MoneyInput label={t('Rate/sqft')} value={r.rate} onChangeValue={(rate) => setRoll(l, i, { rate })} />
                      <Row justify="between">
                        <Text size="sm" ltr>{ftIn(r.wFt ?? 0, r.wIn ?? 0)} × {ftIn(r.lFt ?? 0, r.lIn ?? 0)} = <Text size="sm" weight="bold">{sq(r)} sqft</Text></Text>
                        <IconButton icon={Trash2} label={t('Roll hatayein')} variant="danger" onPress={() => setLine(l.key, { rolls: l.rolls.filter((_, j) => j !== i) })} />
                      </Row>
                    </View>
                  ))}
                  <Button size="sm" variant="soft" icon={Plus} onPress={() => setLine(l.key, { rolls: [...l.rolls, l.rolls.length ? { ...l.rolls[l.rolls.length - 1], rollNumber: '' } : blankRoll(l)] })}>{t('Roll')}</Button>
                </View>
              ) : (
                <View style={{ gap: th.space(2) }}>
                  <NumberInput label={t('Quantity ({{unit}})', { unit: l.unit })} value={l.qty} onChangeValue={(qty) => setLine(l.key, { qty })} />
                  <MoneyInput label={t('Cost (ek ki)')} value={l.cost} onChangeValue={(cost) => setLine(l.key, { cost })} />
                </View>
              )}
            </Card>
          ))}
          <Button icon={Layers} variant="soft" onPress={() => setPicking(true)}>{t('Product chunein…')}</Button>
        </FormSection>

        <FormSection title={t('Bill aur payment')}>
          <SupplierPicker value={supplierId} onChange={(s) => setSupplierId(s.id)} onNew={() => router.push('/suppliers' as never)} error={tried && !supplierId ? t('Supplier chunein') : null} />
          <BranchSelect value={branch} onChange={setBranch} label={t('Branch')} />
          <Input label={t('Supplier ka bill number')} value={invoice} onChangeText={setInvoice} ltr />
          <ChipGroup wrap value={method} onChange={(v) => setMethod(v as PaymentMethod)} options={PAY_METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} />
          <MoneyInput label={t('Discount')} value={discount} onChangeValue={setDiscount} />
          <MoneyInput label={t('Abhi diya')} value={paid} onChangeValue={setPaid} placeholder={String(total)} hint={t('Khaali = poora diya; kam likhein to baqi supplier ke khate me')} />
          <Input label={t('Note')} value={notes} onChangeText={setNotes} />
          <Card tone="default">
            <Row justify="between"><Text size="sm" tone="secondary">{t('Maal')}</Text><Text size="sm" ltr>{formatMoney(subtotal)}</Text></Row>
            <Row justify="between"><Text weight="bold">{t('Total')}</Text><Text weight="bold" ltr>{formatMoney(total)}</Text></Row>
            {paid != null && paid < total ? <Row justify="between"><Text size="sm" tone="warning">{t('Supplier ka baqi')}</Text><Text size="sm" tone="warning" ltr>{formatMoney(total - paid)}</Text></Row> : null}
          </Card>
          {tried && errors.length > 0 ? <Text size="sm" tone="danger">{errors[0]}</Text> : null}
        </FormSection>
      </View>
      <ProductPicker open={picking} onClose={() => setPicking(false)} variants={false} title={t('Carpet chunein')}
        onPick={(p) => {
          const l = { unit: p.product.unit, price: p.product.price, costPrice: p.product.costPrice ?? 0 };
          setLines((ls) => [...ls, { key: ++seq, productId: p.product.id, name: p.product.name, ...l, rolls: isRollUnit(l.unit) ? [blankRoll(l)] : [], qty: 1, cost: l.costPrice || null }]);
        }} />
    </FormTemplate>
  );
}

registerPurchaseEditor('carpet', CarpetPurchaseScreen);
