/**
 * One job (web JobDetailPage): the next step, who does it (with suggestions by
 * skill and distance), parts, advance, and the bill (invoice) once the work is
 * done. Billing posts a normal sale and closes the job.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Banknote, FileText, Plus, RotateCcw, Star, UserCog, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { canBill, isClosed, jobDue, nextStep } from '@nafaa/core/industries/services-biz';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, DetailRow, DetailSection, DetailTemplate, HeroAmount, ListRow, PageHero, Row, Sheet, Text, confirm, toast } from '@/design';
import { PaySheet, errorText, useDeskOnline } from '../../_shared/deskKit';
import { FormSheet, clean } from '../../_shared/serviceKit';
import { DocActions, L, type PackDoc } from '../../_shared/docKit';
import { todayKey } from '../../_shared/deskKit';
import { servicesApi, type JobDetail } from '../api';
import { LOCATIONS, SB_KEYS, dateOf, jobStatus, labelOf, refreshServices } from '../meta';

export function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const manage = can(P.SERVICE_JOBS_MANAGE);
  const { guard } = useDeskOnline('servicesDesk');
  const q = useQuery({ queryKey: [SB_KEYS.jobs, 'one', id], queryFn: () => servicesApi.jobs.getOne(id!), enabled: !!id });
  const j = q.data;
  const [sub, setSub] = useState<'assign' | 'part' | 'advance' | 'bill' | 'rate' | 'return' | null>(null);
  const [stars, setStars] = useState(5);
  const [done, setDone] = useState<{ saleNumber: string; change: number } | null>(null);
  const suggest = useQuery({ queryKey: [SB_KEYS.techs, 'suggest', id], queryFn: () => servicesApi.dispatch.suggest(id!), enabled: sub === 'assign' });
  const reload = () => { refreshServices(true); void q.refetch(); };
  const step = j ? nextStep(j.status) : null;
  const closed = !!j && isClosed(j.status);
  const due = j ? (j.due ?? jobDue(j, j.returned)) : 0;
  const move = async (status: string) => { try { await servicesApi.jobs.status(id!, status); reload(); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } };
  const cancel = async () => { if (await confirm({ title: t('Job cancel karein?'), tone: 'danger', confirmLabel: t('Haan, cancel') })) { try { await servicesApi.jobs.cancel(id!, t('Cancel')); reload(); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } } };
  const open = (s: NonNullable<typeof sub>) => guard(() => setSub(s));
  const removePart = async (pid: string) => { try { await servicesApi.jobs.removePart(id!, pid); reload(); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } };
  return (
    <>
      <DetailTemplate actions={j ? <DocActions phone={j.customerPhone} build={(lang) => jobCard(j, lang)} /> : undefined} title={j?.serviceName ?? t('Job')} subtitle={j ? `${j.jobNumber}${j.customerName ? ` · ${j.customerName}` : ''}` : undefined} loading={q.isLoading} error={j ? null : q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
        summary={j && <PageHero title={t(jobStatus(j.status).label)} chip={j.priority !== 'NORMAL' ? j.priority : undefined} stats={[{ label: t('Total'), value: <HeroAmount value={j.totalCharge} size="2xl" /> }, { label: t('Baqi'), value: <HeroAmount value={j.billSale ? j.due : due} size="2xl" /> }]} />}
        bottomActions={j && manage && !closed ? (
          <>
            {step && <Button style={{ flex: 1 }} onPress={() => guard(() => void move(step.status))}>{t(step.label)}</Button>}
            {canBill(j.status) && can(P.POS_USE) && <Button style={{ flex: 1 }} variant="success" icon={FileText} onPress={() => open('bill')}>{t('Invoice')}</Button>}
          </>
        ) : undefined}>
        {j && (
          <>
            <DetailSection title={t('Kaam')}>
              <DetailRow label={t('Masla')} value={j.problemDescription} />
              {j.brand ? <DetailRow label={t('Brand / model')} value={`${j.brand} ${j.modelNumber ?? ''}`} /> : null}
              <DetailRow label={t('Kahan')} value={labelOf(LOCATIONS, j.locationType)} />
              {j.serviceAddress ? <DetailRow label={t('Pata')} value={j.serviceAddress} /> : null}
              {j.scheduledStart ? <DetailRow label={t('Waqt')} value={dateOf(j.scheduledStart)} /> : null}
              <DetailRow label={t('Technician')} value={j.technician?.staff.fullName ?? t('Koi nahi laga')} last />
            </DetailSection>
            <DetailSection title={t('Charges')}>
              {j.visitCharge > 0 && <DetailRow label={t('Visit')} value={<Text ltr>{formatMoney(j.visitCharge)}</Text>} />}
              {j.labourCharge > 0 && <DetailRow label={t('Mazdoori')} value={<Text ltr>{formatMoney(j.labourCharge)}</Text>} />}
              {j.partsCharge > 0 && <DetailRow label={t('Parts')} value={<Text ltr>{formatMoney(j.partsCharge)}</Text>} />}
              {j.transportCharge + j.emergencyCharge > 0 && <DetailRow label={t('Aur')} value={<Text ltr>{formatMoney(j.transportCharge + j.emergencyCharge)}</Text>} />}
              {j.discountAmount > 0 && <DetailRow label={t('Discount')} value={<Text ltr>−{formatMoney(j.discountAmount)}</Text>} />}
              <DetailRow label={t('Total')} value={<Text weight="bold" ltr>{formatMoney(j.totalCharge)}</Text>} />
              <DetailRow label={t('Advance mila')} value={<Text ltr>{formatMoney(j.paidAmount)}</Text>} last={!j.billSale} />
              {j.billSale && <DetailRow label={t('Invoice')} value={<Text ltr>{j.billSale.saleNumber}</Text>} last />}
            </DetailSection>
            <Card title={t('Parts')} flush>
              {j.parts.length === 0 && <View style={{ padding: 16 }}><Text size="sm" tone="muted">{t('Abhi koi part nahi')}</Text></View>}
              {j.parts.map((p, i) => (
                <ListRow key={p.id} divider={i < j.parts.length - 1} title={p.partName} subtitle={`${p.quantity} × ${formatMoney(p.unitPrice)}${p.isCustomerSupplied ? ` · ${t('Customer ka')}` : ''}${p.isUnderWarranty ? ` · ${t('Warranty')}` : ''}`}
                  trailing={<Row gap={2}><Text size="sm" ltr>{formatMoney(p.total)}</Text>{manage && !closed && <Button size="sm" variant="ghost" onPress={() => guard(() => void removePart(p.id))}>{t('Hataein')}</Button>}</Row>} />
              ))}
            </Card>
            {manage && !closed && (
              <Row gap={2} style={{ flexWrap: 'wrap' }}>
                <Button size="sm" variant="soft" icon={UserCog} onPress={() => open('assign')}>{t('Technician lagayein')}</Button>
                <Button size="sm" variant="soft" icon={Plus} onPress={() => open('part')}>{t('Part jorein')}</Button>
                {can(P.POS_USE) && <Button size="sm" variant="soft" icon={Banknote} onPress={() => open('advance')}>{t('Advance lein')}</Button>}
                <Button size="sm" variant="ghost" icon={XCircle} onPress={() => guard(() => void cancel())}>{t('Cancel')}</Button>
              </Row>
            )}
            {j.status === 'COMPLETED' && manage && (
              <Card title={t('Kaam ke baad')}>
                <View style={{ gap: 8 }}>
                  <Button variant="secondary" icon={Star} onPress={() => { setStars(j.customerRating ?? 5); open('rate'); }}>{j.customerRating ? t('Rating {{r}}/5 — badlein', { r: j.customerRating }) : t('Customer ki rating')}</Button>
                  <Button variant="secondary" icon={RotateCcw} onPress={() => open('return')}>{t('Wapsi visit (muft)')}</Button>
                </View>
              </Card>
            )}
            {j.statusHistory.length > 0 && (
              <Card title={t('History')} flush>
                {j.statusHistory.slice(-6).reverse().map((h, i, arr) => <ListRow key={h.id} divider={i < arr.length - 1} dense title={t(jobStatus(h.toStatus).label)} subtitle={dateOf(h.changedAt)} />)}
              </Card>
            )}
          </>
        )}
      </DetailTemplate>
      {j && (
        <>
          <Sheet open={sub === 'assign'} onClose={() => setSub(null)} title={t('Technician lagayein')} description={t('Skill aur doori ke hisaab se')} height={0.7}>
            {(suggest.data ?? []).map((s) => (
              <ListRow key={s.id} divider title={s.staff?.fullName ?? '—'} subtitle={`${s.primarySkill ?? ''}${s.distanceKm != null ? ` · ${s.distanceKm.toFixed(1)} km` : ''} · ${t('{{n}} khuli jobs', { n: s.openJobs ?? 0 })}`} trailing={<Badge tone={s.matchScore >= 70 ? 'success' : 'neutral'}>{`${Math.round(s.matchScore)}%`}</Badge>}
                onPress={() => { void servicesApi.jobs.assign(j.id, s.staffId).then(() => { reload(); setSub(null); toast.success(t('Technician laga diya')); }).catch((e) => toast.error(errorText(e, t('Nahi hua')))); }} />
            ))}
            {suggest.isLoading && <Text tone="muted">{t('Dhoondh rahe hain…')}</Text>}
          </Sheet>
          <FormSheet open={sub === 'part'} title={t('Part jorein')} onClose={() => setSub(null)}
            fields={[{ key: 'partName', label: t('Part ka naam'), required: true }, { key: 'quantity', label: t('Miqdaar'), kind: 'number' }, { key: 'unitPrice', label: t('Qeemat'), kind: 'money' }, { key: 'isCustomerSupplied', label: t('Customer ne khud diya'), kind: 'switch' }, { key: 'isUnderWarranty', label: t('Warranty me'), kind: 'switch' }]} initial={{ quantity: 1 }}
            onSubmit={async (v) => { await servicesApi.jobs.addPart(j.id, clean({ partName: v.partName.trim(), quantity: v.quantity ?? 1, unitPrice: v.unitPrice ?? 0, isCustomerSupplied: !!v.isCustomerSupplied, isUnderWarranty: !!v.isUnderWarranty }) as any); reload(); toast.success(t('Part jur gaya')); }} />
          <FormSheet open={sub === 'rate'} title={t('Customer ki rating')} description={t('Technician ki rating me jurti hai')} onClose={() => setSub(null)}
            extra={<Row gap={2} justify="center">{[1, 2, 3, 4, 5].map((r) => <Button key={r} variant={r <= stars ? 'primary' : 'secondary'} icon={Star} onPress={() => setStars(r)}>{String(r)}</Button>)}</Row>}
            fields={[{ key: 'feedback', label: t('Customer ne kya kaha'), hint: t('Marzi hai') }]}
            onSubmit={async (v) => { await servicesApi.jobs.rate(j.id, clean({ rating: stars, feedback: v.feedback?.trim() }) as { rating: number; feedback?: string }); reload(); toast.success(t('Rating save ho gayi')); }} />
          <FormSheet open={sub === 'return'} title={t('Wapsi visit (muft)')} description={t('Kaam theek na ho to dobara muft visit')} onClose={() => setSub(null)}
            fields={[{ key: 'returnVisitDate', label: t('Kab'), kind: 'date', required: true }, { key: 'reason', label: t('Wajah'), required: true }]} initial={{ returnVisitDate: todayKey() }}
            onSubmit={async (v) => { await servicesApi.jobs.returnVisit(j.id, { returnVisitDate: v.returnVisitDate, reason: v.reason.trim() }); reload(); toast.success(t('Wapsi visit likh di')); }} />
          <PaySheet open={sub === 'advance'} onClose={() => setSub(null)} title={t('Advance lein')} name={j.customerName ?? ''} due={Math.max(j.totalCharge - j.paidAmount, 0) || j.totalCharge} advance cta={t('Save')}
            onConfirm={async (p) => { await servicesApi.jobs.addPayment(j.id, p.paidAmount, p.paymentMethod); reload(); toast.success(t('Advance lag gaya')); }} />
          <PaySheet open={sub === 'bill'} onClose={() => setSub(null)} title={t('Invoice banayein')} name={j.customerName ?? ''} due={due} allowPart={!!j.customerId} cta={t('Invoice banayein')}
            onConfirm={async (p) => { const r = await servicesApi.jobs.bill(j.id, { paidAmount: p.paidAmount, paymentMethod: p.paymentMethod }); reload(); setDone({ saleNumber: r.sale?.saleNumber ?? '', change: r.change }); }} />
        </>
      )}
      <Sheet open={!!done} onClose={() => setDone(null)} title={t('Invoice ban gaya')} description={done?.saleNumber} footer={<Button fullWidth onPress={() => { setDone(null); router.back(); }}>{t('Theek hai')}</Button>}>
        {done && done.change > 0 && <Row justify="between"><Text tone="muted">{t('Change wapas')}</Text><Amount value={done.change} /></Row>}
      </Sheet>
    </>
  );
}

const jobCard = (j: JobDetail, lang: Parameters<typeof L>[0]): PackDoc => ({
  fileName: `job-${j.jobNumber}`,
  title: j.status === 'COMPLETED' ? L(lang, 'Work completed', 'کام مکمل', 'Kaam mukammal') : L(lang, 'Job card', 'جاب کارڈ', 'Job card'),
  subtitle: j.jobNumber,
  meta: [[L(lang, 'Customer', 'کسٹمر', 'Customer'), j.customerName ?? '—'], [L(lang, 'Phone', 'فون', 'Phone'), j.customerPhone ?? '—'], [L(lang, 'Job', 'کام', 'Kaam'), j.serviceName],
    [L(lang, 'Status', 'حالت', 'Halat'), t(jobStatus(j.status).label)], ...(j.technician ? [[L(lang, 'Technician', 'ٹیکنیشن', 'Technician'), j.technician.staff.fullName] as [string, string]] : []),
    ...(j.scheduledStart ? [[L(lang, 'Visit', 'وزٹ', 'Visit'), dateOf(j.scheduledStart)] as [string, string]] : []), ...(j.serviceAddress ? [[L(lang, 'Address', 'پتہ', 'Pata'), j.serviceAddress] as [string, string]] : [])],
  tables: [{ columns: [L(lang, 'Item', 'آئٹم', 'Item'), L(lang, 'Qty', 'تعداد', 'Qty'), L(lang, 'Amount', 'رقم', 'Amount')], rows: [
    ...(j.visitCharge > 0 ? [[L(lang, 'Visit charge', 'وزٹ چارج', 'Visit charge'), 1, formatMoney(j.visitCharge)]] : []), ...(j.labourCharge > 0 ? [[L(lang, 'Labour', 'مزدوری', 'Mazdoori'), 1, formatMoney(j.labourCharge)]] : []),
    ...j.parts.map((p) => [p.partName, p.quantity, formatMoney(p.isUnderWarranty ? 0 : p.total)])] }],
  rows: [[L(lang, 'Total', 'کل', 'Total'), formatMoney(j.totalCharge), 'strong'], [L(lang, 'Advance paid', 'ایڈوانس', 'Advance'), formatMoney(j.paidAmount)], [L(lang, 'Balance', 'باقی', 'Baqi'), formatMoney(Math.max(j.totalCharge - j.paidAmount, 0)), 'strong']],
  notes: j.jobWarrantyDays > 0 ? [`${L(lang, 'Warranty', 'وارنٹی', 'Warranty')}: ${j.jobWarrantyDays} ${L(lang, 'days', 'دن', 'din')}`] : undefined,
});
