import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Trash2, ToggleLeft, ToggleRight, ShieldCheck, Crown, KeyRound,
  Search, X, Phone, Mail, Calendar, Eye, EyeOff, AlertCircle, Lock,
  CheckCircle2, UserCheck, UserX, Activity, Sparkles, Filter,
  Building2, RefreshCw, Download, Star, Award, ChevronRight,
  Settings2,
} from 'lucide-react';
import { teamApi, type UserRole, type TeamMember } from '@/api/team.api';
import { shopsApi } from '@/api/shops.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
} from '@/lib/permissions';

const roleColors: Record<UserRole, { bg: string; text: string; gradient: string; border: string }> = {
  SUPER_ADMIN: { bg: 'bg-rose-100', text: 'text-rose-700', gradient: 'from-rose-500 to-rose-700', border: 'border-rose-300' },
  OWNER: { bg: 'bg-amber-100', text: 'text-amber-700', gradient: 'from-amber-500 to-orange-600', border: 'border-amber-300' },
  MANAGER: { bg: 'bg-violet-100', text: 'text-violet-700', gradient: 'from-violet-500 to-violet-700', border: 'border-violet-300' },
  CASHIER: { bg: 'bg-blue-100', text: 'text-blue-700', gradient: 'from-blue-500 to-blue-700', border: 'border-blue-300' },
  STAFF: { bg: 'bg-slate-100', text: 'text-slate-700', gradient: 'from-slate-500 to-slate-700', border: 'border-slate-300' },
};

const formatDate = (value: string | null) => {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
};

const formatRelative = (v: string | null) => {
  if (!v) return 'Never logged in';
  const d = new Date(v);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-PK');
};

type Filter = 'all' | 'active' | 'inactive';

