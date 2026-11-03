/** One warranty claim (web ClaimCard): amounts, company answer; send to the company, record its answer, record money received, remove a draft. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Send, Wallet } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { claimMoney } from '@nafaa/core/industries/appliances';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, ChipGroup, DetailRow, DetailSection, DetailTemplate, Input, ListRow, MoneyInput, Row, Sheet, StatusPill, Text, TextArea, confirm, toast, useTheme } from '@/design';
import { Fact, MethodChips, errText, opt, useDeskOnline } from '../../_shared/trade/desk';
import { warrantyClaimsApi, type ClaimStatus, type WarrantyClaimDetail } from '../api';
import { KEYS, claimStatus, dayOnly, refreshAppliances, warrantyKindLabel } from '../meta';
import { claimPending } from './ClaimsScreen';

type Dialog = 'submit' | 'response' | 'settle' | null;

export function ClaimDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const manage = usePermission()(P.ELECTRONICS_WARRANTY_MANAGE);
  const { guard } = useDeskOnline('appliancesDesk');
  const q = useQuery({ queryKey: [KEYS.claim, 'one', id], queryFn: () => warrantyClaimsApi.getOne(id!), enabled: !!id });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const c = q.data;
  const st = claimStatus(c?.status);
  const pending = c ? claimPending(c) : 0;
  const close = () => setDialog(null);
  const done = async (fn: () => Promise<unknown>, ok: string) => { await fn(); refreshAppliances([KEYS.claim], true); toast.success(ok); void q.refetch(); };

  const drop = () => guard(async () => {
    if (!c || !(await confirm({ title: t('Claim hatayein?'), confirmLabel: t('Hatayein'), tone: 'danger' }))) return;
    setBusy(true);
    try { await warrantyClaimsApi.remove(c.id); refreshAppliances([KEYS.claim]); toast.success(t('Claim hata diya')); router.back(); }
    catch (e) { toast.error(errText(e, t('Nahi hua'))); } finally { setBusy(false); }
  });

  return (
    <DetailTemplate title={c ? c.claimNumber : t('Claim')} subtitle={c ? `${c.brandName ?? ''} ${c.productName} · ${c.customerName}`.trim() : undefined}
      loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      bottomActions={c && manage ? (
        <>
          {c.status === 'DRAFT' && <Button variant="ghost" loading={busy} style={{ flex: 1 }} onPress={drop}>{t('Hatayein')}</Button>}
          {c.status === 'DRAFT' && <Button icon={Send} style={{ flex: 1 }} onPress={() => setDialog('submit')}>{t('Company ko bheja')}</Button>}
          {(c.status === 'SUBMITTED' || c.status === 'BRAND_REVIEWING') && <Button style={{ flex: 1 }} onPress={() => setDialog('response')}>{t('Company ka jawab')}</Button>}
          {(c.status === 'APPROVED' || c.status === 'PARTIALLY_APPROVED') && pending > 0 && <Button icon={Wallet} style={{ flex: 1 }} onPress={() => setDialog('settle')}>{t('Paisa mila')}</Button>}
        </>
      ) : undefined}>
      {c && (
        <View style={{ gap: th.space(3) }}>
          <Row gap={1.5} wrap><StatusPill tone={st.tone}>{st.label}</StatusPill>{c.warrantyKind && <Badge>{warrantyKindLabel(c.warrantyKind)}</Badge>}</Row>
          <Card tone="warning"><Text size="sm"><Text size="sm" weight="bold">{t('Kharabi:')} </Text>{c.issue}</Text></Card>
          <DetailSection title={t('Raqam')}>
            <DetailRow label={t('Claim')} value={<Amount value={c.claimedAmount} />} />
            <DetailRow label={t('Approve')} value={<Amount value={c.approvedAmount} />} />
            <DetailRow label={t('Mila')} value={<Amount value={c.receivedAmount} color={th.colors.success.text} />} />
            <DetailRow label={t('Baqi')} value={<Amount value={c.status === 'REJECTED' ? 0 : pending} weight="bold" color={pending > 0 ? th.colors.warning.text : undefined} />} last />
          </DetailSection>
          <Card>
            <View style={{ gap: th.space(2) }}>
              <Fact k={t('Parts')} v={formatMoney(c.partsCost)} />
              <Fact k={t('Mazdoori')} v={formatMoney(c.laborCost)} />
              <Fact k={t('Company ref')} v={c.brandRef} />
              <Fact k={t('Contact')} v={c.brandContact} />
              <Fact k={t('Jawab')} v={c.brandResponse} />
              <Fact k={t('Mana ki wajah')} v={c.rejectionReason} />
              <Fact k={t('Naya unit')} v={c.replacementSerialNumber} />
              <Fact k={t('Repair')} v={c.service ? `${c.service.requestNumber} · ${c.service.workDone ?? c.service.reportedIssue}` : undefined} />
              <Fact k={t('Warranty')} v={c.serial?.warrantyEndDate ? t('{{date}} tak', { date: dayOnly(c.serial.warrantyEndDate) }) : undefined} />
              <Fact k={t('Serial')} v={c.serialNumber} />
              <Fact k={t('Note')} v={c.notes} />
            </View>
          </Card>
          {c.brandHistory?.length > 0 && (
            <DetailSection title={t('Is brand ke pichle claims')}>
              {c.brandHistory.slice(0, 5).map((h, i) => <ListRow key={h.id} dense divider={i < Math.min(c.brandHistory.length, 5) - 1} title={`${h.claimNumber} · ${h.productName}`} subtitle={claimStatus(h.status).label} trailing={<Text size="xs" ltr>{formatMoney(h.claimedAmount)}</Text>} />)}
            </DetailSection>
          )}
        </View>
      )}
      {c && (
        <>
          <SubmitSheet open={dialog === 'submit'} onClose={close} onConfirm={(v) => done(() => warrantyClaimsApi.submit(c.id, v), t('Company ko bhej diya'))} />
          <ResponseSheet c={c} open={dialog === 'response'} onClose={close} onConfirm={(v) => done(() => warrantyClaimsApi.brandResponse(c.id, v), t('Jawab darj'))} />
          <SettleSheet pending={pending} open={dialog === 'settle'} onClose={close} onConfirm={(v) => done(() => warrantyClaimsApi.settle(c.id, v), t('Paisa darj — galla / bank me'))} />
        </>
      )}
    </DetailTemplate>
  );
}

function useSheetRun(onConfirm: () => Promise<unknown>, onClose: () => void) {
  const [busy, setBusy] = useState(false);
  const run = async () => { setBusy(true); try { await onConfirm(); onClose(); } catch (e) { toast.error(errText(e, t('Nahi hua'))); } finally { setBusy(false); } };
  return { busy, run };
}

function SubmitSheet({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: (v: { brandRef?: string; brandContact?: string }) => Promise<unknown> }) {
  const th = useTheme();
  const [ref, setRef] = useState('');
  const [contact, setContact] = useState('');
  useEffect(() => { if (open) { setRef(''); setContact(''); } }, [open]);
  const { busy, run } = useSheetRun(() => onConfirm({ brandRef: opt(ref), brandContact: opt(contact) }), onClose);
  return (
    <Sheet open={open} onClose={onClose} title={t('Company ko bheja')} footer={<Button fullWidth size="lg" loading={busy} onPress={() => void run()}>{t('Darj karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Company ka reference / complaint #')} value={ref} onChangeText={setRef} ltr />
        <Input label={t('Kis se baat hui')} value={contact} onChangeText={setContact} placeholder={t('Naam / phone')} />
      </View>
    </Sheet>
  );
}

function ResponseSheet({ c, open, onClose, onConfirm }: { c: WarrantyClaimDetail; open: boolean; onClose: () => void; onConfirm: (v: { status: ClaimStatus; approvedAmount?: number; brandResponse?: string; rejectionReason?: string; replacementSerialNumber?: string }) => Promise<unknown> }) {
  const th = useTheme();
  const [answer, setAnswer] = useState<ClaimStatus>('APPROVED');
  const [approved, setApproved] = useState<number | null>(null);
  const [response, setResponse] = useState('');
  const [replacement, setReplacement] = useState('');
  useEffect(() => { if (open) { setAnswer('APPROVED'); setApproved(Number(c.claimedAmount) || null); setResponse(''); setReplacement(''); } }, [open, c.id, c.claimedAmount]);
  const rejected = answer === 'REJECTED';
  const { busy, run } = useSheetRun(() => onConfirm({
    status: answer, approvedAmount: rejected ? undefined : approved ?? 0, brandResponse: rejected ? undefined : opt(response), rejectionReason: rejected ? response.trim() : undefined,
    replacementSerialNumber: rejected ? undefined : opt(replacement),
  }), onClose);
  return (
    <Sheet open={open} onClose={onClose} title={t('Company ka jawab')} footer={<Button fullWidth size="lg" loading={busy} disabled={rejected ? response.trim().length < 3 : !((approved ?? 0) > 0)} onPress={() => void run()}>{t('Darj karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <ChipGroup value={answer} onChange={(v) => setAnswer(v as ClaimStatus)} options={[{ value: 'APPROVED', label: t('Poora approve') }, { value: 'PARTIALLY_APPROVED', label: t('Thora approve') }, { value: 'REJECTED', label: t('Mana') }]} />
        {!rejected && <MoneyInput label={t('Kitna approve hua')} value={approved} onChangeValue={setApproved} />}
        <TextArea label={rejected ? t('Mana ki wajah') : t('Company ne kya kaha')} value={response} onChangeText={setResponse} />
        {!rejected && <Input label={t('Naya unit mila? Us ka serial')} value={replacement} onChangeText={setReplacement} hint={t('Marzi hai')} ltr />}
      </View>
    </Sheet>
  );
}

function SettleSheet({ pending, open, onClose, onConfirm }: { pending: number; open: boolean; onClose: () => void; onConfirm: (v: { receivedAmount: number; paymentMethod: string }) => Promise<unknown> }) {
  const th = useTheme();
  const [received, setReceived] = useState<number | null>(null);
  const [method, setMethod] = useState('BANK_TRANSFER');
  useEffect(() => { if (open) { setReceived(pending || null); setMethod('BANK_TRANSFER'); } }, [open, pending]);
  const n = received ?? 0;
  const { busy, run } = useSheetRun(() => onConfirm({ receivedAmount: n, paymentMethod: method }), onClose);
  return (
    <Sheet open={open} onClose={onClose} title={t('Company se paisa mila')} footer={<Button fullWidth size="lg" variant="success" loading={busy} disabled={!(n > 0) || n > pending + 0.01} onPress={() => void run()}>{t('Darj karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Kitna mila')} value={received} onChangeValue={setReceived} size="xl" error={n > pending + 0.01 ? t('Baqi sirf {{pending}}', { pending: formatMoney(pending) }) : undefined} />
        <MethodChips value={method} onChange={setMethod} />
      </View>
    </Sheet>
  );
}
