/**
 * Quotation (estimate) form, new or a revision of an open one (web
 * NewQuotationPage): customer and site, items from the catalog at retail or
 * contractor rate (quantity rates apply by themselves), extra charges,
 * validity and terms. The server prices the lines again on save.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { HardHat, Plus, Store, Tags, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { modeRate, quoteProblems, quoteTotals, rateFor, slipUnit, lineTotal, qty } from '@nafaa/core/industries/hardware';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Badge, Button, Card, ChipGroup, DetailRow, EmptyState, FormSection, FormTemplate, IconButton, Input, MoneyInput, Row, Segmented, Select, Skeleton, Text, TextArea, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { CustomerBox, emptyCustomer, errText, opt, phoneOk, useDeskOnline, type CustomerValue } from '../../_shared/trade/desk';
import { projectsApi, quotationsApi, type QuotationInput } from '../api';
import { factLine, useHardwareFacts, useTiers } from '../components/facts';
import { KEYS, SLIP_OPTIONS, UNIT_LABEL, refreshHardware } from '../meta';

interface Line { key: string; productId?: string; itemName: string; specifications: string; quantity: number | null; unit: string; unitPrice: number | null; retail?: number; wholesale?: number; discount: number | null }
const VALIDITY = [7, 15, 30];
let seq = 0;
const nk = () => `l${++seq}`;

export function QuotationFormScreen() {
  const th = useTheme();
  const params = useLocalSearchParams<{ id?: string; project?: string }>();
  const id = params.id;
  const editing = !!id;
  const { guard } = useDeskOnline('hardwareDesk');
  const tiers = useTiers();
  const facts = useHardwareFacts();
  const existing = useQuery({ queryKey: [KEYS.quotation, id], queryFn: () => quotationsApi.getOne(id!), enabled: editing });
  const projects = useQuery({ queryKey: [KEYS.projects, 'active'], queryFn: () => projectsApi.list({ active: true }).catch(() => []), staleTime: 60_000 });
  const [customer, setCustomer] = useState<CustomerValue>(emptyCustomer);
  const [projectId, setProjectId] = useState(params.project ?? '');
  const [rate, setRate] = useState<'retail' | 'wholesale'>('retail');
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState<number | null>(null);
  const [taxPct, setTaxPct] = useState<number | null>(null);
  const [delivery, setDelivery] = useState<number | null>(null);
  const [labour, setLabour] = useState<number | null>(null);
  const [other, setOther] = useState<number | null>(null);
  const [validity, setValidity] = useState(15);
  const [paymentTerms, setPaymentTerms] = useState('50% advance, baqi delivery par');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [internal, setInternal] = useState('');
  const [pick, setPick] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const mark = <T,>(set: (v: T) => void) => (v: T) => { setDirty(true); set(v); };

  const x = existing.data;
  useEffect(() => {
    if (!x) return;
    setCustomer({ customerId: x.customerId ?? '', name: x.customerName, phone: x.customerPhone ?? '', address: x.customerAddress ?? '' });
    setProjectId(x.projectId ?? '');
    setLines(x.items.map((i) => ({ key: nk(), productId: i.productId, itemName: i.itemName, specifications: i.specifications ?? '', quantity: i.quantity, unit: i.unit || 'PIECE', unitPrice: i.unitPrice, discount: i.discount || null })));
    setDiscount(x.discount || null); setTaxPct(x.taxPct || null); setDelivery(x.deliveryCharges || null); setLabour(x.laborCharges || null); setOther(x.otherCharges || null);
    setValidity(x.validityDays); setPaymentTerms(x.paymentTerms ?? ''); setDeliveryTerms(x.deliveryTerms ?? ''); setNotes(x.customerNotes ?? ''); setInternal(x.internalNotes ?? ''); setDirty(false);
  }, [x]);
  // A site carries its customer.
  const project = projects.data?.find((p) => p.id === projectId);
  useEffect(() => {
    if (!project || editing || customer.name) return;
    setCustomer({ customerId: project.customerId ?? '', name: project.customerName, phone: project.customerPhone ?? '', address: project.siteAddress });
  }, [project, editing, customer.name]);

  const priceFor = (l: Pick<Line, 'productId' | 'retail' | 'wholesale'>, quantity: number, mode = rate) => rateFor(modeRate(l.retail, l.wholesale, mode), l.productId ? tiers.get(l.productId) : undefined, quantity).price;
  const addProduct = (p: { id: string; name: string; unit: string; price: number; wholesalePrice: number | null }) => {
    if (lines.some((l) => l.productId === p.id)) { toast.info(t('{{name}} pehle se list me hai — quantity badlein', { name: p.name })); return; }
    const base = { productId: p.id, retail: p.price, wholesale: Number(p.wholesalePrice) || undefined };
    setDirty(true);
    setLines((prev) => [...prev, { key: nk(), ...base, itemName: p.name, specifications: factLine(facts.get(p.id)) ?? '', quantity: 1, unit: slipUnit(p.unit), unitPrice: priceFor(base, 1), discount: null }]);
  };
  const update = (k: string, patch: Partial<Line>) => { setDirty(true); setLines((prev) => prev.map((l) => {
    if (l.key !== k) return l;
    const next = { ...l, ...patch };
    // Changing the quantity of a catalog item follows its quantity rate, unless the rate was typed by hand.
    if (patch.quantity != null && l.productId && l.unitPrice === priceFor(l, l.quantity ?? 0)) next.unitPrice = priceFor(next, next.quantity ?? 0);
    return next;
  })); };
  const switchRate = (mode: 'retail' | 'wholesale') => {
    setDirty(true); setRate(mode);
    setLines((prev) => prev.map((l) => (l.productId && l.retail != null ? { ...l, unitPrice: priceFor(l, l.quantity ?? 0, mode) } : l)));
  };

  const extras = { discount: discount ?? 0, taxPct: taxPct ?? 0, delivery: delivery ?? 0, labour: labour ?? 0, other: other ?? 0 };
  const calc = lines.map((l) => ({ quantity: l.quantity ?? 0, unitPrice: l.unitPrice ?? 0, discount: l.discount ?? 0, itemName: l.itemName }));
  const totals = useMemo(() => quoteTotals(calc, extras), [calc, extras.discount, extras.taxPct, extras.delivery, extras.labour, extras.other]); // eslint-disable-line react-hooks/exhaustive-deps
  const problems = quoteProblems(customer.name, calc, extras);
  const PROBLEM: Record<string, string> = {
    name: t('Customer ka naam likhein'), items: t('Kam se kam ek item dalein'), itemName: t('Naam likhein'), quantity: t('Quantity 0 se zyada'), rate: t('Rate theek likhein'),
    lineDiscount: t('Discount line se zyada nahi'), charges: t('Koi amount manfi nahi ho sakti'), discount: t('Discount items se zyada hai'),
  };
  const phoneBad = !!customer.phone.trim() && !phoneOk(customer.phone) && !/^[0-9+\-\s]{10,15}$/.test(customer.phone.trim());
  const first = (phoneBad ? t('Phone number theek likhein (03xx-xxxxxxx)') : '') || (problems[0] ? PROBLEM[problems[0]] : '');

  const submit = () => guard(async () => {
    setTouched(true);
    if (first) { toast.error(first); return; }
    setSaving(true);
    try {
      const body: QuotationInput = {
        projectId: projectId || undefined, customerId: customer.customerId || undefined, customerName: customer.name.trim(), customerPhone: opt(customer.phone), customerAddress: opt(customer.address),
        validityDays: validity, discount: totals.disc, taxPct: extras.taxPct, deliveryCharges: extras.delivery, laborCharges: extras.labour, otherCharges: extras.other,
        paymentTerms: opt(paymentTerms), deliveryTerms: opt(deliveryTerms), customerNotes: opt(notes), internalNotes: opt(internal),
        items: lines.map((l) => ({ productId: l.productId, itemName: l.itemName.trim(), specifications: opt(l.specifications), quantity: l.quantity ?? 0, unit: l.unit, unitPrice: l.unitPrice ?? 0, discount: l.discount || undefined })),
      };
      const q = editing ? await quotationsApi.revise(id!, body) : await quotationsApi.create(body);
      setDirty(false);
      refreshHardware([KEYS.quotations, KEYS.quotation, KEYS.quoteSummary]);
      toast.success(editing ? t('{{quotationNumber}} ki nayi revision save ho gayi', { quotationNumber: q.quotationNumber }) : t('Quotation {{quotationNumber}} ban gayi', { quotationNumber: q.quotationNumber }));
      router.replace(`/hardware/quotations/${q.id}` as never);
    } catch (e) { toast.error(errText(e, t('Quotation save nahi hui'))); } finally { setSaving(false); }
  });

  if (editing && existing.isLoading) return <FormTemplate title={t('Nayi quotation')} onSave={() => undefined}><Skeleton height={300} /></FormTemplate>;
  if (editing && x?.status === 'CONVERTED') return <FormTemplate title={x.quotationNumber} onSave={() => undefined} saveDisabled><EmptyState title={t('Is quotation ka bill ban chuka hai')} message={t('Bill ban chuki quotation badli nahi ja sakti. Nayi quotation banayein.')} /></FormTemplate>;
  const e = (v?: string) => (touched ? v : undefined);

  return (
    <FormTemplate title={editing ? t('Revision · {{value}}', { value: x?.quotationNumber ?? '' }) : t('Nayi quotation')} subtitle={t('Estimate jo customer ko diya jata hai — maan le to ek tap me bill')}
      dirty={dirty} saving={saving} onSave={submit} saveLabel={editing ? t('Revision save') : t('Save')}>
      <View style={{ gap: th.space(4) }}>
        <FormSection title={t('Customer aur site')} description={t('Kis ke liye aur kahan ka maal')}>
          <CustomerBox address value={customer} onChange={mark(setCustomer)} error={e(problems.includes('name') ? PROBLEM.name : undefined)} phoneError={e(phoneBad ? t('Phone number theek likhein (03xx-xxxxxxx)') : undefined)} />
          <Select label={t('Site / project')} value={projectId} onChange={mark(setProjectId)} placeholder={t('Koi site nahi')} options={[{ value: '', label: t('Koi site nahi') }, ...(projects.data ?? []).map((p) => ({ value: p.id, label: `${p.name} · ${p.customerName}` }))]} />
        </FormSection>
        <FormSection title={t('Items')} description={t('Rate quotation ke din ka — bill banate waqt yahi rate lagta hai')}>
          <Segmented value={rate} onChange={switchRate} options={[{ value: 'retail', label: t('Retail'), icon: Store }, { value: 'wholesale', label: t('Thekedar'), icon: HardHat }]} />
          {lines.map((l, i) => {
            const tier = l.productId ? rateFor(modeRate(l.retail, l.wholesale, rate), tiers.get(l.productId), l.quantity ?? 0).tier : null;
            return (
              <Card key={l.key} style={{ gap: th.space(2) }}>
                <Row gap={2} style={{ alignItems: 'center' }}>
                  <Text size="xs" tone="muted">{i + 1}</Text>
                  <View style={{ flex: 1 }}><Input value={l.itemName} onChangeText={(v) => update(l.key, { itemName: v })} placeholder={t('Item')} error={e(!l.itemName.trim() ? PROBLEM.itemName : undefined)} /></View>
                  <IconButton icon={Trash2} label={t('Line hatayein')} variant="danger" onPress={() => { setDirty(true); setLines((prev) => prev.filter((z) => z.key !== l.key)); }} />
                </Row>
                <Input value={l.specifications} onChangeText={(v) => update(l.key, { specifications: v })} placeholder={t('Size, shade, brand (marzi)')} />
                {!l.productId && <Text size="xs" tone="warning">{t('Catalog me nahi — bill se pehle product banayein')}</Text>}
                {tier && l.unitPrice === tier.price && <Badge tone="success" icon={Tags}>{t('{{minQuantity}}+ wala rate', { minQuantity: qty(tier.minQuantity) })}</Badge>}
                <Row gap={2}>
                  <View style={{ flex: 1 }}><NumberInput label={t('Quantity')} value={l.quantity} onChangeValue={(v) => update(l.key, { quantity: v })} error={e(!((l.quantity ?? 0) > 0) ? PROBLEM.quantity : undefined)} /></View>
                  <View style={{ flex: 1 }}><Select label={t('Unit')} value={l.unit} onChange={(v) => update(l.key, { unit: v })} options={SLIP_OPTIONS} /></View>
                </Row>
                <Row gap={2}>
                  <View style={{ flex: 1 }}><MoneyInput label={t('Rate')} value={l.unitPrice} onChangeValue={(v) => update(l.key, { unitPrice: v })} /></View>
                  <View style={{ flex: 1 }}><MoneyInput label={t('Discount')} value={l.discount} onChangeValue={(v) => update(l.key, { discount: v })} /></View>
                </Row>
                <DetailRow label={`${qty(l.quantity)} ${UNIT_LABEL(l.unit)}`} value={<Amount value={lineTotal({ quantity: l.quantity ?? 0, unitPrice: l.unitPrice ?? 0, discount: l.discount ?? 0 })} weight="bold" />} last />
              </Card>
            );
          })}
          {touched && problems.includes('items') && <Text size="xs" tone="danger">{PROBLEM.items}</Text>}
          <Row gap={2}>
            <Button style={{ flex: 1 }} variant="soft" icon={Plus} onPress={() => setPick(true)}>{t('Item chunein')}</Button>
            <Button variant="ghost" onPress={() => { setDirty(true); setLines((prev) => [...prev, { key: nk(), itemName: '', specifications: '', quantity: 1, unit: 'PIECE', unitPrice: null, discount: null }]); }}>{t('Catalog ke bagair line')}</Button>
          </Row>
        </FormSection>
        <FormSection title={t('Hisaab')}>
          <MoneyInput label={t('Discount (Rs)')} value={discount} onChangeValue={mark(setDiscount)} />
          <NumberInput label={t('Tax %')} value={taxPct} onChangeValue={(v) => { setDirty(true); setTaxPct(v == null ? null : Math.min(Math.max(v, 0), 100)); }} placeholder="0" />
          <MoneyInput label={t('Delivery / kiraya')} value={delivery} onChangeValue={mark(setDelivery)} />
          <MoneyInput label={t('Mazdoori')} value={labour} onChangeValue={mark(setLabour)} hint={t('Utarai, fitting')} />
          <MoneyInput label={t('Aur kharcha')} value={other} onChangeValue={mark(setOther)} />
          <Card>
            <View style={{ gap: 4 }}>
              <DetailRow label={t('Items')} value={<Amount value={totals.subtotal} />} />
              {totals.disc > 0 && <DetailRow label={t('Discount')} value={<Amount value={-totals.disc} />} />}
              {totals.tax > 0 && <DetailRow label={t('Tax')} value={<Amount value={totals.tax} />} />}
              {totals.charges > 0 && <DetailRow label={t('Kiraya / mazdoori')} value={<Amount value={totals.charges} />} />}
              <DetailRow label={t('Kul')} value={<Amount value={totals.total} size="lg" weight="bold" />} last />
            </View>
          </Card>
          <Text size="sm" weight="semibold" tone="secondary">{t('Kitne din chalegi')}</Text>
          <ChipGroup value={String(validity)} onChange={(v) => { setDirty(true); setValidity(Number(v)); }} options={VALIDITY.map((d) => ({ value: String(d), label: t('{{d}} din', { d }) }))} />
        </FormSection>
        <FormSection title={t('Shartein aur note')} description={t('Quotation par chhapti hain')}>
          <Input label={t('Payment')} value={paymentTerms} onChangeText={mark(setPaymentTerms)} placeholder={t('50% advance, baqi delivery par')} />
          <Input label={t('Delivery')} value={deliveryTerms} onChangeText={mark(setDeliveryTerms)} placeholder={t('3 din me site par')} />
          <TextArea label={t('Customer ke liye note')} value={notes} onChangeText={mark(setNotes)} />
          <TextArea label={t('Andar ka note')} value={internal} onChangeText={mark(setInternal)} hint={t('Sirf dukaan wale dekhte hain')} />
        </FormSection>
        <Text size="xs" tone="muted">{formatMoney(totals.total)}</Text>
      </View>
      <ProductPicker open={pick} onClose={() => setPick(false)} includeRaw={false} variants={false} keepOpen title={t('Item chunein')}
        pickedIds={new Set(lines.map((l) => l.productId).filter((z): z is string => !!z))}
        onPick={(p) => addProduct({ id: p.product.id, name: p.product.name, unit: p.product.unit, price: p.product.price, wholesalePrice: p.product.wholesalePrice })} />
    </FormTemplate>
  );
}
