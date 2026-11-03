/** One installation job (web InstallationCard): details, money, and every action: assign, start, complete, reschedule, fail, cancel, take payment. */

import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { CalendarClock, CheckCircle2, MessageCircle, Play, Printer, ShieldCheck, Wallet, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { INSTALL_OPEN, jobMoney } from '@nafaa/core/industries/appliances';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, DatePicker, DetailRow, DetailSection, DetailTemplate, IconButton, ListRow, MoneyInput, Row, Sheet, StatusPill, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { Fact, MethodChips, PayMoneySheet, ReasonSheet, Stars, callPhone, dateToKey, errText, keyToDate, openWhatsApp, slotLabel, todayKey, useDeskOnline } from '../../_shared/trade/desk';
import { installationsApi, type Installation } from '../api';
import { installationJobDoc } from '../slips';
import { sendSlip } from '../../_shared/trade/slip';
import { useBillLanguage } from '@/core/receipt';

import { AssignSheet } from '../components/kit';
import { KEYS, dateTime, dayOnly, installStatus, refreshAppliances, serviceTypeOf } from '../meta';
import { installDue } from './InstallationsScreen';

const refresh = (money = false) => refreshAppliances([KEYS.install, KEYS.tech, KEYS.serial], money);

export function installMessage(i: Installation, shop: string) {
  return [
    t('Assalam o alaikum {{name}},', { name: i.customerName }),
    `${shop}: ${t('aap ke {{product}} ki {{kind}} ({{number}})', { product: i.productName, kind: serviceTypeOf(i.serviceType).toLowerCase(), number: i.installationNumber })}`,
    i.status === 'COMPLETED' ? t('mukammal ho gayi. Shukriya!') : i.scheduledDate ? t('{{when}} ko hogi.', { when: `${dayOnly(i.scheduledDate)} ${slotLabel(i.scheduledTimeSlot)}`.trim() }) : t('ki date jald batayi jayegi.'),
    i.technicianName && i.status !== 'COMPLETED' ? t('Technician: {{name}}', { name: `${i.technicianName}${i.technicianPhone ? ` (${i.technicianPhone})` : ''}` }) : '',
    installDue(i) > 0 ? t('Baqi: {{amount}}', { amount: formatMoney(installDue(i)) }) : '',
  ].filter(Boolean).join('\n');
}

type Dialog = 'assign' | 'reschedule' | 'cancel' | 'fail' | 'pay' | 'complete' | null;

export function InstallationDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const manage = can(P.SERVICE_JOBS_MANAGE);
  const shop = useAuthStore((s) => s.tenant?.name) ?? '';
  const lang = useBillLanguage();
  const { guard } = useDeskOnline('appliancesDesk');
  const q = useQuery({ queryKey: [KEYS.install, 'one', id], queryFn: () => installationsApi.getOne(id!), enabled: !!id });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [newDate, setNewDate] = useState(todayKey());
  const i = q.data;
  const open = !!i && INSTALL_OPEN.includes(i.status);
  const due = i ? installDue(i) : 0;
  const st = installStatus(i?.status);
  const run = (fn: () => Promise<unknown>, ok: string, money = false) => async () => { await fn(); refresh(money); toast.success(ok); void q.refetch(); };

  return (
    <DetailTemplate title={i ? i.installationNumber : t('Installation')} subtitle={i ? `${serviceTypeOf(i.serviceType)} · ${i.customerName}` : undefined}
      loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={i ? (
        <>
          <IconButton icon={Printer} label={t('Print slip')} onPress={() => void sendSlip(installationJobDoc(i, lang), shop, lang).catch(() => toast.error(t('Could not print. Check the printer and try again.')))} />
          {!!i.customerPhone && <IconButton icon={MessageCircle} label={t('WhatsApp')} onPress={() => openWhatsApp(i.customerPhone, installMessage(i, shop))} />}
        </>
      ) : undefined}
      bottomActions={i && manage ? (
        <>
          {due > 0 && !['CANCELLED', 'FAILED'].includes(i.status) && <Button variant="secondary" icon={Wallet} style={{ flex: 1 }} onPress={() => setDialog('pay')}>{i.status === 'COMPLETED' ? t('Baqi lein') : t('Advance lein')}</Button>}
          {open && i.status !== 'IN_PROGRESS' && <Button variant="secondary" icon={Play} style={{ flex: 1 }} onPress={() => guard(() => void run(() => installationsApi.updateStatus(i.id, { status: 'IN_PROGRESS' }), t('Halat badal gayi'))())}>{t('Shuru')}</Button>}
          {open && <Button icon={CheckCircle2} style={{ flex: 1 }} onPress={() => setDialog('complete')}>{t('Mukammal')}</Button>}
        </>
      ) : undefined}>
      {i && (
        <View style={{ gap: th.space(3) }}>
          <Row gap={1.5} wrap>
            <StatusPill tone={st.tone}>{st.label}</StatusPill>
            {i.isOverdue && <Badge tone="danger">{t('Date guzar gayi')}</Badge>}
            {i.covered_underWarranty && <Badge tone="success" icon={ShieldCheck}>{t('Free (warranty)')}</Badge>}
          </Row>
          <Card>
            <View style={{ gap: th.space(2) }}>
              <Fact k={t('Product')} v={i.productName} />
              <Fact k={t('Customer')} v={`${i.customerName} · ${i.customerPhone}`} />
              <Fact k={t('Pata')} v={[i.customerAddress, i.area, i.city].filter(Boolean).join(', ')} />
              <Fact k={t('Serial')} v={i.serialNumber} />
              <Fact k={t('Date')} v={i.scheduledDate ? `${dayOnly(i.scheduledDate)} ${slotLabel(i.scheduledTimeSlot)}`.trim() : t('Abhi tay nahi')} />
              <Fact k={t('Technician')} v={i.technicianName ? `${i.technicianName}${i.technicianPhone ? ` · ${i.technicianPhone}` : ''}` : t('Abhi nahi laga')} />
              <Fact k={t('Mukammal')} v={i.completedAt ? dateTime(i.completedAt) : undefined} />
              <Fact k={t('Wajah')} v={i.cancellationReason} />
              <Fact k={t('Warranty')} v={i.serial?.warrantyEndDate ? t('{{date}} tak', { date: dayOnly(i.serial.warrantyEndDate) }) : undefined} />
              <Fact k={t('Rating')} v={i.customerRating ? `${i.customerRating} / 5${i.customerFeedback ? ` — ${i.customerFeedback}` : ''}` : undefined} />
            </View>
          </Card>
          <DetailSection title={t('Paisa')}>
            <DetailRow label={t('Mazdoori')} value={<Amount value={i.laborCharge} />} />
            <DetailRow label={t('Visit')} value={<Amount value={i.visitCharge} />} />
            <DetailRow label={t('Saman')} value={<Amount value={i.materialsCharge} />} />
            <DetailRow label={t('Mila')} value={<Amount value={i.paidByCustomer} />} />
            <DetailRow label={t('Baqi')} value={<Amount value={due} weight="bold" color={due > 0 ? th.colors.warning.text : undefined} />} last />
          </DetailSection>
          {i.status === 'COMPLETED' && <Text size="xs" tone="muted">{t('Bill Sales, galla aur khata me hai. Galat ho to Sales se void karein — kaam dobara khul jayega.')}</Text>}
          {i.internalNotes ? <Card><Text size="sm" tone="secondary">{i.internalNotes}</Text></Card> : null}
          {manage && open && (
            <Row gap={2} wrap>
              <Button size="sm" variant="soft" icon={CalendarClock} onPress={() => setDialog('assign')}>{i.technicianId ? t('Technician / date badlein') : t('Technician lagayein')}</Button>
              {i.scheduledDate && <Button size="sm" variant="soft" onPress={() => setDialog('reschedule')}>{t('Nayi date')}</Button>}
              {i.status === 'IN_PROGRESS' && <Button size="sm" variant="ghost" onPress={() => setDialog('fail')}>{t('Nahi lag saka')}</Button>}
              <Button size="sm" variant="ghost" icon={XCircle} onPress={() => setDialog('cancel')}>{t('Cancel')}</Button>
            </Row>
          )}
          {i.technicianPhone && <Button variant="ghost" onPress={() => callPhone(i.technicianPhone)}>{t('Technician ko call')}</Button>}
          {i.history?.length > 0 && (
            <DetailSection title={t('Is customer ke pichle kaam')}>
              {i.history.slice(0, 5).map((h, k) => <ListRow key={h.id} dense divider={k < Math.min(i.history.length, 5) - 1} title={`${h.installationNumber} · ${h.productName}`} subtitle={installStatus(h.status).label} />)}
            </DetailSection>
          )}
        </View>
      )}
      {i && <Dialogs i={i} dialog={dialog} setDialog={setDialog} newDate={newDate} setNewDate={setNewDate} due={due} run={run} />}
    </DetailTemplate>
  );
}

