/**
 * WhatsApp campaigns (web CampaignsPage): every campaign with sent, replied
 * and converted counts. Tapping one opens its one-by-one queue. New
 * campaigns are made on the web, where the segment and message are chosen.
 */

import { View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Megaphone, Send } from 'lucide-react-native';
import { formatMoney, formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { Badge, Button, EmptyState, HeroAmount, ListTemplate, PressableScale, ProgressBar, Text, useTheme } from '@/design';
import { retentionApi, type Campaign } from '../api/retention';
import { CommerceHero } from '../components/CommerceHero';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { Note } from '../components/bits';

export const CAMPAIGN_KEY = ['online-campaigns'] as const;

const TEMPLATE_LABEL: Record<Campaign['template'], string> = {
  WIN_BACK: t('Wapas bulayein'), NEW_ARRIVAL: t('Naya maal'), REVIEW: t('Review maangein'), RESTOCK: t('Stock wapas'), BIRTHDAY: t('Salgirah'), CUSTOM: t('Apna message'),
};

export function CampaignsScreen() {
  const th = useTheme();
  const q = useQuery({ queryKey: CAMPAIGN_KEY, queryFn: retentionApi.campaigns });
  const tt = q.data?.totals;

  const summary = (
    <View style={{ gap: th.space(3) }}>
      <CommerceHero chip={t('Ek ek karke')} loading={q.isLoading}
        stats={[
          { label: t('Bheje'), value: String(tt?.sent ?? 0), hint: t('{{count}} baqi', { count: tt?.pending ?? 0 }) },
          { label: t('Order aaye'), value: String(tt?.converted ?? 0), hint: t('7 din me · {{rate}}%', { rate: tt?.rate ?? 0 }) },
          { label: t('Sale'), value: <HeroAmount value={tt?.revenue ?? 0} size="lg" /> },
        ]} />
      <Note tone="info">{t('Naya campaign web par banayein (list aur message chunein). Yahan se ek ek chat bhejein.')}</Note>
    </View>
  );

  return (
    <ListTemplate
      title={t('WhatsApp campaigns')}
      actions={<OnlineMenuButton current="/online/campaigns" />}
      summary={summary}
      data={q.data?.campaigns ?? []}
      loading={q.isLoading}
      error={q.isError ? q.error : undefined}
      onRetry={q.refetch}
      refreshing={q.isRefetching}
      onRefresh={q.refetch}
      keyExtractor={(c) => c.id}
      renderItem={({ item: c }) => {
        const done = c.stats.sent + c.stats.skipped;
        return (
          <PressableScale onPress={() => router.push(`/online/campaigns/${c.id}` as never)}>
            <View style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(3), gap: th.space(1.5) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                <Text size="base" weight="bold" numberOfLines={1} style={{ flex: 1 }}>{c.name}</Text>
                {c.stats.converted > 0 && <Badge tone="success">{t('{{count}} order', { count: c.stats.converted })}</Badge>}
              </View>
              <Text size="xs" tone="muted" numberOfLines={1}>{[TEMPLATE_LABEL[c.template], formatRelative(c.createdAt), c.code ? `${t('Code')} ${c.code}` : null].filter(Boolean).join(' · ')}</Text>
              <ProgressBar value={c.stats.recipients ? done / c.stats.recipients : 0} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                <Text size="sm" tone="secondary" style={{ flex: 1 }}>
                  {t('{{sent}}/{{total}} bheje · {{replied}} jawab · {{sale}}', { sent: c.stats.sent, total: c.stats.recipients, replied: c.stats.replied, sale: formatMoney(c.stats.revenue) })}
                </Text>
                {c.stats.pending > 0 && <Button size="sm" variant="success" icon={Send} onPress={() => router.push(`/online/campaigns/${c.id}` as never)}>{t('Bhejein ({{count}})', { count: c.stats.pending })}</Button>}
              </View>
            </View>
          </PressableScale>
        );
      }}
      empty={<EmptyState icon={Megaphone} title={t('Abhi koi campaign nahi')} message={t('Web par Customers ya Campaigns se naya campaign banayein.')} />}
    />
  );
}