export default function TeamPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isOwner = currentUser?.role === 'OWNER' || currentUser?.role === 'SUPER_ADMIN';

  const [showPassword, setShowPassword] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [showFormMobile, setShowFormMobile] = useState(false);

  const [form, setForm] = useState<{
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: Exclude<UserRole, 'OWNER' | 'SUPER_ADMIN'>;
    shopId: string;
    permissions: string[];
  }>({
    fullName: '', email: '', phone: '', password: '', shopId: '',
    role: 'CASHIER',
    permissions: [...DEFAULT_ROLE_PERMISSIONS.CASHIER],
  });

  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  const { data: members = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['team'],
    queryFn: teamApi.list,
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['shops-for-team'],
    queryFn: shopsApi.list,
    enabled: isOwner,
  });

  const { data: catalog } = useQuery({
    queryKey: ['team-permissions-catalog'],
    queryFn: teamApi.catalog,
    enabled: isOwner,
    retry: false,
  });

  const effectiveDefaults = useMemo<Record<string, string[]>>(() => {
    if (catalog?.defaultsByRole) return catalog.defaultsByRole as Record<string, string[]>;
    return DEFAULT_ROLE_PERMISSIONS as Record<string, string[]>;
  }, [catalog]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, permissions: [...(effectiveDefaults[prev.role] ?? [])] }));
  }, [effectiveDefaults]);

  const filteredMembers = useMemo(() => {
    let result = [...members];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((m: any) =>
        m.fullName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q)
      );
    }
    if (filter === 'active') result = result.filter((m: any) => m.isActive);
    else if (filter === 'inactive') result = result.filter((m: any) => !m.isActive);
    if (roleFilter !== 'all') result = result.filter((m: any) => m.role === roleFilter);
    return result;
  }, [members, search, filter, roleFilter]);

  const stats = useMemo(() => {
    return {
      total: members.length,
      active: members.filter((m: any) => m.isActive).length,
      inactive: members.filter((m: any) => !m.isActive).length,
      owners: members.filter((m: any) => m.role === 'OWNER' || m.role === 'SUPER_ADMIN').length,
      managers: members.filter((m: any) => m.role === 'MANAGER').length,
      cashiers: members.filter((m: any) => m.role === 'CASHIER').length,
      staff: members.filter((m: any) => m.role === 'STAFF').length,
      recentlyActive: members.filter((m: any) => {
        if (!m.lastLoginAt) return false;
        const diff = Date.now() - new Date(m.lastLoginAt).getTime();
        return diff < 24 * 60 * 60 * 1000;
      }).length,
    };
  }, [members]);

  const hasFilters = search || filter !== 'all' || roleFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setFilter('all');
    setRoleFilter('all');
  };

  const createMutation = useMutation({
    mutationFn: teamApi.create,
    onSuccess: () => {
      toast.success('Team member added successfully!', { description: 'Permissions configured & ready to use' });
      setForm({
        fullName: '', email: '', phone: '', password: '', shopId: '',
        role: 'CASHIER',
        permissions: [...(effectiveDefaults.CASHIER ?? [])],
      });
      setShowFormMobile(false);
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Member add nahi hua'),
  });

  const toggleMutation = useMutation({
    mutationFn: teamApi.toggle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      toast.success('Status updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: teamApi.remove,
    onSuccess: () => {
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });

  const permissionsMutation = useMutation({
    mutationFn: ({ id, permissions }: { id: string; permissions: string[] }) =>
      teamApi.updatePermissions(id, permissions),
    onSuccess: () => {
      toast.success('Permissions updated successfully');
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setSelectedMember(null);
      setEditPermissions([]);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const applyRoleDefaults = (role: Exclude<UserRole, 'OWNER' | 'SUPER_ADMIN'>) => {
    setForm((prev) => ({ ...prev, role, permissions: [...(effectiveDefaults[role] ?? [])] }));
  };

  const toggleCreatePermission = (permission: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const toggleEditPermission = (permission: string) => {
    setEditPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission],
    );
  };

  const startEditingPermissions = (member: TeamMember) => {
    setSelectedMember(member);
    setEditPermissions([...(member.permissions ?? [])]);
  };

  const selectAll = (group: any) => {
    const allPerms = group.permissions;
    const allSelected = allPerms.every((p: string) => form.permissions.includes(p));
    if (allSelected) {
      setForm((prev) => ({ ...prev, permissions: prev.permissions.filter((p) => !allPerms.includes(p)) }));
    } else {
      setForm((prev) => ({ ...prev, permissions: [...new Set([...prev.permissions, ...allPerms])] }));
    }
  };

  const selectAllEdit = (group: any) => {
    const allPerms = group.permissions;
    const allSelected = allPerms.every((p: string) => editPermissions.includes(p));
    if (allSelected) {
      setEditPermissions((prev) => prev.filter((p) => !allPerms.includes(p)));
    } else {
      setEditPermissions((prev) => [...new Set([...prev, ...allPerms])]);
    }
  };

  const exportCSV = () => {
    if (filteredMembers.length === 0) return toast.error('No data');
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Shop', 'Permissions', 'Last Login'];
    const rows = filteredMembers.map((m: any) => [
      m.fullName,
      m.email,
      m.phone || '',
      m.role,
      m.isActive ? 'Active' : 'Inactive',
      m.assignedShop?.name || '',
      (m.permissions ?? []).length,
      m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString('en-PK') : 'Never',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  return (
    <div className="space-y-6">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-pink-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-extrabold">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-300" />
              Team Management
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Team Members</h2>
            <p className="mt-2 text-sm text-white/80">
              Granular permissions • Shop assignments • Real-time activity tracking
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 backdrop-blur"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {filteredMembers.length > 0 && (
              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold transition backdrop-blur border border-white/20"
              >
                <Download className="h-4 w-4" /> Export
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => setShowFormMobile(true)}
                className="xl:hidden inline-flex items-center gap-2 rounded-xl bg-white text-slate-900 px-4 py-2.5 text-sm font-bold shadow-lg transition"
              >
                <Plus className="h-4 w-4" /> Add Member
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Members"
          value={stats.total}
          icon={Users}
          color="violet"
          hint={`${stats.active} active • ${stats.inactive} inactive`}
        />
        <StatCard
          label="Owners & Admins"
          value={stats.owners}
          icon={Crown}
          color="amber"
          hint="Full system access"
        />
        <StatCard
          label="Managers & Cashiers"
          value={stats.managers + stats.cashiers}
          icon={ShieldCheck}
          color="blue"
          hint={`${stats.managers} managers • ${stats.cashiers} cashiers`}
        />
        <StatCard
          label="Active Today"
          value={stats.recentlyActive}
          icon={Activity}
          color="emerald"
          hint={`${stats.staff} staff members total`}
          isHighlight={stats.recentlyActive > 0}
        />
      </section>

      <section className="grid xl:grid-cols-[440px_1fr] gap-6">
        {/* ═══ LEFT: ADD MEMBER FORM ═══ */}
        {isOwner ? (
          <div className={`rounded-3xl bg-white border-2 border-violet-200 shadow-sm p-6 h-fit xl:sticky xl:top-6 ${
            showFormMobile ? 'fixed inset-4 z-40 overflow-y-auto bg-white' : 'hidden xl:block'
          }`}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Add New Member</h3>
                  <p className="text-sm text-slate-500">Custom access control</p>
                </div>
              </div>
              <button
                onClick={() => setShowFormMobile(false)}
                className="xl:hidden h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                label="Full Name *"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Bilal Ahmad"
              />
              <Input
                label="Email *"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="bilal@yourshop.pk"
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+923001234567"
              />

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Temporary Password *
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min 8 characters"
                    className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-semibold">
                  💡 Member first login pe password change kar sakta hai
                </p>
              </div>

              {/* Role selection */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Role *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['MANAGER', 'CASHIER', 'STAFF'] as const).map((r) => {
                    const cfg = roleColors[r];
                    const active = form.role === r;
                    const labels: any = { MANAGER: 'Manager', CASHIER: 'Cashier', STAFF: 'Staff' };
                    const hints: any = { MANAGER: 'Broad access', CASHIER: 'POS focused', STAFF: 'Limited' };
                    const icons: any = { MANAGER: ShieldCheck, CASHIER: UserCheck, STAFF: Users };
                    const Icon = icons[r];
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => applyRoleDefaults(r)}
                        className={`p-3 rounded-xl border-2 transition text-center ${
                          active
                            ? `${cfg.border} ${cfg.bg} ring-2 ring-violet-200 shadow-md`
                            : 'border-slate-200 hover:border-violet-300 bg-white'
                        }`}
                      >
                        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${cfg.gradient} text-white flex items-center justify-center mx-auto mb-1.5 shadow-md`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className={`text-sm font-extrabold ${active ? cfg.text : 'text-slate-900'}`}>
                          {labels[r]}
                        </div>
                        <div className={`text-[9px] font-bold mt-0.5 ${active ? cfg.text : 'text-slate-500'}`}>
                          {hints[r]}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shop assignment */}
              {shops.length > 0 && (
                <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 p-3">
                  <label className="text-sm font-bold text-indigo-900 mb-2 inline-flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-indigo-600" />
                    Assign to Shop / Branch
                  </label>
                  <select
                    value={form.shopId}
                    onChange={(e) => setForm({ ...form, shopId: e.target.value })}
                    className="h-11 w-full rounded-xl border-2 border-indigo-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition"
                  >
                    <option value="">— No specific shop (flexible) —</option>
                    {shops.filter((s) => s.isActive).map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name}{shop.isMain ? ' ⭐ Main' : ''} ({shop.type})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-indigo-800 mt-1.5 font-semibold flex items-center gap-1">
                    {form.shopId ? (
                      <><Lock className="h-2.5 w-2.5" /> User sirf is shop ka data dekh sakega</>
                    ) : (
                      <><AlertCircle className="h-2.5 w-2.5" /> Cashier/Manager ko shop assign karna recommended hai</>
                    )}
                  </p>
                </div>
              )}

              {/* Permissions */}
              <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50/50 to-white p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h4 className="font-extrabold text-violet-900 inline-flex items-center gap-1.5">
                      <KeyRound className="h-4 w-4" />
                      Access Permissions
                    </h4>
                    <p className="text-[10px] text-violet-700 mt-0.5 font-semibold">
                      Role defaults auto-load • Customize anytime
                    </p>
                  </div>
                  <div className="rounded-full bg-violet-600 text-white px-2.5 py-1 text-[10px] font-extrabold shadow-md">
                    {form.permissions.length} perms
                  </div>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {PERMISSION_GROUPS.map((group) => {
                    const allSelected = group.permissions.every((p: string) => form.permissions.includes(p));
                    const someSelected = group.permissions.some((p: string) => form.permissions.includes(p));
                    const count = group.permissions.filter((p: string) => form.permissions.includes(p)).length;
                    return (
                      <div key={group.title} className="rounded-xl bg-white border-2 border-slate-200 p-2.5 hover:border-violet-300 transition">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-extrabold inline-flex items-center gap-1.5" style={{ color: group.color }}>
                            <Settings2 className="h-3 w-3" />
                            {group.title}
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 rounded-full">
                              {count}/{group.permissions.length}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => selectAll(group)}
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full transition ${
                              allSelected
                                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                : someSelected
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            }`}
                          >
                            {allSelected ? '−' : '+'} {allSelected ? 'Deselect' : 'Select'} All
                          </button>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-1">
                          {group.permissions.map((permission: string) => {
                            const active = form.permissions.includes(permission);
                            return (
                              <label
                                key={permission}
                                className={`flex items-center gap-1.5 rounded-lg border-2 px-2 py-1 text-[10px] cursor-pointer transition ${
                                  active
                                    ? 'border-violet-300 bg-violet-50'
                                    : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/30'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={active}
                                  onChange={() => toggleCreatePermission(permission)}
                                  className="h-3 w-3 rounded text-violet-600"
                                />
                                <span className="font-bold text-slate-700 truncate">
                                  {PERMISSION_LABELS[permission] || permission}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 shadow-lg shadow-violet-500/30"
                size="lg"
                loading={createMutation.isPending}
                onClick={() => {
                  if (!form.fullName.trim()) return toast.error('Name required');
                  if (!form.email.trim()) return toast.error('Email required');
                  if (form.password.length < 8) return toast.error('Password min 8 characters');
                  createMutation.mutate({
                    fullName: form.fullName.trim(),
                    email: form.email.trim(),
                    phone: form.phone.trim() || undefined,
                    password: form.password,
                    role: form.role,
                    shopId: form.shopId || undefined,
                    permissions: form.permissions,
                  });
                }}
              >
                <Plus className="h-4 w-4" />
                Add Team Member
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 p-6 h-fit shadow-sm">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Lock className="h-7 w-7" />
            </div>
            <h3 className="mt-4 font-extrabold text-amber-900 text-lg">Owner Access Required</h3>
            <p className="text-sm text-amber-800 mt-2 font-semibold">
              Sirf Owner team members add/edit kar sakta hai. Apne Owner se permission request karein.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-xs font-extrabold text-amber-800">
              <ShieldCheck className="h-3 w-3" />
              Read-only mode
            </div>
          </div>
        )}

        {/* ═══ RIGHT: MEMBERS LIST ═══ */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {/* Filters header */}
          <div className="px-6 py-5 border-b border-slate-100 space-y-3 bg-gradient-to-br from-slate-50/50 to-white">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xl font-bold text-slate-900">All Members</h3>
                <p className="text-sm text-slate-500">
                  {filteredMembers.length} of {members.length}
                  {hasFilters && <span className="ml-1 font-bold text-violet-700">• filtered</span>}
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition shadow-sm"
                placeholder="Search by name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex gap-1 flex-wrap items-center">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold mr-1">Status:</span>
                {[
                  { v: 'all' as Filter, l: 'All', count: stats.total, c: 'bg-slate-900' },
                  { v: 'active' as Filter, l: 'Active', count: stats.active, c: 'bg-emerald-600' },
                  { v: 'inactive' as Filter, l: 'Inactive', count: stats.inactive, c: 'bg-rose-600' },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setFilter(opt.v)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition inline-flex items-center gap-1 ${
                      filter === opt.v ? `${opt.c} text-white shadow-sm` : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {opt.l}
                    <span className={`px-1 rounded-full text-[9px] ${filter === opt.v ? 'bg-white/20' : 'bg-slate-200'}`}>
                      {opt.count}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex gap-1 flex-wrap items-center">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold mr-1">Role:</span>
                <button
                  onClick={() => setRoleFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition ${
                    roleFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                {(['OWNER', 'MANAGER', 'CASHIER', 'STAFF'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition ${
                      roleFilter === r ? `${roleColors[r].bg} ${roleColors[r].text} ring-2 ring-${r === 'OWNER' ? 'amber' : r === 'MANAGER' ? 'violet' : r === 'CASHIER' ? 'blue' : 'slate'}-300` : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs font-bold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1">
                  <X className="h-3 w-3" /> Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Permission edit panel */}
          {selectedMember && isOwner && (
            <div className="m-4 rounded-3xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 via-white to-purple-50 p-5 shadow-lg shadow-violet-500/20 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <KeyRound className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-extrabold text-violet-900 text-lg">
                      Editing access: {selectedMember.fullName}
                    </div>
                    <p className="text-xs text-violet-700 mt-0.5 font-semibold flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${roleColors[selectedMember.role].bg} ${roleColors[selectedMember.role].text}`}>
                        {selectedMember.role}
                      </span>
                      <span>•</span>
                      <span>{editPermissions.length} permissions selected</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => { setSelectedMember(null); setEditPermissions([]); }}>
                    Cancel
                  </Button>
                  <Button
                    loading={permissionsMutation.isPending}
                    onClick={() => permissionsMutation.mutate({ id: selectedMember.id, permissions: editPermissions })}
                    className="bg-gradient-to-r from-violet-600 to-purple-700 shadow-lg shadow-violet-500/30"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Save Access
                  </Button>
                </div>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {PERMISSION_GROUPS.map((group) => {
                  const allSelected = group.permissions.every((p: string) => editPermissions.includes(p));
                  const someSelected = group.permissions.some((p: string) => editPermissions.includes(p));
                  const count = group.permissions.filter((p: string) => editPermissions.includes(p)).length;
                  return (
                    <div key={group.title} className="rounded-xl bg-white border-2 border-slate-200 p-3 hover:border-violet-300 transition">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-extrabold inline-flex items-center gap-1.5" style={{ color: group.color }}>
                          <Settings2 className="h-3.5 w-3.5" />
                          {group.title}
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 rounded-full">
                            {count}/{group.permissions.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => selectAllEdit(group)}
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full transition ${
                            allSelected ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : someSelected ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          }`}
                        >
                          {allSelected ? '− Deselect' : '+ Select'} All
                        </button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-1.5">
                        {group.permissions.map((permission: string) => {
                          const active = editPermissions.includes(permission);
                          return (
                            <label
                              key={permission}
                              className={`flex items-center gap-2 rounded-lg border-2 px-2 py-1.5 text-xs cursor-pointer transition ${
                                active ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/30'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={active}
                                onChange={() => toggleEditPermission(permission)}
                                className="h-3.5 w-3.5 rounded text-violet-600"
                              />
                              <span className="font-bold text-slate-700 truncate">
                                {PERMISSION_LABELS[permission] || permission}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Members list */}
          {isLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-200 flex items-center justify-center shadow-inner">
                <Users className="h-9 w-9 text-violet-600" />
              </div>
              <h4 className="mt-5 text-lg font-bold text-slate-900">
                {hasFilters ? 'No matches' : 'No team members yet'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 font-semibold">
                {hasFilters ? 'Try different filter' : 'Left form se pehla member add karein'}
              </p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold transition shadow-md"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredMembers.map((m: any) => {
                const cfg = roleColors[m.role as UserRole];
                const isRecentlyActive = m.lastLoginAt && (Date.now() - new Date(m.lastLoginAt).getTime() < 24 * 60 * 60 * 1000);
                return (
                  <div key={m.id} className="px-6 py-4 hover:bg-slate-50/50 transition group">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${cfg.gradient} text-white flex items-center justify-center font-extrabold shadow-lg ring-2 ring-white text-base`}>
                            {m.fullName.charAt(0).toUpperCase()}
                          </div>
                          {isRecentlyActive && (
                            <div className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white shadow animate-pulse" title="Recently active" />
                          )}
                          {(m.role === 'OWNER' || m.role === 'SUPER_ADMIN') && (
                            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center shadow-lg">
                              <Crown className="h-2.5 w-2.5 text-white fill-white" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 truncate">{m.fullName}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${cfg.bg} ${cfg.text}`}>
                              {m.role}
                            </span>
                            {m.isActive ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
                                <UserCheck className="h-2.5 w-2.5" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                                <UserX className="h-2.5 w-2.5" /> Inactive
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap font-semibold">
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {m.email}
                            </span>
                            {m.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {m.phone}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 flex-wrap font-bold">
                            {m.assignedShop ? (
                              <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                                <Building2 className="h-2.5 w-2.5" />
                                {m.assignedShop.name}{m.assignedShop.isMain ? ' ⭐' : ''}
                              </span>
                            ) : (m.role !== 'OWNER' && m.role !== 'SUPER_ADMIN') ? (
                              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md">
                                <AlertCircle className="h-2.5 w-2.5" />
                                No shop assigned
                              </span>
                            ) : null}
                            <span className="inline-flex items-center gap-1 text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded-md">
                              <KeyRound className="h-2.5 w-2.5" />
                              {(m.permissions ?? []).length} perms
                            </span>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${isRecentlyActive ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                              <Activity className="h-2.5 w-2.5" />
                              {formatRelative(m.lastLoginAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isOwner && m.role !== 'OWNER' && m.role !== 'SUPER_ADMIN' && (
                        <div className="flex items-center gap-1 shrink-0 opacity-90 group-hover:opacity-100 transition">
                          <button
                            onClick={() => startEditingPermissions(m)}
                            className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-violet-100 to-purple-100 hover:from-violet-200 hover:to-purple-200 text-violet-700 px-3 py-2 text-xs font-extrabold transition shadow-sm hover:shadow-md"
                            title="Edit Access"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            Access
                          </button>
                          <button
                            onClick={() => toggleMutation.mutate(m.id)}
                            className="h-8 w-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition shadow-sm"
                            title={m.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {m.isActive ? (
                              <ToggleRight className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="h-5 w-5 text-slate-400" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remove ${m.fullName}? Yeh action undo nahi ho sakta.`)) deleteMutation.mutate(m.id);
                            }}
                            className="h-8 w-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition shadow-sm"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, hint, isHighlight }: any) {
  const colors: any = {
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
  };
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ${
      isHighlight ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">{value}</div>
          {hint && <div className="text-xs text-slate-600 font-semibold mt-1">{hint}</div>}
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0 ml-2`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
