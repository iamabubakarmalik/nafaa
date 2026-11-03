/** Gym members (web MembersPage + MemberDetailPage): views for running, expiring, expired and dues; one tap opens the member with renew, fee, freeze and check-in. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Banknote, Dumbbell, LogIn, Plus, RefreshCw, Ruler, Snowflake, Users } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { daysRemaining } from '@nafaa/core/industries/gym';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, DetailRow, ListRow, ListTemplate, Row, Sheet, StatusPill, Text, toast } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, errorText, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { DocActions, L } from '../../_shared/docKit';
import { gymApi, type GymMember, type Membership, type MemberView } from '../api';
import { MemberRecordsSheet } from '../components/MemberRecords';
import { DueSheet, FreezeSheet, RenewSheet, SellSheet, unfreezeMembership } from '../components/MembershipSheets';
import { GYM_KEYS, MEMBER_STATE, dateOf, memberName, refreshGym } from '../meta';

const VIEWS: Array<[MemberView, string]> = [['running', t('Chalu')], ['expiring', t('Jald khatam')], ['expired', t('Khatam')], ['dues', t('Fee baqi')], ['frozen', t('Freeze')], ['none', t('Plan nahi')], ['all', t('Sab')]];

export function MembersScreen() {
  const can = usePermission();
  const [view, setView] = useState<MemberView>('running');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const query = useQuery({ queryKey: [GYM_KEYS.members, 'page', view, q], queryFn: () => gymApi.members.page({ view, search: q || undefined, page: 1, limit: 60 }) });
  const data = query.data;
  return (
    <>
      <ListTemplate<GymMember>
        title={t('Members')} search={{ value: q, onChange: setQ, placeholder: t('Naam, phone ya member number') }}
        filters={{ value: view, onChange: (v) => setView(v as MemberView), options: VIEWS.map(([value, label]) => ({ value, label: data ? `${label} ${data.counts[value] ?? 0}` : label })) }}
        summary={<View style={{ gap: 8 }}><OfflineNote feature="gymDesk" /><CachedNote query={query} /></View>}
        data={data?.items} loading={query.isLoading} error={data ? null : query.error} onRetry={() => void query.refetch()} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}
        keyExtractor={(m) => m.id}
        renderItem={({ item: m }) => {
          const st = MEMBER_STATE[m.state ?? 'NONE'];
          const left = m.current ? daysRemaining(m.current.endDate.slice(0, 10), todayKey()) : null;
          return (
            <ListRow icon={Dumbbell} iconTone={st.tone} divider chevron onPress={() => setOpen(m.id)} title={memberName(m)}
              subtitle={`${m.memberNumber} · ${m.current?.plan?.name ?? t('Plan nahi')}${m.current ? ` · ${dateOf(m.current.endDate)}` : ''}`}
              trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>{(m.due ?? 0) > 0 && <Text size="xs" tone="warning" ltr>{formatMoney(m.due)}</Text>}<Badge tone={st.tone}>{left != null && left > 0 && (m.state === 'ACTIVE' || m.state === 'EXPIRING') ? t('{{n}} din', { n: left }) : t(st.label)}</Badge></View>} />
          );
        }}
        empty={<View style={{ padding: 32, alignItems: 'center' }}><Users size={32} color="#999" /><Text tone="muted">{t('Is filter me koi member nahi')}</Text></View>}
        fab={can(P.CUSTOMERS_EDIT) ? { icon: Plus, label: t('New member'), onPress: () => router.push('/gym/members/new' as never) } : undefined}
      />
      <MemberSheet id={open} onClose={() => setOpen(null)} />
    </>
  );
}

export function MemberSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const can = usePermission();
  const { guard } = useDeskOnline('gymDesk');
  const [sell, setSell] = useState(false);
  const [renew, setRenew] = useState<Membership | null>(null);
  const [due, setDue] = useState<Membership | null>(null);
  const [freeze, setFreeze] = useState<Membership | null>(null);
  const [recs, setRecs] = useState(false);
  const q = useQuery({ queryKey: [GYM_KEYS.members, 'one', id], queryFn: () => gymApi.members.getOne(id!), enabled: !!id });
  const m = q.data;
  const cur = m?.current ?? m?.memberships?.[0] ?? null;
  const st = MEMBER_STATE[m?.state ?? 'NONE'];
  const canBill = can(P.POS_USE);
  const checkIn = async () => {
    try { const r = await gymApi.attendance.checkIn({ memberId: m!.id }); refreshGym(); toast.success(t('Check-in ho gaya'), { message: r.warnings[0] }); onClose(); } catch (e) { toast.error(errorText(e, t('Check-in nahi hua'))); }
  };
  return (
    <>
      <Sheet open={!!id} onClose={onClose} title={m ? memberName(m) : t('Member')} description={m ? `${m.memberNumber}${m.customer?.phone ? ` · ${m.customer.phone}` : ''}` : undefined}
        footer={m ? (
          <Row gap={2}>
            <Button style={{ flex: 1 }} icon={LogIn} onPress={() => guard(() => void checkIn())}>{t('Check-in')}</Button>
            <Button style={{ flex: 1 }} variant="soft" icon={Ruler} onPress={() => setRecs(true)}>{t('Records')}</Button>
            {canBill && (cur ? <Button style={{ flex: 1 }} variant="secondary" icon={RefreshCw} onPress={() => guard(() => setRenew(cur))}>{t('Renew')}</Button> : <Button style={{ flex: 1 }} variant="secondary" icon={Plus} onPress={() => guard(() => setSell(true))}>{t('Membership')}</Button>)}
          </Row>
        ) : undefined}>
        {m && (
          <View style={{ gap: 4 }}>
            <Row gap={2}><StatusPill tone={st.tone}>{t(st.label)}</StatusPill><Text size="sm" tone="muted">{t('{{n}} visits · {{s}} din lagataar', { n: m.totalVisits, s: m.currentStreak })}</Text></Row>
            {cur ? (
              <>
                <DetailRow label={t('Plan')} value={cur.plan?.name ?? '—'} />
                <DetailRow label={t('Muddat')} value={`${dateOf(cur.startDate)} – ${dateOf(cur.endDate)}`} />
                <DetailRow label={t('Fee')} value={<Text ltr>{formatMoney(cur.paidAmount)} / {formatMoney(cur.totalPrice)}</Text>} last />
                <Row gap={2} style={{ flexWrap: 'wrap' }}>
                  {canBill && (m.due ?? 0) > 0 && <Button size="sm" variant="soft" icon={Banknote} onPress={() => guard(() => setDue(cur))}>{t('Baqi fee lein')}</Button>}
                  {can(P.CUSTOMERS_EDIT) && cur.isFrozen ? <Button size="sm" variant="soft" icon={Snowflake} onPress={() => guard(() => void unfreezeMembership(cur).then(() => q.refetch()))}>{t('Unfreeze')}</Button>
                    : can(P.CUSTOMERS_EDIT) && cur.plan?.allowFreeze && cur.status === 'ACTIVE' ? <Button size="sm" variant="soft" icon={Snowflake} onPress={() => guard(() => setFreeze(cur))}>{t('Freeze')}</Button> : null}
                </Row>
              </>
            ) : <Text tone="muted">{t('Abhi koi membership nahi')}</Text>}
            {cur && <View style={{ alignItems: 'center' }}><DocActions phone={m.customer?.phone} build={(lang) => ({
              fileName: `membership-${m.memberNumber}`, title: L(lang, 'Membership card', 'ممبرشپ کارڈ', 'Membership card'), subtitle: m.memberNumber,
              meta: [[L(lang, 'Member', 'ممبر', 'Member'), memberName(m)], [L(lang, 'Plan', 'پلان', 'Plan'), cur.plan?.name ?? '—']],
              rows: [[L(lang, 'Valid from', 'شروع', 'Shuru'), dateOf(cur.startDate)], [L(lang, 'Valid till', 'ختم', 'Khatam'), dateOf(cur.endDate)]],
              notes: [L(lang, 'Show this card at the front desk.', 'ریسپشن پر یہ کارڈ دکھائیں۔', 'Reception par ye card dikhayein.')] })} /></View>}
            {(m.lockers?.length ?? 0) > 0 && <DetailRow label={t('Locker')} value={m.lockers.map((l) => l.number).join(', ')} last />}
          </View>
        )}
      </Sheet>
      <MemberRecordsSheet member={recs ? m ?? null : null} onClose={() => setRecs(false)} onChanged={() => void q.refetch()} />
      {m && <SellSheet memberId={m.id} name={memberName(m)} open={sell} onClose={() => { setSell(false); void q.refetch(); }} />}
      <RenewSheet m={renew} onClose={() => { setRenew(null); void q.refetch(); }} />
      <DueSheet m={due} onClose={() => { setDue(null); void q.refetch(); }} />
      <FreezeSheet m={freeze} onClose={() => { setFreeze(null); void q.refetch(); }} />
    </>
  );
}
