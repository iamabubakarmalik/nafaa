/** Shared statement and payments of one network link (buyer and seller see the same figures). */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, CircleCheck, CircleDashed, CircleX, HandCoins, Plus, Undo2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import {
  Amount, Button, Card, EmptyState, ErrorState, Icon, ListRow, MoneyInput, Row, Select, Sheet, SkeletonRows, StatTile, Text, TextArea, Input, confirm, toast, useTheme,
} from '@/design';
import { dayLabel, dayTime, rs, type Tone } from '@/modules/distribution/lib/meta';
import {
  TRADE_KEY, tradeApi, tradeError, type MoneyMethod, type Payment, type Side, type Statement,
} from '../api/trade.api';
import { METHODS, METHOD_LABEL, PAYMENT_STATUS } from '../lib/meta';
import { CachedLine, Pill } from './shared';

const ENTRY_STATE: Record<string, { label: string; tone: Tone }> = {
  ON_THE_WAY: { label: t('Raste me'), tone: 'orange' },
  BOTH: { label: t('Dono khaton me'), tone: 'green' },
  BUYER_TO_RECEIVE: { label: t('Receive baqi'), tone: 'amber' },
  PENDING: { label: t('Confirm baqi'), tone: 'amber' },
  CONFIRMED: { label: t('Dono khaton me'), tone: 'green' },
  DISPUTED: { label: t('Ikhtilaf'), tone: 'rose' },
};

