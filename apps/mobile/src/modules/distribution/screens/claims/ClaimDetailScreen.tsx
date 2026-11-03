/** One claim: its lines, status and money received; submit it to the company, record money, cancel. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { CheckCircle2, HandCoins, Send, Share2, Tags, FileText } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, Card, confirm, DetailSection, DetailTemplate, IconButton, Row, StatTile, StatusPill, Text, toast, useTheme } from '@/design';
import { CLAIM_STATUS_LABEL, phase2Api } from '../../api/phase2.api';
import { DistributionGate } from '../../components/DistributionGate';
import { ClaimLines, CLAIMS_KEY, RECEIVED_VIA, ReceiveClaimSheet, SubmitClaimSheet } from '../../components/ClaimParts';
import { CachedNote, shareText } from '../../components/parts';
import { dayKeyLabel, dayYearLabel, rs, trim } from '../../lib/meta';
import { CLAIM_TONE } from './ClaimsScreen';

export function ClaimDetailScreen() {
  return <DistributionGate title={t('Claims')}><Body /></DistributionGate>;
}

function Body() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const can = usePermission();
  const canManage = can(P.DISTRIBUTION_CLAIMS_MANAGE);
  const q = useQuery({ queryKey: [...CLAIMS_KEY, 'one', id], queryFn: () => phase2Api.claim(id!), enabled: !!id });
  const [submitting, setSubmitting] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const s = q.data;
  const c = s?.claim;
  const live = !!c && (c.status === 'DRAFT' || c.status === 'SUBMITTED');
  const done = (msg: string) => { void qc.invalidateQueries({ queryKey: CLAIMS_KEY }); toast.success(msg); };
  const cancel = useMutation({ mutationFn: () => phase2Api.cancelClaim(id!), onSuccess: () => done(t('Claim cancel ho gaya')) });

  const askCancel = async () => {
    if (await confirm({ title: t('Cancel this claim?'), message: t('Lines dobara claim karne ke liye khul jayengi.'), confirmLabel: t('Cancel claim'), tone: 'danger' })) cancel.mutate();
  };
  const share = () => {
    if (!s || !c) return;
    const head = `${c.number} — ${s.supplier?.name ?? ''}\n${dayKeyLabel(c.fromKey)} – ${dayKeyLabel(c.toKey)}\n${t('Total')}: ${rs(c.total)}`;
    const lines = c.lines.map((l) => `${l.kind === 'SCHEME' ? (l.invoiceNumber ?? l.docNumber) : l.docNumber} | ${l.customerName ?? ''} | ${l.productName ?? ''} | ${l.kind === 'SCHEME' ? `${rs(l.discount)}${l.freeQty ? ` + ${trim(l.freeQty)} free` : ''}` : rs(l.returnValue)}`);
    void shareText([head, '', ...lines].join('\n'));
  };

  return (
    <>
      <DetailTemplate
        title={c ? c.number : t('Claim')}
        subtitle={c ? `${s?.supplier?.name ?? 'Company'} · ${dayKeyLabel(c.fromKey)} – ${dayKeyLabel(c.toKey)}` : undefined}
        loading={q.isLoading} error={q.error} onRetry={q.refetch} onRefresh={q.refetch} refreshing={q.isRefetching}
        actions={c ? <IconButton icon={Share2} label={t('Share')} onPress={share} /> : undefined}
        bottomActions={c && canManage && live ? (
          <>
            {c.status === 'DRAFT' && <Button variant="secondary" style={{ flex: 1 }} icon={Send} onPress={() => setSubmitting(true)}>{t('Company ko diya')}</Button>}
            <Button style={{ flex: 1 }} icon={CheckCircle2} onPress={() => setReceiving(true)}>{t('Paisa mila')}</Button>
          </>
        ) : undefined}
      >
        {s && c && (
          <>
            <CachedNote query={q} />
            <Row gap={2} wrap>
              <StatusPill tone={CLAIM_TONE[c.status]}>{t(CLAIM_STATUS_LABEL[c.status])}</StatusPill>
              {c.reference ? <Text size="xs" tone="muted">{t('Ref {{reference}}', { reference: c.reference })}</Text> : null}
              {c.createdByName ? <Text size="xs" tone="muted">{t('Banaya {{createdByName}}, {{createdAt}}', { createdByName: c.createdByName, createdAt: dayYearLabel(c.createdAt) })}</Text> : null}
            </Row>
            {c.note ? <Text size="sm" tone="muted">{c.note}</Text> : null}
            <Row gap={2}>
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="accent" icon={FileText} label={t('Total')} value={rs(c.total)} />
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" icon={CheckCircle2} label={t('Mila')} value={rs(c.receivedAmount)} />
            </Row>
            <Row gap={2}>
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="warning" icon={HandCoins} label={t('Baqi')} value={rs(c.balance)} />
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Tags} label={t('Lines')} value={String(c.lines.length)} />
            </Row>
            {s.receipts.length > 0 && (
              <Card tone="success">
                {s.receipts.map((r) => <Text key={r.id} size="sm">{r.incomeNumber}: {rs(r.amount)} · {dayYearLabel(r.incomeDate)} · {t(RECEIVED_VIA[r.receivedVia] ?? r.receivedVia)}</Text>)}
                <Text size="xs" tone="muted">{t('Doosri aamdani (Other income) me likha gaya — profit me shamil.')}</Text>
              </Card>
            )}
            <DetailSection title={t('Lines')}><View style={{ padding: th.space(2) }}><ClaimLines lines={c.lines} /></View></DetailSection>
            {canManage && live && !c.receivedAmount && <Button variant="danger" loading={cancel.isPending} onPress={askCancel}>{t('Cancel karein')}</Button>}
          </>
        )}
      </DetailTemplate>
      {submitting && <SubmitClaimSheet id={id!} onClose={() => setSubmitting(false)} onDone={() => { setSubmitting(false); done(t('Claim company ko diya gaya')); }} />}
      {receiving && c && <ReceiveClaimSheet id={id!} balance={c.balance} onClose={() => setReceiving(false)} onDone={() => { setReceiving(false); done(t('Paisa likh diya')); }} />}
    </>
  );
}

