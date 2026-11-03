/**
 * Yesterday's sale, profit and udhaar in one card, from GET /ai/morning-summary
 * (the same numbers as the daily summary, no AI cost). Exposed for Home; shows
 * nothing when the person may not use Nafaa AI or the server has no figures.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Sun } from 'lucide-react-native';
import { Linking, View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import { useFeatureFlag } from '@/modules/app-control';
import { Amount, Card, Chip, Icon, NafaaAiMark, Skeleton, StatTile, Text, useTheme } from '@/design';
import { aiApi } from '../api/ai';
import { useAiStore } from '../store';

export function MorningSummary() {
  const th = useTheme();
  const can = usePermission();
  const enabled = useFeatureFlag('feature.ai') && can(PERMISSIONS.AI_USE);
  const q = useQuery({ queryKey: ['ai', 'morning'], queryFn: aiApi.morning, enabled, staleTime: 10 * 60_000, retry: false });
  if (!enabled || q.isError) return null;
  const m = q.data;
  if (m && (!m.allowed || !m.figures)) return null;
  const f = m?.figures;
  const ask = (text: string) => { useAiStore.getState().ask(text); router.push('/ai' as never); };

  return (
    <Card
      title={<View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}><NafaaAiMark size={22} /><Text weight="bold">{t('Subah ka khulasa')}</Text></View>}
      description={m ? t('Kal ({{day}}) — Sale, Profit aur udhaar', { day: m.day }) : t('Kal ka hisaab')}
      action={m ? <Icon icon={Sun} size={18} tone="warning" /> : undefined}
    >
      {!f ? <Skeleton height={64} /> : (
        <View style={{ gap: th.space(3) }}>
          <View style={{ flexDirection: 'row', gap: th.space(2) }}>
            <View style={{ flex: 1 }}>
              <StatTile label={t('Sale')} value={<Amount value={f.sales} size="lg" weight="bold" />} hint={t('{{bills}} bill', { bills: f.bills })} />
            </View>
            {f.grossProfit != null && (
              <View style={{ flex: 1 }}>
                <StatTile label={t('Profit')} value={<Amount value={f.grossProfit} size="lg" weight="bold" colorize />} />
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: th.space(2) }}>
            {f.khata && (
              <View style={{ flex: 1 }}>
                <StatTile label={t('Udhaar baqi')} value={<Amount value={f.khata.outstanding} size="lg" weight="bold" />} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <StatTile label={t('Stock')} value={<Text size="lg" weight="bold">{t('{{out}} khatam', { out: f.lowStock.out })}</Text>} hint={t('{{low}} kam', { low: f.lowStock.low })} />
            </View>
          </View>
          {f.topItem && <Text size="sm" tone="secondary">{`${t('Sab se zyada bika:')} ${f.topItem}`}</Text>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
            {[t('Kal ka profit kis cheez se aaya?'), t('Kal ki sale pichhle hafte se kaisi rahi?'), t('Kya mangwana hai?')].map((x) => <Chip key={x} label={x} onPress={() => ask(x)} />)}
          </View>
          {m && (
            <Chip label={t('WhatsApp par bhejein')} onPress={() => void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(`${m.title}\n\n${m.text}`)}`)} />
          )}
        </View>
      )}
    </Card>
  );
}
