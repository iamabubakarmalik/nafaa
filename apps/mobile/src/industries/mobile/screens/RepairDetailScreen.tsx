/**
 * One repair job (web RepairTicketDetailPage): the phone and customer, where the
 * job stands and the next step, the check, parts and labour, money taken, every
 * status change, and hand-over with the bill.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ban, CheckCircle2, Hammer, MessageCircle, Package, Pencil, Play, Plus, Printer, Receipt, ShieldCheck, Trash2, Wallet, Wrench, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { repairDue } from '@nafaa/core/industries/mobile';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatDate, formatDateTime, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Badge, Button, Card, DetailRow, DetailSection, DetailTemplate, HeroAmount, HeroText, IconButton, ListRow, PageHero, ProgressBar, Row, Text, confirm, toast, useTheme } from '@/design';
import { useCostMask } from '@/modules/sales/lib/mask';
import { REPAIR_TRANSITIONS, repairsApi, type RepairStatus } from '../api';
import { AddPartSheet, AddPaymentSheet, DeliverSheet, DiagnoseSheet, ReasonSheet } from '../components/RepairSheets';
import { MetaPill } from '../components/kit';
import { REPAIR_CLOSED, REPAIR_FLOW, REPAIR_KEY, daysTo, methodLabel, metaText, openWhatsApp, priorityOf, refreshMobile, repairStatusOf } from '../meta';
import { repairMessage, repairSlip, sendSlip } from '../slips';

type Pop = 'diagnose' | 'part' | 'pay' | 'deliver' | null;

export function RepairDetailScreen() {
  const th = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const canManage = usePermission()(P.MOBILE_REPAIRS_MANAGE);
  const shopName = useAuthStore((s) => s.tenant?.name) ?? '';
  const lang = useBillLanguage();
  const { cost } = useCostMask();
  const [pop, setPop] = useState<Pop>(null);
  const [reason, setReason] = useState<RepairStatus | null>(null);
  const q = useQuery({ queryKey: [REPAIR_KEY, 'one', id], queryFn: () => repairsApi.getOne(id), enabled: !!id });
  const tk = q.data;
  const refresh = () => refreshMobile([REPAIR_KEY, 'repair-stats'], true);

  const move = useMutation({
    mutationFn: (v: { to: RepairStatus; note?: string }) => repairsApi.updateStatus(id, { toStatus: v.to, note: v.note }),
    onSuccess: (_r, v) => { toast.success(t(repairStatusOf(v.to).label)); setReason(null); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Halat nahi badli'))),
  });
  const deliver = useMutation({
    mutationFn: (v: { amount: number; method: string }) => repairsApi.deliver(id, { amount: v.amount, paymentMethod: v.method }),
    onSuccess: (r) => { toast.success(r.sale ? t('Phone wapas — bill {{saleNumber}}', { saleNumber: r.sale.saleNumber }) : t('Phone wapas de diya')); setPop(null); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Wapas nahi hua'))),
  });
  const dropPart = async (partId: string, name: string, own: boolean) => {
    if (!(await confirm({ title: t('{{partName}} hatayein?', { partName: name }), message: own ? t('Stock wala part shelf par wapas chala jayega.') : undefined, tone: 'danger', confirmLabel: t('Hatayein') }))) return;
    try { await repairsApi.removePart(id, partId); toast.success(t('Part hata — stock wala part shelf par wapas')); refresh(); } catch (e) { toast.error(apiErrorMessage(e, t('Part nahi hata'))); }
  };

  const open = !!tk && !REPAIR_CLOSED.includes(tk.status) && !tk.saleId;
  const can = (to: RepairStatus) => !!tk && REPAIR_TRANSITIONS[tk.status].includes(to);
  const bill = tk ? (Number(tk.totalCost) > 0 ? Number(tk.totalCost) : Number(tk.estimatedCost) || 0) : 0;
  const due = tk ? repairDue({ totalCost: bill, paidAmount: tk.paidAmount }) : 0;
  const left = tk ? daysTo(tk.estimatedReadyAt) : null;
  const late = open && tk?.status !== 'READY' && left !== null && left < 0;
  const warrantyLeft = tk?.status === 'DELIVERED' ? daysTo(tk.warrantyEnds) : null;
  const claimable = tk?.status === 'DELIVERED' && warrantyLeft !== null && warrantyLeft >= 0;
  const flowAt = tk ? REPAIR_FLOW.indexOf(tk.status === 'AWAITING_APPROVAL' || tk.status === 'AWAITING_PARTS' ? 'DIAGNOSED' : tk.status) : 0;
  const parts = tk?.parts ?? [];
  const slip = (share: boolean) => { if (tk) void sendSlip(repairSlip(tk, lang), shopName, lang, share).catch((e) => toast.error(apiErrorMessage(e, t('Print nahi hua')))); };

  const next: Array<{ label: string; icon: typeof Play; run: () => void; primary?: boolean }> = [];
  if (tk && canManage && open) {
    if (tk.status === 'RECEIVED') next.push({ label: t('Check karein'), icon: Wrench, run: () => setPop('diagnose'), primary: true });
    if (can('IN_PROGRESS')) next.push({ label: t('Kaam shuru'), icon: Play, run: () => move.mutate({ to: 'IN_PROGRESS' }), primary: tk.status !== 'RECEIVED' });
    if (can('AWAITING_APPROVAL')) next.push({ label: t('Customer ki haan baqi'), icon: MessageCircle, run: () => move.mutate({ to: 'AWAITING_APPROVAL' }) });
    if (can('AWAITING_PARTS')) next.push({ label: t('Part ka intezar'), icon: Package, run: () => move.mutate({ to: 'AWAITING_PARTS' }) });
    if (can('READY')) next.push({ label: t('Tayyar hai'), icon: CheckCircle2, run: () => move.mutate({ to: 'READY' }), primary: true });
  }
  if (tk && canManage && can('DELIVERED')) next.push({ label: t('Wapas dein'), icon: Receipt, run: () => setPop('deliver'), primary: true });
  const st = repairStatusOf(tk?.status);

  return (
    <DetailTemplate
      title={tk ? `${tk.deviceBrand} ${tk.deviceModel}` : t('Repair job')}
      subtitle={tk ? `${tk.ticketNumber} · ${tk.customerName}` : undefined}
      loading={q.isLoading} error={tk ? null : q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={tk ? (
        <View style={{ flexDirection: 'row' }}>
          <IconButton icon={Printer} label={t('Parchi')} onPress={() => slip(false)} />
          {tk.customerPhone ? <IconButton icon={MessageCircle} label={t('WhatsApp')} onPress={() => openWhatsApp(tk.customerPhone, repairMessage(tk, shopName, lang, t(st.label)))} /> : null}
          {canManage ? <IconButton icon={Pencil} label={t('Badlein')} onPress={() => router.push(`/mobile/repairs/${tk.id}/edit` as never)} /> : null}
        </View>
      ) : undefined}
      summary={tk ? (
        <PageHero title={`${tk.deviceBrand} ${tk.deviceModel}`} chip={t(st.label)} stats={[
          { label: Number(tk.totalCost) > 0 ? t('Bill') : t('Andaza'), value: <HeroAmount value={bill} size="xl" /> },
          { label: t('Mila'), value: <HeroAmount value={Number(tk.paidAmount || 0)} size="xl" /> },
          { label: t('Baqi'), value: <HeroAmount value={due} size="xl" /> },
        ]} />
      ) : undefined}
      bottomActions={tk && canManage && next.length > 0 ? (
        <>{next.slice(-2).map((b) => <Button key={b.label} variant={b.primary ? 'primary' : 'secondary'} icon={b.icon} style={{ flex: 1 }} loading={move.isPending} onPress={b.run}>{b.label}</Button>)}</>
      ) : undefined}
    >
      {tk && (
        <>
          {tk.status !== 'CANCELLED' && (
            <Card>
              <ProgressBar value={Math.max(flowAt, 0) / (REPAIR_FLOW.length - 1)} />
              <Row gap={1} style={{ justifyContent: 'space-between' }}>{REPAIR_FLOW.map((s, i) => <Text key={s} size="2xs" weight={i === flowAt ? 'bold' : 'regular'} tone={i <= flowAt ? 'default' : 'muted'}>{t(repairStatusOf(s).label)}</Text>)}</Row>
              <Text size="xs" tone={late ? 'danger' : 'muted'}>{late ? `${t('Late hai — customer ko batayein.')} ` : ''}{st.next ? t(st.next) : ''}</Text>
            </Card>
          )}
          {(tk.warrantyOf || (tk.warrantyRepairs ?? []).length > 0) && (
            <Card tone="info">
              {tk.warrantyOf && <Text size="sm"><ShieldCheck size={14} color={th.colors.info.text} /> {t('Warranty claim — pehla job')} {tk.warrantyOf.ticketNumber}</Text>}
              {(tk.warrantyRepairs ?? []).map((w) => <Text key={w.id} size="sm" onPress={() => router.push(`/mobile/repairs/${w.id}` as never)}>{t('Is job par warranty claim')} {w.ticketNumber} · {t(repairStatusOf(w.status).label)}</Text>)}
            </Card>
          )}
          {canManage && open && (
            <Row gap={2} wrap>
              <Button variant="soft" size="sm" icon={Wrench} onPress={() => setPop('diagnose')}>{tk.diagnosedIssue ? t('Check badlein') : t('Check karein')}</Button>
              <Button variant="soft" size="sm" icon={Plus} onPress={() => setPop('part')}>{t('Part')}</Button>
              <Button variant="soft" size="sm" icon={Wallet} onPress={() => setPop('pay')}>{t('Advance')}</Button>
              {can('UNREPAIRABLE') && <Button variant="ghost" size="sm" icon={XCircle} onPress={() => setReason('UNREPAIRABLE')}>{t('Theek nahi hoga')}</Button>}
              {can('CANCELLED') && <Button variant="ghost" size="sm" icon={Ban} onPress={() => setReason('CANCELLED')}>{t('Cancel')}</Button>}
              {tk.status === 'READY' && <Button variant="ghost" size="sm" icon={Hammer} onPress={() => move.mutate({ to: 'IN_PROGRESS', note: 'Dobara kaam' })}>{t('Dobara kaam')}</Button>}
              {next.slice(0, -2).filter((b) => !['Check karein'].includes(b.label)).map((b) => <Button key={b.label} variant="secondary" size="sm" icon={b.icon} onPress={b.run}>{b.label}</Button>)}
            </Row>
          )}
          {canManage && claimable && <Button icon={ShieldCheck} variant="soft" onPress={() => router.push({ pathname: '/mobile/repairs/new', params: { warrantyOf: tk.id } } as never)}>{t('Warranty claim')}</Button>}

          <DetailSection title={t('Kharabi aur check')}>
            <DetailRow label={t('Customer ne kaha')} value={tk.reportedIssue} />
            <DetailRow label={t('Check me nikla')} value={tk.diagnosedIssue ?? t('Abhi check nahi hua')} />
            {tk.recommendedActions ? <DetailRow label={t('Kya karna hai')} value={tk.recommendedActions} /> : null}
            {tk.diagnosisNotes ? <DetailRow label={t('Andar ka note')} value={tk.diagnosisNotes} /> : null}
            <DetailRow label={t('Priority')} value={<Badge tone={priorityOf(tk.priority).tone}>{metaText(priorityOf(tk.priority))}</Badge>} />
            {tk.technicianName ? <DetailRow label={t('Technician')} value={tk.technicianName} /> : null}
            <DetailRow label={tk.status === 'DELIVERED' ? t('Repair warranty') : t('Tayyar hoga')} last
              value={tk.status === 'DELIVERED' ? (warrantyLeft !== null && warrantyLeft >= 0 ? t('{{warrantyLeft}} din', { warrantyLeft }) : t('Khatam')) : tk.estimatedReadyAt ? formatDate(tk.estimatedReadyAt) : '—'} />
          </DetailSection>

          <DetailSection title={t('Parts aur mazdoori')}>
            <DetailRow label={t('Mazdoori')} value={formatMoney(tk.laborCost)} />
            {parts.length === 0 ? <Text size="sm" tone="muted" style={{ padding: th.space(3) }}>{t('Koi part nahi laga')}</Text> : parts.map((p, i) => (
              <ListRow key={p.id} divider={i < parts.length - 1} dense title={p.partName}
                subtitle={`${p.quantity} × ${formatMoney(p.unitPrice)}${cost(Number(p.unitCost) * Number(p.quantity)) ? ` · ${t('cost')} ${cost(Number(p.unitCost) * Number(p.quantity))}` : ''}`}
                trailing={<Row gap={1}><Text weight="semibold" ltr>{formatMoney(p.totalPrice)}</Text>{canManage && open ? <IconButton icon={Trash2} label={t('Hatayein')} size="sm" variant="danger" onPress={() => void dropPart(p.id, p.partName, p.source === 'OWN_STOCK')} /> : null}</Row>} />
            ))}
          </DetailSection>

          <DetailSection title={t('Paise')}>
            {(tk.payments ?? []).length === 0 ? <Text size="sm" tone="muted" style={{ padding: th.space(3) }}>{t('Abhi koi paisa nahi mila')}</Text> : tk.payments!.map((p, i) => (
              <DetailRow key={p.id} last={i === tk.payments!.length - 1 && !tk.sale} label={`${formatDateTime(p.paidAt)} · ${methodLabel(p.paymentMethod)}`} value={formatMoney(p.amount)} />
            ))}
            {tk.sale ? <DetailRow last label={t('Bill {{n}} bana', { n: tk.sale.saleNumber })} value={`${t('Udhaar')} ${formatMoney(Number(tk.sale.creditAmount ?? 0))}`} /> : null}
          </DetailSection>

          <DetailSection title={t('Customer')}>
            <DetailRow label={t('Naam')} value={tk.customerName} />
            <DetailRow label={t('Phone')} value={tk.customerPhone} />
            {tk.customer && Number(tk.customer.balance) !== 0 ? <DetailRow label={t('Khata')} value={formatMoney(Number(tk.customer.balance))} /> : null}
            <DetailRow label={t('Phone')} value={`${tk.deviceBrand} ${tk.deviceModel}${tk.deviceColor ? ` · ${tk.deviceColor}` : ''}`} />
            {tk.imei1 ? <DetailRow label="IMEI" value={tk.imei1} /> : null}
            <DetailRow label={t('Saath')} value={[tk.hasSimCard && t('SIM'), tk.hasMemoryCard && t('Memory card')].filter(Boolean).join(', ') || t('Sirf phone')} last />
          </DetailSection>

          {(tk.statusLog ?? []).length > 0 && (
            <DetailSection title={t('Halat ki history')}>
              {tk.statusLog!.map((l, i) => (
                <ListRow key={l.id} dense divider={i < tk.statusLog!.length - 1} title={t(repairStatusOf(l.toStatus).label)} subtitle={`${formatDateTime(l.changedAt)}${l.note ? ` · ${l.note}` : ''}`} trailing={<MetaPill m={repairStatusOf(l.toStatus)} />} />
              ))}
            </DetailSection>
          )}
        </>
      )}
      <DiagnoseSheet ticket={pop === 'diagnose' ? tk ?? null : null} onClose={() => setPop(null)} />
      <AddPartSheet ticket={pop === 'part' ? tk ?? null : null} onClose={() => setPop(null)} />
      <AddPaymentSheet ticket={pop === 'pay' ? tk ?? null : null} onClose={() => setPop(null)} />
      <DeliverSheet ticket={pop === 'deliver' ? tk ?? null : null} pending={deliver.isPending} onConfirm={(amount, method) => deliver.mutate({ amount, method })} onClose={() => setPop(null)} />
      <ReasonSheet ticket={reason ? tk ?? null : null} to={reason} pending={move.isPending} onClose={() => setReason(null)} onConfirm={(note) => reason && move.mutate({ to: reason, note: note || undefined })} />
    </DetailTemplate>
  );
}
