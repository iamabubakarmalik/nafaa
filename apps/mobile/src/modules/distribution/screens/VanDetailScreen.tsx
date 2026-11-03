/**
 * One van (manager side): stock on the van, today's trip (spot invoices,
 * cash expected, returns), loading from the godown, starting and closing the
 * day, and the last days' cash.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, PackagePlus, Pencil, PlayCircle } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Button, DetailSection, DetailTemplate, IconButton, ListRow, Row, StatTile, Text, toast, useTheme } from '@/design';
import { distError } from '../api/distribution.api';
import { phase2Api, type SaveVan, type VanSession } from '../api/phase2.api';
import { CachedNote, useRefreshDistribution } from '../components/parts';
import { DistributionGate } from '../components/DistributionGate';
import { VANS_KEY, VanCloseSheet, VanFormSheet, VanLoadSheet } from '../components/VanSheets';
import { dayKeyLabel, dayTime, rs } from '../lib/meta';

export function VanDetailScreen() {
  return <DistributionGate title={t('Van')}><Van /></DistributionGate>;
}

function Van() {
  const th = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const refresh = useRefreshDistribution();
  const can = usePermission();
  const canManage = can(P.DISTRIBUTION_VANS_MANAGE);
  const q = useQuery({ queryKey: [...VANS_KEY, 'one', id], queryFn: () => phase2Api.van(id), enabled: !!id });
  const van = q.data;
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const session = van?.session ?? null;

  const open = useMutation({
    mutationFn: () => phase2Api.openVan(id),
    onSuccess: () => { toast.success(t('Van ka din shuru')); void refresh(); },
    onError: (e) => toast.error(distError(e, t('Din shuru nahi hua'))),
  });
  const save = useMutation({
    mutationFn: (b: SaveVan) => phase2Api.updateVan(id, b),
    onSuccess: () => { toast.success(t('Save ho gaya')); setEditing(false); void refresh(); },
    onError: (e) => toast.error(distError(e, t('Save nahi hua'))),
  });

  return (
    <DetailTemplate
      title={van?.name ?? t('Van')}
      subtitle={van ? van.vehicleNo ?? undefined : undefined}
      actions={canManage && van ? <IconButton icon={Pencil} label={t('Edit')} onPress={() => setEditing(true)} /> : undefined}
      loading={q.isLoading} error={q.isError && !van ? q.error : undefined} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      bottomActions={van?.isActive && canManage ? <>
        <Button style={{ flex: 1 }} size="lg" variant="secondary" icon={PackagePlus} onPress={() => setLoading(true)}>{t('Load')}</Button>
        {session
          ? <Button style={{ flex: 1 }} size="lg" icon={CheckCircle2} onPress={() => setClosing(true)}>{t('Close day')}</Button>
          : <Button style={{ flex: 1 }} size="lg" icon={PlayCircle} loading={open.isPending} onPress={() => open.mutate()}>{t('Start day')}</Button>}
      </> : undefined}
    >
      {van && <View style={{ gap: th.space(4) }}>
        <Text size="sm" tone="muted">{[van.salesmanName && `${t('Salesman')}: ${van.salesmanName}`, van.homeShopName && `${t('Godown')}: ${van.homeShopName}`, van.routeName && `${t('Route')}: ${van.routeName}`].filter(Boolean).join(' · ') || t('Salesman abhi nahi')}</Text>
        <CachedNote query={q} />
        <Row gap={2}>
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Van par maal')} value={<Amount value={van.stockValue} weight="bold" />} hint={t('{{count}} items · cost par', { count: van.stock.length })} />
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Aaj')} value={session ? t('Route par · {{dayKey}}', { dayKey: dayKeyLabel(session.dayKey) }) : t('Khadi hai')} />
        </Row>
        {!van.homeShopId && <Text size="sm" tone="warning">{t('Is van ka godown set nahi — load aur shaam ko maal wapas ke liye "Badlein" me godown chunein.')}</Text>}

        {session && <SessionPanel session={session} />}

        <DetailSection title={t('Van par maal')}>
          {!van.stock.length ? <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{t('Van khaali hai. Godown se load karein.')}</Text> : van.stock.map((l) => (
            <ListRow key={`${l.productId}-${l.variantId}`} dense title={`${l.name}${l.variantName ? ` · ${l.variantName}` : ''}`} subtitle={l.free > 0 ? `${t('Free')}: ${l.free}` : undefined}
              trailing={<View style={{ alignItems: 'flex-end' }}><Text size="sm" weight="bold" ltr>{l.text}</Text><Text size="xs" tone="muted" ltr>{rs(l.value)}</Text></View>} />
          ))}
        </DetailSection>

        {van.recent.length > 0 && (
          <DetailSection title={t('Pichle din')}>
            {van.recent.map((r) => (
              <ListRow key={r.id} dense title={dayKeyLabel(r.dayKey)} subtitle={r.closedAt ? t('· band {{closedAt}}', { closedAt: dayTime(r.closedAt) }) : undefined}
                trailing={<View style={{ alignItems: 'flex-end' }}><Text size="sm" ltr>{t('Cash {{rs}} / {{expectedCash}}', { rs: rs(r.handedIn ?? 0), expectedCash: rs(r.expectedCash) })}</Text>
                  {r.shortAmount !== 0 && <Text size="xs" weight="bold" tone={r.shortAmount > 0 ? 'danger' : 'success'} ltr>{r.shortAmount > 0 ? t('Kam') : t('Zyada')} {rs(Math.abs(r.shortAmount))}</Text>}</View>} />
            ))}
          </DetailSection>
        )}
      </View>}

      {van && <VanFormSheet open={editing} van={van} saving={save.isPending} onClose={() => setEditing(false)} onSave={(b) => save.mutate(b)} />}
      {van && <VanLoadSheet open={loading} van={van} onClose={() => setLoading(false)} />}
      <VanCloseSheet open={closing} vanId={id} onClose={() => setClosing(false)} onDone={() => { setClosing(false); void refresh(); }} />
    </DetailTemplate>
  );
}

function SessionPanel({ session }: { session: VanSession }) {
  const th = useTheme();
  const m = session.money;
  return (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Spot invoices')} value={<Amount value={m.salesValue} weight="bold" />} hint={t('{{invoices}} invoices · udhaar {{creditGiven}}', { invoices: m.invoices, creditGiven: rs(m.creditGiven) })} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="success" label={t('Cash expected')} value={<Amount value={m.expectedCash} weight="bold" />} hint={m.otherMoney ? t('Bank / cheque {{otherMoney}}', { otherMoney: rs(m.otherMoney) }) : undefined} />
      </Row>
      {m.pending > 0 && <StatTile tone="warning" label={t('Verify baqi')} value={<Amount value={m.pending} weight="bold" />} hint={m.recoveries ? t('Recovery {{recoveries}}', { recoveries: rs(m.recoveries) }) : undefined} />}
      <DetailSection title={t('Aaj ki invoices')}>
        {!session.invoices.length ? <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{t('Abhi koi spot Invoice nahi. Salesman phone ki van screen se bechta hai.')}</Text> : session.invoices.map((i) => (
          <ListRow key={i.id} dense title={i.customerName ?? '—'} subtitle={`${i.saleNumber ?? i.orderNumber}`} chevron onPress={() => router.push(`/distribution/orders/${i.id}` as never)}
            trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={i.total} weight="semibold" />{i.cashCollected > 0 && <Text size="xs" tone="success" ltr>{t('cash {{cashCollected}}', { cashCollected: rs(i.cashCollected) })}</Text>}</View>} />
        ))}
      </DetailSection>
      <DetailSection title={t('Market returns (aaj)')}>
        {!session.returns.length ? <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{t('Aaj koi market return nahi.')}</Text> : session.returns.map((r) => (
          <ListRow key={r.id} dense title={r.customerName ?? '—'} subtitle={r.number} trailing={<Amount value={r.totalValue} weight="semibold" />} />
        ))}
      </DetailSection>
    </View>
  );
}
