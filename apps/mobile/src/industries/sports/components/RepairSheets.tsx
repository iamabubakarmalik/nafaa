/** Repair desk sheets (web RepairModals): receive an item, and one job with its next step and the delivery bill. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ban, CheckCircle2, MessageCircle, PackageCheck, PauseCircle, Play, Plus, Printer, Receipt, RotateCcw, Share2, Trash2, Wallet } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { REPAIR_OPEN, heldAdvance, repairBill } from '@nafaa/core/industries/sports';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { withManagerPin } from '@/core/security/ManagerPin';
import { Amount, Button, Card, DatePicker, DetailRow, IconButton, Input, ListRow, MoneyInput, Row, Select, Sheet, SkeletonRows, StatusPill, Text, TextArea, confirm, toast, useTheme } from '@/design';
import { MethodChips, PaySheet, dateToKey, errorText } from '@/industries/_shared/deskKit';
import { openWhatsApp } from '@/modules/customers/lib/contact';
import { NumberInput } from '@/modules/inventory/components/fields';
import { PhotoField } from '@/modules/inventory/components/PhotoField';
import { ProductPicker, type PickedProduct } from '@/modules/inventory/components/ProductPicker';
import { repairServicesApi, type RepairDetail, type RepairPart, type RepairStatus } from '../api';
import { ITEM_TYPES, REPAIR_KEY, REPAIR_STATUS, REPAIR_TYPES, dayFull, refreshSports } from '../meta';
import { repairSlip, sendSlip } from '../slip';

const opt = (s: string) => (s.trim() ? s.trim() : undefined);

export function NewRepairSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const th = useTheme();
  const blank = { customerName: '', customerPhone: '', itemType: ITEM_TYPES[0], itemBrand: '', itemDescription: '', issue: '', repairType: REPAIR_TYPES[0], estimatedCost: null as number | null, advancePaid: null as number | null, estimatedReadyAt: null as Date | null, notes: '', photos: [] as string[] };
  const [f, setF] = useState(blank);
  const [method, setMethod] = useState('CASH');
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setF(blank); setMethod('CASH'); setError(''); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const save = useMutation({
    mutationFn: () => repairServicesApi.create({
      customerName: f.customerName.trim(), customerPhone: f.customerPhone.trim(), itemType: f.itemType, itemBrand: opt(f.itemBrand), itemDescription: f.itemDescription.trim(), issue: f.issue.trim(), repairType: f.repairType,
      estimatedCost: f.estimatedCost ?? 0, advancePaid: f.advancePaid || undefined, paymentMethod: method, estimatedReadyAt: f.estimatedReadyAt ? dateToKey(f.estimatedReadyAt) : undefined, photosBeforeUrls: f.photos, notes: opt(f.notes),
    }),
    onSuccess: (r) => { toast.success(t('Repair {{no}} jama', { no: r.serviceNumber })); refreshSports([REPAIR_KEY], true); onCreated(r.id); },
    onError: (e) => setError(errorText(e, t('Kuch ghalat ho gaya'))),
  });
  const submit = () => {
    if (f.customerName.trim().length < 2) return setError(t('Customer ka naam likhein'));
    if (!/^[0-9+\-\s]{7,16}$/.test(f.customerPhone.trim())) return setError(t('Phone number sahi likhein (03001234567)'));
    if (f.issue.trim().length < 2) return setError(t('Kya kaam karna hai likhein'));
    if ((f.estimatedCost ?? 0) > 0 && (f.advancePaid ?? 0) > (f.estimatedCost ?? 0)) return setError(t('Advance andaze se zyada nahi'));
    setError('');
    save.mutate();
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Nayi repair')} description={t('Saman jama karein, andaza aur advance likhein')} height={0.94}
      footer={<Button fullWidth size="lg" loading={save.isPending} onPress={submit}>{t('Jama karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Customer')} value={f.customerName} onChangeText={(v) => setF({ ...f, customerName: v })} maxLength={80} />
        <Input label={t('Phone')} value={f.customerPhone} onChangeText={(v) => setF({ ...f, customerPhone: v })} keyboardType="phone-pad" ltr placeholder="03001234567" hint={t('Tayyar hone par WhatsApp')} />
        <Select label={t('Kya cheez')} value={f.itemType} onChange={(v) => setF({ ...f, itemType: v })} options={ITEM_TYPES.map((x) => ({ value: x, label: t(x) }))} />
        <Input label={t('Brand')} value={f.itemBrand} onChangeText={(v) => setF({ ...f, itemBrand: v })} maxLength={60} placeholder="CA / Yonex" />
        <Select label={t('Kaam')} value={f.repairType} onChange={(v) => setF({ ...f, repairType: v })} options={REPAIR_TYPES.map((x) => ({ value: x, label: t(x) }))} />
        <DatePicker label={t('Tayyar kab')} value={f.estimatedReadyAt} onChange={(d) => setF({ ...f, estimatedReadyAt: d })} minimumDate={new Date()} hint={t('Customer ko yahi date batayein')} />
        <TextArea label={t('Masla / kya karna hai')} value={f.issue} onChangeText={(v) => setF({ ...f, issue: v })} maxLength={500} placeholder={t('Handle dheela, grip nayi, tape')} />
        <Input label={t('Saman ki haalat')} value={f.itemDescription} onChangeText={(v) => setF({ ...f, itemDescription: v })} maxLength={300} placeholder={t('Toe par crack, sticker phata')} />
        <MoneyInput label={t('Andaza (Rs)')} value={f.estimatedCost} onChangeValue={(v) => setF({ ...f, estimatedCost: v })} hint={t('Deliver par asal charge likhenge')} />
        <MoneyInput label={t('Advance (Rs)')} value={f.advancePaid} onChangeValue={(v) => setF({ ...f, advancePaid: v })} hint={t('Customer ke khate me jama')} />
        {(f.advancePaid ?? 0) > 0 && <><Text size="sm" weight="semibold" tone="secondary">{t('Advance kaise mila')}</Text><MethodChips value={method} onChange={setMethod} /></>}
        <PhotoField value={f.photos.map((url) => ({ url }))} onChange={(v) => setF({ ...f, photos: v.map((x) => x.url) })} max={5} />
        {!!error && <Card tone="danger"><Text size="sm">{error}</Text></Card>}
      </View>
    </Sheet>
  );
}

interface PartRow extends RepairPart { key: string; label: string }

export function RepairJobSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const th = useTheme();
  const can = usePermission();
  const lang = useBillLanguage();
  const shop = useAuthStore((s) => s.tenant?.name) ?? '';
  const q = useQuery({ queryKey: [REPAIR_KEY, 'one', id], queryFn: () => repairServicesApi.getOne(id!), enabled: !!id });
  const r = q.data as RepairDetail | undefined;
  const [mode, setMode] = useState<'complete' | 'deliver' | 'pay' | null>(null);
  const [work, setWork] = useState({ workDone: '', charge: null as number | null });
  const [parts, setParts] = useState<PartRow[]>([]);
  const [picking, setPicking] = useState(false);
  const [paying, setPaying] = useState(false);
  useEffect(() => { if (!id) { setMode(null); setParts([]); setPaying(false); } }, [id]);
  const done = (msg: string) => { toast.success(msg); setMode(null); setPaying(false); refreshSports([REPAIR_KEY], true); };
  const fail = (e: unknown) => toast.error(errorText(e, t('Kuch ghalat ho gaya')));
  const step = useMutation({ mutationFn: (v: { status: RepairStatus; workDone?: string; finalCost?: number }) => repairServicesApi.updateStatus(id!, v), onSuccess: (x) => done(`${x.serviceNumber}: ${t(REPAIR_STATUS[x.status].label)}`), onError: fail });
  const cancel = useMutation({ mutationFn: () => repairServicesApi.cancel(id!), onSuccess: () => done(t('Repair cancel')), onError: fail });
  const refund = useMutation({ mutationFn: () => withManagerPin(t('Advance wapsi'), (pin) => repairServicesApi.refund(id!, pin), 'refund'), onSuccess: () => done(t('Advance cash me wapas')), onError: fail });
  const begin = (m: 'complete' | 'deliver') => { if (!r) return; setWork({ workDone: r.workDone ?? '', charge: r.finalCost || r.estimatedCost || null }); setMode(m); };
  const addPart = (p: PickedProduct) => {
    setPicking(false);
    setParts((ps) => [...ps, { key: `${p.product.id}-${p.variantId ?? ''}-${ps.length}`, productId: p.product.id, variantId: p.variantId ?? undefined, name: p.product.name, label: `${p.product.name}${p.variantName ? ` · ${p.variantName}` : ''}`, quantity: 1, price: p.product.price }]);
  };
  const { partsTotal, bill, due } = repairBill(work.charge ?? 0, parts, r?.advancePaid ?? 0);
  const open = !!r && REPAIR_OPEN.includes(r.status);
  const held = r ? heldAdvance(r.advancePaid, r.refunded) : 0;
  const value = r ? r.finalCost || r.estimatedCost : 0;
  const askCancel = async () => {
    if (!r) return;
    const ok = await confirm({ title: t('{{no}} cancel karein?', { no: r.serviceNumber }), message: r.advancePaid > 0 ? t('{{advance}} advance customer ke khate me rahega — chahein to baad me cash wapas karein.', { advance: formatMoney(r.advancePaid) }) : t('Saman wapas dein. Kuch delete nahi hota.'), confirmLabel: t('Repair cancel karein'), tone: 'danger' });
    if (ok) cancel.mutate();
  };
  const slip = (share: boolean) => { if (r) void sendSlip(repairSlip(r, lang), shop, lang, share).catch(fail); };

  return (
    <>
      <Sheet open={!!id} onClose={onClose} title={r ? `${r.serviceNumber} · ${t(r.itemType)}${r.itemBrand ? ` ${r.itemBrand}` : ''}` : t('Repair')} description={r ? `${r.customerName} · ${r.customerPhone}` : undefined} height={0.92}
        footer={r && open && !mode ? (
          <View style={{ gap: th.space(2) }}>
            <Row gap={2}>
              {r.status === 'RECEIVED' && <Button style={{ flex: 1 }} variant="secondary" icon={Play} loading={step.isPending} onPress={() => step.mutate({ status: 'IN_PROGRESS' })}>{t('Kaam shuru')}</Button>}
              {r.status === 'IN_PROGRESS' && <Button style={{ flex: 1 }} variant="secondary" icon={PauseCircle} loading={step.isPending} onPress={() => step.mutate({ status: 'ON_HOLD' })}>{t('Rokein')}</Button>}
              {r.status === 'ON_HOLD' && <Button style={{ flex: 1 }} variant="secondary" icon={Play} loading={step.isPending} onPress={() => step.mutate({ status: 'IN_PROGRESS' })}>{t('Dobara shuru')}</Button>}
              {r.status !== 'COMPLETED' && <Button style={{ flex: 1 }} variant="secondary" icon={CheckCircle2} onPress={() => begin('complete')}>{t('Tayyar')}</Button>}
            </Row>
            <Button fullWidth size="lg" icon={PackageCheck} onPress={() => begin('deliver')}>{t('Deliver + bill')}</Button>
          </View>
        ) : undefined}>
        {!r ? <SkeletonRows count={4} /> : (
          <View style={{ gap: th.space(3) }}>
            <Row gap={2}>
              <StatusPill tone={REPAIR_STATUS[r.status].tone}>{t(REPAIR_STATUS[r.status].label)}</StatusPill>
              <Text size="xs" tone="muted">{t('Jama {{date}}', { date: dayFull(r.receivedAt) })} · {t('Tayyar {{value}}', { value: r.estimatedReadyAt ? dayFull(r.estimatedReadyAt) : t('tay nahi') })}</Text>
            </Row>
            <Card flush>
              <DetailRow label={t('Kaam')} value={r.repairType ? t(r.repairType) : '—'} />
              <DetailRow label={t('Masla')} value={r.issue} />
              {!!r.itemDescription && <DetailRow label={t('Haalat')} value={r.itemDescription} />}
              {!!r.workDone && <DetailRow label={t('Kya kiya')} value={r.workDone} />}
              {(r.partsUsed ?? []).length > 0 && <DetailRow label={t('Parts')} value={r.partsUsed!.map((p) => `${p.name ?? t('Part')} ×${p.quantity}`).join(', ')} />}
              <DetailRow label={r.finalCost ? t('Charge') : t('Andaza')} value={<Amount value={value} weight="bold" />} />
              <DetailRow label={t('Advance')} value={<Amount value={r.advancePaid} tone="success" />} />
              {r.refunded > 0 && <DetailRow label={t('Wapas diya')} value={<Amount value={r.refunded} tone="danger" />} />}
              {open && <DetailRow last label={t('Baqi')} value={<Amount value={Math.max(value - r.advancePaid, 0)} weight="bold" />} />}
            </Card>
            {!!r.notes && <Text size="sm" tone="secondary">{r.notes}</Text>}

            {(mode === 'complete' || mode === 'deliver') && (
              <Card title={mode === 'complete' ? t('Kaam mukammal') : t('Deliver aur bill')}>
                <View style={{ gap: th.space(3) }}>
                  <Input label={t('Kya kiya')} value={work.workDone} onChangeText={(v) => setWork({ ...work, workDone: v })} placeholder={t('Nayi grip, handle bind')} />
                  <MoneyInput label={t('Kaam ka charge (Rs)')} value={work.charge} onChangeValue={(v) => setWork({ ...work, charge: v })} hint={mode === 'deliver' ? t('Parts neeche alag') : t('Customer ko yahi batayein')} />
                  {mode === 'deliver' && (
                    <>
                      <Button variant="soft" icon={Plus} onPress={() => setPicking(true)}>{t('Stock se part (string, grip)')}</Button>
                      {parts.map((p) => (
                        <Row key={p.key} gap={2} align="start">
                          <Text size="sm" weight="medium" style={{ flex: 1, paddingTop: th.space(3) }} numberOfLines={2}>{p.label}</Text>
                          <View style={{ width: 64 }}><NumberInput label={t('Ginti')} value={p.quantity} onChangeValue={(v) => setParts((ps) => ps.map((x) => (x.key === p.key ? { ...x, quantity: v ?? 0 } : x)))} /></View>
                          <View style={{ width: 96 }}><MoneyInput label={t('Rate')} value={p.price} onChangeValue={(v) => setParts((ps) => ps.map((x) => (x.key === p.key ? { ...x, price: v ?? 0 } : x)))} /></View>
                          <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => setParts((ps) => ps.filter((x) => x.key !== p.key))} />
                        </Row>
                      ))}
                      <Card flush>
                        <DetailRow label={t('Kaam')} value={<Amount value={work.charge ?? 0} />} />
                        {partsTotal > 0 && <DetailRow label={t('Parts')} value={<Amount value={partsTotal} />} />}
                        <DetailRow label={t('Advance')} value={<Amount value={-r.advancePaid} />} />
                        <DetailRow last label={t('Ab lena hai')} value={<Amount value={due} weight="bold" />} />
                      </Card>
                      {bill < r.advancePaid - 0.01 && <Text size="sm" tone="danger">{t('Bill advance ({{advance}}) se kam nahi ho sakta', { advance: formatMoney(r.advancePaid) })}</Text>}
                    </>
                  )}
                  <Row gap={2}>
                    <Button style={{ flex: 1 }} variant="ghost" onPress={() => setMode(null)}>{t('Wapas')}</Button>
                    {mode === 'complete'
                      ? <Button style={{ flex: 1 }} loading={step.isPending} onPress={() => step.mutate({ status: 'COMPLETED', workDone: opt(work.workDone), finalCost: work.charge ?? 0 })}>{t('Tayyar karein')}</Button>
                      : <Button style={{ flex: 1 }} disabled={bill < r.advancePaid - 0.01} onPress={() => setPaying(true)}>{t('Payment aur bill')}</Button>}
                  </Row>
                </View>
              </Card>
            )}

            {!mode && (
              <View>
                <ListRow icon={Printer} title={t('Parchi')} onPress={() => slip(false)} />
                <ListRow icon={Share2} title={t('Parchi share karein')} onPress={() => slip(true)} />
                <ListRow icon={MessageCircle} title={t('WhatsApp')} onPress={() => openWhatsApp(r.customerPhone, t('{{name}}, aap ka {{item}} ({{no}}) {{status}}.{{cost}}', { name: r.customerName, item: t(r.itemType), no: r.serviceNumber, status: r.status === 'COMPLETED' ? t('tayyar hai — le jayein') : `${t('ka haal')}: ${t(REPAIR_STATUS[r.status].label)}`, cost: value ? ` ${t('Charge')} ${formatMoney(value)}, ${t('advance')} ${formatMoney(r.advancePaid)}.` : '' }))} />
                {open && <ListRow icon={Wallet} title={t('Advance lein')} onPress={() => { setMode('pay'); setPaying(true); }} />}
                {r.sale && <ListRow icon={Receipt} title={t('Bill {{no}}', { no: r.sale.saleNumber })} chevron onPress={() => { onClose(); router.push(`/pos/receipt/${r.sale!.id}` as never); }} />}
                {open && <ListRow icon={Ban} destructive title={t('Cancel')} onPress={() => void askCancel()} />}
                {r.status === 'CANCELLED' && held > 0 && can(P.RETURNS_CREATE) && <ListRow icon={RotateCcw} destructive title={t('Advance wapas ({{held}})', { held: formatMoney(held) })} onPress={() => refund.mutate()} />}
              </View>
            )}
          </View>
        )}
      </Sheet>
      <ProductPicker open={picking} onClose={() => setPicking(false)} onPick={addPart} title={t('Stock se part (string, grip)')} includeRaw={false} />
      <PaySheet open={paying && mode === 'deliver'} title={t('Deliver aur bill')} name={r?.customerName ?? ''} due={due} cta={t('Deliver karein')} onClose={() => setPaying(false)}
        onConfirm={async (p) => {
          await repairServicesApi.updateStatus(id!, { status: 'DELIVERED', workDone: opt(work.workDone), finalCost: work.charge ?? 0, partsUsed: parts.map(({ productId, variantId, name, quantity, price }) => ({ productId, variantId, name, quantity, price })), paidNow: p.paidAmount, paymentMethod: p.paymentMethod });
          done(t('Deliver — bill ban gaya'));
        }} />
      <PaySheet open={paying && mode === 'pay'} title={t('Advance lein')} name={r?.customerName ?? ''} due={value ? Math.max(value - (r?.advancePaid ?? 0), 0) : 0} cta={t('Advance jama karein')} onClose={() => { setPaying(false); setMode(null); }}
        onConfirm={async (p) => { await repairServicesApi.recordPayment(id!, p.paidAmount, p.paymentMethod); done(t('Advance khate me jama')); }} />
    </>
  );
}
