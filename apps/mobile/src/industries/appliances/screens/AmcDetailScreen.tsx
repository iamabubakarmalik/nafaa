/** One AMC contract (web AmcContractCard): cover, visits, money; take payment, renew, suspend or cancel, remind by WhatsApp, edit. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { MessageCircle, Pause, Pencil, Play, RefreshCw, Wallet, Wrench, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, DetailRow, DetailSection, DetailTemplate, IconButton, ListRow, MoneyInput, Row, Sheet, StatusPill, Text, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { Fact, MethodChips, PayMoneySheet, ReasonSheet, errText, openWhatsApp, useDeskOnline } from '../../_shared/trade/desk';
import { amcContractsApi, type AmcContract } from '../api';
import { KEYS, amcPlanLabel, amcStatus, dayOnly, daysPhrase, daysTo, refreshAppliances, serviceStatus } from '../meta';
import { amcDue } from './AmcScreen';

const refresh = (money = false) => refreshAppliances([KEYS.amc], money);
const amcMessage = (c: AmcContract, shop: string) => [
  t('Assalam o alaikum {{name}},', { name: c.customerName }),
  `${shop}: ${t('aap ke {{product}} ka AMC ({{number}}) {{date}} ko khatam {{state}}.', { product: c.productName ?? t('appliance'), number: c.contractNumber, date: dayOnly(c.expiryDate), state: (daysTo(c.expiryDate) ?? 0) < 0 ? t('ho gaya') : t('ho raha hai') })}`,
  t('Renew karwa kar saal bhar ki free service jaari rakhein.'),
].join('\n');

type Dialog = 'pay' | 'renew' | 'cancel' | 'suspend' | null;

export function AmcDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const manage = usePermission()(P.SERVICE_JOBS_MANAGE);
  const shop = useAuthStore((s) => s.tenant?.name) ?? '';
  const { guard } = useDeskOnline('appliancesDesk');
  const q = useQuery({ queryKey: [KEYS.amc, 'one', id], queryFn: () => amcContractsApi.getOne(id!), enabled: !!id });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const c = q.data;
  const due = c ? amcDue(c) : 0;
  const live = !!c && ['ACTIVE', 'SUSPENDED', 'EXPIRED'].includes(c.status);
  const close = () => setDialog(null);
  const run = (fn: () => Promise<unknown>, ok: string, money = false) => async () => { await fn(); refresh(money); toast.success(ok); void q.refetch(); };
  const st = amcStatus(c?.status);

  return (
    <DetailTemplate title={c ? c.contractNumber : t('AMC contract')} subtitle={c ? `${c.customerName} · ${amcPlanLabel(c.amcType)}` : undefined}
      loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={c ? <IconButton icon={MessageCircle} label={t('WhatsApp')} onPress={() => { openWhatsApp(c.customerPhone, amcMessage(c, shop)); void amcContractsApi.sendReminder(c.id).then(() => refresh()).catch(() => undefined); }} /> : undefined}
      bottomActions={c && manage ? (
        <>
          {due > 0 && c.status !== 'CANCELLED' && <Button variant="secondary" icon={Wallet} style={{ flex: 1 }} onPress={() => setDialog('pay')}>{t('Paisa lein')}</Button>}
          {live && <Button icon={RefreshCw} style={{ flex: 1 }} onPress={() => setDialog('renew')}>{t('Renew')}</Button>}
        </>
      ) : undefined}>
      {c && (
        <View style={{ gap: th.space(3) }}>
          <Row gap={1.5} wrap>
            <StatusPill tone={st.tone}>{st.label}</StatusPill>
            {c.computed?.isExpiringSoon && <Badge tone="warning">{t('Jald khatam')}</Badge>}
            {c.autoRenew && <Badge tone="info">{t('Renew yaad dilayein')}</Badge>}
          </Row>
          <Card>
            <View style={{ gap: th.space(2) }}>
              <Fact k={t('Customer')} v={`${c.customerName} · ${c.customerPhone}`} />
              <Fact k={t('Product')} v={c.productName} />
              <Fact k={t('Serial')} v={c.serialNumber} />
              <Fact k={t('Pata')} v={c.customerAddress} />
              <Fact k={t('Muddat')} v={`${dayOnly(c.startDate)} – ${dayOnly(c.expiryDate)} (${daysPhrase(c.computed?.daysRemaining ?? daysTo(c.expiryDate))})`} />
              <Fact k={t('Free visits')} v={t('{{used}} / {{all}} use hui', { used: c.freeVisitsUsed, all: c.freeVisitsAllowed })} />
              <Fact k={t('Cover')} v={[c.laborCovered && t('Mazdoori'), c.gasRefillCovered && t('Gas refill'), c.freePartsAllowed && t('Parts')].filter(Boolean).join(', ') || t('Sirf visits')} />
              <Fact k={t('Cover nahi')} v={c.exclusions} />
              <Fact k={t('Note')} v={c.notes} />
            </View>
          </Card>
          <DetailSection title={t('Paisa')}>
            <DetailRow label={t('Contract ki qeemat')} value={<Amount value={c.contractValue} />} />
            <DetailRow label={t('Mila')} value={<Amount value={c.paidAmount} />} />
            <DetailRow label={t('Baqi')} value={<Amount value={due} weight="bold" color={due > 0 ? th.colors.warning.text : undefined} />} />
            <DetailRow label={t('Customer ne bachaya')} value={<Amount value={c.totalLaborSaved} />} last />
          </DetailSection>
          {manage && (
            <Row gap={2} wrap>
              <Button size="sm" variant="soft" icon={Wrench} onPress={() => router.push('/appliances/service-requests/new' as never)}>{t('Visit darj karein')}</Button>
              <Button size="sm" variant="soft" icon={Pencil} onPress={() => router.push({ pathname: '/appliances/amc-contracts/new', params: { edit: c.id } } as never)}>{t('Badlein')}</Button>
              {c.status === 'SUSPENDED'
                ? <Button size="sm" variant="soft" icon={Play} loading={busy} onPress={() => guard(() => { setBusy(true); void run(() => amcContractsApi.updateStatus(c.id, { status: 'ACTIVE' }), t('Halat badal gayi'))().catch((e) => toast.error(errText(e, t('Nahi hua')))).finally(() => setBusy(false)); })}>{t('Dobara chalu')}</Button>
                : c.status === 'ACTIVE' && <Button size="sm" variant="ghost" icon={Pause} onPress={() => setDialog('suspend')}>{t('Roken')}</Button>}
              {c.status !== 'CANCELLED' && <Button size="sm" variant="ghost" icon={XCircle} onPress={() => setDialog('cancel')}>{t('Cancel')}</Button>}
            </Row>
          )}
          {c.relatedRequests && c.relatedRequests.length > 0 && (
            <DetailSection title={t('Is contract ki visits')}>
              {c.relatedRequests.slice(0, 8).map((r, i) => <ListRow key={r.id} dense divider={i < Math.min(c.relatedRequests!.length, 8) - 1} chevron onPress={() => router.push(`/appliances/service-requests/${r.id}` as never)} title={r.requestNumber} subtitle={r.reportedIssue} trailing={<Text size="xs" tone="muted">{serviceStatus(r.status).label}</Text>} />)}
            </DetailSection>
          )}
        </View>
      )}
      {c && (
        <>
          <PayMoneySheet open={dialog === 'pay'} onClose={close} title={t('Paisa lein — {{contractNumber}}', { contractNumber: c.contractNumber })} due={due}
            onConfirm={(v) => run(() => amcContractsApi.addPayment(c.id, { amount: v.amount, paymentMethod: v.paymentMethod, note: v.note }), t('Paisa mil gaya'), true)()} />
          <ReasonSheet open={dialog === 'cancel'} onClose={close} title={t('Contract cancel karein')} confirm={t('Cancel karein')} presets={[t('Customer ne mana kar diya'), t('Unit bik gaya'), t('Galat contract')]}
            onConfirm={(reason) => run(() => amcContractsApi.updateStatus(c.id, { status: 'CANCELLED', reason }), t('Halat badal gayi'))()} />
          <ReasonSheet open={dialog === 'suspend'} onClose={close} title={t('Contract rokein')} confirm={t('Rokein')} presets={[t('Paisa nahi aaya'), t('Customer shehar se bahar')]}
            onConfirm={(reason) => run(() => amcContractsApi.updateStatus(c.id, { status: 'SUSPENDED', reason }), t('Halat badal gayi'))()} />
          <RenewSheet c={c} open={dialog === 'renew'} onClose={close} onDone={(n) => { refresh(true); toast.success(t('Renew — naya contract {{n}}', { n })); void q.refetch(); }} />
        </>
      )}
    </DetailTemplate>
  );
}

function RenewSheet({ c, open, onClose, onDone }: { c: AmcContract; open: boolean; onClose: () => void; onDone: (number: string) => void }) {
  const th = useTheme();
  const [months, setMonths] = useState<number | null>(12);
  const [value, setValue] = useState<number | null>(null);
  const [paid, setPaid] = useState<number | null>(null);
  const [visits, setVisits] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setMonths(12); setValue(Number(c.contractValue) || null); setPaid(null); setVisits(c.freeVisitsAllowed); setMethod('CASH'); } }, [open, c.id, c.contractValue, c.freeVisitsAllowed]);
  const v = value ?? 0;
  const p = paid ?? 0;
  const run = async () => {
    setBusy(true);
    try { const r = await amcContractsApi.renew(c.id, { durationMonths: months || 12, contractValue: v, paidAmount: p, paymentMethod: method, freeVisitsAllowed: visits ?? 0 }); onDone(r.contractNumber); onClose(); }
    catch (e) { toast.error(errText(e, t('Renew nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Renew — {{contractNumber}}', { contractNumber: c.contractNumber })} description={t('Naya contract purane ke khatam hone ki date se shuru hoga')}
      footer={<Button fullWidth size="lg" icon={RefreshCw} loading={busy} disabled={!(v > 0) || p > v + 0.01} onPress={() => void run()}>{t('Renew karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <NumberInput label={t('Muddat (mahine)')} integer value={months} onChangeValue={setMonths} />
        <NumberInput label={t('Free visits')} integer value={visits} onChangeValue={setVisits} />
        <MoneyInput label={t('Contract ki qeemat')} value={value} onChangeValue={setValue} />
        <MoneyInput label={t('Abhi kitna mila')} value={paid} onChangeValue={setPaid} error={p > v + 0.01 ? t('Qeemat se zyada nahi') : undefined} />
        {p > 0 && <MethodChips value={method} onChange={setMethod} />}
        {v - p > 0 && p >= 0 && <Text size="sm" tone="warning">{t('{{due}} customer ke khata me jayega', { due: formatMoney(Math.max(v - p, 0)) })}</Text>}
      </View>
    </Sheet>
  );
}
