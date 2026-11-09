/**
 * New purchase or order. Items come from search or the camera scanner (a
 * pack barcode brings its pack unit); each line can be bought in any unit:
 * pieces, a product's carton/box, or a purchase-only unit such as
 * "bori = 50 kg". Discount, freight and tax spread into the cost; paid
 * defaults to the full bill; an order puts nothing in stock until it is
 * received. Saved through the offline engine: received goods are in stock
 * at once, with or without internet.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, ChevronDown, ChevronUp, ClipboardList, PackagePlus, Plus, ScanLine, Ship, Trash2, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { landedTotal, newLandedDraft } from '@nafaa/core/inventory';
import { useAuthStore } from '@/core/auth/store';
import { haptic } from '@/core/device/haptics';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { enqueuePurchase, offline, OfflineRuleError, useProductSearch, type ProductRow } from '@/core/offline';
import {
  Badge, Button, Card, Chip, ChipGroup, DatePicker, FormSection, FormTemplate, IconButton, Input, MoneyInput, Row, Segmented, Select, Sheet, Text, TextArea,
  confirm, toast, useTheme,
} from '@/design';
import { Scanner } from '@/core/hardware/scanner';
import { BranchSelect } from '@/modules/inventory/components/Pickers';
import { ProductPicker, type PickedProduct } from '@/modules/inventory/components/ProductPicker';
import { ProductThumb } from '@/modules/inventory/components/ProductThumb';
import { NumberInput } from '@/modules/inventory/components/fields';
import { qty as q3, useOnline, useRefreshInventory } from '@/modules/inventory/lib/shared';
import type { Purchase } from '../../api/purchases';
import { LandedCostEditor } from '../../components/Landed';
import { QuickProductSheet, QuickSupplierSheet } from '../../components/QuickAdd';
import { SupplierPicker, useSupplierPickerList } from '../../components/SupplierPicker';
import { usePurchaseExtras } from '../../industry/registry';
import { PAY_METHODS } from '../../lib/meta';
import { usePurchaseDraft, type DraftLine, type NewLine, type UnitChoice } from './draft';

const toDate = (s: string) => (s ? new Date(`${s}T12:00:00`) : null);
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** A product from the phone's mirror as a bill line source, with its pack units. */
async function sourceOf(productId: string, variant?: { id: string; name: string } | null): Promise<NewLine | null> {
  const p = await offline.products.get(productId);
  if (!p) return null;
  const packs = p.packs
    .filter((u) => !u.isBase && !u.variantId && u.unitName.toLowerCase() !== (p.unit || '').toLowerCase())
    .sort((a, b) => a.conversionRate - b.conversionRate)
    .map((u): UnitChoice => ({ id: u.id, name: u.unitName, rate: Number(u.conversionRate) || 1 }));
  const v = variant ? p.variants.find((x) => x.id === variant.id) : null;
  return {
    productId: p.id, name: p.name, baseUnit: p.unit || 'pcs', stock: Number(v?.stock ?? p.stock ?? 0),
    was: Number(v?.costPrice || p.costPrice || 0), price: Number(p.price) || 0, isRaw: p.isRawMaterial, expiryTracked: p.expiryTracked,
    image: p.imageUrl, category: p.categoryName, variant: variant ?? null, units: [{ id: null, name: p.unit || 'pcs', rate: 1 }, ...packs],
  };
}

