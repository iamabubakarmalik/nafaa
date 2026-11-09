/**
 * One campaign's queue (web CampaignQueuePage): the next customer waits on
 * top; "WhatsApp kholein" opens the chat with the message filled in and marks
 * it sent, then the next one comes up. Replies are ticked by hand; an order
 * from the same phone within 7 days shows as converted.
 */

import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, MessageCircle, MessageSquareReply, SkipForward, Undo2, Users } from 'lucide-react-native';
import { formatMoney, formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { Badge, Button, Card, EmptyState, HeroAmount, IconButton, ListTemplate, PressableScale, Text, toast, useTheme } from '@/design';
import { apiErrorMessage } from '../api/online';
import { retentionApi, type CampaignDetail, type CampaignRecipient } from '../api/retention';
import { CommerceHero } from '../components/CommerceHero';
import { openWhatsApp } from '../lib/device';
import { useOnlineGuard } from '../lib/online';
import { CAMPAIGN_KEY } from './CampaignsScreen';

type Tab = 'PENDING' | 'DONE' | 'CONVERTED';

export function CampaignQueueScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const { guard } = useOnlineGuard();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('PENDING');
  const key = ['online-campaign', id];
  const q = useQuery({ queryKey: key, queryFn: () => retentionApi.campaign(String(id)), enabled: !!id });
  const mark = useMutation({
    mutationFn: (v: { rid: string; status?: 'SENT' | 'SKIPPED' | 'PENDING'; replied?: boolean }) => retentionApi.markRecipient(String(id), v.rid, { status: v.status, replied: v.replied }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key });
      qc.setQueryData<CampaignDetail>(key, (old) => old && ({
        ...old,
        recipients: old.recipients.map((r) => (r.id === v.rid ? { ...r, ...(v.status && { status: v.status, sentAt: v.status === 'SENT' ? (r.sentAt ?? new Date().toISOString()) : r.sentAt }), ...(v.replied !== undefined && { replied: v.replied }) } : r)),
      }));
    },
    onError: (e) => { toast.error(apiErrorMessage(e, t('Nahi hua'))); qc.invalidateQueries({ queryKey: key }); },
    onSettled: () => qc.invalidateQueries({ queryKey: CAMPAIGN_KEY }),
  });

  const c = q.data;
  const rs = c?.recipients ?? [];
  const next = rs.find((r) => r.status === 'PENDING') ?? null;
  const sent = rs.filter((r) => r.status === 'SENT').length;
  const converted = rs.filter((r) => r.converted);
  const send = (r: CampaignRecipient) => {
    void openWhatsApp(r.phone, r.text);
    mark.mutate({ rid: r.id, status: 'SENT' });
  };
  const list = rs.filter((r) => (tab === 'PENDING' ? r.status === 'PENDING' : tab === 'CONVERTED' ? !!r.converted : r.status !== 'PENDING'));

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <CommerceHero title={c?.name} chip={t('{{count}} customers', { count: rs.length })} loading={q.isLoading}
        stats={[
          { label: t('Bheje'), value: `${sent}/${rs.length}` },
          { label: t('Jawab aaya'), value: String(rs.filter((r) => r.replied).length) },
          { label: t('Order aaye'), value: String(converted.length) },
          { label: t('Sale'), value: <HeroAmount value={converted.reduce((s, r) => s + (r.converted?.total ?? 0), 0)} size="lg" /> },
        ]} />
      {c && (next ? (
        <Card title={next.name || t('Naam nahi')} description={t('Agla customer · {{count}} baqi', { count: rs.filter((r) => r.status === 'PENDING').length })}>
          <Text size="sm" tone="muted" ltr>{next.phone}</Text>
          <Text size="sm" style={{ marginTop: th.space(2) }}>{next.text}</Text>
          <View style={{ flexDirection: 'row', gap: th.space(2), marginTop: th.space(3) }}>
            <Button variant="success" icon={MessageCircle} onPress={guard(() => send(next))} style={{ flex: 1 }}>{t('WhatsApp kholein')}</Button>
            <Button variant="secondary" icon={SkipForward} onPress={guard(() => mark.mutate({ rid: next.id, status: 'SKIPPED' }))}>{t('Chhorein')}</Button>
          </View>
        </Card>
      ) : (
        <Card tone="success" title={t('Sab ko bhej diya')} description={t('7 din tak jo order aayenge woh "Order aaya" me dikhenge.')} />
      ))}
    </View>
  );

  return (
    <ListTemplate
      title={c?.name ?? t('Campaign')}
      summary={summary}
      filters={{ value: tab, onChange: (v) => setTab(v as Tab), options: [
        { value: 'PENDING', label: t('Baqi') }, { value: 'DONE', label: t('Bheje / chhore') }, { value: 'CONVERTED', label: t('Order aaya') },
      ] }}
      data={list}
      loading={q.isLoading}
      error={q.isError ? q.error : undefined}
      onRetry={q.refetch}
      refreshing={q.isRefetching}
      onRefresh={q.refetch}
      keyExtractor={(r) => r.id}
      renderItem={({ item: r }) => (
        <View style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(3), gap: th.space(1) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
            <Text size="base" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>{r.name || t('Naam nahi')}</Text>
            {r.status === 'SENT' && <Badge tone="success">{t('Bheja {{when}}', { when: r.sentAt ? formatRelative(r.sentAt) : '' })}</Badge>}
            {r.status === 'SKIPPED' && <Badge tone="neutral">{t('Chhora')}</Badge>}
          </View>
          <Text size="xs" tone="muted" numberOfLines={2}>{r.phone} · {r.text}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), flexWrap: 'wrap' }}>
            {r.converted && (
              <PressableScale onPress={() => router.push(`/online/orders/${r.converted!.orderId}` as never)}>
                <Badge tone="success" icon={CheckCircle2}>{t('Order #{{no}} · {{total}}', { no: r.converted.no, total: formatMoney(r.converted.total) })}</Badge>
              </PressableScale>
            )}
            {r.replied && <Badge tone="info">{t('Jawab aaya')}</Badge>}
            <View style={{ flex: 1 }} />
            {r.status === 'SENT' && <IconButton icon={MessageSquareReply} size="sm" label={r.replied ? t('Jawab hatayein') : t('Jawab aaya')} onPress={guard(() => mark.mutate({ rid: r.id, replied: !r.replied }))} />}
            {r.status === 'PENDING'
              ? <Button size="sm" variant="success" icon={MessageCircle} onPress={guard(() => send(r))}>{t('WhatsApp')}</Button>
              : <IconButton icon={Undo2} size="sm" label={t('Wapas list me')} onPress={guard(() => mark.mutate({ rid: r.id, status: 'PENDING' }))} />}
          </View>
        </View>
      )}
      empty={<EmptyState icon={Users} title={t('Is list me koi nahi')} />}
    />
  );
}
