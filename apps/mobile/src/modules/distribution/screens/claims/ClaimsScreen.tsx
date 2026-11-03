/**
 * Principal claims. Three views:
 *   Claim karna hai  what each company owes back for a period: claimable
 *                    scheme Discount, free goods at cost and damaged / expired
 *                    market returns; make a claim from it.
 *   Claims           claims made: open one to submit, record money, cancel.
 *   Principals       which brands belong to which company.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Building2, FileText, HandCoins, Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, DatePicker, EmptyState, ListRow, ListTemplate, Row, Segmented, StatTile, StatusPill, Text, useTheme } from '@/design';
import { DIST_KEY } from '../../api/distribution.api';
import { CLAIM_STATUS_LABEL, phase2Api, type ClaimRow, type ClaimStatus, type PendingClaims } from '../../api/phase2.api';
import { DistributionGate } from '../../components/DistributionGate';
import { BrandsSheet, CLAIMS_KEY, MakeClaimSheet } from '../../components/ClaimParts';
import { CachedNote } from '../../components/parts';
import { dayKeyLabel, rs } from '../../lib/meta';
import { fromYmd, monthStartKey, todayKey, ymd } from '../../lib/setup';

type Tab = 'pending' | 'claims' | 'principals';
export const CLAIM_TONE: Record<ClaimStatus, 'warning' | 'info' | 'success' | 'neutral'> = { DRAFT: 'warning', SUBMITTED: 'info', RECEIVED: 'success', CANCELLED: 'neutral' };

export function ClaimsScreen() {
  return <DistributionGate title={t('Claims')}><Body /></DistributionGate>;
}

function Body() {
  const th = useTheme();
  const can = usePermission();
  const canManage = can(P.DISTRIBUTION_CLAIMS_MANAGE);
  const [tab, setTab] = useState<Tab>('pending');
  const [from, setFrom] = useState(monthStartKey());
  const [to, setTo] = useState(todayKey());
  const [make, setMake] = useState<{ supplierId: string; name: string | null } | null>(null);
  const [edit, setEdit] = useState<{ id: string; name: string; brandIds: string[] } | null>(null);
  const [showAll, setShowAll] = useState(false);

  const pendingQ = useQuery({ queryKey: [...CLAIMS_KEY, 'pending', from, to], queryFn: () => phase2Api.pendingClaims({ from, to }) });
  const claimsQ = useQuery({ queryKey: [...CLAIMS_KEY, 'list'], queryFn: () => phase2Api.claims() });
  const princQ = useQuery({ queryKey: [DIST_KEY, 'principals'], queryFn: phase2Api.principals, enabled: tab === 'principals' });
  const claims = claimsQ.data?.claims ?? [];
  const open = claims.filter((c) => c.status === 'DRAFT' || c.status === 'SUBMITTED');
  const suppliers = princQ.data?.suppliers ?? [];

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={HandCoins} label={t('Claim karna hai')} value={rs(pendingQ.data?.total ?? 0)} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} tone="warning" icon={FileText} label={t('Khule claims')} value={String(open.length)} hint={rs(open.reduce((s, c) => s + c.balance, 0))} />
      </Row>
      <Segmented value={tab} onChange={setTab} size="sm" options={[
        { value: 'pending', label: t('Claim karna hai') },
        { value: 'claims', label: t('Claims'), count: claims.length || undefined },
        { value: 'principals', label: t('Principals') },
      ]} />
      {tab === 'pending' && (
        <Row gap={2}>
          <View style={{ flex: 1 }}><DatePicker label={t('Se')} value={fromYmd(from)} onChange={(d) => setFrom(ymd(d))} /></View>
          <View style={{ flex: 1 }}><DatePicker label={t('Tak')} value={fromYmd(to)} onChange={(d) => setTo(ymd(d))} /></View>
        </Row>
      )}
      <CachedNote query={tab === 'claims' ? claimsQ : pendingQ} />
    </View>
  );

  const sheets = (
    <>
      {make && <MakeClaimSheet supplierId={make.supplierId} name={make.name} from={from} to={to} onClose={() => setMake(null)}
        onMade={(id) => { setMake(null); setTab('claims'); router.push(`/distribution/claims/${id}` as never); }} />}
      {edit && princQ.data && <BrandsSheet supplier={edit} brands={princQ.data.brands} suppliers={suppliers} onClose={() => setEdit(null)} />}
    </>
  );

  if (tab === 'claims') {
    return (
      <>
        <ListTemplate<ClaimRow>
          title={t('Claims')} summary={header} data={claims} loading={claimsQ.isLoading} error={claimsQ.error} onRetry={claimsQ.refetch}
          refreshing={claimsQ.isRefetching} onRefresh={claimsQ.refetch} keyExtractor={(c) => c.id}
          renderItem={({ item: c }) => (
            <ListRow
              title={`${c.number} · ${c.supplierName ?? '—'}`}
              subtitle={<View><Text size="sm" tone="muted">{dayKeyLabel(c.fromKey)} – {dayKeyLabel(c.toKey)}</Text>{c.reference ? <Text size="xs" tone="muted">{t('Ref {{reference}}', { reference: c.reference })}</Text> : null}</View>}
              trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text weight="bold" tabular ltr>{rs(c.total)}</Text>
                <StatusPill tone={CLAIM_TONE[c.status]}>{t(CLAIM_STATUS_LABEL[c.status])}</StatusPill>
                {c.status !== 'CANCELLED' && c.balance > 0 && <Text size="xs" tone="warning" ltr>{t('Baqi')} {rs(c.balance)}</Text>}
              </View>}
              chevron divider onPress={() => router.push(`/distribution/claims/${c.id}` as never)}
            />
          )}
          empty={<EmptyState icon={FileText} title={t('Abhi koi claim nahi bana.')} />}
        />
        {sheets}
      </>
    );
  }

  if (tab === 'principals') {
    const shown = showAll ? suppliers : suppliers.filter((s) => s.isPrincipal);
    return (
      <>
        <ListTemplate<(typeof suppliers)[number]>
          title={t('Claims')} summary={(
            <View style={{ gap: th.space(3) }}>
              {header}
              <Button size="sm" variant="secondary" onPress={() => setShowAll((v) => !v)}>{showAll ? t('Sirf principals') : t('Sab suppliers')}</Button>
              <Text size="xs" tone="muted">{t('Item ka principal us ke brand se tay hota hai — brand ko company se jodein')}</Text>
            </View>
          )}
          data={shown} loading={princQ.isLoading} error={princQ.error} onRetry={princQ.refetch} keyExtractor={(s) => s.id}
          renderItem={({ item: s }) => (
            <ListRow
              icon={Building2} title={s.name}
              subtitle={`${s.brandNames.length ? s.brandNames.join(', ') : t('Koi brand nahi')}${s.schemes ? t(' · {{schemes}} schemes', { schemes: s.schemes }) : ''}`}
              trailing={canManage ? <Pencil size={16} color={th.colors.textMuted} /> : undefined}
              divider onPress={canManage ? () => setEdit({ id: s.id, name: s.name, brandIds: s.brandIds }) : undefined}
            />
          )}
          empty={<EmptyState icon={Building2} title={t('Abhi kisi supplier ke brands nahi jode. \'Sab suppliers\' dabayein aur company ke brands chunein.')} />}
        />
        {sheets}
      </>
    );
  }

  const rows: PendingClaims['principals'] = pendingQ.data?.principals ?? [];
  return (
    <>
      <ListTemplate<PendingClaims['principals'][number]>
        title={t('Claims')} summary={header} data={rows} loading={pendingQ.isLoading} error={pendingQ.error} onRetry={pendingQ.refetch}
        refreshing={pendingQ.isRefetching} onRefresh={pendingQ.refetch} keyExtractor={(p) => p.supplierId}
        renderItem={({ item: p }) => (
          <ListRow
            icon={Building2} iconTone="brand" title={p.supplierName ?? t('Company')}
            subtitle={<View>
              <Text size="xs" tone="muted">{t('{{lines}} lines', { lines: p.lines })} · {t('Scheme Discount')} {rs(p.schemeDiscount)}</Text>
              <Text size="xs" tone="muted">{t('Free maal (cost)')} {rs(p.freeGoodsValue)} · {t('Kharab / expiry')} {rs(p.returnsValue)}</Text>
            </View>}
            trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text weight="bold" tabular ltr>{rs(p.total)}</Text>
              {canManage && <Button size="sm" onPress={() => setMake({ supplierId: p.supplierId, name: p.supplierName })}>{t('New claim')}</Button>}
            </View>}
            divider
          />
        )}
        empty={<EmptyState icon={HandCoins} title={t('Is period me claim karne ko kuch nahi. Scheme par \'company claim\' lagi ho aur principal chuna ho, tab yahan aayega.')} />}
      />
      {sheets}
    </>
  );
}