export function PurchaseEditorScreen() {
  const th = useTheme();
  const params = useLocalSearchParams<{ order?: string; supplier?: string; supplierId?: string; from?: string; lines?: string; prefill?: string }>();
  const online = useOnline();
  const refresh = useRefreshInventory();
  const activeShop = useAuthStore((s) => s.currentShopId);
  const d = usePurchaseDraft(params.order === '1' || params.from === 'low-stock' ? 'order' : 'receive');
  const { bill, setBill, lines } = d;
  const suppliers = useSupplierPickerList();
  const shopId = activeShop ?? bill.shopId;

  const [picker, setPicker] = useState(false);
  const [scan, setScan] = useState(false);
  const [newProduct, setNewProduct] = useState<{ name?: string; barcode?: string } | null>(null);
  const [newSupplier, setNewSupplier] = useState<string | null>(null);
  const [customFor, setCustomFor] = useState<DraftLine | null>(null);
  const [landedOpen, setLandedOpen] = useState(bill.landed.length > 0);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const done = useRef(false);
  // Navigate after the cleared bill has rendered, so the "unsaved changes" guard sees a clean form.
  const [next, setNext] = useState<string | null>(null);
  useEffect(() => { if (next) router.replace(next as never); }, [next]);
  const low = useProductSearch({ stock: 'low', limit: 14 }, { enabled: !lines.length });

  // Opened from a supplier, with lines from low stock, or with a Nafaa AI
  // reorder (`prefill={ supplierId, supplierName, lines }`): start with them, once.
  useEffect(() => {
    let ai: { supplierId?: string; supplierName?: string; lines?: unknown[] } = {};
    if (params.prefill) { try { ai = JSON.parse(params.prefill) ?? {}; } catch { ai = {}; } }
    const sup = params.supplierId ?? params.supplier ?? ai.supplierId;
    const prefill = params.lines ?? (Array.isArray(ai.lines) ? JSON.stringify(ai.lines) : undefined);
    if (!sup && !prefill) return;
    void (async () => {
      if (prefill) {
        if (lines.length && !(await confirm({ title: t('Pehle se adhoora bill hai. Usay hata kar naya order banayein?'), tone: 'danger' }))) return;
        d.reset(params.order === '0' ? 'receive' : 'order');
        let list: Array<{ productId?: string; qty?: number; cost?: number }> = [];
        try { list = JSON.parse(prefill); } catch { list = []; }
        const skipped: string[] = [];
        for (const l of list) {
          if (!l.productId) continue;
          const src = await sourceOf(l.productId);
          if (!src) continue;
          const row = await offline.products.get(l.productId);
          if (row?.hasVariants && row.variants.length) { skipped.push(src.name); continue; }
          await addLine({ ...src, qty: l.qty && l.qty > 0 ? l.qty : 1, ...(l.cost ? { cost: l.cost } : {}) });
        }
        if (skipped.length) toast.info(t('Variant wali cheezein khud jorein: {{value}}', { value: skipped.join(', ') }));
      }
      if (sup) setBill({ supplierId: sup, supplierName: ai.supplierId === sup ? ai.supplierName ?? '' : '' });
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!bill.supplierId || bill.supplierName) return;
    const hit = suppliers.data?.items.find((x) => x.id === bill.supplierId);
    if (hit) setBill({ supplierName: hit.name });
  }, [suppliers.data, bill.supplierId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Industry cost (PurchaseExtras.lineCost): asked when a line is added and again when the supplier changes.
  const { lineCost } = usePurchaseExtras();
  const costFor = async (src: { productId: string; variant: { id: string } | null; price: number; was: number }, supplierId: string) => {
    if (!lineCost) return null;
    try {
      return await lineCost({ productId: src.productId, variantId: src.variant?.id ?? null, supplierId, listPrice: src.price, lastCost: src.was });
    } catch {
      return null;
    }
  };
  const addLine = async (src: NewLine) => {
    if (src.cost == null) {
      const hit = await costFor(src, bill.supplierId);
      if (hit) {
        d.add({ ...src, cost: Math.round(hit.cost * (src.unit ?? src.units[0]).rate * 100) / 100 });
        if (hit.note) toast.info(hit.note);
        return;
      }
    }
    d.add(src);
  };
  const lastSupplier = useRef(bill.supplierId);
  useEffect(() => {
    if (!lineCost || lastSupplier.current === bill.supplierId) return;
    lastSupplier.current = bill.supplierId;
    void (async () => {
      for (const l of lines) {
        const hit = await costFor(l, bill.supplierId);
        if (hit) d.patch(l.key, { cost: Math.round(hit.cost * l.unit.rate * 100) / 100 });
      }
    })();
  }, [bill.supplierId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addPicked = async (p: PickedProduct) => {
    const src = await sourceOf(p.product.id, p.variantId ? { id: p.variantId, name: p.variantName ?? '' } : null);
    if (!src) return;
    const unit = p.pack && !p.pack.isBase ? src.units.find((u) => u.id === p.pack!.id) ?? { id: p.pack.id, name: p.pack.unitName, rate: p.pack.conversionRate } : undefined;
    await addLine({ ...src, unit });
  };
  const addRow = async (row: ProductRow) => {
    const src = await sourceOf(row.id);
    if (!src) return;
    if (row.hasVariants) { setPicker(true); return; }
    await addLine(src);
  };

  const onCode = async (code: string) => {
    const hit = await offline.products.byBarcode(code);
    if (!hit) {
      toast.error(t('"{{raw}}" nahi mila — naya product bana lein', { raw: code }));
      setScan(false);
      setNewProduct({ barcode: code });
      return false;
    }
    const v = hit.variantId ? hit.product.variants.find((x) => x.id === hit.variantId) : null;
    if (!hit.variantId && hit.product.hasVariants && hit.product.variants.length) { setScan(false); setPicker(true); return true; }
    await addPicked({ product: hit.product, variantId: hit.variantId, variantName: v?.name ?? null, pack: hit.pack, stock: null });
    toast.success(`${hit.product.name}${hit.pack ? ` · ${hit.pack.unitName}` : ''}`);
    return true;
  };

  const order = bill.mode === 'order';
  const problems = [
    !shopId && t('Upar se branch chunein — maal kis branch me aaya'),
    !bill.supplierId && t('Supplier chunein'),
    !lines.length && t('Kam se kam ek cheez jorein'),
    lines.some((l) => !(l.qty > 0)) && t('Har line ki quantity likhein'),
    bill.discount > d.subtotal && t('Discount bill se zyada hai'),
    bill.landed.some((c) => c.currency !== 'PKR' && c.amount > 0 && !(c.rate > 0)) && t('Landed cost: currency ka rate (Rs me) likhein'),
  ].filter(Boolean) as string[];

  const save = async () => {
    setTried(true);
    if (problems.length) { haptic('error'); toast.error(problems[0]); return; }
    if (saving) return;
    setSaving(true);
    try {
      const opId = await enqueuePurchase(d.payload(shopId));
      void refresh({ purchasing: true });
      const op = online ? await offline.outbox.waitFor(opId, 20_000) : null;
      if (op?.status === 'issue') {
        // The server said no: keep the bill here to fix, and drop the queued copy.
        await offline.issues.discard(op.id).catch(() => undefined);
        toast.error(op.serverMessage || op.explanation || t('Save nahi hua'));
        return;
      }
      haptic('success');
      d.reset();
      done.current = true;
      if (op?.status === 'done') {
        const p = op.result as Purchase | null;
        toast.success(order ? t('Order {{purchaseNumber}} ban gaya', { purchaseNumber: p?.purchaseNumber ?? '' }) : t('Purchase {{purchaseNumber}} save — stock barh gaya', { purchaseNumber: p?.purchaseNumber ?? '' }));
        void refresh({ purchasing: true });
        if (p?.id) { setNext(`/purchases/${p.id}`); return; }
      } else {
        toast.info(t('Phone par save ho gaya — internet aane par bhej diya jayega'), order ? undefined : { message: t('Stock abhi se barh gaya hai') });
      }
      setNext('/purchases');
    } catch (e) {
      toast.error(e instanceof OfflineRuleError ? e.message : e instanceof Error ? e.message : t('Save nahi hua'));
    } finally {
      setSaving(false);
    }
  };

  const total = landedTotal(bill.landed);
  return (
    <FormTemplate
      title={order ? t('Naya order') : t('Nayi purchase')}
      subtitle={order ? t('Supplier ko order — maal baad me') : t('Maal aa gaya — stock abhi barhega')}
      dirty={!done.current && (lines.length > 0 || !!bill.supplierId) && !saving}
      saving={saving}
      saveLabel={`${order ? t('Order save karein') : t('Purchase save karein')} · ${formatPKR(d.total)}`}
      onSave={() => void save()}
      actions={(lines.length > 0 || !!bill.supplierId) ? (
        <IconButton icon={Trash2} label={t('Saaf')} onPress={async () => { if (await confirm({ title: t('Yeh bill saaf kar dein?'), tone: 'danger', confirmLabel: t('Saaf') })) d.reset(); }} />
      ) : undefined}
    >
      <View style={{ gap: th.space(4) }}>
        {d.restored && lines.length > 0 && <Card tone="info"><Text size="sm">{t('Pichla adhoora bill wapas aa gaya — jahan chhoda tha wahin se jari rakhein.')}</Text></Card>}
        <Segmented value={bill.mode} onChange={(mode) => setBill({ mode })}
          options={[{ value: 'receive', label: t('Maal aa gaya') }, { value: 'order', label: t('Order dena hai'), icon: ClipboardList }]} />

        <FormSection title={t('Supplier')}>
          <SupplierPicker value={bill.supplierId} onChange={(s) => setBill({ supplierId: s.id, supplierName: s.name })} onNew={(name) => setNewSupplier(name)}
            error={tried && !bill.supplierId ? t('Supplier chunein') : null} />
          {!activeShop && <BranchSelect value={bill.shopId} onChange={(id) => setBill({ shopId: id })} label={t('Maal kis branch me aaya')} error={tried && !shopId ? t('Branch chunein') : null} />}
          <Row gap={2} align="start">
            <Input containerStyle={{ flex: 1 }} label={t('Supplier ka bill #')} value={bill.invoiceNo} onChangeText={(invoiceNo) => setBill({ invoiceNo })} maxLength={60} placeholder={t('Parchi ka #')} ltr />
            <View style={{ flex: 1 }}><DatePicker label={order ? t('Order ki date') : t('Date')} value={toDate(bill.date)} onChange={(x) => setBill({ date: ymd(x) })} maximumDate={new Date()} /></View>
          </Row>
          {order && <DatePicker label={t('Maal kab tak aayega')} value={toDate(bill.expectedAt)} onChange={(x) => setBill({ expectedAt: ymd(x) })} hint={t('Supplier ne jo din bataya — list me yaad dilaya jayega')} />}
        </FormSection>

        <FormSection title={t('Cheezein ({{count}})', { count: lines.length })}>
          <Row gap={2}>
            <Button style={{ flex: 1 }} icon={Plus} onPress={() => setPicker(true)}>{t('Cheez jorein')}</Button>
            <IconButton icon={ScanLine} label={t('Scan')} variant="soft" size="lg" onPress={() => setScan(true)} />
            <IconButton icon={PackagePlus} label={t('Naya')} variant="soft" size="lg" onPress={() => setNewProduct({})} />
          </Row>
          {!lines.length && (low.data?.length ?? 0) > 0 && (
            <Card tone="warning">
              <Row gap={1.5}><AlertTriangle size={16} color={th.colors.warning.text} /><Text size="sm" weight="semibold">{t('Kam stock — ek tap me jorein')}</Text></Row>
              <Row gap={1.5} wrap style={{ marginTop: 8 }}>
                {low.data!.map((s) => <Chip key={s.id} label={`+ ${s.name} (${q3(s.stock)} ${s.unit})`} onPress={() => void addRow(s)} />)}
              </Row>
            </Card>
          )}
          {!lines.length && <Text size="sm" tone="muted">{t('Upar naam likhein ya barcode scan karein. Carton/box ka barcode ho to wohi unit khud lagta hai.')}</Text>}
          {lines.map((l) => <LineCard key={l.key} line={l} d={d} onCustomUnit={() => setCustomFor(l)} />)}
        </FormSection>

        <FormSection title={t('Bill')}>
          <Row justify="between"><Text tone="muted">{t('Cheezein ({{count}})', { count: lines.length })}</Text><Text weight="semibold" ltr>{formatPKR(d.subtotal)}</Text></Row>
          <MoneyInput label={t('Discount')} hint={t('Supplier ne poore bill par jo discount di')} value={bill.discount || null} onChangeValue={(v) => setBill({ discount: v ?? 0 })} />
          <MoneyInput label={t('Kiraya / loading')} hint={t('Maal laane ka expense — rickshaw, loader, mazdoori')} value={bill.otherCharges || null} onChangeValue={(v) => setBill({ otherCharges: v ?? 0 })} />
          <MoneyInput label={t('Tax')} hint={t('Bill par laga GST / sales tax')} value={bill.taxAmount || null} onChangeValue={(v) => setBill({ taxAmount: v ?? 0 })} />
          <Card tone="brand">
            <Row justify="between"><Text weight="bold">{t('Kul bill')}</Text><Text size="lg" weight="bold" ltr>{formatPKR(d.total)}</Text></Row>
          </Card>
          {(bill.discount > 0 || bill.otherCharges > 0 || bill.taxAmount > 0) && <Text size="xs" tone="muted">{t('Discount, kiraya aur tax har cheez ki cost me hisse ke mutabiq jud jate hain.')}</Text>}
        </FormSection>

        {landedOpen ? (
          <FormSection title={`${t('Landed cost (import)')} · ${formatPKR(total)}`}>
            <LandedCostEditor costs={bill.landed} onCosts={(landed) => setBill({ landed })} method={bill.landedMethod} onMethod={(landedMethod) => setBill({ landedMethod })}
              lines={lines.map((l) => ({ id: l.key, name: l.variant ? `${l.name} (${l.variant.name})` : l.name, value: l.qty * l.cost, qty: l.qty * l.unit.rate, unit: l.baseUnit, weightKg: l.weightKg }))}
              onWeight={(key, kg) => d.patch(key, { weightKg: kg })} />
          </FormSection>
        ) : (
          <Button variant="secondary" icon={Ship} onPress={() => { setLandedOpen(true); if (!bill.landed.length) setBill({ landed: [newLandedDraft()] }); }}>{t('Import / landed cost jorein')}</Button>
        )}

        {!order && (
          <FormSection title={t('Payment')}>
            <ChipGroup wrap value={bill.paymentMethod} onChange={(paymentMethod) => setBill({ paymentMethod })} options={PAY_METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} />
            <Row gap={2} align="end">
              <MoneyInput containerStyle={{ flex: 1 }} label={t('Abhi kitne diye')} value={bill.paid ?? d.total} onChangeValue={(v) => setBill({ paid: v ?? 0 })} />
              <Button size="sm" variant="secondary" onPress={() => setBill({ paid: null })}>{t('Poora')}</Button>
              <Button size="sm" variant="secondary" onPress={() => setBill({ paid: 0 })}>{t('Udhaar')}</Button>
            </Row>
            <Text size="xs" tone="muted">{t('Khali = poora bill diya. Kuch na diya ho to "Udhaar" dabayein; baqi supplier ke khate me chala jayega.')}</Text>
            {d.drawerCash > 0 && <Text size="xs" tone="muted">{t('{{amount}} cash galle se niklega', { amount: formatPKR(d.drawerCash) })}</Text>}
            {d.due > 0 && (
              <Card tone="warning">
                <Text size="sm"><Text size="sm" weight="bold" ltr>{formatPKR(d.due)}</Text> {t('supplier ke khate me udhaar jayega.')}</Text>
                <View style={{ marginTop: 8 }}><DatePicker label={t('Kab tak dena hai')} value={toDate(bill.dueDate)} onChange={(x) => setBill({ dueDate: ymd(x) })} /></View>
              </Card>
            )}
          </FormSection>
        )}

        <TextArea label={t('Note')} value={bill.notes} onChangeText={(notes) => setBill({ notes })} maxLength={500} placeholder={t('Note — misaal: 2 carton toote aaye, agle bill me kam karna')} />
        {tried && problems.length > 0 && <Text size="sm" tone="danger">{problems[0]}</Text>}
        {!online && <Card tone="info"><Text size="sm">{t('Internet nahi — purchase phone par save hogi aur internet aane par bhej di jayegi.')}</Text></Card>}
      </View>

      <ProductPicker open={picker} onClose={() => setPicker(false)} keepOpen title={t('Maal scan karein')} pickedIds={new Set(lines.map((l) => l.productId))}
        onPick={(p) => void addPicked(p)} onCreate={(name) => { setPicker(false); setNewProduct({ name }); }}
        onScanMiss={(code) => { setPicker(false); setNewProduct({ barcode: code }); return true; }} />
      {scan && <Scanner title={t('Maal scan karein')} continuous onClose={() => setScan(false)} onCode={onCode} />}
      <QuickProductSheet open={!!newProduct} initialName={newProduct?.name} initialBarcode={newProduct?.barcode} onClose={() => setNewProduct(null)}
        onCreated={(row) => { setNewProduct(null); void addRow(row); }} />
      <QuickSupplierSheet open={newSupplier !== null} initialName={newSupplier ?? ''} onClose={() => setNewSupplier(null)}
        onCreated={(s) => { setNewSupplier(null); setBill({ supplierId: s.id, supplierName: s.name }); void suppliers.refetch(); }} />
      <CustomUnitSheet line={customFor} onClose={() => setCustomFor(null)} onSave={(u) => { if (customFor) d.setUnit(customFor.key, u); setCustomFor(null); }} />
    </FormTemplate>
  );
}

function LineCard({ line: l, d, onCustomUnit }: { line: DraftLine; d: ReturnType<typeof usePurchaseDraft>; onCustomUnit: () => void }) {
  const th = useTheme();
  const { LineBadge } = usePurchaseExtras();
  const [more, setMore] = useState(!!(l.batchNo || l.expiry || l.salePrice || l.expiryTracked));
  const base = l.qty * l.unit.rate;
  const perBase = l.cost / (l.unit.rate || 1);
  const change = l.was > 0 ? ((perBase - l.was) / l.was) * 100 : 0;
  const options = [...l.units.map((u) => ({ value: u.name, label: u.rate !== 1 ? `${u.name} = ${q3(u.rate)} ${l.baseUnit}` : u.name })), { value: '__new', label: t('+ Apna unit (bori, peti…)') }];
  return (
    <Card>
      <View style={{ gap: th.space(2) }}>
        <Row gap={2} align="start">
          <ProductThumb name={l.name} category={l.category} url={l.image} size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <Row gap={1.5} wrap>
              <Text weight="semibold" numberOfLines={2}>{l.variant ? `${l.name} (${l.variant.name})` : l.name}</Text>
              {l.isRaw && <Badge tone="warning">{t('Raw')}</Badge>}
              {LineBadge ? <LineBadge productId={l.productId} /> : null}
            </Row>
            <Text size="xs" tone="muted">
              {t('Stock {{stock}} {{baseUnit}} · pichli cost {{was}}/{{baseUnit}}', { stock: q3(l.stock), baseUnit: l.baseUnit, was: formatPKR(l.was) })}
              {Math.abs(change) >= 1 ? <Text size="xs" weight="semibold" tone={change > 0 ? 'danger' : 'success'}>{` ${change > 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(0)}%`}</Text> : null}
            </Text>
          </View>
          <IconButton icon={X} size="sm" label={t('Hatayein')} onPress={() => d.remove(l.key)} />
        </Row>
        <Select label={t('Unit (kis me khareeda)')} value={l.unit.name} options={options}
          onChange={(v) => { if (v === '__new') { onCustomUnit(); return; } const u = l.units.find((x) => x.name === v); if (u) d.setUnit(l.key, u); }} />
        <Row gap={2}>
          <NumberInput containerStyle={{ flex: 1 }} label={t('Kitne {{name}}', { name: l.unit.name })} value={l.qty || null} onChangeValue={(v) => d.patch(l.key, { qty: Math.max(v ?? 0, 0) })} />
          <MoneyInput containerStyle={{ flex: 1 }} label={t('Ek {{name}} ki qeemat', { name: l.unit.name })} value={l.cost || null} onChangeValue={(v) => d.patch(l.key, { cost: Math.max(v ?? 0, 0) })} />
        </Row>
        {l.unit.rate !== 1 && (
          // Per-piece cost, editable: typing it sets the pack cost (piece x size), so either side can be entered.
          <MoneyInput label={t('Ek {{baseUnit}} ki qeemat', { baseUnit: l.baseUnit })} value={perBase ? Math.round(perBase * 100) / 100 : null}
            hint={t('Ek {{baseUnit}} ki qeemat likhein — {{name}} ki qeemat khud ban jayegi', { baseUnit: l.baseUnit, name: l.unit.name })}
            onChangeValue={(v) => d.patch(l.key, { cost: Math.round(Math.max(v ?? 0, 0) * l.unit.rate * 100) / 100 })} />
        )}
        <Row justify="between" wrap gap={2}>
          <Text size="xs" weight="medium" tone="brand" ltr>{l.unit.rate !== 1 ? `= ${q3(base)} ${l.baseUnit} · ${formatPKR(perBase)}/${l.baseUnit}` : ''}</Text>
          <Text weight="bold" ltr>{formatPKR(l.qty * l.cost)}</Text>
        </Row>
        <Button size="sm" variant="ghost" iconEnd={more ? ChevronUp : ChevronDown} onPress={() => setMore((m) => !m)}>{t('Bechne ka rate, batch, expiry')}</Button>
        {more && (
          <View style={{ gap: th.space(2) }}>
            <MoneyInput label={t('Naya bechne ka rate / {{baseUnit}} (ikhtiyari)', { baseUnit: l.baseUnit })} value={l.salePrice} placeholder={l.price ? String(l.price) : '—'}
              onChangeValue={(v) => d.patch(l.key, { salePrice: v })}
              hint={l.salePrice != null && perBase > 0 ? t('Profit {{value}}%', { value: (((l.salePrice - perBase) / perBase) * 100).toFixed(0) }) : t('Khali chhorein to purana rate rahega')} />
            <Row gap={2} align="start">
              <Input containerStyle={{ flex: 1 }} label={t('Batch #')} value={l.batchNo} onChangeText={(batchNo) => d.patch(l.key, { batchNo })} maxLength={60} placeholder={t('Packet par likha batch')} ltr />
              <View style={{ flex: 1 }}><DatePicker label={t('Expiry')} value={toDate(l.expiry)} onChange={(x) => d.patch(l.key, { expiry: ymd(x) })} hint={t('Dawai, doodh, khane ki cheezon ke liye')} /></View>
            </Row>
          </View>
        )}
      </View>
    </Card>
  );
}

function CustomUnitSheet({ line, onClose, onSave }: { line: DraftLine | null; onClose: () => void; onSave: (u: UnitChoice) => void }) {
  const th = useTheme();
  const [name, setName] = useState('');
  const [rate, setRate] = useState<number | null>(null);
  useEffect(() => { if (line) { setName(''); setRate(null); } }, [line]);
  if (!line) return null;
  const ok = !!name.trim() && (rate ?? 0) > 0;
  const presets: Array<[string, number]> = line.baseUnit.toLowerCase() === 'kg'
    ? [['Bori', 50], ['Bori', 40], ['Bag', 25], ['Thaila', 10]] : [['Peti', 12], ['Carton', 24], ['Dozen', 12], ['Box', 10]];
  return (
    <Sheet open onClose={onClose} title={t('Apna unit')} description={t('Is purchase ke liye — kitne {{baseUnit}} ka ek?', { baseUnit: line.baseUnit })}
      footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={onClose}>{t('Rehne dein')}</Button>
        <Button style={{ flex: 1 }} disabled={!ok} onPress={() => onSave({ id: null, name: name.trim(), rate: rate! })}>{t('Lagayein')}</Button>
      </Row>}>
      <View style={{ gap: th.space(3) }}>
        <Row gap={1.5} wrap>
          {presets.map(([n, r]) => <Chip key={`${n}${r}`} label={`${n} = ${r} ${line.baseUnit}`} onPress={() => { setName(n); setRate(r); }} />)}
        </Row>
        <Row gap={2}>
          <Input containerStyle={{ flex: 1 }} label={t('Unit ka naam')} value={name} onChangeText={setName} maxLength={30} placeholder={t('Bori')} />
          <NumberInput containerStyle={{ flex: 1 }} label={t('Ek me kitne {{baseUnit}}', { baseUnit: line.baseUnit })} value={rate} onChangeValue={setRate} placeholder="50" />
        </Row>
        <Text size="xs" tone="muted">{t('Hamesha ke liye unit banana ho to product ki setting me "Units" se banayein — phir POS par bhi bikega.')}</Text>
      </View>
    </Sheet>
  );
}
