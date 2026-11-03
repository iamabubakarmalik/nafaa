/**
 * Backup: one JSON file with all the business records (shared through the
 * share sheet to Drive, WhatsApp or Files), what it holds, when the last one
 * was taken, a data download of chosen record types, and the history of
 * backups and file exports (web BackupPage + BackupSection). Owner only.
 * Nothing here changes or removes data.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Database, Download, FileSpreadsheet, History, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/core/auth/store';
import { formatDateTime } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { Button, Card, Chip, EmptyState, ListGroup, ListRow, Screen, SectionHeader, SettingLink, Skeleton, StatTile, Text, toast, useTheme } from '@/design';
import { backupApi, settingsApi } from '../api/settings';
import { downloadAndShare, shareText } from '../lib/download';
import { Note, OfflineNote, ownerOnly } from '../components/SettingsParts';

const COUNTS: Array<[string, string]> = [
  ['sales', t('Sale ke bill')], ['products', t('Products')], ['customers', t('Customers')], ['khataEntries', t('Khata entries')], ['purchases', t('Purchase')],
  ['suppliers', t('Suppliers')], ['expenses', t('Expenses')], ['stockMovements', t('Stock entries')], ['categories', t('Categories')],
  ['cashRegisters', t('Drawer ke din')], ['transfers', t('Stock transfers')], ['shops', t('Branches')],
];
const ENTITIES: Array<[string, string]> = [
  ['products', t('Products')], ['customers', t('Customers')], ['suppliers', t('Suppliers')], ['sales', t('Sales')], ['purchases', t('Purchases')],
  ['expenses', t('Expenses')], ['categories', t('Categories')], ['settings', t('Settings')],
];

const daysSince = (v: string) => Math.floor((Date.now() - new Date(v).getTime()) / 86_400_000);

function Backup() {
  const th = useTheme();
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const tenant = useAuthStore((s) => s.tenant);
  const summary = useQuery({ queryKey: ['backup-summary'], queryFn: backupApi.summary, enabled: online });
  const history = useQuery({ queryKey: ['backup-history'], queryFn: backupApi.history, enabled: online });
  const [picked, setPicked] = useState<string[]>(ENTITIES.map(([k]) => k));

  const download = useMutation({
    mutationFn: async () => {
      toast.info(t('Backup tayyar ho raha hai…'), { message: t('Bara karobar ho to thora waqt lagta hai') });
      return downloadAndShare('/backup/download', `nafaa-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json', t('Nafaa backup'));
    },
    onSuccess: (r) => {
      toast.success(t('Backup download ho gaya'), { message: t('{{value}} MB — ab ise Drive ya email me rakh dein', { value: (r.bytes / 1024 / 1024).toFixed(2) }) });
      void qc.invalidateQueries({ queryKey: ['backup-summary'] });
      void qc.invalidateQueries({ queryKey: ['backup-history'] });
    },
    onError: () => toast.error(t('Backup nahi bana — internet check karke dobara koshish karein')),
  });

  const data = useMutation({
    mutationFn: async () => {
      const out = await settingsApi.exportData(picked, 'json');
      await shareText(`nafaa-data-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(out ?? {}, null, 2), 'application/json');
    },
    onSuccess: () => toast.success(t('Download ho gaya ({{count}} cheezein)', { count: picked.length })),
    onError: () => toast.error(t('Download nahi hua — dobara koshish karein')),
  });

  const s = summary.data;
  const total = s ? Object.values(s.counts).reduce((a, b) => a + (b ?? 0), 0) : 0;
  const last = s?.lastBackup ?? null;
  const age = last ? daysSince(last.at) : null;
  const stale = age == null || age >= 7;
  const log = history.data ?? [];

  return (
    <Screen title={t('Backup')} narrow onRefresh={() => { void summary.refetch(); void history.refetch(); }} refreshing={summary.isRefetching}>
      {!online && <OfflineNote />}
      <View style={{ flexDirection: 'row', gap: th.space(3) }}>
        <View style={{ flex: 1 }}><StatTile icon={Database} label={t('Kul records')} value={<Text size="xl" weight="bold" ltr tabular>{total.toLocaleString('en-PK')}</Text>} /></View>
        <View style={{ flex: 1 }}>
          <StatTile icon={ShieldCheck} label={t('Aakhri backup')} value={<Text size="md" weight="bold">{age == null ? t('Kabhi nahi liya') : age === 0 ? t('Aaj liya') : t('{{age}} din pehle', { age })}</Text>} hint={last ? formatDateTime(last.at) : undefined} />
        </View>
      </View>
      {stale && !summary.isLoading && online && (
        <Note tone={age == null || age >= 30 ? 'danger' : 'warning'}>{age == null ? t('Abhi tak koi backup nahi liya') : t('Aakhri backup {{age}} din purana hai', { age })}. {t('Computer kharab ya chori ho jaye to apna record mehfooz rahe — har hafte ek backup lein.')}</Note>
      )}
      <Button icon={Download} size="lg" fullWidth loading={download.isPending} disabled={!online} onPress={() => download.mutate()}>{t('Backup download')}</Button>
      {!online && <Text size="xs" tone="muted" align="center">{onlineNeededText('backup')}</Text>}

      <View style={{ gap: th.space(2) }}>
        <SectionHeader title={t('Is file me kya hai')} />
        <Card flush>
          {summary.isLoading ? <View style={{ padding: th.space(4) }}><Skeleton height={120} /></View> : COUNTS.map(([k, label], i) => (
            <ListRow key={k} title={label} trailing={<Text size="sm" weight="semibold" ltr tabular>{(s?.counts[k] ?? 0).toLocaleString('en-PK')}</Text>} />
          ))}
        </Card>
        <Text size="xs" tone="muted">{t('Saath me: dukaan ki settings, bill ki cheezein, purchase ki cheezein, drawer ki entries aur stock adjustments.')}</Text>
      </View>

      <Card title={t('Data download')} description={t('Apna data file me lein — accountant ko bhejein ya mehfooz rakhein')}>
        <View style={{ gap: th.space(3) }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
            {ENTITIES.map(([k, label]) => <Chip key={k} label={label} selected={picked.includes(k)} onPress={() => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))} />)}
          </View>
          <Button icon={Download} variant="secondary" loading={data.isPending} disabled={!online || !picked.length} onPress={() => data.mutate()}>{t('{{count}} cheezein JSON me download karein', { count: picked.length })}</Button>
        </View>
      </Card>

      <ListGroup>
        <SettingLink icon={FileSpreadsheet} label={t('Excel files chahiye?')} description={t('Sale, khata, stock — period ke hisaab se, Exports page par')} onPress={() => router.push('/exports' as never)} />
      </ListGroup>

      <View style={{ gap: th.space(2) }}>
        <SectionHeader title={t('History')} />
        {history.isLoading ? <Skeleton height={140} /> : log.length === 0 ? (
          <EmptyState compact icon={History} title={t('Abhi koi backup ya file nahi nikaali')} message={t('Pehla backup lein — yahan us ka record aayega')} />
        ) : (
          <ListGroup>
            {log.map((h) => (
              <ListRow key={h.id} icon={h.action === 'BACKUP_DOWNLOADED' ? Database : FileSpreadsheet} title={h.description}
                subtitle={`${formatDateTime(h.createdAt)} · ${h.user?.fullName ?? '—'}${h.action === 'BACKUP_DOWNLOADED' && h.metadata?.bytes ? ` · ${(h.metadata.bytes / 1024 / 1024).toFixed(2)} MB` : ''}`} />
            ))}
          </ListGroup>
        )}
      </View>
      <Note tone="muted">{t('File me customers, udhaar aur profit hai — kisi anjaan ko na dein. Is file se data khud wapas nahi dala jata — zaroorat ho to support se baat karein.')}</Note>
    </Screen>
  );
}

export const BackupScreen = ownerOnly(Backup, 'Backup');
