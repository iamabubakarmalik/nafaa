/**
 * The money sheets of payroll: save and pay the chosen salaries of a month,
 * pay what is left on one salary, and cancel a salary or an advance (money
 * paid goes back where it came from). Each sheet sends one request key, so a
 * double tap or a retry posts once.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { Avatar, Button, Input, ListGroup, ListRow, MoneyInput, Sheet, Text, toast, Amount } from '@/design';
import { payrollApi, type RunEdit, type RunResult, type SalaryRecord, type Sources } from '../api/payroll';
import { TOUCHED_KEYS, requestKey } from '../lib/meta';
import { SourcePicker, defaultSource, sourceReady, type SourceValue } from './SourcePicker';

const refreshAll = (qc: ReturnType<typeof useQueryClient>) => TOUCHED_KEYS.forEach((k) => void qc.invalidateQueries({ queryKey: [k] }));

export interface PayLineView { staffId: string; name: string; avatarUrl?: string | null; designation: string; net: number; payNow: number; edit?: RunEdit }

/** Saves the chosen salaries of a month and pays them from one source (or keeps them due). */
export function RunPaySheet({ lines, month, monthLabel, shopId, sources, onDone, onClose }: {
  lines: PayLineView[] | null; month: string; monthLabel: string; shopId?: string; sources: Sources; onDone: (r: RunResult) => void; onClose: () => void;
}) {
  return (
    <Sheet open={!!lines} onClose={onClose} height={0.88}
      title={t('{{monthLabel}} ki tankhwah — {{count}} staff', { monthLabel, count: lines?.length ?? 0 })}
      description={lines ? t('Banti kul {{net}}', { net: formatPKR(lines.reduce((a, l) => a + l.net, 0)) }) : undefined}>
      {lines && <RunPayBody lines={lines} month={month} shopId={shopId} sources={sources} onDone={onDone} onClose={onClose} />}
    </Sheet>
  );
}

