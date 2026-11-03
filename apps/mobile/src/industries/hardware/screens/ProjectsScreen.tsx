/** Contractor sites (web ProjectsPage): construction sites that quotations, challans and bills tie to, with what was ordered and what reached. */

import { router } from 'expo-router';
import { Building2, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { deliveredPct } from '@nafaa/core/industries/hardware';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, ChipGroup, EmptyState, ListRow, ListTemplate, ProgressBar, Row, StatusPill, Text, useTheme } from '@/design';
import { OfflineNote, useDeskOnline } from '../../_shared/trade/desk';
import { projectsApi, type HardwareProject } from '../api';
import { KEYS, projectStatus } from '../meta';

type Show = 'active' | 'done' | 'all';

export function ProjectsScreen() {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('hardwareDesk');
  const [show, setShow] = useState<Show>('active');
  const [search, setSearch] = useState('');
  const q = search.trim();
  const list = useQuery({ queryKey: [KEYS.projects, show, q], queryFn: () => projectsApi.list({ search: q || undefined }), placeholderData: (p) => p });
  const rows = (list.data ?? []).filter((p) => (show === 'all' ? true : show === 'done' ? ['COMPLETED', 'CANCELLED'].includes(p.status) : !['COMPLETED', 'CANCELLED'].includes(p.status)));

  return (
    <ListTemplate<HardwareProject>
      title={t('Sites / projects')} grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Site, malik, thekedar ya pata…') }}
      summary={<View style={{ gap: th.space(3) }}><ChipGroup value={show} onChange={(v) => setShow(v as Show)} style={{ marginHorizontal: -th.space(4) }} options={[{ value: 'active', label: t('Chal rahi') }, { value: 'done', label: t('Mukammal / band') }, { value: 'all', label: t('Sab') }]} /><OfflineNote feature="hardwareDesk" /></View>}
      data={rows} loading={list.isLoading} error={list.data ? null : list.error} onRetry={() => void list.refetch()} refreshing={list.isRefetching} onRefresh={() => void list.refetch()} keyExtractor={(p) => p.id}
      renderItem={({ item: p }) => {
        const st = projectStatus(p.status);
        const pct = deliveredPct(p.totalOrdered, p.totalDelivered);
        return (
          <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
            <ListRow icon={Building2} iconTone={st.tone} chevron onPress={() => router.push(`/hardware/projects/${p.id}` as never)}
              title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{p.name}</Text><StatusPill tone={st.tone}>{st.label}</StatusPill></Row>}
              subtitle={<View style={{ gap: 4 }}>
                <Text size="xs" tone="muted" numberOfLines={1}>{[p.projectNumber, p.customerName, p.contractorName && t('Thekedar {{n}}', { n: p.contractorName })].filter(Boolean).join(' · ')}</Text>
                {p.totalOrdered > 0 && <><ProgressBar value={pct / 100} /><Text size="2xs" tone="muted">{t('{{pct}}% pohancha · baqi {{amount}}', { pct, amount: formatMoney(p.totalPending) })}</Text></>}
                {p.projectType ? <Badge>{p.projectType}</Badge> : null}
              </View>} />
          </View>
        );
      }}
      empty={<EmptyState icon={Building2} title={q ? t('Koi site nahi mili') : t('Abhi koi site nahi')} message={t('Construction site jahan maal jata hai — quotation, challan aur bill isi se jurte hain')} />}
      fab={can(P.CUSTOMERS_EDIT) ? { icon: Plus, label: t('Nayi site'), onPress: () => guard(() => router.push('/hardware/projects/new' as never)) } : undefined}
    />
  );
}
