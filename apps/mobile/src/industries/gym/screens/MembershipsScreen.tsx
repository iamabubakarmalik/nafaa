/** Gym memberships (web MembershipsPage): every membership by state, with renew, due fee, freeze, cancel and a WhatsApp reminder. */

import { useQuery } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { Award, Banknote, MessageCircle, RefreshCw, Snowflake, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { daysRemaining } from '@nafaa/core/industries/gym';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, DetailRow, ListRow, ListTemplate, Row, Sheet, Text } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { gymApi, type Membership, type MembershipView } from '../api';
import { DueSheet, FreezeSheet, RenewSheet, cancelMembership, unfreezeMembership } from '../components/MembershipSheets';
import { GYM_KEYS, dateOf } from '../meta';

const VIEWS: Array<[MembershipView, string]> = [['running', t('Chalu')], ['expiring', t('Jald khatam')], ['expired', t('Khatam')], ['dues', t('Fee baqi')], ['frozen', t('Freeze')], ['upcoming', t('Aane wali')], ['cancelled', t('Cancel')], ['all', t('Sab')]];

export function MembershipsScreen() {
  const can = usePermission();
  const { guard } = useDeskOnline('gymDesk');
  const [view, setView] = useState<MembershipView>('expiring');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Membership | null>(null);
  const [renew, setRenew] = useState<Membership | null>(null);
  const [due, setDue] = useState<Membership | null>(null);
  const [freeze, setFreeze] = useState<Membership | null>(null);
  const query = useQuery({ queryKey: [GYM_KEYS.memberships, view, q], queryFn: () => gymApi.memberships.page({ view, search: q || undefined, page: 1, limit: 60 }) });
  const data = query.data;
  const remind = (m: Membership) => {
    const phone = String(m.member?.customer?.phone ?? '').replace(/\D/g, '').replace(/^0/, '92');
    const text = t('Assalam o Alaikum {{name}}, aap ki gym membership {{date}} ko khatam ho rahi hai. Renew karwa lein.', { name: m.member?.customer?.name ?? '', date: dateOf(m.endDate) });
    void Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
    void gymApi.memberships.reminded(m.id).catch(() => undefined);
  };
  const bill = can(P.POS_USE);
  const left = (m: Membership) => daysRemaining(m.endDate.slice(0, 10), todayKey());
  return (
    <>
      <ListTemplate<Membership>
        title={t('Memberships')} search={{ value: q, onChange: setQ, placeholder: t('Naam ya number') }}
        filters={{ value: view, onChange: (v) => setView(v as MembershipView), options: VIEWS.map(([value, label]) => ({ value, label: data ? `${label} ${data.counts[value] ?? 0}` : label })) }}
        summary={<View style={{ gap: 8 }}><OfflineNote feature="gymDesk" /><CachedNote query={query} /></View>}
        data={data?.items} loading={query.isLoading} error={data ? null : query.error} onRetry={() => void query.refetch()} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}
        keyExtractor={(m) => m.id}
        renderItem={({ item: m }) => (
          <ListRow icon={Award} iconTone={m.status === 'ACTIVE' ? (left(m) <= 7 ? 'warning' : 'success') : 'neutral'} divider chevron onPress={() => setOpen(m)}
            title={m.member?.customer?.name ?? m.membershipNumber} subtitle={`${m.plan?.name ?? ''} · ${dateOf(m.startDate)} – ${dateOf(m.endDate)}`}
            trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>{m.balanceDue > 0 && <Text size="xs" tone="warning" ltr>{formatMoney(m.balanceDue)}</Text>}<Badge tone={m.status === 'ACTIVE' ? (left(m) <= 7 ? 'warning' : 'success') : 'neutral'}>{m.status === 'ACTIVE' ? t('{{n}} din', { n: left(m) }) : m.status}</Badge></View>} />
        )}
      />
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.member?.customer?.name} description={open?.membershipNumber}
        footer={open && bill ? (
          <Row gap={2}>
            <Button style={{ flex: 1 }} icon={RefreshCw} onPress={() => guard(() => { setRenew(open); setOpen(null); })}>{t('Renew')}</Button>
            <Button variant="secondary" icon={MessageCircle} onPress={() => remind(open)}>{open.renewalReminded ? t('Dobara yaad') : t('Yaad dilayein')}</Button>
          </Row>
        ) : undefined}>
        {open && (
          <View style={{ gap: 4 }}>
            <DetailRow label={t('Plan')} value={open.plan?.name ?? '—'} />
            <DetailRow label={t('Muddat')} value={`${dateOf(open.startDate)} – ${dateOf(open.endDate)}`} />
            <DetailRow label={t('Fee')} value={<Text ltr>{formatMoney(open.paidAmount)} / {formatMoney(open.totalPrice)}</Text>} last />
            <Row gap={2} style={{ flexWrap: 'wrap' }}>
              {bill && open.balanceDue > 0 && <Button size="sm" variant="soft" icon={Banknote} onPress={() => guard(() => { setDue(open); setOpen(null); })}>{t('Baqi fee lein')}</Button>}
              {can(P.CUSTOMERS_EDIT) && open.isFrozen && <Button size="sm" variant="soft" icon={Snowflake} onPress={() => guard(() => void unfreezeMembership(open).then(() => { setOpen(null); void query.refetch(); }))}>{t('Unfreeze')}</Button>}
              {can(P.CUSTOMERS_EDIT) && !open.isFrozen && open.status === 'ACTIVE' && open.plan?.allowFreeze && <Button size="sm" variant="soft" icon={Snowflake} onPress={() => guard(() => { setFreeze(open); setOpen(null); })}>{t('Freeze')}</Button>}
              {bill && open.status === 'ACTIVE' && <Button size="sm" variant="ghost" icon={XCircle} onPress={() => guard(() => void cancelMembership(open).then((ok) => { if (ok) { setOpen(null); void query.refetch(); } }))}>{t('Cancel')}</Button>}
            </Row>
          </View>
        )}
      </Sheet>
      <RenewSheet m={renew} onClose={() => { setRenew(null); void query.refetch(); }} />
      <DueSheet m={due} onClose={() => { setDue(null); void query.refetch(); }} />
      <FreezeSheet m={freeze} onClose={() => { setFreeze(null); void query.refetch(); }} />
    </>
  );
}
