/** One contractor site (web ProjectDetailPage): money (quoted, billed, delivered, still to send), its quotations and challans, and its stage. */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { BookOpen, FilePlus, Pencil, Phone, Truck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { PROJECT_NEXT, deliveredPct } from '@nafaa/core/industries/hardware';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, DetailRow, DetailSection, DetailTemplate, ListRow, ProgressBar, Row, StatusPill, Text, toast, useTheme } from '@/design';
import { Fact, callPhone, errText, useDeskOnline } from '../../_shared/trade/desk';
import { projectsApi } from '../api';
import { KEYS, challanStatus, projectStatus, quoteStatus, refreshHardware, shortDate } from '../meta';

export function ProjectDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const { guard } = useDeskOnline('hardwareDesk');
  const q = useQuery({ queryKey: [KEYS.project, id], queryFn: () => projectsApi.getOne(id!), enabled: !!id });
  const [busy, setBusy] = useState('');
  const p = q.data;
  const st = projectStatus(p?.status);
  const pct = p ? deliveredPct(p.totalOrdered, p.totalDelivered) : 0;
  const quotations = p?.quotations ?? [];
  const deliveries = p?.deliveries ?? [];

  const move = (s: string) => guard(async () => {
    setBusy(s);
    try { const r = await projectsApi.updateStatus(id!, s); refreshHardware([KEYS.project, KEYS.projects]); toast.success(projectStatus(r.status).label); void q.refetch(); } catch (e) { toast.error(errText(e, t('Status nahi badla'))); } finally { setBusy(''); }
  });

  return (
    <DetailTemplate title={p?.name ?? t('Site')} subtitle={p ? `${p.projectNumber} · ${p.customerName}${p.contractorName ? ` · ${t('Thekedar {{n}}', { n: p.contractorName })}` : ''}` : undefined}
      loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      bottomActions={p ? (
        <>
          <Button variant="secondary" icon={Truck} style={{ flex: 1 }} onPress={() => router.push(`/hardware/deliveries/new?project=${p.id}` as never)}>{t('Challan')}</Button>
          <Button icon={FilePlus} style={{ flex: 1 }} onPress={() => router.push(`/hardware/quotations/new?project=${p.id}` as never)}>{t('Quotation')}</Button>
        </>
      ) : undefined}>
      {p && (
        <View style={{ gap: th.space(3) }}>
          <Row gap={1.5} wrap><StatusPill tone={st.tone}>{st.label}</StatusPill>{p.projectType ? <Badge>{p.projectType}</Badge> : null}</Row>
          <DetailSection title={t('Hisaab')}>
            <DetailRow label={t('Bill / maal')} value={<Amount value={p.totalOrdered} />} />
            <DetailRow label={t('Pohanch chuka')} value={<Text size="sm" weight="semibold" ltr>{`${formatMoney(p.totalDelivered)} · ${pct}%`}</Text>} />
            <DetailRow label={t('Bhejna baqi')} value={<Amount value={p.totalPending} />} />
            <DetailRow label={t('Quotation (maani hui)')} value={<Amount value={p.totalQuoted} />} />
            <DetailRow label={t('Budget')} value={<Text size="sm" ltr>{p.estimatedBudget ? formatMoney(p.estimatedBudget) : '—'}</Text>} last />
          </DetailSection>
          {p.totalOrdered > 0 && <ProgressBar value={pct / 100} />}
          <Card title={t('Site')}>
            <View style={{ gap: th.space(2) }}>
              <Fact k={t('Pata')} v={[p.siteAddress, p.area, p.city].filter(Boolean).join(', ')} />
              <Fact k={t('Malik')} v={[p.customerName, p.customerPhone].filter(Boolean).join(' · ')} />
              <Fact k={t('Thekedar')} v={[p.contractorName, p.contractorPhone].filter(Boolean).join(' · ')} />
              <Fact k={t('Site par rabta')} v={p.siteContactPhone} />
              <Fact k={t('Shuru')} v={p.startDate ? shortDate(p.startDate) : undefined} />
              <Fact k={t('Khatam (andaza)')} v={p.expectedEndDate ? shortDate(p.expectedEndDate) : undefined} />
              <Fact k={t('Note')} v={p.notes} />
              <Row gap={2} wrap>
                {(p.siteContactPhone ?? p.contractorPhone ?? p.customerPhone) ? <Button size="sm" variant="soft" icon={Phone} onPress={() => callPhone(p.siteContactPhone ?? p.contractorPhone ?? p.customerPhone)}>{t('Call')}</Button> : null}
                {can(P.CUSTOMERS_EDIT) ? <Button size="sm" variant="soft" icon={Pencil} onPress={() => router.push({ pathname: '/hardware/projects/new', params: { edit: p.id } } as never)}>{t('Badlein')}</Button> : null}
                {p.customerId ? <Button size="sm" variant="soft" icon={BookOpen} onPress={() => router.push(`/customers/${p.customerId}` as never)}>{t('Khata')}</Button> : null}
              </Row>
            </View>
          </Card>
          <Card title={t('Kaam ka marhala')}>
            <Row gap={2} wrap>
              {(PROJECT_NEXT[p.status] ?? []).map((s) => <Button key={s} size="sm" variant={s === 'CANCELLED' ? 'ghost' : 'secondary'} loading={busy === s} onPress={() => move(s)}>{projectStatus(s).label}</Button>)}
            </Row>
          </Card>
          <Card flush title={t('Quotations')}>
            {quotations.length === 0 ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Abhi koi quotation nahi.')}</Text></View> : quotations.map((x, i) => (
              <ListRow key={x.id} dense divider={i < quotations.length - 1} chevron onPress={() => router.push(`/hardware/quotations/${x.id}` as never)} title={x.quotationNumber} subtitle={`${shortDate(x.createdAt)} · ${quoteStatus(x.status).label}`} trailing={<Text size="sm" weight="bold" ltr>{formatMoney(x.total)}</Text>} />
            ))}
          </Card>
          <Card flush title={t('Challan')}>
            {deliveries.length === 0 ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Abhi koi challan nahi.')}</Text></View> : deliveries.map((d, i) => (
              <ListRow key={d.id} dense divider={i < deliveries.length - 1} chevron onPress={() => router.push(`/hardware/deliveries/${d.id}` as never)} title={d.deliveryNumber} subtitle={d.items.map((z) => z.itemName).join(', ')} trailing={<Text size="xs" tone="muted">{challanStatus(d.status).label}</Text>} />
            ))}
          </Card>
        </View>
      )}
    </DetailTemplate>
  );
}
