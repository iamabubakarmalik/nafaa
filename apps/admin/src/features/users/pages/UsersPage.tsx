/**
 * Users: every person who can sign in to a shop, across the platform.
 * Search and filters run on the server. Admins can switch a user on or off.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Activity, ArrowDownUp, Crown, Download, MonitorSmartphone, Lightbulb, MailQuestion, Power, ShieldCheck, Tag, UserCheck, UserPlus, Users } from 'lucide-react';
import {
  Avatar, Badge, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, heroButton, type BadgeVariant,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminUsersApi, type AdminUserItem, type UserRole } from '@/api/admin-users.api';
import { formatDate, formatDateTime } from '@/lib/format';
import { LastSeen, ListCard, StatusBadge, downloadCsv, fetchAllPages, statusLabel, useListParams } from '@/ui';
import { UserActions } from '../components/UserActions';
import { num } from '@/lib/format';

const ROLES: Array<UserRole | 'ALL'> = ['ALL', 'OWNER', 'MANAGER', 'CASHIER', 'STAFF'];
const ACTIVITY = [
  { value: 'ALL', label: 'Any activity' },
  { value: 'online', label: 'Online now' },
  { value: 'today', label: 'Active today' },
  { value: 'week', label: 'Active this week' },
  { value: 'idle7', label: 'Not seen for 7+ days' },
  { value: 'idle30', label: 'Not seen for 30+ days' },
  { value: 'never', label: 'Never signed in' },
];
const APPS = [{ value: 'ALL', label: 'Any app' }, { value: 'web', label: 'Web' }, { value: 'desktop', label: 'Desktop' }, { value: 'mobile', label: 'Mobile' }];
const SORTS = [{ value: 'newest', label: 'Newest first' }, { value: 'last_seen', label: 'Last seen' }, { value: 'oldest', label: 'Oldest first' }, { value: 'name', label: 'Name A–Z' }];
const ROLE_TONE: Record<UserRole, BadgeVariant> = { SUPER_ADMIN: 'warning', OWNER: 'info', MANAGER: 'default', CASHIER: 'success', STAFF: 'default' };

export default function UsersPage() {
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ role: 'ALL', status: 'ALL', activity: 'ALL', via: 'ALL', sort: 'newest' });
  const { role, status, activity, via, sort } = list.filters;

  const query = {
    search: list.debouncedSearch || undefined,
    role: role === 'ALL' ? undefined : (role as UserRole),
    status: status === 'ALL' ? undefined : (status as 'active' | 'inactive'),
    activity: activity === 'ALL' ? undefined : activity,
    via: via === 'ALL' ? undefined : via,
    sort,
  };
  const users = useQuery({
    queryKey: ['admin', 'users', query, list.page, list.limit],
    queryFn: () => adminUsersApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const stats = useQuery({ queryKey: ['admin', 'users', 'stats'], queryFn: adminUsersApi.stats, staleTime: 60_000 });
  const s = stats.data;
  const rows = users.data?.items ?? [];

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages((page) => adminUsersApi.list({ ...query, page, limit: 100 }));
      downloadCsv<AdminUserItem>('users', all, [
        { label: 'Name', value: (u) => u.fullName },
        { label: 'Email', value: (u) => u.email },
        { label: 'Phone', value: (u) => u.phone },
        { label: 'Role', value: (u) => u.role },
        { label: 'Shop', value: (u) => u.tenant.name },
        { label: 'Active', value: (u) => u.isActive },
        { label: 'Last sign-in', value: (u) => (u.lastLoginAt ? formatDateTime(u.lastLoginAt) : '') },
        { label: 'Last seen', value: (u) => (u.lastSeenAt ? formatDateTime(u.lastSeenAt) : '') },
        { label: 'App', value: (u) => u.lastSeenVia },
        { label: 'Joined', value: (u) => formatDateTime(u.createdAt) },
      ]);
      toast.success(`${num(all.length)} users exported`);
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const chips = [
    role !== 'ALL' && <FilterChip key="r" onRemove={() => list.setFilter('role', 'ALL')}>{statusLabel(role)}</FilterChip>,
    activity !== 'ALL' && <FilterChip key="a" onRemove={() => list.setFilter('activity', 'ALL')}>{ACTIVITY.find((a) => a.value === activity)?.label}</FilterChip>,
    via !== 'ALL' && <FilterChip key="v" onRemove={() => list.setFilter('via', 'ALL')}>{APPS.find((a) => a.value === via)?.label}</FilterChip>,
    status !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{statusLabel(status)}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Users"
        chip={s ? `${num(s.total)} people` : undefined}
        busy={users.isFetching}
        loading={stats.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting}>
              <Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={s ? [
          { label: 'Online now', value: num(s.onlineNow ?? 0), hint: `${num(s.activeToday ?? 0)} active today` },
          { label: 'Active users', value: num(s.active), hint: `${num(s.inactive)} switched off` },
          { label: 'New this week', value: num(s.newThisWeek) },
          { label: 'Never signed in', value: num(s.neverSignedIn) },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search name, email or phone" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={ShieldCheck} label="Role" value={role} active={role !== 'ALL'} onChange={(v) => list.setFilter('role', v)}
          options={ROLES.map((v) => ({ value: v, label: v === 'ALL' ? 'All roles' : statusLabel(v) }))} />
        <FilterMenu icon={Activity} label="Activity" value={activity} active={activity !== 'ALL'} onChange={(v) => list.setFilter('activity', v)} options={ACTIVITY} />
        <FilterMenu icon={MonitorSmartphone} label="App" value={via} active={via !== 'ALL'} onChange={(v) => list.setFilter('via', v)} options={APPS} />
        <FilterMenu icon={ArrowDownUp} label="Sort" value={sort} onChange={(v) => list.setFilter('sort', v)} options={SORTS} align="right" />
        <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)} align="right"
          options={[{ value: 'ALL', label: 'All users' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Switched off' }]} />
      </FilterBar>

      <ListCard
        loading={users.isLoading}
        empty={!rows.length}
        emptyIcon={<Users className="h-6 w-6" />}
        emptyTitle="No users match"
        emptyText="Try another search or clear the filters."
        page={list.page} limit={list.limit} total={users.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="52rem">
          <THead>
            <Tr>
              <Th>User</Th><Th>Shop</Th><Th>Role</Th><Th>Last seen</Th><Th>Status</Th><Th align="right">Joined</Th><Th align="right"><span className="sr-only">Actions</span></Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((u) => (
              <Tr key={u.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={u.fullName} size={36} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 font-semibold text-slate-900">
                        <span className="truncate">{u.fullName}</span>
                        {u.role === 'SUPER_ADMIN' && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                      </div>
                      <div className="truncate text-[0.75rem] text-slate-500">
                        {u.email}{u.phone ? ` · ${u.phone}` : ''}
                        {!u.emailVerified && <MailQuestion className="ms-1 inline h-3 w-3 text-amber-500" aria-label="Email not verified" />}
                      </div>
                    </div>
                  </div>
                </Td>
                <Td className="max-w-[14rem]">
                  <Link to={`/tenants/${u.tenant.id}`} className="block truncate font-medium text-slate-900 hover:text-brand-700">{u.tenant.name}</Link>
                  <div className="truncate text-[0.75rem] text-slate-500">@{u.tenant.slug}</div>
                </Td>
                <Td><Badge variant={ROLE_TONE[u.role]}>{statusLabel(u.role)}</Badge></Td>
                <Td><LastSeen at={u.lastSeenAt ?? u.lastLoginAt} via={u.lastSeenVia} /></Td>
                <Td><StatusBadge value={u.isActive ? 'ACTIVE' : 'DISABLED'} label={u.isActive ? 'Active' : 'Switched off'} /></Td>
                <Td align="right" className="whitespace-nowrap text-slate-500" title={formatDateTime(u.createdAt)}>{formatDate(u.createdAt)}<div className="text-[0.6875rem] text-slate-400">{new Date(u.createdAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })}</div></Td>
                <Td align="right">
                  <UserActions user={u} />
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Users"
          description="Everyone who can sign in to a shop: owners, managers, cashiers and staff."
          flowTitle="How a user is used"
          flow={[
            { label: 'Shop owner signs up', icon: UserPlus, color: '#4f46e5' },
            { label: 'Adds staff', hint: 'Manager, cashier', icon: Users, color: '#0284c7' },
            { label: 'Signs in', icon: UserCheck, color: '#059669' },
            { label: 'Switched off', hint: 'By you', icon: Power, color: '#e11d48' },
          ]}
          steps={[
            { icon: Tag, color: '#4f46e5', title: 'Find a person', text: 'Search by name, email or phone, or narrow by role and status.' },
            { icon: Power, color: '#e11d48', title: 'Switch off', text: 'A switched-off user cannot sign in. Their sales and records stay.' },
            { icon: Download, color: '#059669', title: 'Export', text: 'Export CSV downloads every user that matches the filters.' },
          ]}
          tips={['Click a shop name to open that shop.', 'Super admin accounts cannot be switched off here.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
