/**
 * Eye test page (web EyeTestDetailPage): start the test, write the result
 * (power, vision, diagnosis, advice, follow-up, make the prescription), take
 * the fee, and print the report. Needs the server.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarClock, Glasses, Play, Printer, Stethoscope, Wallet } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { emptyPower, powerDraftOf, powerErrors, powerOf, type PowerDraft } from '@nafaa/core/industries/optical';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, Card, DatePicker, DetailRow, DetailSection, DetailTemplate, FormSection, FormTemplate, IconButton, Input, ListRow, PageHero, HeroAmount, HeroText, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { printDoc } from '@/modules/purchasing/lib/docs';
import { useCostMask } from '@/modules/sales/lib/mask';
import { eyeTestsApi, type OpticalEyeTest } from '../api';
import { Choices, Pill, PowerGrid, PowerTable, powerErrorText } from '../components/parts';
import { TestDialogs, useTestActions, type TestDialog } from '../components/TestSheets';
import { testDoc } from '../docs';
import { OPTICAL_KEYS, VA_CHOICES, asDate, dateTime, dayKey, dayOnly, isoAt, refreshOptical, testStatusOf, todayKey } from '../meta';

interface Result {
  power: PowerDraft; rightVa: string; leftVa: string; iop: string; color: string; diagnosis: string; advice: string;
  followUp: boolean; followUpDate: string; followUpReason: string; issueRx: boolean; notes: string;
}

const resultOf = (x: OpticalEyeTest): Result => ({
  power: powerDraftOf(x), rightVa: x.rightVa ?? '', leftVa: x.leftVa ?? '', iop: x.intraocularPressure ?? '', color: x.colorVisionTest ?? '',
  diagnosis: x.diagnosis ?? '', advice: x.recommendation ?? '', followUp: x.requiresFollowUp, followUpDate: x.followUpDate ? dayKey(x.followUpDate) : '', followUpReason: x.followUpReason ?? '',
  issueRx: !x.prescriptionId, notes: '',
});

export function EyeTestDetailScreen() {
  const th = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const online = useOnlineStatus();
  const can = usePermission();
  const { cost } = useCostMask();
  const canBill = can(P.POS_USE);
  const [dialog, setDialog] = useState<TestDialog>(null);
  const actions = useTestActions(() => { setDialog(null); void q.refetch(); });
  const q = useQuery({ queryKey: [OPTICAL_KEYS.tests, 'one', id], queryFn: () => eyeTestsApi.getOne(id) });
  const x = q.data;
  const [r, setR] = useState<Result | null>(null);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (x && !r) setR(resultOf(x)); }, [x, r]);

  const p = r ? powerOf(r.power) : {};
  const pErr = powerErrors(p);
  const followErr = r?.followUp && !r.followUpDate ? t('Dobara aane ki date likhein') : undefined;
  const save = useMutation({
    mutationFn: () => eyeTestsApi.recordResults(id, {
      ...p, rightVa: r!.rightVa || undefined, leftVa: r!.leftVa || undefined, intraocularPressure: r!.iop.trim() || undefined, colorVisionTest: r!.color.trim() || undefined,
      diagnosis: r!.diagnosis.trim() || undefined, recommendation: r!.advice.trim() || undefined,
      requiresFollowUp: r!.followUp, followUpDate: r!.followUp && r!.followUpDate ? isoAt(r!.followUpDate) : undefined,
      followUpReason: r!.followUp ? r!.followUpReason.trim() || undefined : undefined,
      issuePrescription: r!.issueRx && !x?.prescriptionId, notes: r!.notes.trim() || undefined,
    }),
    onSuccess: (res) => {
      setDirty(false);
      toast.success(res.prescriptionId && !x?.prescriptionId ? t('Result save — nuskha ban gaya') : t('Result save ho gaya'));
      refreshOptical([OPTICAL_KEYS.tests, OPTICAL_KEYS.rx]);
      setR(null); setEditing(false); void q.refetch();
    },
  });
  const submit = () => {
    if (!r) return;
    if (Object.keys(pErr).length || followErr) { toast.error(powerErrorText(pErr) ?? followErr!); return; }
    if (!Object.keys(p).length && !r.diagnosis.trim()) { toast.error(t('Number ya tashkhees likhein')); return; }
    if (!online) { toast.warning(onlineNeededText('opticalDesk')); return; }
    if (!save.isPending) save.mutate();
  };
  const set = (patch: Partial<Result>) => { setDirty(true); setR((c) => (c ? { ...c, ...patch } : c)); };

  if (x && r && editing) {
    return (
      <FormTemplate title={t('Result')} subtitle={`${x.customerName} · ${x.testNumber}`} dirty={dirty} saving={save.isPending} onSave={submit} saveLabel={t('Result save')}
        secondaryAction={x.status === 'COMPLETED' ? <Button variant="secondary" size="lg" onPress={() => { setR(resultOf(x)); setEditing(false); setDirty(false); }}>{t('Rehne dein')}</Button> : undefined}>
        <FormSection title={t('Number')}>
          <PowerGrid value={r.power} onChange={(power) => set({ power })} errors={pErr} />
        </FormSection>
        <FormSection title={t('Check')}>
          <Input label={t('Nazar R (VA)')} value={r.rightVa} onChangeText={(v) => set({ rightVa: v })} placeholder="6/6" ltr />
          <Choices options={VA_CHOICES} value={r.rightVa} onChange={(v) => set({ rightVa: v })} clearable />
          <Input label={t('Nazar L (VA)')} value={r.leftVa} onChangeText={(v) => set({ leftVa: v })} placeholder="6/9" ltr />
          <Choices options={VA_CHOICES} value={r.leftVa} onChange={(v) => set({ leftVa: v })} clearable />
          <Input label={t('Aankh ka pressure (IOP)')} value={r.iop} onChangeText={(v) => set({ iop: v })} placeholder={t('R 14 / L 15 mmHg')} hint={t('Marzi hai')} />
          <Input label={t('Rang ki pehchan')} value={r.color} onChangeText={(v) => set({ color: v })} placeholder={t('Normal')} hint={t('Marzi hai')} />
          <TextArea label={t('Tashkhees')} value={r.diagnosis} onChangeText={(v) => set({ diagnosis: v })} placeholder={t('Jaise: Myopia, astigmatism')} />
          <TextArea label={t('Mashwara')} value={r.advice} onChangeText={(v) => set({ advice: v })} placeholder={t('Jaise: blue cut lens, computer par break')} />
        </FormSection>
        <FormSection title={t('Aage')}>
          <Switch value={r.followUp} onChange={(v) => set({ followUp: v })} label={t('Dobara bulana hai')} description={t('"Dobara aana" list aur dashboard par yaad dilaya jata hai')} />
          {r.followUp && (
            <>
              <DatePicker label={t('Kab')} value={r.followUpDate ? asDate(r.followUpDate) : null} minimumDate={new Date()} error={followErr} onChange={(d) => set({ followUpDate: dayKey(d.toISOString()) })} />
              <Input label={t('Kyun')} value={r.followUpReason} onChangeText={(v) => set({ followUpReason: v })} placeholder={t('Number dobara check')} />
            </>
          )}
          {!x.prescriptionId && <Switch value={r.issueRx} onChange={(v) => set({ issueRx: v })} label={t('Isi number se nuskha banayein')} description={t('Prescriptions me save — chashma order me khud aata hai (1 saal ki muddat)')} />}
          <TextArea label={t('Note')} value={r.notes} onChangeText={(v) => set({ notes: v })} hint={t('Marzi hai')} />
        </FormSection>
      </FormTemplate>
    );
  }

  const closed = x?.status === 'CANCELLED' || x?.status === 'NO_SHOW';
  const due = x ? (x.isWaivedOff ? 0 : Math.max(x.testFee - x.paidAmount, 0)) : 0;
  const notStarted = !!x && ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'].includes(x.status);

  return (
    <DetailTemplate
      title={x?.customerName ?? t('Eye test')} subtitle={x ? `${x.testNumber} · ${dayOnly(x.appointmentDate)}${x.scheduledSlot ? ` ${x.scheduledSlot}` : ''}` : undefined}
      loading={q.isLoading} error={!x ? q.error : undefined} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={x?.status === 'COMPLETED' ? <IconButton icon={Printer} label={t('Report')} onPress={() => void printDoc(testDoc(x))} /> : undefined}
      summary={x ? (
        <PageHero title={x.customerName} chip={t(testStatusOf(x.status).label)}
          stats={[
            { label: t('Fees'), value: <HeroAmount value={x.testFee} size="lg" /> },
            { label: t('Mili'), value: <HeroAmount value={x.paidAmount} size="lg" /> },
            { label: t('Baqi'), value: x.isWaivedOff ? <HeroText size="lg" weight="bold">{t('Maaf')}</HeroText> : <HeroAmount value={due} size="lg" /> },
          ]} />
      ) : undefined}
      bottomActions={x && !closed ? (
        <>
          {notStarted && <Button style={{ flex: 1 }} icon={Play} loading={actions.start.isPending} onPress={() => actions.start.mutate(x)}>{t('Test shuru')}</Button>}
          {x.status === 'IN_PROGRESS' && <Button style={{ flex: 1 }} icon={Stethoscope} onPress={() => { if (!r) setR(resultOf(x)); setEditing(true); }}>{t('Result likhein')}</Button>}
          {x.status === 'COMPLETED' && x.prescriptionId && <Button style={{ flex: 1 }} icon={Glasses} onPress={() => router.push(`/optical/lens-orders/new?rx=${x.prescriptionId}` as never)}>{t('Chashma order')}</Button>}
          {canBill && due > 0.009 && <Button variant="secondary" icon={Wallet} onPress={() => setDialog({ kind: 'fee', test: x })}>{t('Fees lein ({{due}})', { due: cost(due) })}</Button>}
        </>
      ) : undefined}
    >
      {x && (
        <>
          <View style={{ flexDirection: 'row', gap: th.space(2), flexWrap: 'wrap' }}>
            <Pill meta={testStatusOf(x.status)} />
            {notStarted && <Button variant="ghost" size="sm" icon={CalendarClock} onPress={() => setDialog({ kind: 'move', test: x })}>{t('Waqt badlein')}</Button>}
            {x.status === 'COMPLETED' && <Button variant="ghost" size="sm" icon={Stethoscope} onPress={() => { setR(resultOf(x)); setEditing(true); }}>{t('Result badlein')}</Button>}
          </View>
          <DetailSection title={t('Result')}>
            <Card>
              {x.status === 'COMPLETED' ? (
                <View style={{ gap: th.space(2) }}>
                  <PowerTable p={x} />
                  {(x.rightVa || x.leftVa) && <Text size="sm">{t('Nazar R / L')}: <Text size="sm" weight="semibold" ltr>{[x.rightVa, x.leftVa].filter(Boolean).join(' / ')}</Text></Text>}
                  {x.intraocularPressure ? <Text size="sm">{t('Pressure')}: <Text size="sm" weight="semibold">{x.intraocularPressure}</Text></Text> : null}
                  {x.diagnosis ? <Text size="sm">{t('Tashkhees')}: <Text size="sm" weight="semibold">{x.diagnosis}</Text></Text> : null}
                  {x.recommendation ? <Text size="sm">{t('Mashwara')}: <Text size="sm" weight="semibold">{x.recommendation}</Text></Text> : null}
                  {x.requiresFollowUp ? <Text size="sm" tone="brand">{t('Dobara aana')}: {dayOnly(x.followUpDate)}{x.followUpReason ? ` — ${x.followUpReason}` : ''}</Text> : null}
                </View>
              ) : <Text size="sm" tone="muted">{closed ? t('Ye test band hai.') : t('Test shuru karein, phir result likhein.')}</Text>}
            </Card>
          </DetailSection>
          <DetailSection title={t('Customer')}>
            <Card flush>
              <DetailRow label={t('Mobile')} value={<Text size="sm" weight="semibold" ltr>{x.customerPhone}</Text>} />
              <DetailRow label={t('Masla')} value={x.chiefComplaint || '—'} last={!x.optometristName && !x.medicalHistory && !x.testStartedAt} />
              {x.optometristName ? <DetailRow label={t('Doctor')} value={x.optometristName} last={!x.medicalHistory && !x.testStartedAt} /> : null}
              {x.medicalHistory ? <DetailRow label={t('Bimari / dawai')} value={x.medicalHistory} last={!x.testStartedAt} /> : null}
              {x.testStartedAt ? <DetailRow label={t('Shuru')} value={`${dateTime(x.testStartedAt)}${x.testDurationMinutes ? t(' · {{testDurationMinutes}} minute', { testDurationMinutes: x.testDurationMinutes }) : ''}`} last /> : null}
              {x.customerId ? <ListRow dense title={t('Customer ka record →')} chevron onPress={() => router.push(`/customers/${x.customerId}` as never)} /> : null}
            </Card>
          </DetailSection>
          {x.prescription && (
            <DetailSection title={t('Nuskha')}>
              <Card flush><ListRow title={x.prescription.prescriptionNumber} subtitle={t('Muddat: {{expiryDate}}', { expiryDate: dayOnly(x.prescription.expiryDate) })} chevron onPress={() => router.push(`/optical/prescriptions/${x.prescription!.id}` as never)} /></Card>
            </DetailSection>
          )}
          <TestDialogs dialog={dialog} close={() => setDialog(null)} actions={actions} />
        </>
      )}
    </DetailTemplate>
  );
}