function Dialogs({ i, dialog, setDialog, newDate, setNewDate, due, run }: {
  i: Installation; dialog: Dialog; setDialog: (d: Dialog) => void; newDate: string; setNewDate: (v: string) => void; due: number;
  run: (fn: () => Promise<unknown>, ok: string, money?: boolean) => () => Promise<void>;
}) {
  const close = () => setDialog(null);
  return (
    <>
      <AssignSheet open={dialog === 'assign'} onClose={close} title={t('Technician aur date')} initial={{ technicianId: i.technicianId, date: i.scheduledDate, slot: i.scheduledTimeSlot }}
        onConfirm={(v) => run(() => installationsApi.assignTechnician(i.id, v), t('Technician lag gaya'))()} />
      <Sheet open={dialog === 'reschedule'} onClose={close} title={t('Nayi date')}
        footer={<Button fullWidth size="lg" disabled={!newDate || newDate < todayKey()} onPress={() => void run(() => installationsApi.reschedule(i.id, { newDate }), t('Nayi date lag gayi'))().then(close).catch((e) => toast.error(errText(e, t('Nahi hua'))))}>{t('Laga dein')}</Button>}>
        <DatePicker label={t('Nayi date')} value={keyToDate(newDate)} minimumDate={new Date()} onChange={(d) => setNewDate(dateToKey(d))} error={newDate < todayKey() ? t('Guzri hui date nahi') : undefined} />
      </Sheet>
      <ReasonSheet open={dialog === 'cancel'} onClose={close} title={t('Installation cancel karein')} confirm={t('Cancel karein')}
        presets={[t('Customer ne mana kar diya'), t('Customer khud lagwayega'), t('Galat booking')]}
        onConfirm={(reason) => run(() => installationsApi.updateStatus(i.id, { status: 'CANCELLED', cancellationReason: reason }), t('Halat badal gayi'))()} />
      <ReasonSheet open={dialog === 'fail'} onClose={close} title={t('Nahi lag saka')} confirm={t('Darj karein')}
        presets={[t('Bijli ka point nahi'), t('Jagah nahi'), t('Unit kharab nikla'), t('Customer ghar par nahi')]}
        onConfirm={(reason) => run(() => installationsApi.updateStatus(i.id, { status: 'FAILED', cancellationReason: reason }), t('Halat badal gayi'))()} />
      <PayMoneySheet open={dialog === 'pay'} onClose={close} title={t('Paisa lein — {{installationNumber}}', { installationNumber: i.installationNumber })} due={due}
        description={i.status === 'COMPLETED' ? t('Bill ka udhaar kam hoga') : t('Advance: kaam ke bill me kat jayega')}
        onConfirm={(v) => run(() => installationsApi.addPayment(i.id, v), t('Paisa mil gaya'), true)()} />
      <CompleteSheet job={i} open={dialog === 'complete'} onClose={close} />
    </>
  );
}

