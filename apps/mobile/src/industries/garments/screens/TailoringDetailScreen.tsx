/**
 * One stitching order (web TailoringDetailPage): progress strip, customer and
 * dates, garments with their costs, the measurement used, payments, and the
 * actions for the next step, money, going back a step and cancel.
 */

import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { CheckCircle2, Undo2, Wallet, XCircle } from 'lucide-react-native';
import { View } from 'react-native';
import { TAILORING_FLOW, TAILORING_PREV, flowIndex, isClosed, tailoringNext, type TailoringStatus } from '@nafaa/core/industries/garments';
import { formatDate, formatDateTime } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Button, Card, DetailRow, DetailSection, DetailTemplate, ProgressBar, StatusPill, Text, useTheme } from '@/design';
import { tailoringApi } from '../api';
import { useTailoringActions } from '../components/useJobActions';
import { FLOW_LABEL, TAILORING_KEY, dueOf, garmentLabel, measureLabel, priorityOf, stepLabel, tailoringStatus, whenText } from '../meta';
import { MEASURE_FIELDS } from '../api';

export function TailoringDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const act = useTailoringActions();
  const q = useQuery({ queryKey: [TAILORING_KEY, 'one', id], queryFn: () => tailoringApi.getOne(id), enabled: !!id });
  const o = q.data;
  const st = tailoringStatus(o?.orderStatus);
  const closed = isClosed(o?.orderStatus);
  const next = o ? tailoringNext(o.orderStatus as TailoringStatus) : null;
  const due = o ? dueOf(o) : 0;
  const idx = o ? flowIndex(o.orderStatus as TailoringStatus) : -1;
  const manage = can(P.POS_USE);
  const m = o?.measurementProfile;
  const measures = m ? MEASURE_FIELDS.filter((k) => m[k] != null && m[k] !== 0) : [];

  return (
    <DetailTemplate title={o?.orderNumber ?? t('Silai order')} subtitle={o ? `${o.customerName ?? ''}${o.customerPhone ? ` · ${o.customerPhone}` : ''}` : undefined}
      loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} refreshing={q.isRefetching} onRefresh={() => void q.refetch()}
      bottomActions={o && manage && !closed ? (
        <>
          {due > 0 && <Button variant="secondary" icon={Wallet} style={{ flex: 1 }} onPress={() => act.pay(o)}>{t('Payment')}</Button>}
          {next && <Button icon={CheckCircle2} style={{ flex: 1 }} loading={act.busyId === o.id} onPress={() => act.next(o)}>{stepLabel(next.step)}</Button>}
        </>
      ) : undefined}>
      {o && (
        <>
          <Card>
            <View style={{ gap: th.space(2) }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <StatusPill tone={st.tone}>{t(st.label)}</StatusPill>
                <StatusPill tone={priorityOf(o.priority).tone}>{t(priorityOf(o.priority).label)}</StatusPill>
              </View>
              {idx >= 0 && <>
                <ProgressBar value={(idx + 1) / TAILORING_FLOW.length} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {TAILORING_FLOW.map((f, i) => <Text key={f.key} size="2xs" tone={i <= idx ? 'default' : 'muted'} weight={i === idx ? 'bold' : 'regular'}>{t(FLOW_LABEL[f.key])}</Text>)}
                </View>
              </>}
              <DetailRow label={t('Total')} value={<Amount value={o.total} weight="bold" />} />
              <DetailRow label={t('Advance / mila')} value={<Amount value={o.paidAmount} />} />
              <DetailRow label={t('Baqi')} value={<Amount value={due} tone={due > 0 ? 'danger' : 'success'} />} last />
            </View>
          </Card>
          <DetailSection title={t('Order')}>
            <DetailRow label={t('Order date')} value={formatDate(o.orderDate, { year: true })} />
            <DetailRow label={t('Kab dena hai')} value={o.promisedDate ? `${formatDate(o.promisedDate, { year: true })} · ${whenText(o.promisedDate, closed)}` : '—'} />
            <DetailRow label={t('Karigar')} value={o.tailorName ?? '—'} last={!o.designInstructions} />
            {!!o.designInstructions && <DetailRow label={t('Design ki hidayat')} value={o.designInstructions} last />}
          </DetailSection>
          <DetailSection title={t('Kapre')}>
            {o.items.map((i, k) => (
              <DetailRow key={i.id} last={k === o.items.length - 1}
                label={`${i.quantity > 1 ? `${i.quantity}x ` : ''}${i.garmentName}${i.categoryType ? ` · ${garmentLabel(i.categoryType)}` : ''}`}
                value={<Amount value={i.total} />} />
            ))}
          </DetailSection>
          {measures.length > 0 && m && (
            <DetailSection title={`${t('Measurement')} · ${m.profileName} (${m.unit === 'CM' ? 'cm' : 'inch'})`}>
              {measures.map((k, i) => <DetailRow key={k} label={measureLabel(k)} value={String(m[k])} last={i === measures.length - 1} />)}
            </DetailSection>
          )}
          {!!o.payments?.length && (
            <DetailSection title={t('Payments')}>
              {o.payments.map((p, i) => <DetailRow key={p.id} label={`${formatDateTime(p.paidAt)} · ${p.paymentMethod}`} value={<Amount value={p.amount} />} last={i === o.payments!.length - 1} />)}
            </DetailSection>
          )}
          {o.bill && <DetailSection title={t('Bill')}><DetailRow label={o.bill.saleNumber} value={<Amount value={o.bill.total} />} last /></DetailSection>}
          {manage && !closed && (
            <View style={{ gap: th.space(2) }}>
              {TAILORING_PREV[o.orderStatus as TailoringStatus] && <Button variant="soft" icon={Undo2} onPress={() => act.back(o)}>{t('Ek step peeche')}</Button>}
              <Button variant="ghost" icon={XCircle} onPress={() => act.cancel(o)}>{t('Order cancel karein')}</Button>
            </View>
          )}
        </>
      )}
      {act.modals}
    </DetailTemplate>
  );
}