export function StatementView({ linkId }: { linkId: string }) {
  const th = useTheme();
  const q = useQuery({ queryKey: [TRADE_KEY, 'statement', linkId], queryFn: () => tradeApi.statement(linkId) });
  if (q.isLoading) return <SkeletonRows count={4} />;
  if (!q.data) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const s: Statement = q.data;
  const tt = s.totals;
  const seller = s.link.side === 'SELLER';
  const gap = s.ownBalance != null ? Math.round((s.ownBalance - tt.agreedBalance) * 100) / 100 : null;
  const pend = tt.pendingFromSeller + tt.pendingFromBuyer;
  return (
    <View style={{ gap: th.space(3) }}>
      <CachedLine query={q} />
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="brand" label={seller ? t('Lena hai (dono ka manna)') : t('Dena hai (dono ka manna)')}
          value={<Amount value={tt.agreedBalance} size="xl" weight="bold" />} hint={t('Delivered maal − wapsi − confirm payments')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone={tt.onTheWay > 0 ? 'warning' : 'neutral'} label={t('Raste me')}
          value={<Amount value={tt.onTheWay} size="xl" weight="bold" />} hint={t('Invoice bani, deliver nahi hua')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone={pend > 0 ? 'warning' : 'neutral'} label={t('Confirm baqi')}
          value={<Amount value={pend} size="xl" weight="bold" />}
          hint={seller
            ? t('Dukaan ki {{pendingFromBuyer}} · aap ki {{pendingFromSeller}}', { pendingFromBuyer: rs(tt.pendingFromBuyer), pendingFromSeller: rs(tt.pendingFromSeller) })
            : t('Supplier ki {{pendingFromSeller}} · aap ki {{pendingFromBuyer}}', { pendingFromSeller: rs(tt.pendingFromSeller), pendingFromBuyer: rs(tt.pendingFromBuyer) })} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={t('Paid (confirm)')}
          value={<Amount value={tt.paid} size="xl" weight="bold" />} hint={t('Kul delivered {{value}}', { value: rs(tt.delivered - tt.returns) })} />
      </Row>
      {tt.disputed > 0 && (
        <Card tone="danger"><Text size="sm" tone="danger">{t('{{disputed}} ki payment par ikhtilaf hai — neeche dekhein aur doosri party se baat karein.', { disputed: rs(tt.disputed) })}</Text></Card>
      )}
      {gap != null && Math.abs(gap) >= 1 && (
        <Card tone="info">
          <Text size="sm">
            {t('Aap ke {{value}} me balance {{ownBalance}} hai. Network ka hisaab {{agreedBalance}} hai — farq {{value2}} {{value3}}link se pehle ke purane hisaab ya baqi kaam ka hai.', {
              value: seller ? t('customer khate') : t('supplier khate'), ownBalance: rs(s.ownBalance ?? 0), agreedBalance: rs(tt.agreedBalance), value2: rs(Math.abs(gap)),
              value3: tt.toReceive > 0 && !seller ? t('(receive baqi maal ki wajah se) ') : '',
            })}
          </Text>
        </Card>
      )}
      <Card title={t('Statement')} description={t('Yehi hisaab dono taraf dikhta hai')} flush>
        {!s.entries.length ? <EmptyState compact icon={HandCoins} title={t('Abhi koi Invoice ya payment nahi.')} /> : s.entries.map((e, i) => {
          const st = ENTRY_STATE[e.state] ?? { label: e.state, tone: 'slate' as Tone };
          return (
            <ListRow key={i} divider={i < s.entries.length - 1} title={e.text}
              subtitle={[dayLabel(e.at), e.ref].filter(Boolean).join(' · ')}
              trailing={(
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Amount value={e.debit ? e.debit : -e.credit} weight="semibold" tone={e.debit ? undefined : 'success'} />
                  <Pill tone={st.tone}>{st.label}</Pill>
                </View>
              )} />
          );
        })}
      </Card>
    </View>
  );
}

export function PaymentsView({ linkId, side, canManage }: { linkId: string; side: Side; canManage: boolean }) {
  const th = useTheme();
  const qc = useQueryClient();
  const [record, setRecord] = useState(false);
  const [dispute, setDispute] = useState<Payment | null>(null);
  const q = useQuery({ queryKey: [TRADE_KEY, 'payments', linkId], queryFn: () => tradeApi.payments({ linkId }) });
  const refresh = () => qc.invalidateQueries({ queryKey: [TRADE_KEY] });
  const act = useMutation({
    mutationFn: ({ kind, id }: { kind: 'confirm' | 'cancel'; id: string }) => (kind === 'confirm' ? tradeApi.confirmPayment(id) : tradeApi.cancelPayment(id)),
    onSuccess: (_r, v) => { toast.success(v.kind === 'confirm' ? t('Payment confirm — aap ke khate me bhi likh di') : t('Payment wapas li')); void refresh(); },
    onError: (e) => toast.error(tradeError(e)),
  });
  const rows = q.data ?? [];
  const other = side === 'SELLER' ? t('Dukaan') : t('Supplier');

  return (
    <View style={{ gap: th.space(3) }}>
      <CachedLine query={q} />
      <Text size="sm" tone="muted">{t('Ek taraf likhi payment doosri taraf confirm hone par hi us ke khate me jati hai')}</Text>
      {canManage && <Button icon={Plus} size="lg" onPress={() => setRecord(true)}>{t('Add payment')}</Button>}
      {q.isLoading ? <SkeletonRows count={3} /> : q.error && !q.data ? <ErrorState error={q.error} onRetry={q.refetch} />
        : !rows.length ? <EmptyState compact icon={HandCoins} title={t('Abhi koi payment nahi.')} />
          : rows.map((p) => {
            const can = canManage && (p.canConfirm || p.canDispute || p.canCancel);
            return (
              <Card key={p.id}>
                <Row gap={3}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: p.status === 'CONFIRMED' ? th.colors.success.soft : p.status === 'DISPUTED' ? th.colors.danger.soft : th.colors.warning.soft }}>
                    <Icon icon={p.status === 'CONFIRMED' ? CircleCheck : p.status === 'DISPUTED' ? CircleX : CircleDashed}
                      color={p.status === 'CONFIRMED' ? th.colors.success.text : p.status === 'DISPUTED' ? th.colors.danger.text : th.colors.warning.text} size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Row gap={2}><Amount value={p.amount} weight="bold" /><Text size="sm" tone="muted">{METHOD_LABEL[p.method] ?? p.method}</Text></Row>
                    <Text size="xs" tone="muted">
                      {dayTime(p.paidAt)} · {p.mine ? t('Aap ne likhi') : t('{{other}} ne likhi', { other })}{p.reference ? ` · ${p.reference}` : ''}{p.disputeReason ? ` · ${p.disputeReason}` : ''}
                    </Text>
                  </View>
                  <Pill tone={PAYMENT_STATUS[p.status].tone}>{p.status === 'PENDING' && p.mine ? t('{{other}} confirm karega', { other }) : PAYMENT_STATUS[p.status].label}</Pill>
                </Row>
                {can && (
                  <Row gap={2} style={{ marginTop: th.space(3) }}>
                    {p.canDispute && <Button variant="ghost" style={{ flex: 1 }} onPress={() => setDispute(p)}>{t('Dispute')}</Button>}
                    {p.canCancel && (
                      <Button variant="ghost" icon={Undo2} style={{ flex: 1 }} onPress={async () => {
                        if (await confirm({ title: t('Payment wapas lein?'), message: t('Aap ke khate me ulti entry lag jayegi.'), confirmLabel: t('Undo'), tone: 'danger' })) act.mutate({ kind: 'cancel', id: p.id });
                      }}>{t('Withdraw')}</Button>
                    )}
                    {p.canConfirm && <Button variant="success" icon={BadgeCheck} style={{ flex: 1 }} loading={act.isPending} onPress={() => act.mutate({ kind: 'confirm', id: p.id })}>{t('Confirm')}</Button>}
                  </Row>
                )}
              </Card>
            );
          })}
      {record && <RecordPaymentSheet linkId={linkId} side={side} onClose={() => setRecord(false)} />}
      {dispute && <DisputeSheet payment={dispute} onClose={() => setDispute(null)} />}
    </View>
  );
}

