/** One repair job (web RepairCard): details, steps, money; assign, move along, close the job, take payment, cancel, send the warranty claim. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarClock, CheckCircle2, MessageCircle, Printer, Send, ShieldCheck, Wallet, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SERVICE_NEXT, SERVICE_OPEN, jobMoney } from '@nafaa/core/industries/appliances';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, DatePicker, DetailRow, DetailSection, DetailTemplate, IconButton, ListRow, MoneyInput, Row, Sheet, StatusPill, Switch, Text, TextArea, Input, toast, useTheme } from '@/design';
import { sendSlip } from '../../_shared/trade/slip';
import { useBillLanguage } from '@/core/receipt';
import { repairJobDoc } from '../slips';
import { Fact, MethodChips, PayMoneySheet, ReasonSheet, Stars, callPhone, dateToKey, errText, keyToDate, openWhatsApp, slotLabel, useDeskOnline } from '../../_shared/trade/desk';
import { serviceRequestsApi, warrantyClaimsApi, type ServiceRequest, type ServiceStatus } from '../api';
import { AssignSheet } from '../components/kit';
import { KEYS, dateTime, dayOnly, priorityOf, refreshAppliances, serviceStatus, serviceTypeOf } from '../meta';
import { repairDue } from './RepairsScreen';

const refresh = (money = false) => refreshAppliances([KEYS.service, KEYS.tech, KEYS.serial, KEYS.amc, KEYS.claim], money);

export function repairMessage(r: ServiceRequest, shop: string) {
  return [
    t('Assalam o alaikum {{name}},', { name: r.customerName }),
    `${shop}: ${t('aap ke {{product}} ki shikayat {{number}}', { product: r.productName, number: r.requestNumber })}`,
    r.status === 'COMPLETED' ? t('theek ho gayi. Shukriya!') : t('Halat: {{status}}', { status: serviceStatus(r.status).label }),
    r.scheduledDate && r.status !== 'COMPLETED' ? t('Technician {{when}} ko aayega{{who}}.', { when: `${dayOnly(r.scheduledDate)} ${slotLabel(r.scheduledTimeSlot)}`.trim(), who: r.technicianName ? ` (${r.technicianName})` : '' }) : '',
    repairDue(r) > 0 ? t('Baqi: {{amount}}', { amount: formatMoney(repairDue(r)) }) : '',
  ].filter(Boolean).join('\n');
}

type Dialog = 'assign' | 'cancel' | 'pay' | 'complete' | 'unresolved' | null;

export function RepairDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const manage = can(P.SERVICE_JOBS_MANAGE);
  const shop = useAuthStore((s) => s.tenant?.name) ?? '';
  const lang = useBillLanguage();
  const { guard } = useDeskOnline('appliancesDesk');
  const q = useQuery({ queryKey: [KEYS.service, 'one', id], queryFn: () => serviceRequestsApi.getOne(id!), enabled: !!id });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const r = q.data;
  const open = !!r && SERVICE_OPEN.includes(r.status);
  const due = r ? repairDue(r) : 0;
  const st = serviceStatus(r?.status);
  const close = () => setDialog(null);
  const run = (fn: () => Promise<unknown>, ok: string, money = false) => async () => { await fn(); refresh(money); toast.success(ok); void q.refetch(); };
  const quick = (fn: () => Promise<unknown>, ok: string) => () => guard(() => { setBusy(true); void run(fn, ok)().catch((e) => toast.error(errText(e, t('Nahi hua')))).finally(() => setBusy(false)); });

  return (
    <DetailTemplate title={r ? r.requestNumber : t('Shikayat')} subtitle={r ? `${r.customerName} · ${r.customerPhone}` : undefined}
      loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={r ? (
        <>
          <IconButton icon={Printer} label={t('Print slip')} onPress={() => void sendSlip(repairJobDoc(r, lang), shop, lang).catch(() => toast.error(t('Could not print. Check the printer and try again.')))} />
          {!!r.customerPhone && <IconButton icon={MessageCircle} label={t('WhatsApp')} onPress={() => openWhatsApp(r.customerPhone, repairMessage(r, shop))} />}
        </>
      ) : undefined}
      bottomActions={r && manage ? (
        <>
          {due > 0 && r.status !== 'CANCELLED' && <Button variant="secondary" icon={Wallet} style={{ flex: 1 }} onPress={() => setDialog('pay')}>{r.status === 'COMPLETED' ? t('Baqi lein') : t('Advance lein')}</Button>}
          {r.status === 'COMPLETED' && r.coveredUnderWarranty && !r.warrantyClaimNumber && <Button variant="secondary" icon={Send} loading={busy} style={{ flex: 1 }}
            onPress={quick(() => warrantyClaimsApi.fromService(r.id), t('Claim ban gaya — Warranty claims me bhejein'))}>{t('Claim banayein')}</Button>}
          {open && <Button icon={CheckCircle2} style={{ flex: 1 }} onPress={() => setDialog('complete')}>{t('Mukammal')}</Button>}
        </>
      ) : undefined}>
      {r && (
        <View style={{ gap: th.space(3) }}>
          <Row gap={1.5} wrap>
            <StatusPill tone={st.tone}>{st.label}</StatusPill>
            {r.priority !== 'NORMAL' && <Badge tone={priorityOf(r.priority).tone}>{priorityOf(r.priority).label}</Badge>}
            <Badge>{serviceTypeOf(r.serviceType)}</Badge>
            {r.coveredUnderWarranty && <Badge tone="success" icon={ShieldCheck}>{t('Warranty')}</Badge>}
            {r.coveredUnderAmc && <Badge tone="accent">{t('AMC {{amcContractNumber}}', { amcContractNumber: r.amcContractNumber ?? '' })}</Badge>}
            {r.warrantyClaimNumber && <Badge tone="info">{t('Claim {{claimNumber}}', { claimNumber: r.warrantyClaimNumber })}</Badge>}
          </Row>
          <Card tone="warning"><Text size="sm"><Text size="sm" weight="bold">{t('Shikayat:')} </Text>{r.reportedIssue}</Text></Card>
          <Card>
            <View style={{ gap: th.space(2) }}>
              <Fact k={t('Product')} v={r.productName} />
              <Fact k={t('Pata')} v={[r.customerAddress, r.area, r.city].filter(Boolean).join(', ')} />
              <Fact k={t('Serial')} v={r.serialNumber} />
              <Fact k={t('Darj')} v={dateTime(r.requestedAt)} />
              <Fact k={t('Visit')} v={r.scheduledDate ? `${dayOnly(r.scheduledDate)} ${slotLabel(r.scheduledTimeSlot)}`.trim() : t('Abhi tay nahi')} />
              <Fact k={t('Technician')} v={r.technicianName ? `${r.technicianName}${r.technicianPhone ? ` · ${r.technicianPhone}` : ''}` : t('Abhi nahi laga')} />
              <Fact k={t('Asal kharabi')} v={r.diagnosedIssue} />
              <Fact k={t('Kya kiya')} v={r.workDone} />
              <Fact k={t('Mukammal')} v={r.completedAt ? dateTime(r.completedAt) : undefined} />
              <Fact k={t('Follow-up')} v={r.followUpDate ? dayOnly(r.followUpDate) : undefined} />
            </View>
          </Card>
          <DetailSection title={t('Paisa')}>
            <DetailRow label={t('Visit')} value={<Amount value={r.visitCharge} />} />
            <DetailRow label={t('Mazdoori')} value={<Amount value={r.laborCharge} />} />
            <DetailRow label={t('Parts')} value={<Amount value={r.partsCharge} />} />
            <DetailRow label={t('Mila')} value={<Amount value={r.paidAmount} />} />
            <DetailRow label={t('Baqi')} value={<Amount value={due} weight="bold" color={due > 0 ? th.colors.warning.text : undefined} />} last />
          </DetailSection>
          {r.amc && <Card><Text size="sm">{t('AMC {{contractNumber}} — {{left}} visit baqi', { contractNumber: r.amc.contractNumber, left: Math.max(r.amc.freeVisitsAllowed - r.amc.freeVisitsUsed, 0) })}</Text></Card>}
          {manage && open && (
            <View style={{ gap: th.space(2) }}>
              <Row gap={2} wrap>
                {(SERVICE_NEXT[r.status] ?? []).map((s) => (
                  <Button key={s} size="sm" variant="secondary" loading={busy} onPress={() => (s === 'UNRESOLVED' ? setDialog('unresolved') : quick(() => serviceRequestsApi.updateStatus(r.id, { status: s as ServiceStatus }), t('Halat badal gayi'))())}>{serviceStatus(s).label}</Button>
                ))}
              </Row>
              <Row gap={2} wrap>
                <Button size="sm" variant="soft" icon={CalendarClock} onPress={() => setDialog('assign')}>{r.technicianId ? t('Technician / date badlein') : t('Technician lagayein')}</Button>
                <Button size="sm" variant="ghost" icon={XCircle} onPress={() => setDialog('cancel')}>{t('Cancel')}</Button>
              </Row>
            </View>
          )}
          {r.technicianPhone && <Button variant="ghost" onPress={() => callPhone(r.technicianPhone)}>{t('Technician ko call')}</Button>}
          {r.internalNotes ? <Card><Text size="sm" tone="secondary">{r.internalNotes}</Text></Card> : null}
          {r.history?.length > 0 && (
            <DetailSection title={t('Is customer ke pichle kaam')}>
              {r.history.slice(0, 5).map((h, k) => <ListRow key={h.id} dense divider={k < Math.min(r.history.length, 5) - 1} title={`${h.requestNumber} · ${h.productName}`} subtitle={h.reportedIssue} trailing={<Text size="xs" tone="muted">{serviceStatus(h.status).label}</Text>} />)}
            </DetailSection>
          )}
        </View>
      )}
      {r && (
        <>
          <AssignSheet open={dialog === 'assign'} onClose={close} title={t('Technician aur date')} initial={{ technicianId: r.technicianId, date: r.scheduledDate, slot: r.scheduledTimeSlot }}
            onConfirm={(v) => run(() => serviceRequestsApi.assignTechnician(r.id, v), t('Technician lag gaya'))()} />
          <ReasonSheet open={dialog === 'cancel'} onClose={close} title={t('Shikayat cancel karein')} confirm={t('Cancel karein')}
            presets={[t('Customer ne mana kar diya'), t('Customer ne khud theek karwa liya'), t('Galat shikayat')]}
            onConfirm={(reason) => run(() => serviceRequestsApi.cancel(r.id, { reason }), t('Shikayat cancel'))()} />
          <ReasonSheet open={dialog === 'unresolved'} onClose={close} title={t('Theek nahi hua')} confirm={t('Darj karein')}
            presets={[t('Part nahi mil raha'), t('Unit ka nuqsan bara hai'), t('Company ko bhejna hoga')]}
            onConfirm={(reason) => run(() => serviceRequestsApi.updateStatus(r.id, { status: 'UNRESOLVED', notes: reason }), t('Halat badal gayi'))()} />
          <PayMoneySheet open={dialog === 'pay'} onClose={close} title={t('Paisa lein — {{requestNumber}}', { requestNumber: r.requestNumber })} due={due}
            description={r.status === 'COMPLETED' ? t('Bill ka udhaar kam hoga') : t('Advance: kaam ke bill me kat jayega')}
            onConfirm={(v) => run(() => serviceRequestsApi.addPayment(r.id, v), t('Paisa mil gaya'), true)()} />
          <CompleteSheet job={r} open={dialog === 'complete'} onClose={close} />
        </>
      )}
    </DetailTemplate>
  );
}

/** Closing the job: what was wrong, what was done, charges and money taken. Posts the job's bill; a warranty job can go on to a claim. */
function CompleteSheet({ job, open, onClose }: { job: ServiceRequest; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const [diag, setDiag] = useState('');
  const [work, setWork] = useState('');
  const [visit, setVisit] = useState<number | null>(null);
  const [labor, setLabor] = useState<number | null>(null);
  const [parts, setParts] = useState<number | null>(null);
  const [warranty, setWarranty] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [follow, setFollow] = useState('');
  const [rating, setRating] = useState(0);
  const [busy, setBusy] = useState(false);
  const covered = warranty || job.coveredUnderAmc;
  const advance = Number(job.paidAmount) || 0;
  const m = jobMoney({ charges: [visit ?? 0, labor ?? 0, parts ?? 0], covered, advance, now: now ?? 0 });
  useEffect(() => {
    if (!open) return;
    setDiag(job.diagnosedIssue ?? ''); setWork(job.workDone ?? '');
    setVisit(Number(job.visitCharge) || null); setLabor(Number(job.laborCharge) || null); setParts(Number(job.partsCharge) || null);
    setWarranty(job.coveredUnderWarranty); setMethod('CASH'); setFollow(''); setRating(0);
    const total = (Number(job.visitCharge) || 0) + (Number(job.laborCharge) || 0) + (Number(job.partsCharge) || 0);
    setNow(job.coveredUnderWarranty || job.coveredUnderAmc ? null : Math.max(total - advance, 0) || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job.id]);
  useEffect(() => { if (covered) setNow(null); }, [covered]);
  const noWork = work.trim().length < 3;
  const run = async () => {
    setBusy(true);
    try {
      await serviceRequestsApi.complete(job.id, {
        diagnosedIssue: diag.trim() || undefined, workDone: work.trim(), visitCharge: visit ?? 0, laborCharge: labor ?? 0, partsCharge: parts ?? 0, coveredUnderWarranty: warranty,
        paidAmount: m.paid, paymentMethod: method, requiresFollowUp: !!follow, followUpDate: follow || undefined, customerRating: rating || undefined,
      });
      toast.success(t('{{requestNumber}} theek ho gaya — bill ban gaya', { requestNumber: job.requestNumber }));
      refresh(true);
      onClose();
    } catch (e) { toast.error(errText(e, t('Band nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Kaam mukammal — {{requestNumber}}', { requestNumber: job.requestNumber })} description={`${job.productName} · ${job.reportedIssue}`}
      footer={<Button fullWidth size="lg" icon={CheckCircle2} loading={busy} disabled={m.tooMuch || noWork} onPress={() => void run()}>{m.left > 0 ? t('Mukammal — {{left}} khata me', { left: formatMoney(m.left) }) : t('Mukammal karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Asal kharabi')} value={diag} onChangeText={setDiag} placeholder={t('Capacitor jal gaya tha')} />
        <TextArea label={t('Kya kaam kiya')} value={work} onChangeText={setWork} placeholder={t('Capacitor badla, gas check ki')} error={work && noWork ? t('Kaam likhein') : undefined} />
        <MoneyInput label={t('Visit')} value={visit} onChangeValue={setVisit} />
        <MoneyInput label={t('Mazdoori')} value={labor} onChangeValue={setLabor} />
        <MoneyInput label={t('Parts')} value={parts} onChangeValue={setParts} hint={t('Parts ki qeemat')} />
        {!job.coveredUnderAmc && <Switch value={warranty} onChange={setWarranty} label={t('Warranty me')} description={t('Customer se kuch nahi; parts ka kharcha company se claim hoga')} />}
        {job.coveredUnderAmc && <Card tone="info"><Text size="sm">{t('AMC {{amcContractNumber}} me — customer se kuch nahi, ek free visit lagegi', { amcContractNumber: job.amcContractNumber ?? '' })}</Text></Card>}
        <Card>
          <View style={{ gap: 4 }}>
            <DetailRow label={t('Kul kaam')} value={<Amount value={m.total} weight="semibold" />} />
            {advance > 0 && <DetailRow label={t('Pehle mila')} value={<Amount value={advance} />} />}
            <DetailRow label={t('Customer se lena')} value={<Amount value={m.owed} size="lg" weight="bold" />} last />
          </View>
        </Card>
        {!covered && (
          <>
            <MoneyInput label={t('Abhi kitna liya')} value={now} onChangeValue={setNow} error={m.tooMuch ? t('Kul kaam se zyada nahi') : undefined} />
            {(now ?? 0) > 0 && <MethodChips value={method} onChange={setMethod} />}
            {m.left > 0 && <Text size="sm" tone="warning">{t('{{left}} customer ke khata me chala jayega', { left: formatMoney(m.left) })}</Text>}
          </>
        )}
        <DatePicker label={t('Dobara dekhna hai (follow-up)')} value={keyToDate(follow)} minimumDate={new Date()} onChange={(d) => setFollow(dateToKey(d))} hint={t('Khali chhorein agar zaroorat nahi')} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Rating')}</Text>
        <Stars value={rating} onChange={setRating} />
      </View>
    </Sheet>
  );
}
