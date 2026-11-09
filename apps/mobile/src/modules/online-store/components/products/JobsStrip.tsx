/**
 * Running catalog jobs (import, link, push, publish) with their progress;
 * refreshes every few seconds while one runs and can stop it. Finished jobs
 * stay for a short while with their result.
 */

import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { t, msg } from '@/core/i18n';
import { Button, Card, ProgressBar, Text, toast, useTheme } from '@/design';
import { apiErrorMessage, productsApi, type CatalogJob } from '../../api/online';
import { KEYS } from '../../lib/online';

const KIND: Record<CatalogJob['kind'], string> = {
  IMPORT_ALL: msg('Products la rahe'), LINK_ALL: msg('Products jor rahe'), PUSH: msg('Stock aur Price bhej rahe'), PUBLISH: msg('Channel par daal rahe'),
};
const RECENT_MS = 10 * 60_000;

export function JobsStrip() {
  const th = useTheme();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: [...KEYS.products, 'jobs'], queryFn: productsApi.jobs,
    refetchInterval: (query) => ((query.state.data?.jobs ?? []).some((j) => j.status === 'RUNNING' || j.status === 'QUEUED') ? 3000 : 30_000),
  });
  const stop = useMutation({
    mutationFn: productsApi.cancelJob,
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEYS.products, 'jobs'] }),
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const jobs = (q.data?.jobs ?? []).filter((j) => j.status === 'RUNNING' || j.status === 'QUEUED' || (j.finishedAt && Date.now() - new Date(j.finishedAt).getTime() < RECENT_MS));
  if (!jobs.length) return null;
  return (
    <Card title={t('Chalte kaam')}>
      <View style={{ gap: th.space(3) }}>
        {jobs.slice(0, 3).map((j) => {
          const running = j.status === 'RUNNING' || j.status === 'QUEUED';
          return (
            <View key={j.id} style={{ gap: th.space(1.5) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                <Text size="sm" weight="semibold" style={{ flex: 1 }}>{t(KIND[j.kind])}</Text>
                <Text size="xs" tone={j.status === 'FAILED' ? 'danger' : 'muted'} ltr>{j.done}/{j.total}{j.failed ? ` · ${t('{{count}} fail', { count: j.failed })}` : ''}</Text>
                {running && <Button size="sm" variant="ghost" loading={stop.isPending && stop.variables === j.id} onPress={() => stop.mutate(j.id)}>{t('Rokein')}</Button>}
              </View>
              <ProgressBar value={j.percent / 100} tone={j.status === 'FAILED' ? 'danger' : running ? 'brand' : 'success'} />
              {!running && j.errors[0] ? <Text size="2xs" tone="danger" numberOfLines={2}>{j.errors[0]}</Text> : null}
            </View>
          );
        })}
      </View>
    </Card>
  );
}
