/**
 * Users: every person who can sign in to a shop, across the platform.
 * Search and filters run on the server. Admins can switch a user on or off.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Crown, Download, Lightbulb, MailQuestion, Power, ShieldCheck, Tag, UserCheck, UserPlus, Users } from 'lucide-react';
import {
  Avatar, Badge, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, confirmDialog, heroButton, type BadgeVariant,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminUsersApi, type AdminUserItem, type UserRole } from '@/api/admin-users.api';
import { formatDate, formatRelative } from '@/lib/format';
import { ListCard, StatusBadge, downloadCsv, fetchAllPages, statusLabel, useListParams } from '@/ui';

const ROLES: Array<UserRole | 'ALL'> = ['ALL', 'OWNER', 'MANAGER', 'CASHIER', 'STAFF', 'SUPER_ADMIN'];
const ROLE_TONE: Record<UserRole, BadgeVariant> = { SUPER_ADMIN: 'warning', OWNER: 'info', MANAGER: 'default', CASHIER: 'success', STAFF: 'default' };
const num = (n: number) => n.toLocaleString('en-PK');

export default function UsersPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ role: 'ALL', status: 'ALL' });
  const { role, status } = list.filters;

  const query = {
    search: list.debouncedSearch || undefined,
    role: role === 'ALL' ? undefined : (role as UserRole),
    status: status === 'ALL' ? undefined : (status as 'active' | 'inactive'),
  };
  const users = useQuery({
    queryKey: ['admin', 'users', query, list.page, list.limit],
    queryFn: () => adminUsersApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const stats = useQuery({ queryKey: ['admin', 'users', 'stats'], queryFn: adminUsersApi.stats, staleTime: 60_000 });
  const s = stats.data;
  const rows = users.data?.items ?? [];

  const toggle = useMutation({
    mutationFn: adminUsersApi.toggle,
    onSuccess: (u) => {
      toast.success(u.isActive ? 'User switched on' : 'User switched off');
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Could not update the user'),
  });

  const onToggle = async (u: AdminUserItem) => {
    if (u.isActive && !(await confirmDialog({
      title: `Switch off ${u.fullName}?`, text: 'They will not be able to sign in until you switch them on again.', yes: 'Switch off', danger: true,
    }))) return;
    toggle.mutate(u.id);
  };

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
        { label: 'Last sign-in', value: (u) => u.lastLoginAt?.slice(0, 10) },
        { label: 'Joined', value: (u) => u.createdAt.slice(0, 10) },
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
          { label: 'Active users', value: num(s.active), hint: `of ${num(s.total)}` },
          { label: 'Switched off', value: num(s.inactive) },
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
              <Th>User</Th><Th>Shop</Th><Th>Role</Th><Th>Last sign-in</Th><Th>Status</Th><Th align="right">Joined</Th><Th align="right"><span className="sr-only">Actions</span></Th>
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
                <Td className="whitespace-nowrap text-slate-600">{u.lastLoginAt ? formatRelative(u.lastLoginAt) : <span className="text-slate-400">Never</span>}</Td>
                <Td><StatusBadge value={u.isActive ? 'ACTIVE' : 'DISABLED'} label={u.isActive ? 'Active' : 'Switched off'} /></Td>
                <Td align="right" className="whitespace-nowrap text-slate-500">{formatDate(u.createdAt)}</Td>
                <Td align="right">
                  {u.role !== 'SUPER_ADMIN' && (
                    <button type="button" onClick={() => onToggle(u)} disabled={toggle.isPending}
                      className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                      <Power className={u.isActive ? 'h-3.5 w-3.5 text-rose-600' : 'h-3.5 w-3.5 text-emerald-600'} />{u.isActive ? 'Switch off' : 'Switch on'}
                    </button>
                  )}
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
