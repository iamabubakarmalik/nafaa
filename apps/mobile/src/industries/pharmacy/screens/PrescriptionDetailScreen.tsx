/**
 * One prescription (web PrescriptionDetailPage): check it, hand the medicines
 * over and take the money, close what will not be given, and refill. Handing
 * over bills a normal sale (cash, card, wallet or udhaar on the patient's
 * khata) from the chosen batch; a same-formula medicine can be given instead
 * of the written one. Needs the server.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ban, ClipboardCheck, Receipt, Repeat, Wallet } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { drName, saltKey } from '@nafaa/core/industries/pharmacy';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { shopParam } from '@/core/auth/shopScope';
import { formatDate, formatDateTime, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useProductSearch } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { PinCancelled, withManagerPin } from '@/core/security/ManagerPin';
import { Amount, Badge, Button, Card, DetailRow, DetailSection, DetailTemplate, ListRow, MoneyInput, PageHero, Row, Select, Sheet, Text, TextArea, confirm, toast, HeroAmount, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { OfflineNote, PaySheet, useDeskOnline } from '../../_shared/deskKit';
import { batchesApi, prescriptionsApi, type Prescription, type PrescriptionItem } from '../api';
import { allFacts, useMedicineFacts } from '../facts';
import { RX_KEY, RX_ONE_KEY, RX_STATUS, refreshPharmacy } from '../meta';

interface Draft { qty: number | null; price: number | null; productId: string; batchId: string }
const left = (it: PrescriptionItem) => Math.max(0, Number((it.prescribedQty - (it.dispensedQty ?? 0)).toFixed(3)));

export function PrescriptionDetailScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const { guard } = useDeskOnline('pharmacyDesk');
  const shopId = shopParam(useAuthStore((s) => s.currentShopId));
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [discount, setDiscount] = useState<number | null>(null);
  const [pay, setPay] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [subFor, setSubFor] = useState<PrescriptionItem | null>(null);

  const q = useQuery({ queryKey: [RX_ONE_KEY, id], queryFn: () => prescriptionsApi.getOne(id), enabled: !!id });
  const rx = q.data;
  const facts = useMedicineFacts();
  const products = useProductSearch({ query: '', limit: 3000 });
  const byId = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, p])), [products.data]);

  const canDispense = !!rx && (rx.status === 'VERIFIED' || rx.status === 'PARTIALLY_DISPENSED');
  const open = rx?.items.filter((i) => left(i) > 0) ?? [];
  const draftOf = (it: PrescriptionItem): Draft => drafts[it.id!] ?? { qty: canDispense ? left(it) : null, price: it.unitPrice ?? byId.get(it.productId ?? '')?.price ?? 0, productId: it.productId ?? '', batchId: '' };
  const setDraft = (it: PrescriptionItem, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [it.id!]: { ...draftOf(it), ...patch } }));
  const productIds = useMemo(() => [...new Set(open.map((i) => draftOf(i).productId).filter(Boolean))], [open, drafts]); // eslint-disable-line react-hooks/exhaustive-deps
  const batchesQ = useQuery({ queryKey: ['rx-batches', shopId, productIds], queryFn: () => batchesApi.list(shopId!, productIds), enabled: canDispense && !!shopId && productIds.length > 0 });
  const batches = batchesQ.data ?? [];

  const subsFor = (it: PrescriptionItem) => {
    const key = it.productId ? saltKey(facts.get(it.productId)?.saltIds ?? []) : '';
    if (!key) return [];
    return allFacts().filter((m) => m.productId !== it.productId && m.saltIds.length && saltKey(m.saltIds) === key)
      .map((m) => byId.get(m.productId)).filter((p): p is NonNullable<typeof p> => !!p && (p.stock ?? 0) > 0);
  };

  const lines = open.map((it) => ({ it, d: draftOf(it) })).filter(({ d }) => (d.qty ?? 0) > 0 && d.productId);
  const subtotal = lines.reduce((s, { d }) => s + (d.qty ?? 0) * (d.price ?? 0), 0);
  const disc = Math.min(discount ?? 0, subtotal);
  const total = Math.round((subtotal - disc) * 100) / 100;

  const refresh = () => { refreshPharmacy([RX_ONE_KEY, RX_KEY, 'rx-batches'], true); void qc.invalidateQueries({ queryKey: ['offline'] }); };
  const fail = (e: unknown) => { if (!(e instanceof PinCancelled)) toast.error(apiErrorMessage(e, t('Nahi hua'))); };

  const verify = useMutation({ mutationFn: () => prescriptionsApi.verify(id), onSuccess: () => { toast.success(t('Nuskha check ho gaya — ab dawai dein')); refresh(); }, onError: fail });
  const reject = useMutation({
    mutationFn: () => prescriptionsApi.reject(id, reason.trim()),
    onSuccess: () => { toast.success(rx?.status === 'PARTIALLY_DISPENSED' ? t('Baqi dawai band kar di') : t('Nuskha radd')); setRejecting(false); refresh(); },
    onError: fail,
  });
  const refill = useMutation({
    mutationFn: () => prescriptionsApi.refill(id),
    onSuccess: (n) => { toast.success(t('Refill {{prescriptionNumber}} ban gaya', { prescriptionNumber: n.prescriptionNumber })); refresh(); router.push(`/pharmacy/prescriptions/${n.id}` as never); },
    onError: fail,
  });
  const dispense = async (p: { paymentMethod: string; paidAmount: number }) => {
    const res = await withManagerPin(t('Discount ya udhaar ke liye malik ka PIN'), (managerPin) => prescriptionsApi.dispense(id, {
      items: lines.map(({ it, d }) => ({
        itemId: it.id!, dispensedQty: d.qty ?? 0, unitPrice: d.price ?? 0,
        ...(d.productId !== it.productId && { productId: d.productId }), ...(d.batchId && { batchId: d.batchId }),
      })),
      paymentMethod: p.paymentMethod, paidAmount: Math.min(p.paidAmount, total), discount: disc || undefined, ...(managerPin && { managerPin }),
    }), 'discount');
    setDrafts({}); setDiscount(null);
    toast.success(t('Dawai de di · bill {{value}}', { value: res.sale?.saleNumber ?? '' }));
    refresh();
  };

  const startPay = () => {
    if (!lines.length) { toast.error(t('Kam az kam ek dawai ki miqdaar likhein')); return; }
    const over = lines.find(({ it, d }) => (d.qty ?? 0) > left(it) + 1e-9);
    if (over) { toast.error(t('{{medicineName}}: sirf {{left}} baqi hai', { medicineName: over.it.medicineName, left: left(over.it) })); return; }
    if (!shopId) { toast.error(t('Upar se shop chunein')); return; }
    setPay(true);
  };

  const reasonOk = reason.trim().length >= 2;
  const st = rx ? RX_STATUS[rx.status] : null;
  const refillLeft = rx ? rx.refillsAllowed - rx.refillsUsed : 0;
  const canWork = can(P.POS_USE);

  const bottom = rx && canWork ? (
    rx.status === 'PENDING' ? <Button fullWidth icon={ClipboardCheck} loading={verify.isPending} onPress={() => guard(() => verify.mutate())}>{t('Check ho gaya')}</Button>
      : canDispense ? <Button fullWidth icon={Wallet} disabled={!lines.length} onPress={() => guard(startPay)}>{t('Dawai dein · {{total}}', { total: formatMoney(total) })}</Button> : undefined
  ) : undefined;

  return (
    <DetailTemplate title={rx?.prescriptionNumber ?? t('Nuskha')} subtitle={rx ? t('Aaya {{createdAt}}', { createdAt: formatDateTime(rx.createdAt) }) : undefined}
      loading={q.isLoading} error={!rx ? q.error : undefined} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching} bottomActions={bottom}
      summary={rx && st ? (
        <PageHero title={rx.patientName || t('Mareez')} chip={rx.type === 'REFILL' ? `${t(st.label)} · Refill` : t(st.label)}
          stats={[{ label: t('Kul'), value: <HeroAmount value={rx.totalAmount} size="2xl" /> }, { label: t('Dawaiyan'), value: <Text weight="bold" size="2xl" ltr>{String(rx.items.length)}</Text> }]} />
      ) : undefined}>
      {rx && (
        <View style={{ gap: th.space(3) }}>
          <OfflineNote feature="pharmacyDesk" />
          {rx.status === 'REJECTED' && rx.rejectionReason ? <Card tone="danger"><Text size="sm">{rx.rejectionReason}</Text></Card> : null}

          <DetailSection title={t('Mareez aur doctor')}>
            <DetailRow label={t('Mareez')} value={[rx.patientName, rx.patientAge ? `${rx.patientAge}` : '', rx.patientGender].filter(Boolean).join(' · ') || '—'} />
            {rx.patientPhone ? <DetailRow label={t('Phone')} value={<Text ltr>{rx.patientPhone}</Text>} /> : null}
            {rx.patientCnic ? <DetailRow label={t('CNIC')} value={<Text ltr>{rx.patientCnic}</Text>} /> : null}
            <DetailRow label={t('Doctor')} value={`${drName(rx.doctorName) || '—'}${rx.doctorRegNumber ? ` (PMDC ${rx.doctorRegNumber})` : ''}`} />
            {rx.diagnosis ? <DetailRow label={t('Bimari')} value={rx.diagnosis} /> : null}
            <DetailRow label={t('Nuskhe ki tareekh')} value={formatDate(rx.prescriptionDate ?? rx.createdAt)} last />
          </DetailSection>

          <Card flush title={t('Dawaiyan')}>
            {rx.items.map((it, i) => {
              const rest = left(it);
              const d = draftOf(it);
              const shelf = d.productId ? batches.filter((b) => b.productId === d.productId) : [];
              const live = canDispense && rest > 0;
              return (
                <View key={it.id ?? i} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: th.colors.divider }}>
                  <ListRow title={it.medicineName}
                    subtitle={[it.strength, it.frequency, it.duration, it.instructions].filter(Boolean).join(' · ') || undefined}
                    trailing={<View style={{ alignItems: 'flex-end' }}><Text weight="bold" ltr>{`${it.dispensedQty ?? 0}/${it.prescribedQty} ${it.unit ?? ''}`}</Text>{it.isSubstituted ? <Badge tone="info">{t('Badli')}</Badge> : null}</View>} />
                  {live && (
                    <View style={{ paddingHorizontal: th.space(4), paddingBottom: th.space(3), gap: th.space(2) }}>
                      {!d.productId ? <Text size="sm" tone="warning">{t('Ye dawai stock se link nahi — dene ke liye stock wali dawai chunein')}</Text> : null}
                      <Row gap={2}>
                        <View style={{ flex: 1 }}><NumberInput label={t('Kitni di')} value={d.qty} onChangeValue={(v) => setDraft(it, { qty: v })} hint={t('{{rest}} baqi', { rest })} /></View>
                        <View style={{ flex: 1 }}><MoneyInput label={t('Rate')} value={d.price} onChangeValue={(v) => setDraft(it, { price: v })} /></View>
                      </Row>
                      {shelf.length > 0 && (
                        <Select label={t('Batch')} value={d.batchId || 'auto'} onChange={(v) => setDraft(it, { batchId: v === 'auto' ? '' : v })}
                          options={[{ value: 'auto', label: t('Jaldi expire hone wala (khud)') }, ...shelf.map((b) => ({ value: b.id, label: `${b.batchNumber} · ${Number(b.quantity.toFixed(2))}`, description: b.expiryDate ? formatDate(b.expiryDate, { year: true }) : undefined }))]} />
                      )}
                      {subsFor(it).length > 0 && <Button size="sm" variant="soft" onPress={() => setSubFor(it)}>{t('Same formula ki doosri dawai')}</Button>}
                    </View>
                  )}
                </View>
              );
            })}
          </Card>

          {canDispense && lines.length > 0 && (
            <Card title={t('Hisaab')}>
              <DetailRow label={t('Subtotal')} value={<Amount value={subtotal} />} />
              <MoneyInput label={t('Discount')} value={discount} onChangeValue={setDiscount} />
              <DetailRow label={t('Kul')} value={<Amount value={total} weight="bold" />} last />
            </Card>
          )}

          {rx.sale ? (
            <Card onPress={() => router.push(`/sales/${rx.sale!.id}` as never)}>
              <Row justify="between"><Row gap={2}><Receipt size={18} color={th.colors.brand.solid} /><Text weight="semibold">{t('Aakhri bill')} {rx.sale.saleNumber}</Text></Row><Amount value={rx.sale.total} weight="bold" /></Row>
            </Card>
          ) : null}

          {canWork && (
            <View style={{ gap: th.space(2) }}>
              {rx.isRefillable && rx.type !== 'REFILL' && refillLeft > 0 && rx.status !== 'REJECTED' && rx.status !== 'PENDING' && (
                <Button variant="secondary" icon={Repeat} loading={refill.isPending} onPress={() => guard(() => refill.mutate())}>{t('Refill ({{refillLeft}} baqi)', { refillLeft })}</Button>
              )}
              {(rx.status === 'PENDING' || rx.status === 'VERIFIED' || rx.status === 'PARTIALLY_DISPENSED') && (
                <Button variant="danger" icon={Ban} onPress={() => { setReason(''); setRejecting(true); }}>{rx.status === 'PARTIALLY_DISPENSED' ? t('Baqi dawai band karein') : t('Nuskha radd karein')}</Button>
              )}
            </View>
          )}
        </View>
      )}

      <PaySheet open={pay} title={t('Dawai ki payment')} name={rx?.patientName ?? ''} due={total} cta={t('Dawai de dein')} allowPart={!!rx?.customerId} onConfirm={dispense} onClose={() => setPay(false)} />
      <Sheet open={rejecting} onClose={() => setRejecting(false)} title={rx?.status === 'PARTIALLY_DISPENSED' ? t('Baqi dawai band karein') : t('Nuskha radd karein')}
        description={rx?.status === 'PARTIALLY_DISPENSED' ? t('Jo dawai de chuke wo bill me rahegi; baqi nahi di jayegi.') : t('Koi dawai nahi di jayegi.')}
        footer={<Button fullWidth variant="danger" loading={reject.isPending} disabled={!reasonOk} onPress={() => guard(() => reject.mutate())}>{t('Radd karein')}</Button>}>
        <TextArea label={t('Wajah')} value={reason} onChangeText={setReason} placeholder={t('Jaise: mareez ke paas pehle se hai, doctor ki likhai saaf nahi')} />
      </Sheet>
      <Sheet open={!!subFor} onClose={() => setSubFor(null)} title={t('Same formula ki dawai')} description={subFor?.medicineName}>
        <Card flush>{(subFor ? subsFor(subFor) : []).map((p, i, a) => (
          <ListRow key={p.id} divider={i < a.length - 1} title={p.name} subtitle={t('{{value}} shelf par', { value: Number((p.stock ?? 0).toFixed(2)) })} trailing={<Amount value={p.price} weight="bold" />}
            onPress={() => { if (subFor) setDraft(subFor, { productId: p.id, price: p.price, batchId: '' }); setSubFor(null); }} />
        ))}</Card>
      </Sheet>
    </DetailTemplate>
  );
}