/** Finishing the job: final charges, money taken, demo and the customer's rating. Posts the job's bill; money not taken goes on the customer's khata. */
function CompleteSheet({ job, open, onClose }: { job: Installation; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const [labor, setLabor] = useState<number | null>(null);
  const [visit, setVisit] = useState<number | null>(null);
  const [material, setMaterial] = useState<number | null>(null);
  const [covered, setCovered] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [demo, setDemo] = useState(true);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [checks, setChecks] = useState({ hasProperElectricConnection: true, wallSpaceAvailable: true, hasProperPlumbing: true, drainageAvailable: true });
  const [busy, setBusy] = useState(false);
  const advance = Number(job.paidByCustomer) || 0;
  const m = jobMoney({ charges: [labor ?? 0, visit ?? 0, material ?? 0], covered, advance, now: now ?? 0 });
  useEffect(() => {
    if (!open) return;
    setLabor(Number(job.laborCharge) || null); setVisit(Number(job.visitCharge) || null); setMaterial(Number(job.materialsCharge) || null);
    setCovered(job.covered_underWarranty);
    const total = (Number(job.laborCharge) || 0) + (Number(job.visitCharge) || 0) + (Number(job.materialsCharge) || 0);
    setNow(job.covered_underWarranty ? null : Math.max(total - advance, 0) || null);
    setMethod('CASH'); setDemo(true); setRating(0); setFeedback('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job.id]);
  useEffect(() => { if (covered) setNow(null); }, [covered]);
  const noName = m.left > 0 && !job.customerId && !job.customerName;
  const run = async () => {
    setBusy(true);
    try {
      await installationsApi.complete(job.id, {
        laborCharge: labor ?? 0, visitCharge: visit ?? 0, materialsCharge: material ?? 0, covered_underWarranty: covered, paidByCustomer: m.paid, paymentMethod: method, demoGiven: demo,
        customerRating: rating || undefined, customerFeedback: feedback.trim() || undefined, ...checks,
      });
      toast.success(t('{{installationNumber}} mukammal — bill ban gaya', { installationNumber: job.installationNumber }));
      refresh(true);
      onClose();
    } catch (e) { toast.error(errText(e, t('Mukammal nahi hui'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Kaam mukammal — {{installationNumber}}', { installationNumber: job.installationNumber })} description={`${job.productName} · ${job.customerName}`}
      footer={<Button fullWidth size="lg" icon={CheckCircle2} loading={busy} disabled={m.tooMuch || noName} onPress={() => void run()}>{m.left > 0 ? t('Mukammal — {{left}} khata me', { left: formatMoney(m.left) }) : t('Mukammal karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Mazdoori')} value={labor} onChangeValue={setLabor} />
        <MoneyInput label={t('Visit')} value={visit} onChangeValue={setVisit} />
        <MoneyInput label={t('Saman')} value={material} onChangeValue={setMaterial} hint={t('Pipe, stand, wire')} />
        <Switch value={covered} onChange={setCovered} label={t('Free installation (warranty)')} />
        <Card>
          <View style={{ gap: 4 }}>
            <DetailRow label={t('Kul kaam')} value={<Amount value={m.total} weight="semibold" />} />
            {advance > 0 && <DetailRow label={t('Pehle mila (advance)')} value={<Amount value={advance} />} />}
            <DetailRow label={t('Customer se lena')} value={<Amount value={m.owed} size="lg" weight="bold" />} last />
          </View>
        </Card>
        {!covered && <MoneyInput label={t('Abhi kitna liya')} value={now} onChangeValue={setNow} error={m.tooMuch ? t('Kul kaam se zyada nahi le sakte') : undefined} />}
        {(now ?? 0) > 0 && <MethodChips value={method} onChange={setMethod} />}
        {m.left > 0 && <Text size="sm" tone={noName ? 'danger' : 'warning'}>{noName ? t('Baqi paisa khata me tab jata hai jab customer ka naam ho') : t('{{left}} customer ke khata me chala jayega', { left: formatMoney(m.left) })}</Text>}
        <Switch value={checks.hasProperElectricConnection} onChange={(v) => setChecks({ ...checks, hasProperElectricConnection: v })} label={t('Bijli ka point theek')} />
        <Switch value={checks.wallSpaceAvailable} onChange={(v) => setChecks({ ...checks, wallSpaceAvailable: v })} label={t('Jagah theek thi')} />
        <Switch value={checks.hasProperPlumbing} onChange={(v) => setChecks({ ...checks, hasProperPlumbing: v })} label={t('Paani / pipe theek')} />
        <Switch value={checks.drainageAvailable} onChange={(v) => setChecks({ ...checks, drainageAvailable: v })} label={t('Paani nikalne ki jagah')} />
        <Switch value={demo} onChange={setDemo} label={t('Customer ko chala kar dikhaya (demo)')} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Customer ki rating')}</Text>
        <Stars value={rating} onChange={setRating} />
        <TextArea label={t('Customer ne kya kaha')} value={feedback} onChangeText={setFeedback} placeholder={t('Marzi hai')} />
      </View>
    </Sheet>
  );
}