function RunPayBody({ lines, month, shopId, sources, onDone, onClose }: { lines: PayLineView[]; month: string; shopId?: string; sources: Sources; onDone: (r: RunResult) => void; onClose: () => void }) {
  const qc = useQueryClient();
  const [key] = useState(requestKey);
  const [src, setSrc] = useState<SourceValue>(() => defaultSource(sources, true));
  const total = lines.reduce((a, l) => a + l.payNow, 0);
  const paying = src.source !== 'NONE' ? total : 0;
  const ready = sourceReady(sources, src, paying);

  const m = useMutation({
    mutationFn: () => payrollApi.process({
      month, shopId, source: src.source, accountId: src.accountId, allowNegative: src.allowNegative || undefined, requestId: key,
      rows: lines.map((l) => ({ staffId: l.staffId, ...(l.edit ?? {}) })),
    }),
    onSuccess: (r) => {
      if (r.duplicate) toast.info(t('Ye payment pehle hi ho chuki thi'));
      else if (!r.created.length) toast.info(r.skipped.map((s) => `${s.name}: ${s.reason}`).join(' · ') || t('Kuch nahi bana'));
      else {
        toast.success(t('{{count}} tankhwah ban gayi', { count: r.created.length }), { message: r.paid ? t('{{paid}} ada', { paid: formatPKR(r.paid) }) : undefined });
        r.skipped.forEach((s) => toast.warning(`${s.name}: ${s.reason}`));
      }
      refreshAll(qc);
      onDone(r);
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Tankhwah nahi bani'))),
  });

  return (
    <View style={{ gap: 16, paddingBottom: 8 }}>
      <ListGroup>
        {lines.map((l) => (
          <ListRow key={l.staffId} avatar={<Avatar name={l.name} url={l.avatarUrl} size={36} />} title={l.name} subtitle={l.designation}
            trailing={<View style={{ alignItems: 'flex-end' }}>
              <Amount value={src.source === 'NONE' ? l.net : l.payNow} weight="bold" />
              {src.source !== 'NONE' && l.payNow < l.net && <Text size="2xs" tone="warning">{t('baqi {{amount}}', { amount: formatPKR(l.net - l.payNow) })}</Text>}
            </View>} />
        ))}
      </ListGroup>
      <SourcePicker sources={sources} value={src} onChange={setSrc} total={paying} allowLater />
      <Text size="xs" tone="muted">{t('Ek bande ki ek mahine ki tankhwah ek hi dafa banti hai. Ghalti ho to record khol kar "Cancel" karein — diya hua paisa wapas hisaab me aa jata hai.')}</Text>
      <Button fullWidth size="lg" loading={m.isPending} disabled={!ready || !lines.length} onPress={() => m.mutate()}>
        {src.source === 'NONE' ? t('Tankhwah banayein') : t('{{total}} ada karein', { total: formatPKR(total) })}
      </Button>
    </View>
  );
}

/** Pays all or part of what is left on one salary. */
export type BalanceTarget = Pick<SalaryRecord, 'id' | 'paymentNumber' | 'monthLabel' | 'balanceAmount'> & { staff: { fullName: string } };

export function PayBalanceSheet({ record, sources, shopId, onClose }: { record: BalanceTarget | null; sources: Sources; shopId?: string; onClose: () => void }) {
  return (
    <Sheet open={!!record} onClose={onClose} height={0.8} title={record ? t('Baqi tankhwah — {{fullName}}', { fullName: record.staff.fullName }) : undefined}
      description={record ? t('{{paymentNumber}} · {{monthLabel}} · baqi {{balanceAmount}}', { paymentNumber: record.paymentNumber, monthLabel: record.monthLabel, balanceAmount: formatPKR(record.balanceAmount) }) : undefined}>
      {record && <BalanceBody key={record.id} record={record} sources={sources} shopId={shopId} onClose={onClose} />}
    </Sheet>
  );
}

function BalanceBody({ record, sources, shopId, onClose }: { record: BalanceTarget; sources: Sources; shopId?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [key] = useState(requestKey);
  const [amount, setAmount] = useState<number | null>(Math.round(record.balanceAmount));
  const [src, setSrc] = useState<SourceValue>(() => defaultSource(sources, false));
  const value = amount ?? 0;
  const valid = value > 0 && value <= record.balanceAmount + 0.5;
  const ready = valid && src.source !== 'NONE' && sourceReady(sources, src, value);
  const m = useMutation({
    mutationFn: () => payrollApi.payBalance(record.id, { amount: value, source: src.source, accountId: src.accountId, allowNegative: src.allowNegative || undefined, requestId: key, shopId }),
    onSuccess: (r) => {
      toast.success(r.duplicate ? t('Ye payment pehle hi ho chuki thi') : t('{{amount}} ada — {{fullName}}', { amount: formatPKR(value), fullName: record.staff.fullName }));
      refreshAll(qc);
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Payment nahi hui'))),
  });
  return (
    <View style={{ gap: 16, paddingBottom: 8 }}>
      <MoneyInput label={t('Amount')} value={amount} onChangeValue={setAmount}
        error={amount != null && !valid ? t('1 se {{balanceAmount}} tak likhein', { balanceAmount: formatPKR(record.balanceAmount) }) : undefined}
        hint={t('Poori baqi ya us ka kuch hissa — jo reh jaye baad me de sakte hain')} />
      <SourcePicker sources={sources} value={src} onChange={setSrc} total={valid ? value : 0} />
      <Button fullWidth size="lg" loading={m.isPending} disabled={!ready} onPress={() => m.mutate()}>{t('Ada karein')}</Button>
    </View>
  );
}

/** Cancels a salary or a whole advance and puts any paid money back. */
export type CancelTarget = Pick<SalaryRecord, 'id' | 'paymentNumber' | 'kind' | 'paidAmount'> & { staffName: string };

export function CancelSheet({ record, shopId, onClose }: { record: CancelTarget | null; shopId?: string; onClose: () => void }) {
  return (
    <Sheet open={!!record} onClose={onClose} title={record ? (record.kind === 'advance' ? t('Advance cancel karein') : t('Tankhwah cancel karein')) : undefined}
      description={record ? `${record.paymentNumber} · ${record.staffName}` : undefined}>
      {record && <CancelBody key={record.id} record={record} shopId={shopId} onClose={onClose} />}
    </Sheet>
  );
}

function CancelBody({ record, shopId, onClose }: { record: CancelTarget; shopId?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [key] = useState(requestKey);
  const [reason, setReason] = useState('');
  const advance = record.kind === 'advance';
  const m = useMutation({
    mutationFn: () => payrollApi.cancel(record.id, { reason: reason.trim(), requestId: key, shopId }),
    onSuccess: (r) => { toast.success(t('{{number}} cancel ho gaya', { number: r.number })); refreshAll(qc); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Cancel nahi hua'))),
  });
  return (
    <View style={{ gap: 16, paddingBottom: 8 }}>
      <Text size="sm" tone="warning">
        {record.paidAmount > 0
          ? t('Diya hua paisa wapas usi jagah likha jayega jahan se gaya tha (galle se gaya to is branch ke khule galle me). Paisa staff se wapas le lein.')
          : t('Abhi kuch ada nahi hua — sirf record cancel hoga.')}
        {advance ? t(' Advance ki saari qisten cancel hongi.') : t(' Is mahine ki tankhwah dobara bana sakte hain.')}
      </Text>
      <Input label={t('Wajah')} value={reason} onChangeText={setReason} maxLength={200} placeholder={t('Masalan: ghalat amount likhi thi')} hint={t('Record aur activity log me rehti hai')} autoFocus />
      <Button variant="danger" fullWidth loading={m.isPending} disabled={!reason.trim()} onPress={() => m.mutate()}>{t('Cancel karein')}</Button>
    </View>
  );
}
