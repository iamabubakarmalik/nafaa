/**
 * All staff: everyone who works at the shop, with or without a login. Who is
 * on duty right now, roles, logins not used yet; rows with branch, last
 * login and today's sales; a roles and permissions table; and analytics.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { BarChart3, Download, Plus, ShieldCheck, SlidersHorizontal, UserCheck, Clock, LogIn, Users, ShoppingBag } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { useShops } from '@/core/auth/useShops';
import { isAllShops } from '@/core/auth/shopScope';
import { formatTime } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { useCachedNotice } from '@/core/offline';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import { Amount, Button, EmptyState, IconButton, ListTemplate, Segmented, Select, Sheet, StatTile, Text, toast, useTheme } from '@/design';
import { peopleApi, type DirectoryPerson } from '../api/people';
import { PeopleAnalytics } from '../components/PeopleAnalytics';
import { PersonRow } from '../components/PersonRow';
import { RolesPanel } from '../components/RolesPanel';
import { shareCsv } from '../lib/exportCsv';
import { PEOPLE_KEY, ROLES, STATUS, roleLabel, type RoleKey } from '../lib/meta';

type Tab = 'staff' | 'roles' | 'analytics';
type StatusFilter = 'current' | 'ACTIVE' | 'DUTY' | 'ON_LEAVE' | 'INACTIVE' | 'LEFT' | 'PENDING' | 'all';
type Sort = 'name' | 'login' | 'sales' | 'joined';

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'current', label: msg('Maujooda') },
  { value: 'ACTIVE', label: msg('Kaam par') },
  { value: 'DUTY', label: msg('Abhi duty par') },
  { value: 'ON_LEAVE', label: msg('Chhutti par') },
  { value: 'PENDING', label: msg('Login abhi nahi kiya') },
  { value: 'INACTIVE', label: msg('Band') },
  { value: 'LEFT', label: msg('Chhor gaye') },
  { value: 'all', label: msg('Sab') },
];

function matches(p: DirectoryPerson, s: StatusFilter) {
  switch (s) {
    case 'current': return p.status !== 'LEFT';
    case 'DUTY': return !!p.onDuty;
    case 'PENDING': return !!p.login?.isActive && p.login.neverLoggedIn;
    case 'all': return true;
    default: return p.status === s;
  }
}

export function StaffListScreen() {
  const th = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();
  const can = usePermission();
  const isOwner = useAuthStore((s) => s.user?.role === 'OWNER' || s.user?.role === 'SUPER_ADMIN');
  const allShops = useAuthStore((s) => isAllShops(s.currentShopId));
  const canAdd = can(PERMISSIONS.STAFF_MANAGE) || isOwner;
  const canTeam = can(PERMISSIONS.TEAM_VIEW);
  const [tab, setTab] = useState<Tab>(params.tab === 'roles' || params.tab === 'analytics' ? params.tab : 'staff');
  const [role, setRole] = useState<'' | RoleKey>('');
  const [shopId, setShopId] = useState('');
  const [status, setStatus] = useState<StatusFilter>('current');
  const [sort, setSort] = useState<Sort>('name');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(false);

  const listQ = useQuery({ queryKey: [PEOPLE_KEY, 'list'], queryFn: peopleApi.list, placeholderData: (p) => p, refetchInterval: 60_000 });
  const shops = (useShops().data ?? []).filter((s) => s.isActive);
  const notice = useCachedNotice(listQ);
  const people = useMemo(() => listQ.data ?? [], [listQ.data]);
  const seesSales = people.some((p) => p.today);

  const current = people.filter((p) => p.status !== 'LEFT');
  const k = {
    active: people.filter((p) => p.status === 'ACTIVE').length,
    duty: people.filter((p) => p.onDuty).length,
    pending: people.filter((p) => p.login?.isActive && p.login.neverLoggedIn).length,
    noLogin: current.filter((p) => !p.hasLogin).length,
    sales: people.reduce((a, p) => a + (p.today?.sales ?? 0), 0),
    bills: people.reduce((a, p) => a + (p.today?.bills ?? 0), 0),
  };

  const needle = search.trim().toLowerCase();
  const rows = useMemo(() => {
    const list = people.filter((p) =>
      matches(p, status)
      && (!role || (p.role ?? 'NO_LOGIN') === role)
      && (!shopId || p.shop?.id === shopId || (shopId === 'none' && !p.shop))
      && (!needle || [p.fullName, p.phone, p.email, p.designation, p.staffNumber, p.department].some((v) => v?.toLowerCase().includes(needle))));
    const by: Record<Sort, (a: DirectoryPerson, b: DirectoryPerson) => number> = {
      name: (a, b) => Number(!!b.onDuty) - Number(!!a.onDuty) || a.fullName.localeCompare(b.fullName),
      login: (a, b) => (b.login?.lastLoginAt ?? '').localeCompare(a.login?.lastLoginAt ?? ''),
      sales: (a, b) => (b.today?.sales ?? 0) - (a.today?.sales ?? 0),
      joined: (a, b) => (b.joinDate ?? '').localeCompare(a.joinDate ?? ''),
    };
    return [...list].sort(by[sort]);
  }, [people, status, role, shopId, needle, sort]);

  const filtered = !!role || !!shopId || status !== 'current' || !!needle;
  const clear = () => { setRole(''); setShopId(''); setStatus('current'); setSearch(''); };
  const show = (s: StatusFilter, r: '' | RoleKey = '') => { setTab('staff'); setStatus(s); setRole(r); };

  const exportCsv = async () => {
    try {
      await shareCsv(`staff-${new Date().toISOString().slice(0, 10)}.csv`, [
        [t('Naam'), t('Staff no.'), t('Role'), t('Kaam'), t('Branch'), t('Phone'), t('Email'), t('Haal'), t('Joining'), t('Aakhri login'), ...(seesSales ? [t('Aaj sale'), t('Aaj bill')] : [])],
        ...rows.map((p) => [
          p.fullName, p.staffNumber, roleLabel(p.role), p.designation, p.shop?.name ?? t('Sab branches'), p.phone, p.email, t(STATUS[p.status].label),
          p.joinDate?.slice(0, 10), p.login ? (p.login.lastLoginAt ?? t('Kabhi nahi')) : '', ...(seesSales ? [p.today?.sales ?? 0, p.today?.bills ?? 0] : []),
        ]),
      ]);
    } catch (e) { toast.error(apiErrorMessage(e, t('Export nahi hua'))); }
  };

  const strip = (
    <View style={{ gap: th.space(3) }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -th.space(4) }} contentContainerStyle={{ paddingHorizontal: th.space(4), gap: th.space(2) }}>
        <StatTile style={{ width: 150 }} icon={UserCheck} tone="success" label={t('Kaam par')} value={String(k.active)} hint={t('{{count}} me se', { count: current.length })} onPress={() => show('ACTIVE')} />
        <StatTile style={{ width: 150 }} icon={Clock} tone="info" label={t('Abhi duty par')} value={String(k.duty)} onPress={() => show('DUTY')} />
        <StatTile style={{ width: 150 }} icon={LogIn} tone="accent" label={t('Login abhi nahi kiya')} value={String(k.pending)} onPress={() => show('PENDING')} />
        {seesSales
          ? <StatTile style={{ width: 160 }} icon={ShoppingBag} tone="warning" label={t('Aaj ki sale (staff)')} value={<Amount value={k.sales} size="lg" weight="bold" />} hint={t('{{count}} bill', { count: k.bills })} onPress={() => { setTab('staff'); setSort('sales'); }} />
          : <StatTile style={{ width: 150 }} icon={Users} tone="neutral" label={t('Bina login')} value={String(k.noLogin)} onPress={() => show('current', 'NO_LOGIN')} />}
      </ScrollView>
      <Segmented value={tab} onChange={setTab} options={[
        { value: 'staff', label: t('Staff'), icon: Users },
        { value: 'roles', label: t('Roles'), icon: ShieldCheck },
        { value: 'analytics', label: t('Analytics'), icon: BarChart3 },
      ]} />
    </View>
  );

  const body = tab === 'roles' ? <RolesPanel people={people} canSeeLogins={canTeam} onRole={(r) => show('current', r)} />
    : tab === 'analytics' ? <PeopleAnalytics /> : null;

  return (
    <>
      <ListTemplate<DirectoryPerson>
        title={t('Staff')}
        subtitle={notice.fromCache && notice.updatedAt ? t('Last updated {{time}}', { time: formatTime(notice.updatedAt) }) : undefined}
        actions={(
          <>
            {tab === 'staff' && <IconButton icon={SlidersHorizontal} label={t('Filters')} badge={filtered ? 1 : undefined} onPress={() => setFilters(true)} />}
            {tab === 'staff' && <IconButton icon={Download} label={t('CSV')} onPress={() => void exportCsv()} />}
          </>
        )}
        summary={strip}
        search={tab === 'staff' ? { value: search, onChange: setSearch, placeholder: t('Naam, phone, email ya kaam dhoondein') } : undefined}
        filters={tab === 'staff' ? { value: status, onChange: (v) => setStatus(v as StatusFilter), options: STATUS_FILTERS.map((f) => ({ value: f.value, label: t(f.label) })) } : undefined}
        data={tab === 'staff' ? rows : []}
        loading={listQ.isLoading}
        error={listQ.isError && !listQ.data ? listQ.error : undefined}
        onRetry={listQ.refetch}
        refreshing={listQ.isRefetching}
        onRefresh={listQ.refetch}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <PersonRow p={item} />}
        empty={body ?? (
          <EmptyState icon={Users} title={filtered ? t('Is filter me koi nahi') : t('Abhi koi staff nahi')} message={t('Cashier, manager ya helper — sab ko yahan jorein. Login dena marzi hai.')}
            action={<View style={{ gap: 8 }}>{canAdd && <Button icon={Plus} onPress={() => router.push('/staff/new' as never)}>{t('New')}</Button>}{filtered && <Button variant="ghost" onPress={clear}>{t('Filter saaf karein')}</Button>}</View>} />
        )}
        fab={canAdd && tab === 'staff' ? { icon: Plus, label: t('New'), onPress: () => router.push('/staff/new' as never) } : undefined}
      />
      <Sheet open={filters} onClose={() => setFilters(false)} title={t('Filters')}
        footer={<View style={{ flexDirection: 'row', gap: 8 }}><Button variant="secondary" style={{ flex: 1 }} onPress={clear}>{t('Filter saaf karein')}</Button><Button style={{ flex: 1 }} onPress={() => setFilters(false)}>{t('Done')}</Button></View>}>
        <View style={{ gap: th.space(4) }}>
          <Select label={t('Role')} value={role} onChange={(v) => setRole(v as '' | RoleKey)}
            options={[{ value: '', label: t('Sab roles') }, ...(Object.keys(ROLES) as RoleKey[]).map((r) => ({ value: r, label: roleLabel(r), icon: ROLES[r].icon }))]} />
          {allShops && shops.length > 1 && (
            <Select label={t('Branch')} value={shopId} onChange={setShopId}
              options={[{ value: '', label: t('Sab branches') }, ...shops.map((s) => ({ value: s.id, label: s.name })), { value: 'none', label: t('Kisi ek branch ke nahi') }]} />
          )}
          <Select label={t('Sort')} value={sort} onChange={(v) => setSort(v as Sort)}
            options={[
              { value: 'name', label: t('Duty wale pehle, phir naam') }, { value: 'joined', label: t('Naye pehle') },
              ...(canTeam ? [{ value: 'login', label: t('Aakhri login') }] : []),
              ...(seesSales ? [{ value: 'sales', label: t('Aaj ki sale') }] : []),
            ]} />
        </View>
      </Sheet>
    </>
  );
}