function RecordPaymentSheet({ linkId, side, onClose }: { linkId: string; side: Side; onClose: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<MoneyMethod>('CASH');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const save = useMutation({
    mutationFn: () => tradeApi.recordPayment(linkId, { amount: amount ?? 0, method, reference: reference.trim() || undefined, note: note.trim() || undefined }),
    onSuccess: () => { toast.success(t('Payment likh di — doosri party confirm karegi')); void qc.invalidateQueries({ queryKey: [TRADE_KEY] }); onClose(); },
    onError: (e) => toast.error(tradeError(e)),
  });
  return (
    <Sheet open onClose={onClose} title={side === 'SELLER' ? t('Payment received') : t('Payment to supplier')}
      description={side === 'SELLER' ? t('Aap ke customer khate me abhi lagegi; dukaan confirm karegi to us ke khate me bhi.') : t('Aap ke supplier khate me abhi lagegi; supplier confirm karega to us ke khate me bhi.')}
      footer={<Button fullWidth size="lg" loading={save.isPending} disabled={!((amount ?? 0) > 0)} onPress={() => save.mutate()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Raqam (Rs)')} value={amount} onChangeValue={setAmount} autoFocus />
        <Select label={t('Kaise')} value={method} onChange={(v) => setMethod(v as MoneyMethod)} options={METHODS.map((m) => ({ value: m, label: METHOD_LABEL[m] }))} />
        <Input label={t('Reference (marzi)')} placeholder={t('TRX no., cheque no.')} value={reference} onChangeText={setReference} />
        <TextArea label={t('Note (marzi)')} numberOfLines={2} value={note} onChangeText={setNote} />
      </View>
    </Sheet>
  );
}

function DisputeSheet({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const save = useMutation({
    mutationFn: () => tradeApi.disputePayment(payment.id, reason.trim()),
    onSuccess: () => { toast.success(t('Ikhtilaf bhej diya')); void qc.invalidateQueries({ queryKey: [TRADE_KEY] }); onClose(); },
    onError: (e) => toast.error(tradeError(e)),
  });
  return (
    <Sheet open onClose={onClose} title={t('{{amount}} par ikhtilaf', { amount: rs(payment.amount) })}
      footer={<Button fullWidth size="lg" variant="danger" loading={save.isPending} disabled={reason.trim().length < 3} onPress={() => save.mutate()}>{t('Send')}</Button>}>
      <TextArea label={t('Wajah')} numberOfLines={3} placeholder={t('Misal: yeh payment hamein nahi mili')} value={reason} onChangeText={setReason} />
    </Sheet>
  );
}
