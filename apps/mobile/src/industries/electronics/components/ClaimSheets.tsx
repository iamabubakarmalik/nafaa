/** Warranty claim sheets (web NewClaimModal, ResolveClaimModal, brand contact): open a claim, close it with an outcome, note the brand's reply. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Search } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, Card, ChipGroup, DatePicker, Input, ListRow, MoneyInput, Row, Sheet, Text, TextArea, toast, useTheme } from '@/design';
import { CustomerBox, ProductField, emptyCustomer, useShopId, type CustomerValue } from '../../mobile/components/kit';
import { dateToKey, keyToDate, todayKey } from '../../_shared/deskKit';
import { serialTrackingApi, warrantyClaimsApi, type ClaimRow, type ResolutionType, type WarrantyCheck } from '../api';
import { CLAIM_KEYS, ISSUE_CHIPS, OUTCOME, RESOLUTIONS, SERIAL_KEYS, opt, refreshElectronics } from '../meta';

const PAY = [{ value: 'CASH', label: 'Cash' }, { value: 'JAZZCASH', label: 'JazzCash' }, { value: 'EASYPAISA', label: 'Easypaisa' }, { value: 'BANK_TRANSFER', label: 'Bank' }, { value: 'CARD', label: 'Card' }];

export function NewClaimSheet({ open, initialCode, onClose, onCreated }: { open: boolean; initialCode?: string; onClose: () => void; onCreated?: (c: { id: string; claimNumber: string }) => void }) {
  const th = useTheme();
  const [code, setCode] = useState('');
  const [hit, setHit] = useState<WarrantyCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [product, setProduct] = useState<{ id: string; name: string } | null>(null);
  const [productName, setProductName] = useState('');
  const [cust, setCust] = useState<CustomerValue>(emptyCustomer);
  const [purchaseDate, setPurchaseDate] = useState(todayKey());
  const [invoice, setInvoice] = useState('');
  const [serialText, setSerialText] = useState('');
  const [category, setCategory] = useState('');
  const [issue, setIssue] = useState('');
  const [notes, setNotes] = useState('');
  const lookup = async (c = code) => {
    const v = c.trim();
    if (!v) return;
    setBusy(true);
    try {
      const r = await serialTrackingApi.warrantyCheck(v);
      setHit(r);
      if (r.found && r.serial) {
        setSerialText(r.serial.serialNumber); setProductName(r.serial.product?.name ?? '');
        if (r.serial.soldAt) setPurchaseDate(r.serial.soldAt.slice(0, 10));
        setInvoice(r.serial.invoiceNumber ?? '');
        if (r.serial.customer) setCust({ customerId: r.serial.customer.id, name: r.serial.customer.name, phone: r.serial.customer.phone ?? '' });
      } else setSerialText(v);
    } catch (e) { toast.error(apiErrorMessage(e, t('Serial check nahi hua'))); } finally { setBusy(false); }
  };
  useEffect(() => {
    if (!open) return;
    setCode(initialCode ?? ''); setHit(null); setProduct(null); setProductName(''); setCust(emptyCustomer); setPurchaseDate(todayKey()); setInvoice(''); setSerialText(''); setCategory(''); setIssue(''); setNotes('');
    if (initialCode) void lookup(initialCode);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const own = hit?.found && hit.serial ? hit.serial : null;
  const name = own ? productName : product?.name ?? productName;
  const problem = !name.trim() ? t('Product chunein ya naam likhein') : !cust.name.trim() ? t('Customer ka naam likhein') : !issue.trim() && !category ? t('Kharabi likhein') : !purchaseDate ? t('Khareed ki date likhein') : null;
  const save = useMutation({
    mutationFn: () => warrantyClaimsApi.create({
      ...(own ? { serialTrackingId: own.id } : { productId: product?.id, serialNumber: serialText.trim() || undefined }), productName: name.trim(),
      customerId: cust.customerId || own?.customer?.id || undefined, customerName: cust.name.trim(), customerPhone: opt(cust.phone), purchaseDate, invoiceNumber: opt(invoice),
      issueCategory: category || undefined, issueDescription: (issue.trim() || category).trim(), internalNotes: opt(notes),
    }),
    onSuccess: (c) => { toast.success(t('Claim {{claimNumber}} khul gaya', { claimNumber: c.claimNumber })); refreshElectronics([...CLAIM_KEYS, ...SERIAL_KEYS, 'electronics-claims']); onClose(); onCreated?.(c); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Claim nahi khula'))),
  });
  const w = hit?.warranty;
  return (
    <Sheet open={open} onClose={onClose} height={0.94} title={t('Naya warranty claim')} description={t('Serial ya IMEI se dhoondein — warranty khud check hogi')}
      footer={<View style={{ gap: 4 }}><Text size="xs" tone="muted">{problem ?? t('Save ke baad customer ki parchi print kar sakte hain')}</Text><Button fullWidth size="lg" loading={save.isPending} disabled={!!problem} onPress={() => save.mutate()}>{t('Claim kholein')}</Button></View>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Serial / IMEI')} value={code} onChangeText={setCode} ltr returnKeyType="search" onSubmitEditing={() => void lookup()} trailing={<Button size="sm" variant="soft" icon={Search} loading={busy} disabled={!code.trim()} onPress={() => void lookup()}>{t('Dhoondein')}</Button>} />
        {hit && (hit.found && hit.serial ? (
          <Card tone={w?.isValid ? 'success' : 'warning'}>
            <Text weight="semibold">{hit.serial.product?.name}</Text>
            <Text size="sm">{w?.isValid ? t('Warranty chal rahi — {{daysRemaining}} din baqi', { daysRemaining: w.daysRemaining }) : w?.endDate ? t('Warranty {{endDate}} ko khatam ho gayi', { endDate: formatDate(w.endDate) }) : t('Is unit par warranty nahi')}</Text>
          </Card>
        ) : <Card tone="warning"><Text size="sm">{t('Ye serial hamare record mein nahi — neeche khud likhein.')}</Text></Card>)}
        {own ? <Input label={t('Product')} value={productName} onChangeText={setProductName} hint={t('Serial {{serialNumber}}', { serialNumber: own.serialNumber })} />
          : <><ProductField label={t('Product')} value={product} onChange={(p) => { setProduct({ id: p.product.id, name: p.product.name }); setProductName(p.product.name); }} /><Input label={t('Product naam')} value={productName} onChangeText={setProductName} /><Input label={t('Serial / IMEI')} value={serialText} onChangeText={setSerialText} ltr hint={t('Marzi hai — dabbe ya unit se')} /></>}
        <DatePicker label={t('Khareed ki date')} value={keyToDate(purchaseDate)} onChange={(d) => setPurchaseDate(dateToKey(d))} maximumDate={new Date()} hint={t('Bill ki date — warranty isi se gini jati hai')} />
        <Input label={t('Bill number')} value={invoice} onChangeText={setInvoice} placeholder={t('NF-…')} ltr hint={t('Marzi hai')} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Customer')}</Text>
        <CustomerBox value={cust} onChange={setCust} nameLabel={t('Naam')} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Kharabi')}</Text>
        <ChipGroup wrap value={category} onChange={setCategory} options={ISSUE_CHIPS.map((c) => ({ value: c, label: t(c) }))} />
        <TextArea label={t('Kharabi ki tafseel')} value={issue} onChangeText={setIssue} />
        <TextArea label={t('Andar ka note')} value={notes} onChangeText={setNotes} placeholder={t('Dabba, charger saath hai ya nahi')} hint={t('Customer ko nahi dikhta')} />
      </View>
    </Sheet>
  );
}

export function ResolveClaimSheet({ claim, underWarranty, onClose }: { claim: ClaimRow | null; underWarranty: boolean; onClose: () => void }) {
  const th = useTheme();
  const shopId = useShopId();
  const canReplace = usePermission()(P.STOCK_ADJUSTMENTS_MANAGE);
  const [type, setType] = useState<ResolutionType>('REPAIRED');
  const [charge, setCharge] = useState<number | null>(null);
  const [paidNow, setPaidNow] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [repairCost, setRepairCost] = useState<number | null>(null);
  const [brand, setBrand] = useState<number | null>(null);
  const [fromDrawer, setFromDrawer] = useState(false);
  const [replacement, setReplacement] = useState('');
  const [text, setText] = useState('');
  useEffect(() => { if (claim) { setType('REPAIRED'); setCharge(null); setPaidNow(null); setMethod('CASH'); setRepairCost(null); setBrand(null); setFromDrawer(false); setReplacement(''); setText(''); } }, [claim?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const units = useQuery({ queryKey: ['electronics-serials', 'replacement', claim?.productId, shopId], queryFn: () => serialTrackingApi.list({ productId: claim!.productId!, status: 'IN_STOCK', shopId: shopId ?? undefined }), enabled: !!claim && type === 'REPLACED' && !!claim.productId });
  const fee = type === 'REJECTED' ? 0 : charge ?? 0;
  const now = paidNow == null ? fee : Math.min(paidNow, fee);
  const problem = useMemo(() => {
    if (!claim) return null;
    if (type === 'REPLACED' && !canReplace) return t('Naya unit dene ke liye Stock adjustment ki permission chahiye');
    if (type === 'REPLACED' && !claim.productId) return t('Is claim ka product record mein nahi — replacement yahan se nahi ho sakta');
    if (type === 'REPLACED' && units.data && units.data.length > 0 && !replacement) return t('Naya unit chunein');
    if (now > fee) return t('Mila hua charge se zyada hai');
    if (fee - now > 0.5 && !claim.customerId && !claim.customerName) return t('Udhaar ke liye customer chahiye');
    return null;
  }, [type, canReplace, claim, units.data, replacement, now, fee]);
  const save = useMutation({
    mutationFn: () => warrantyClaimsApi.resolve(claim!.id, {
      resolutionType: type, ...(type === 'REPLACED' && replacement && { replacementSerialId: replacement }),
      ...(type !== 'REJECTED' && type !== 'REFUNDED' && { paidByCustomer: fee, paidNow: now, paymentMethod: method, repairCost: repairCost ?? 0, paidByBrand: brand ?? 0, costFromDrawer: fromDrawer }), resolution: opt(text),
    }),
    onSuccess: () => { toast.success(t('{{claimNumber}} band ho gaya — {{label}}', { claimNumber: claim!.claimNumber, label: t(OUTCOME[type].label) })); refreshElectronics([...CLAIM_KEYS, ...SERIAL_KEYS, 'electronics-claims'], true); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Claim band nahi hua'))),
  });
  return (
    <Sheet open={!!claim} onClose={onClose} height={0.94} title={claim ? t('Claim {{claimNumber}} — hal karein', { claimNumber: claim.claimNumber }) : undefined} description={claim ? `${claim.productName} · ${claim.customerName}` : undefined}
      footer={<View style={{ gap: 4 }}><Text size="xs" tone={problem ? 'warning' : 'muted'}>{problem ?? (fee > 0 ? t('Bill {{claimNumber}}: {{fee}}', { claimNumber: claim?.claimNumber ?? '', fee: formatMoney(fee) }) + (fee - now > 0.5 ? ` · ${t('udhaar {{n}}', { n: formatMoney(fee - now) })}` : '') : t('Koi charge nahi'))}</Text>
        <Button fullWidth size="lg" icon={CheckCircle2} variant="success" loading={save.isPending} disabled={!!problem} onPress={() => save.mutate()}>{t('Band karein')}</Button></View>}>
      <View style={{ gap: th.space(3) }}>
        {!underWarranty && <Card tone="warning"><Text size="sm">{t('Warranty khatam ya record mein nahi — charge lagana theek hoga.')}</Text></Card>}
        <ChipGroup wrap value={type} onChange={setType} options={RESOLUTIONS.map((r) => ({ value: r, label: t(OUTCOME[r].label) }))} />
        <Text size="xs" tone="muted">{t(OUTCOME[type].hint)}</Text>
        {type === 'REPLACED' && (
          <>
            <Text size="sm" weight="semibold" tone="secondary">{t('Naya unit (stock se)')}</Text>
            {(units.data ?? []).length === 0 ? <Text size="sm" tone="muted">{units.isLoading ? '…' : t('Stock mein is product ka koi unit nahi')}</Text> : (units.data ?? []).map((u) => <ListRow key={u.id} dense selected={replacement === u.id} title={<Text ltr weight="semibold">{u.serialNumber}</Text>} subtitle={u.imei ?? undefined} onPress={() => setReplacement(u.id)} />)}
          </>
        )}
        {type !== 'REJECTED' && type !== 'REFUNDED' && (
          <>
            <MoneyInput label={t('Customer se charge')} value={charge} onChangeValue={setCharge} hint={t('Warranty mein ho to 0')} />
            {fee > 0 && <><MoneyInput label={t('Abhi mile')} value={paidNow ?? fee} onChangeValue={setPaidNow} /><ChipGroup wrap value={method} onChange={setMethod} options={PAY.map((m) => ({ value: m.value, label: t(m.label) }))} /></>}
            <Row gap={2}>
              <MoneyInput containerStyle={{ flex: 1 }} label={t('Repair kharcha (dukaan ka)')} value={repairCost} onChangeValue={setRepairCost} />
              <MoneyInput containerStyle={{ flex: 1 }} label={t('Company ne diya')} value={brand} onChangeValue={setBrand} />
            </Row>
            {(repairCost ?? 0) > 0 && <ChipGroup value={fromDrawer ? 'y' : 'n'} onChange={(v) => setFromDrawer(v === 'y')} options={[{ value: 'n', label: t('Galle se nahi diya') }, { value: 'y', label: t('Galle se diya') }]} />}
          </>
        )}
        <TextArea label={t('Natija ki tafseel')} value={text} onChangeText={setText} />
      </View>
    </Sheet>
  );
}

export function BrandSheet({ claim, onClose }: { claim: ClaimRow | null; onClose: () => void }) {
  const th = useTheme();
  const [ref, setRef] = useState('');
  const [reply, setReply] = useState('');
  useEffect(() => { if (claim) { setRef(claim.brandRef ?? ''); setReply(claim.brandResponse ?? ''); } }, [claim?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = useMutation({
    mutationFn: () => warrantyClaimsApi.contactBrand(claim!.id, { brandRef: ref.trim(), brandResponse: opt(reply) }),
    onSuccess: () => { toast.success(t('Company ka record save ho gaya')); refreshElectronics([...CLAIM_KEYS, 'electronics-claims']); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });
  return (
    <Sheet open={!!claim} onClose={onClose} title={t('Company ke paas bheja')} description={claim ? `${claim.claimNumber} · ${claim.productName}` : undefined}
      footer={<Button fullWidth size="lg" loading={save.isPending} disabled={!ref.trim()} onPress={() => save.mutate()}>{t('Save karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Company ka reference')} value={ref} onChangeText={setRef} ltr placeholder="RMA-…" />
        <TextArea label={t('Company ka jawab')} value={reply} onChangeText={setReply} hint={t('Marzi hai')} />
      </View>
    </Sheet>
  );
}
