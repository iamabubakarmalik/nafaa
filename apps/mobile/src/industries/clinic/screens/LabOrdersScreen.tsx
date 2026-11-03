/** Lab (web LabOrdersPage): orders with their tests and fees; move the status, type in results, take the lab fee. */

import { TestTube } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { feeDue, feePayBody } from '@nafaa/core/industries/clinic';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, DetailRow, Row, Sheet, Text, toast } from '@/design';
import { PaySheet, errorText, useDeskOnline } from '../../_shared/deskKit';
import { DocActions, L, type PackDoc } from '../../_shared/docKit';
import { DeskList, FormSheet, clean } from '../../_shared/serviceKit';
import { clinicApi, type LabOrder, type LabTest } from '../api';
import { CLINIC_KEYS, LAB_STATUS, dateOf, refreshClinic } from '../meta';

const NEXT: Record<string, { status: LabOrder['status']; label: string } | undefined> = {
  ORDERED: { status: 'SAMPLE_COLLECTED', label: msg('Sample liya') }, SAMPLE_COLLECTED: { status: 'IN_PROGRESS', label: msg('Test shuru') }, COMPLETED: { status: 'REPORTED', label: msg('Report de di') },
};

const labDoc = (o: LabOrder, lang: Parameters<typeof L>[0]): PackDoc => ({
  fileName: `lab-${o.orderNumber}`,
  title: L(lang, 'Lab report', 'لیب رپورٹ', 'Lab report'),
  subtitle: o.orderNumber,
  meta: [[L(lang, 'Patient', 'مریض', 'Mareez'), o.patient?.fullName ?? '—'], [L(lang, 'Date', 'تاریخ', 'Date'), dateOf(o.orderedAt)]],
  tables: [{ columns: [L(lang, 'Test', 'ٹیسٹ', 'Test'), L(lang, 'Result', 'نتیجہ', 'Result'), L(lang, 'Normal range', 'نارمل رینج', 'Normal range'), ''],
    rows: o.tests.map((x) => [x.testName, `${x.result ?? '—'} ${x.unit ?? ''}`.trim(), x.referenceRange, x.isAbnormal ? L(lang, 'Abnormal', 'غیر معمولی', 'Ghair-mamooli') : '']) }],
});

export function LabOrdersScreen() {
  const can = usePermission();
  const records = can(P.CLINIC_RECORDS_MANAGE);
  const bill = can(P.POS_USE);
  const { guard } = useDeskOnline('clinicDesk');
  const [open, setOpen] = useState<LabOrder | null>(null);
  const [test, setTest] = useState<LabTest | null>(null);
  const [pay, setPay] = useState(false);
  const act = async (fn: () => Promise<unknown>) => { try { await fn(); refreshClinic(true); setOpen(null); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } };
  const due = open ? feeDue({ total: open.totalCost, paidAmount: open.paidAmount }) : 0;
  const next = open ? NEXT[open.status] : undefined;
  return (
    <DeskList<{ items: LabOrder[] }> title={t('Lab')} queryKey={[CLINIC_KEYS.labs]} fetch={() => clinicApi.labs.page({ limit: 80 })} feature="clinicDesk" emptyIcon={TestTube} empty={t('Abhi koi lab order nahi')} searchPlaceholder={t('Mareez ya order number')}
      rows={(d) => d.items.map((o) => ({
        id: o.id, icon: TestTube, tone: LAB_STATUS[o.status]?.tone ?? 'neutral', search: `${o.patient?.fullName} ${o.orderNumber} ${o.tests.map((x) => x.testName).join(' ')}`, title: o.patient?.fullName ?? o.orderNumber,
        subtitle: `${o.orderNumber} · ${o.tests.map((x) => x.testName).join(', ')}`, trailing: <Badge tone={LAB_STATUS[o.status]?.tone ?? 'neutral'}>{t(LAB_STATUS[o.status]?.label ?? o.status)}</Badge>, onPress: () => setOpen(o),
      }))}>
      <Sheet open={!!open && !test && !pay} onClose={() => setOpen(null)} title={open?.patient?.fullName} description={open ? `${open.orderNumber} · ${dateOf(open.orderedAt)}` : undefined}
        footer={open ? <View style={{ gap: 8 }}><View style={{ alignItems: 'center' }}><DocActions phone={open.patient?.phonePrimary} disabled={!open.tests.some((x) => x.result)} build={(lang) => labDoc(open, lang)} /></View><Row gap={2}>
          {records && next && <Button style={{ flex: 1 }} onPress={() => guard(() => void act(() => clinicApi.labs.status(open.id, next.status)))}>{t(next.label)}</Button>}
          {bill && due > 0 && <Button style={{ flex: 1 }} variant={next && records ? 'secondary' : 'primary'} onPress={() => guard(() => setPay(true))}>{t('Fee lein')}</Button>}
        </Row></View> : undefined}>
        {open && <View style={{ gap: 4 }}>
          {open.tests.map((x, i) => (
            <DetailRow key={x.id ?? i} label={x.testName} value={x.result ? <Text weight="semibold" tone={x.isAbnormal ? 'danger' : 'default'} ltr>{`${x.result} ${x.unit ?? ''}`}</Text> : records && x.id ? <Button size="sm" variant="soft" onPress={() => setTest(x)}>{t('Result likhein')}</Button> : <Text tone="muted">—</Text>} last={i === open.tests.length - 1} />
          ))}
          <DetailRow label={t('Fee')} value={<Text ltr>{formatMoney(open.paidAmount)} / {formatMoney(open.totalCost)}</Text>} last />
        </View>}
      </Sheet>
      <FormSheet open={!!test} title={t('Result')} description={test?.testName} onClose={() => setTest(null)}
        fields={[{ key: 'result', label: t('Result'), required: true }, { key: 'unit', label: t('Unit') }, { key: 'referenceRange', label: t('Normal range') }, { key: 'isAbnormal', label: t('Ghair-mamooli'), kind: 'switch' }]}
        onSubmit={async (v) => { await clinicApi.labs.result(test!.id!, clean({ result: v.result.trim(), unit: v.unit, referenceRange: v.referenceRange, isAbnormal: !!v.isAbnormal }) as any); refreshClinic(); setOpen(null); toast.success(t('Result likh diya')); }} />
      <PaySheet open={pay} onClose={() => setPay(false)} title={t('Lab fee')} name={open?.patient?.fullName ?? ''} due={due} cta={t('Fee lein')}
        onConfirm={async (p) => { await clinicApi.labs.pay(open!.id, feePayBody(due, p.paidAmount, p.paymentMethod)); refreshClinic(true); setOpen(null); toast.success(t('Fee ka bill ban gaya')); }} />
    </DeskList>
  );
}
