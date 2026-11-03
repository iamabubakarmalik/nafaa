/**
 * One job card (web WorkshopJobDetailPage): where the job stands and the next
 * step, the work and parts on it (parts leave stock when added and go back when
 * removed), the money (advances, what is due, the bill once the vehicle is
 * handed back), the vehicle and customer, and the job's history.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, Ban, CheckCircle2, Clock, Hammer, MessageCircle, Package, Pencil, PlayCircle, Printer, Receipt, ShieldCheck, Trash2, Truck, UserRound, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { isReady, jobIsLate, nextJobStep, stepOf, JOB_FLOW } from '@nafaa/core/industries/autoparts';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Badge, Button, Card, DetailRow, DetailSection, DetailTemplate, IconButton, ListRow, ProgressBar, Row, Text, confirm, toast, useTheme } from '@/design';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { MoneySheet, ReasonSheet } from '../../_shared/trade/sheets';
import { sendSlip } from '../../_shared/trade/slip';
import { mechanicsApi, workshopJobsApi, type DeliverInput, type ExternalInput, type JobStatus, type JobUpdateInput, type LaborInput, type PartInput, type PaymentMethod } from '../api';
import { DeliverSheet, EditJobSheet, PartSheet, WorkSheet } from '../components/JobSheets';
import { JOB_KEY, JOB_SIDE, MECHANIC_KEY, REMINDER_KEY, VEHICLE_KEY, conditionOf, dateTime, dayOnly, isClosed, jobTypeOf, km, priorityOf, refreshAuto, statusOf, vehicleName, waLink } from '../meta';
import { jobCard, jobMessage } from '../slip';

type Dialog = null | 'part' | 'labour' | 'outside' | 'edit' | 'pay' | 'deliver' | 'cancel';
const SIDE_LABEL: Record<string, string> = { WAITING_PARTS: 'Parts ka intezar', WAITING_APPROVAL: 'Customer ki haan', ON_HOLD: 'Rok dein' };
const FLOW_LABEL = ['Gaari aayi', 'Kaam', 'Tayyar', 'Di gayi'];

export function WorkshopJobDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const { guard } = useDeskOnline('autopartsDesk');
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Shop';
  const lang = useBillLanguage();
  const canManage = can(P.SERVICE_JOBS_MANAGE);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);

  const q = useQuery({ queryKey: [JOB_KEY, 'one', id], queryFn: () => workshopJobsApi.getOne(id!), enabled: !!id });
  const mech = useQuery({ queryKey: [MECHANIC_KEY], queryFn: () => mechanicsApi.list(), staleTime: 5 * 60_000 });
  const j = q.data;
  const open = !!j && !isClosed(j.status);
  const edit = open && canManage;
  const mechanics = mech.data ?? [];

  /** Runs one change on the job, refreshes and closes the sheet. */
  const act = (fn: () => Promise<unknown>, ok: string, opts: { stock?: boolean; money?: boolean; keep?: boolean } = {}) => guard(async () => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      refreshAuto([JOB_KEY, VEHICLE_KEY], { stock: opts.stock, money: opts.money });
      if (!opts.keep) setDialog(null);
      void q.refetch();
    } catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua — dobara koshish karein'))); } finally { setBusy(false); }
  });
  const setStatus = (s: JobStatus) => act(() => workshopJobsApi.updateStatus(id!, s), t('Halat badal di'));
  const removeLine = async (label: string, run: () => Promise<unknown>, ok: string, stock = false) => {
    if (!(await confirm({ title: t('{{label}} hatayein', { label }), tone: 'danger', confirmLabel: t('Hatayein') }))) return;
    void act(run, ok, { keep: true, stock });
  };
  const deliver = (v: DeliverInput) => guard(async () => {
    setBusy(true);
    try {
      const r = await workshopJobsApi.deliver(id!, v);
      toast.success(r.sale ? t('Gaari de di — bill {{saleNumber}}', { saleNumber: r.sale.saleNumber }) : t('Gaari de di'));
      refreshAuto([JOB_KEY, VEHICLE_KEY, REMINDER_KEY], { money: true });
      setDialog(null);
      void q.refetch();
    } catch (e) { toast.error(apiErrorMessage(e, t('Gaari wapas nahi hui'))); } finally { setBusy(false); }
  });
  const print = () => { if (j) void sendSlip(jobCard(j, lang), shopName, lang).catch(() => toast.error(t('Could not print. Check the printer and try again.'))); };

  const ready = !!j && isReady(j.status);
  const late = !!j && jobIsLate(j);
  const st = j ? statusOf(j.status) : null;
  const wa = j ? waLink(j.customerPhone, jobMessage(j, shopName, lang)) : undefined;
  const step = j ? stepOf(j.status) : 0;
  const nxt = j && edit ? nextJobStep(j.status) : null;
  const nextBtn = nxt && (nxt.step === 'deliver' ? { label: t('Gaari dein'), icon: Receipt, run: () => guard(() => setDialog('deliver')) } : nxt.step === 'finish' ? { label: t('Kaam mukammal'), icon: CheckCircle2, run: () => setStatus('COMPLETED') } : { label: t('Kaam shuru'), icon: PlayCircle, run: () => setStatus('IN_PROGRESS') });

  return (
    <DetailTemplate
      title={j ? j.registrationNumber ?? j.jobNumber : t('Job')}
      subtitle={j ? `${vehicleName(j)} · ${j.jobNumber}` : undefined}
      loading={q.isLoading} error={q.data ? null : q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={j ? <Row gap={1}><IconButton icon={Printer} label={t('Parchi')} onPress={print} />{wa ? <IconButton icon={MessageCircle} label={t('WhatsApp')} onPress={() => void Linking.openURL(wa)} /> : null}{edit ? <IconButton icon={Pencil} label={t('Badlein')} onPress={() => guard(() => setDialog('edit'))} /> : null}</Row> : undefined}
      bottomActions={nextBtn ? <Button fullWidth size="lg" icon={nextBtn.icon} loading={busy} onPress={nextBtn.run}>{nextBtn.label}</Button> : undefined}
    >
      {j && st && (
        <View style={{ gap: th.space(4) }}>
          <OfflineNote feature="autopartsDesk" />
          <Row gap={2} wrap><Badge tone={st.tone}>{t(st.label)}</Badge>{j.priority !== 'NORMAL' ? <Badge tone={priorityOf(j.priority).tone}>{t(priorityOf(j.priority).label)}</Badge> : null}<Text size="xs" tone="muted">{t('{{jobNumber}} · {{jobType}} · aayi {{receivedAt}}', { jobNumber: j.jobNumber, jobType: jobTypeOf(j.jobType), receivedAt: dateTime(j.receivedAt) })}</Text></Row>

          {late && <Card tone="danger"><Row gap={2}><AlertTriangle size={18} color={th.colors.danger.text} /><Text size="sm" weight="medium" style={{ flex: 1 }}>{t('Waada {{promisedAt}} tha — customer ko bata dein', { promisedAt: dateTime(j.promisedAt) })}</Text></Row></Card>}
          {j.status === 'CANCELLED' && <Card tone="default"><Text size="sm">{t('Cancel {{cancelledAt}} — {{cancellationReason}}', { cancelledAt: dayOnly(j.cancelledAt), cancellationReason: j.cancellationReason ?? '—' })}{j.advanceOnKhata > 0 ? t(' · Rs {{advanceOnKhata}} advance customer ke khata me jama hai', { advanceOnKhata: j.advanceOnKhata }) : ''}</Text></Card>}
          {j.status === 'DELIVERED' && j.sale && (
            <Card tone="success"><Row gap={2} justify="between"><Text size="sm" style={{ flex: 1 }}>{t('Gaari {{deliveredAt}} ko di — bill', { deliveredAt: dateTime(j.deliveredAt) })} <Text size="sm" weight="bold">{j.sale.saleNumber}</Text>{j.due > 0 ? <Text size="sm" tone="warning">{` ${t('· {{due}} khata me', { due: formatMoney(j.due) })}`}</Text> : null}</Text>
              <Button size="sm" variant="soft" onPress={() => router.push(`/sales/${j.sale!.id}` as never)}>{t('Bill dekhein →')}</Button></Row></Card>
          )}

          {j.status !== 'CANCELLED' && (
            <Card>
              <View style={{ gap: th.space(3) }}>
                <Row gap={2}>{JOB_FLOW.map((s, i) => <View key={s} style={{ flex: 1, gap: 4 }}><ProgressBar value={i <= step ? 1 : 0} tone={i <= step ? 'brand' : 'neutral'} /><Text size="2xs" weight={i === step ? 'bold' : 'regular'} tone={i === step ? 'brand' : i < step ? 'default' : 'muted'} numberOfLines={1}>{t(FLOW_LABEL[i])}</Text></View>)}</Row>
                {edit && (
                  <Row gap={2} wrap>
                    {JOB_SIDE.map((s) => <Button key={s} size="sm" variant={j.status === s ? 'soft' : 'secondary'} loading={busy} onPress={() => setStatus(j.status === s ? 'IN_PROGRESS' : s)}>{j.status === s ? t('{{label}} — khatam', { label: t(SIDE_LABEL[s]) }) : t(SIDE_LABEL[s])}</Button>)}
                    {ready && <Button size="sm" variant="secondary" icon={Hammer} onPress={() => setStatus('IN_PROGRESS')}>{t('Kaam baqi hai')}</Button>}
                    <Button size="sm" variant="ghost" icon={Ban} onPress={() => guard(() => setDialog('cancel'))}>{t('Cancel')}</Button>
                  </Row>
                )}
              </View>
            </Card>
          )}

          <DetailSection title={t('Kaam')}>
            <DetailRow label={t('Shikayat')} value={j.customerComplaint || '—'} />
            <DetailRow label={t('Check me nikla')} value={j.diagnosis || t('Abhi nahi likha')} />
            <DetailRow label={t('Mechanic')} value={j.mechanicName || t('Koi nahi')} />
            <DetailRow label={t('Gaari kab deni hai')} value={j.promisedAt ? dateTime(j.promisedAt) : '—'} last={!j.recommendations && !j.internalNotes} />
            {j.recommendations ? <DetailRow label={t('Mashwara')} value={j.recommendations} last={!j.internalNotes} /> : null}
            {j.internalNotes ? <DetailRow label={t('Andar ka note')} value={j.internalNotes} last /> : null}
          </DetailSection>

          <Card flush title={t('Bill')} description={open ? t('Stock wala part jorte hi stock se nikalta hai; hatane par wapas shelf par') : undefined}
            action={edit ? <Row gap={1}><IconButton icon={Package} label={t('Part')} variant="soft" onPress={() => guard(() => setDialog('part'))} /><IconButton icon={Hammer} label={t('Mazdoori')} variant="soft" onPress={() => guard(() => setDialog('labour'))} /><IconButton icon={Truck} label={t('Bahar ka kaam')} variant="soft" onPress={() => guard(() => setDialog('outside'))} /></Row> : undefined}>
            {j.laborItems.length + j.partsUsed.length + j.externalWork.length === 0 ? (
              <View style={{ padding: th.space(4), gap: th.space(2), alignItems: 'center' }}><Text size="sm" tone="muted">{t('Abhi koi kaam ya part nahi jora')}</Text>{edit ? <Button size="sm" icon={Package} onPress={() => guard(() => setDialog('part'))}>{t('Pehla part jorein')}</Button> : null}</View>
            ) : (
              <>
                {j.laborItems.map((l) => (
                  <ListRow key={l.id} icon={Hammer} iconTone="info" title={l.description} subtitle={`${t('Mazdoori')}${l.mechanicName ? ` · ${l.mechanicName}` : ''}${l.hours !== 1 ? ` · ${t('{{hours}} ghante', { hours: l.hours })} × ${formatMoney(l.ratePerHour)}` : ''}`}
                    trailing={<Row gap={1}><Text weight="semibold" ltr>{formatMoney(l.total)}</Text>{edit ? <IconButton icon={Trash2} label={t('{{label}} hatayein', { label: l.description })} size="sm" variant="ghost" onPress={() => void removeLine(l.description, () => workshopJobsApi.removeLabor(id!, l.id), t('Mazdoori hata di'))} /> : null}</Row>} />
                ))}
                {j.partsUsed.map((p) => (
                  <ListRow key={p.id} icon={Package} iconTone="warning" title={p.partName}
                    subtitle={[p.partNumber, t(conditionOf(p.condition).label), p.isCustomerSupplied ? t('Customer ka apna') : p.productId ? (p.installedAt ? t('Stock se laga') : t('Dene par stock se niklega')) : t('Bahar se liya'), p.warrantyMonths ? t('{{warrantyMonths}} mahine warranty', { warrantyMonths: p.warrantyMonths }) : null].filter(Boolean).join(' · ') + ` · ${Number(p.quantity)} × ${formatMoney(p.unitPrice)}`}
                    trailing={<Row gap={1}><Text weight="semibold" ltr>{formatMoney(p.total)}</Text>{edit ? <IconButton icon={Trash2} label={t('{{label}} hatayein', { label: p.partName })} size="sm" variant="ghost" onPress={() => void removeLine(p.partName, () => workshopJobsApi.removePart(id!, p.id), t('Part hata diya'), true)} /> : null}</Row>} />
                ))}
                {j.externalWork.map((e) => (
                  <ListRow key={e.id} icon={Truck} iconTone="neutral" title={e.description} subtitle={t('Bahar ka kaam{{value}} · cost {{cost}}', { value: e.vendorName ? ` · ${e.vendorName}` : '', cost: formatMoney(e.cost) })}
                    trailing={<Row gap={1}><Text weight="semibold" ltr>{formatMoney(e.total)}</Text>{edit ? <IconButton icon={Trash2} label={t('{{label}} hatayein', { label: e.description })} size="sm" variant="ghost" onPress={() => void removeLine(e.description, () => workshopJobsApi.removeExternal(id!, e.id), t('Bahar ka kaam hata diya'))} /> : null}</Row>} />
                ))}
              </>
            )}
            <View style={{ padding: th.space(4), gap: 4, borderTopWidth: 0.5, borderColor: th.colors.border }}>
              <Row justify="between"><Text size="sm" tone="secondary">{t('Mazdoori')}</Text><Text size="sm" ltr>{formatMoney(j.laborTotal)}</Text></Row>
              <Row justify="between"><Text size="sm" tone="secondary">{t('Parts')}</Text><Text size="sm" ltr>{formatMoney(j.partsTotal)}</Text></Row>
              {j.externalTotal > 0 ? <Row justify="between"><Text size="sm" tone="secondary">{t('Bahar ka kaam')}</Text><Text size="sm" ltr>{formatMoney(j.externalTotal)}</Text></Row> : null}
              {j.taxAmount > 0 ? <Row justify="between"><Text size="sm" tone="secondary">{t('Tax')}</Text><Text size="sm" ltr>{formatMoney(j.taxAmount)}</Text></Row> : null}
              {j.discount > 0 ? <Row justify="between"><Text size="sm" tone="secondary">{t('Discount')}</Text><Text size="sm" ltr>−{formatMoney(j.discount)}</Text></Row> : null}
              <Row justify="between"><Text weight="bold">{t('Kul bill')}</Text><Text weight="bold" size="lg" ltr>{formatMoney(j.total)}</Text></Row>
            </View>
          </Card>

          <Card flush title={t('Paisa')} action={canManage && j.status !== 'CANCELLED' && (j.due > 0 || (open && j.total <= 0)) ? <Button size="sm" variant="secondary" icon={Wallet} onPress={() => guard(() => setDialog('pay'))}>{j.status === 'DELIVERED' ? t('Wusooli') : t('Advance lein')}</Button> : undefined}>
            <View style={{ padding: th.space(4), gap: 4 }}>
              <Row justify="between"><Text size="sm" tone="secondary">{t('Bill')}</Text><Text size="sm" ltr>{formatMoney(j.total)}</Text></Row>
              <Row justify="between"><Text size="sm" tone="secondary">{t('Mila')}</Text><Text size="sm" ltr>{formatMoney(j.paidAmount)}</Text></Row>
              <Row justify="between"><Text weight="semibold">{t('Baqi')}</Text><Text weight="semibold" tone={j.due > 0 ? 'warning' : 'default'} ltr>{formatMoney(j.due)}</Text></Row>
            </View>
            {j.payments.length > 0 ? j.payments.map((p) => (
              <ListRow key={p.id} title={p.notes || t('Payment')} subtitle={`${dateTime(p.paidAt)} · ${p.paymentMethod}`} trailing={<Text weight="semibold" tone={p.amount < 0 ? 'danger' : 'default'} ltr>{formatMoney(p.amount)}</Text>} />
            )) : <View style={{ paddingHorizontal: th.space(4), paddingBottom: th.space(3) }}><Text size="sm" tone="muted">{t('Abhi koi payment nahi')}</Text></View>}
            {j.advanceOnKhata > 0 && j.status !== 'DELIVERED' ? <View style={{ paddingHorizontal: th.space(4), paddingBottom: th.space(3) }}><Text size="xs" tone="muted">{t('{{advanceOnKhata}} advance khata me jama — bill me katega', { advanceOnKhata: formatMoney(j.advanceOnKhata) })}</Text></View> : null}
            {(j.coreReturns?.length ?? 0) > 0 ? (
              <View style={{ paddingHorizontal: th.space(4), paddingBottom: th.space(3), gap: 2 }}>
                <Text size="xs" weight="semibold" tone="warning">{t('Purane part')}</Text>
                {j.coreReturns!.map((c) => <Text key={c.id} size="xs" tone="warning">{c.description} · {formatMoney(c.value)}{c.saleId ? t(' · bill me laga') : t(' · agle bill me katega')}</Text>)}
              </View>
            ) : null}
          </Card>

          <DetailSection title={t('Gaari aur customer')}>
            <DetailRow label={t('Gaari')} value={<Button size="sm" variant="link" onPress={() => j.vehicle ? router.push(`/autoparts/vehicles/${j.vehicle.id}` as never) : undefined}>{`${j.registrationNumber ?? '—'} ${vehicleName(j)}`}</Button>} />
            <DetailRow label={t('Meter')} value={km(j.odometerKm)} />
            <DetailRow label={t('Customer')} value={<Button size="sm" variant="link" icon={UserRound} onPress={() => j.customer ? router.push(`/customers/${j.customer.id}` as never) : undefined}>{j.customer?.name ?? j.customerName ?? '—'}</Button>} last={!j.customerPhone && !(j.customer && j.customer.balance !== 0)} />
            {j.customerPhone ? <DetailRow label={t('Phone')} value={j.customerPhone} last={!(j.customer && j.customer.balance !== 0)} /> : null}
            {j.customer && j.customer.balance !== 0 ? <DetailRow label={t('Khata')} value={<Text weight="semibold" tone={j.customer.balance > 0 ? 'warning' : 'success'}>{j.customer.balance > 0 ? t('{{balance}} udhaar', { balance: formatMoney(j.customer.balance) }) : t('{{formatPKR}} jama (advance)', { formatPKR: formatMoney(-j.customer.balance) })}</Text>} last /> : null}
            {(j.fuelLevel || j.hasSpareTire || j.hasToolkit || j.externalDamages) ? <DetailRow label={t('Aate waqt')} value={[j.fuelLevel && `${t('Petrol')} ${j.fuelLevel}`, j.hasSpareTire && t('Stepney'), j.hasToolkit && t('Auzaar'), j.externalDamages].filter(Boolean).join(' · ')} last={!(j.warrantyStatus === 'ACTIVE' && j.warrantyExpiry)} /> : null}
            {j.warrantyStatus === 'ACTIVE' && j.warrantyExpiry ? <DetailRow label={t('Warranty')} value={<Row gap={1}><ShieldCheck size={14} color={th.colors.success.text} /><Text size="sm" tone="success">{t('{{warrantyExpiry}} tak', { warrantyExpiry: dayOnly(j.warrantyExpiry) })}</Text></Row>} last /> : null}
          </DetailSection>

          <Card flush title={t('Job ki history')}>
            {j.statusLogs.map((l, i) => (
              <ListRow key={l.id} divider={i < j.statusLogs.length - 1} icon={Clock} title={t(statusOf(l.toStatus).label)} subtitle={l.notes ?? undefined} trailing={<Text size="2xs" tone="muted">{dateTime(l.createdAt)}</Text>} dense />
            ))}
          </Card>

          <PartSheet vehicle={j} open={dialog === 'part'} pending={busy} onClose={() => setDialog(null)} onAdd={(v: PartInput) => void act(() => workshopJobsApi.addPart(id!, v), t('Part jor diya'), { stock: true })} />
          <WorkSheet kind={dialog === 'outside' ? 'outside' : 'labour'} open={dialog === 'labour' || dialog === 'outside'} mechanics={mechanics} defaultMechanicId={j.primaryMechanicId} pending={busy} onClose={() => setDialog(null)}
            onLabour={(v: LaborInput) => void act(() => workshopJobsApi.addLabor(id!, v), t('Mazdoori jor di'))} onOutside={(v: ExternalInput) => void act(() => workshopJobsApi.addExternal(id!, v), t('Bahar ka kaam jor diya'))} />
          <EditJobSheet job={j} open={dialog === 'edit'} mechanics={mechanics} pending={busy} onClose={() => setDialog(null)} onSave={(v: JobUpdateInput) => void act(() => workshopJobsApi.update(id!, v), t('Job save ho gaya'))} />
          <DeliverSheet job={j} open={dialog === 'deliver'} pending={busy} onClose={() => setDialog(null)} onConfirm={deliver} />
          <MoneySheet open={dialog === 'pay'} title={j.status === 'DELIVERED' ? t('Wusooli — {{jobNumber}}', { jobNumber: j.jobNumber }) : t('Advance — {{jobNumber}}', { jobNumber: j.jobNumber })} description={[j.registrationNumber, j.customerName].filter(Boolean).join(' · ')}
            due={j.due > 0 ? j.due : undefined} max={j.total > 0 ? j.due : undefined} busy={busy}
            onSubmit={(v) => void act(() => workshopJobsApi.addPayment(id!, { amount: v.amount, paymentMethod: v.paymentMethod as PaymentMethod }), t('Payment mil gayi'), { money: true })} onClose={() => setDialog(null)} />
          <ReasonSheet open={dialog === 'cancel'} title={t('Job cancel karein — {{jobNumber}}', { jobNumber: j.jobNumber })} message={t('Stock se lage parts wapas shelf par chale jayenge. Advance customer ke khata me jama rahega.')}
            label={t('Wajah')} placeholder={t('Customer ne mana kar diya')} cta={t('Cancel karein')} danger busy={busy} onClose={() => setDialog(null)}
            onSubmit={(r) => void act(() => workshopJobsApi.updateStatus(id!, 'CANCELLED', { cancellationReason: r }), t('Job cancel — stock wale parts wapas shelf par'), { stock: true })} />
        </View>
      )}
    </DetailTemplate>
  );
}
