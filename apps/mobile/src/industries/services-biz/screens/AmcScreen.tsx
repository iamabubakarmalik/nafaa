/** AMC contracts (web AmcPage): yearly service contracts with visits left and what is paid; add, take payment, renew, cancel. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Award, Briefcase, CalendarPlus, CheckCircle2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, DetailRow, ListRow, Row, Sheet, Text, confirm, toast } from '@/design';
import { PaySheet, errorText, shiftKey, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { CustomerField, DeskList, FormSheet, type PickedCustomer } from '../../_shared/serviceKit';
import { servicesApi, type AmcContract, type AmcVisit } from '../api';
import { AMC_STATUS, SB_KEYS, dateOf, refreshServices } from '../meta';

export function AmcScreen() {
  const manage = usePermission()(P.SERVICE_JOBS_MANAGE);
  const { guard } = useDeskOnline('servicesDesk');
  const [form, setForm] = useState(false);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [open, setOpen] = useState<AmcContract | null>(null);
  const [pay, setPay] = useState(false);
  const act = async (fn: () => Promise<unknown>, msgText: string) => { try { await fn(); refreshServices(true); setOpen(null); toast.success(msgText); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } };
  const due = open ? Math.max(open.contractValue - open.amountPaid, 0) : 0;
  return (
    <DeskList<AmcContract[]> title={t('AMC contracts')} queryKey={[SB_KEYS.amc]} fetch={() => servicesApi.amc.list()} feature="servicesDesk" emptyIcon={Award} empty={t('Abhi koi contract nahi')} searchPlaceholder={t('Customer ya contract number')}
      rows={(list) => list.map((a) => ({
        id: a.id, icon: Award, tone: AMC_STATUS[a.status]?.tone ?? 'neutral', search: `${a.customerName} ${a.amcNumber}`, title: a.customerName, subtitle: `${a.amcNumber} · ${dateOf(a.startDate)} – ${dateOf(a.endDate)}`,
        trailing: <View style={{ alignItems: 'flex-end', gap: 2 }}><Badge tone={AMC_STATUS[a.status]?.tone ?? 'neutral'}>{t(AMC_STATUS[a.status]?.label ?? a.status)}</Badge><Text size="2xs" tone="muted">{t('{{n}} visits baqi', { n: a.visitsRemaining })}</Text></View>, onPress: () => setOpen(a),
      }))}
      fab={manage ? { label: t('New contract'), onPress: () => guard(() => { setCustomer(null); setForm(true); }) } : undefined}>
      <Sheet open={!!open && !pay} onClose={() => setOpen(null)} title={open?.customerName} description={open?.amcNumber}
        footer={open && manage ? <Row gap={2}>
          {due > 0 && open.status !== 'CANCELLED' && <Button style={{ flex: 1 }} onPress={() => guard(() => setPay(true))}>{t('Payment lein')}</Button>}
          {['ACTIVE', 'RENEWAL_DUE', 'EXPIRED'].includes(open.status) && <Button style={{ flex: 1 }} variant="secondary" onPress={() => guard(() => void act(() => servicesApi.amc.renew(open.id, {}), t('Renew ho gaya')))}>{t('Renew')}</Button>}
          {open.status === 'ACTIVE' && <Button variant="ghost" onPress={() => guard(() => void confirm({ title: t('Contract cancel karein?'), tone: 'danger', confirmLabel: t('Haan') }).then(async (ok) => { if (ok) await act(() => servicesApi.amc.cancel(open.id, t('Cancel')), t('Cancel ho gaya')); }))}>{t('Cancel')}</Button>}
        </Row> : undefined}>
        {open && <View style={{ gap: 4 }}>
          <DetailRow label={t('Visits')} value={`${open.visitsUsed}/${open.numberOfVisits}`} /><DetailRow label={t('Muddat')} value={`${dateOf(open.startDate)} – ${dateOf(open.endDate)}`} />
          <DetailRow label={t('Pata')} value={open.serviceAddress} /><DetailRow label={t('Contract value')} value={<Text ltr>{formatMoney(open.contractValue)}</Text>} /><DetailRow label={t('Mil gaye')} value={<Text ltr>{formatMoney(open.amountPaid)}</Text>} last />
          {open.status !== 'CANCELLED' && <AmcVisits contract={open} manage={manage} onClose={() => setOpen(null)} />}
        </View>}
      </Sheet>
      <PaySheet open={!!open && pay} onClose={() => setPay(false)} title={t('Contract payment')} name={open?.customerName ?? ''} due={due} advance cta={t('Save')} onConfirm={async (p) => { await servicesApi.amc.pay(open!.id, p.paidAmount, p.paymentMethod); refreshServices(true); setOpen(null); toast.success(t('Payment lag gayi')); }} />
      <FormSheet open={form} title={t('New contract')} onClose={() => setForm(false)} extra={<CustomerField value={customer} onChange={setCustomer} />}
        fields={[{ key: 'numberOfVisits', label: t('Kitni visits'), kind: 'number', required: true }, { key: 'contractValue', label: t('Contract value'), kind: 'money', required: true }, { key: 'amountPaid', label: t('Abhi mile'), kind: 'money' }, { key: 'serviceAddress', label: t('Pata'), required: true }, { key: 'includesParts', label: t('Parts shamil'), kind: 'switch' }, { key: 'includesLabour', label: t('Mazdoori shamil'), kind: 'switch' }]}
        initial={{ numberOfVisits: 4, includesLabour: true }}
        onSubmit={async (v) => { if (!customer) throw new Error(t('Customer chunein')); await servicesApi.amc.create({ customerId: customer.id, numberOfVisits: v.numberOfVisits ?? 1, contractValue: v.contractValue ?? 0, amountPaid: v.amountPaid ?? 0, paymentMode: 'CASH', serviceAddress: v.serviceAddress.trim(), includesParts: !!v.includesParts, includesLabour: v.includesLabour ?? true, startDate: todayKey(), endDate: shiftKey(todayKey(), 365), type: 'STANDARD', autoScheduleVisits: true }); refreshServices(true); toast.success(t('Contract ban gaya')); }} />
    </DeskList>
  );
}

/** Visits of one contract: schedule the next one, make a job from it, or mark it done. */
function AmcVisits({ contract, manage, onClose }: { contract: AmcContract; manage: boolean; onClose: () => void }) {
  const { guard } = useDeskOnline('servicesDesk');
  const [sched, setSched] = useState(false);
  const [done, setDone] = useState<AmcVisit | null>(null);
  const q = useQuery({ queryKey: [SB_KEYS.amc, 'one', contract.id], queryFn: () => servicesApi.amc.getOne(contract.id) });
  const techs = useQuery({ queryKey: [SB_KEYS.techs], queryFn: () => servicesApi.technicians.list(), enabled: sched });
  const visits = q.data?.visits ?? [];
  const reload = () => { refreshServices(); void q.refetch(); };
  const makeJob = async (v: AmcVisit) => {
    try { const job = await servicesApi.amc.visitJob(contract.id, v.id); reload(); toast.success(t('Job ban gayi')); onClose(); router.push({ pathname: '/services-biz/jobs/[id]', params: { id: job.id } } as never); }
    catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };
  return (
    <View style={{ gap: 8, marginTop: 8 }}>
      <Row justify="between"><Text weight="semibold">{t('Visits')}</Text>
        {manage && contract.visitsRemaining > 0 && contract.status !== 'EXPIRED' && <Button size="sm" variant="soft" icon={CalendarPlus} onPress={() => guard(() => setSched(true))}>{t('Visit tay karein')}</Button>}</Row>
      {visits.length === 0 ? <Text size="sm" tone="muted">{t('Koi visit tay nahi')}</Text> : (
        <Card flush>{visits.map((v, i) => (
          <ListRow key={v.id} divider={i < visits.length - 1} title={t('Visit {{n}} — {{date}}', { n: v.visitNumber, date: dateOf(v.scheduledDate) })} subtitle={v.workDone ?? undefined}
            trailing={v.status === 'COMPLETED' ? <Badge tone="success">{t('Ho gayi')}</Badge> : manage ? (
              <Row gap={1}>
                {!v.serviceJobId && <Button size="sm" variant="soft" icon={Briefcase} onPress={() => guard(() => void makeJob(v))}>{t('Job')}</Button>}
                <Button size="sm" variant="ghost" icon={CheckCircle2} onPress={() => guard(() => setDone(v))}>{''}</Button>
              </Row>
            ) : <Badge tone="info">{t('Baqi')}</Badge>} />
        ))}</Card>
      )}
      <FormSheet open={sched} title={t('Visit tay karein')} onClose={() => setSched(false)}
        fields={[{ key: 'scheduledDate', label: t('Kab'), kind: 'date', required: true }, { key: 'technicianId', label: t('Technician'), kind: 'select', options: (techs.data ?? []).map((x) => ({ value: x.id, label: x.staff?.fullName ?? '—' })) }]} initial={{ scheduledDate: shiftKey(todayKey(), 7) }}
        onSubmit={async (v) => { await servicesApi.amc.scheduleVisit(contract.id, { scheduledDate: v.scheduledDate, technicianId: v.technicianId || undefined }); reload(); toast.success(t('Visit tay ho gayi')); }} />
      <FormSheet open={!!done} title={t('Visit mukammal')} onClose={() => setDone(null)} fields={[{ key: 'workDone', label: t('Kya kaam hua'), kind: 'multiline' }]}
        onSubmit={async (v) => { await servicesApi.amc.completeVisit(contract.id, done!.id, { workDone: v.workDone?.trim() || undefined }); reload(); toast.success(t('Visit likh di')); }} />
    </View>
  );
}
