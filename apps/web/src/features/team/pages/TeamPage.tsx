import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Trash2, ToggleLeft, ToggleRight, ShieldCheck, Crown, KeyRound,
  Search, X, Phone, Mail, Calendar, Eye, EyeOff, AlertCircle, Lock,
  CheckCircle2, UserCheck, UserX, Activity, Sparkles, Filter,
} from 'lucide-react';
import { teamApi, type UserRole, type TeamMember } from '@/api/team.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
} from '@/lib/permissions';

const roleColors: Record<UserRole, { bg: string; text: string; gradient: string }> = {
  SUPER_ADMIN: { bg: 'bg-rose-100', text: 'text-rose-700', gradient: 'from-rose-500 to-rose-700' },
  OWNER: { bg: 'bg-amber-100', text: 'text-amber-700', gradient: 'from-amber-500 to-orange-600' },
  MANAGER: { bg: 'bg-violet-100', text: 'text-violet-700', gradient: 'from-violet-500 to-violet-700' },
  CASHIER: { bg: 'bg-blue-100', text: 'text-blue-700', gradient: 'from-blue-500 to-blue-700' },
  STAFF: { bg: 'bg-slate-100', text: 'text-slate-700', gradient: 'from-slate-500 to-slate-700' },
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

  const [form, setForm] = useState<{
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: Exclude<UserRole, 'OWNER' | 'SUPER_ADMIN'>;
    permissions: string[];
  }>({
    fullName: '', email: '', phone: '', password: '',
    role: 'CASHIER',
    permissions: [...DEFAULT_ROLE_PERMISSIONS.CASHIER],
  });

  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: teamApi.list,
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
      owners: members.filter((m: any) => m.role === 'OWNER' || m.role === 'SUPER_ADMIN').length,
      managers: members.filter((m: any) => m.role === 'MANAGER').length,
      cashiers: members.filter((m: any) => m.role === 'CASHIER').length,
      staff: members.filter((m: any) => m.role === 'STAFF').length,
    };
  }, [members]);

  const createMutation = useMutation({
    mutationFn: teamApi.create,
    onSuccess: () => {
      toast.success('Team member added successfully');
      setForm({
        fullName: '', email: '', phone: '', password: '',
        role: 'CASHIER',
        permissions: [...(effectiveDefaults.CASHIER ?? [])],
      });
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
      toast.success('Permissions updated');
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

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-violet-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-300" /> Team Management
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Team Members</h2>
            <p className="mt-2 text-sm text-white/80">
              Apni team ko exact permissions ke saath access dein — checkbox-based control.
            </p>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Members" value={stats.total} icon={Users} color="violet" hint={`${stats.active} active`} />
        <StatCard label="Owners" value={stats.owners} icon={Crown} color="amber" hint="Full access" />
        <StatCard label="Managers" value={stats.managers} icon={ShieldCheck} color="blue" hint="Broad access" />
        <StatCard label="Cashiers + Staff" value={stats.cashiers + stats.staff} icon={UserCheck} color="emerald" hint={`${stats.cashiers} cashier + ${stats.staff} staff`} />
      </section>

      <section className="grid xl:grid-cols-[440px_1fr] gap-6">
        {isOwner ? (
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 h-fit sticky top-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center shadow">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">New Member</h3>
                <p className="text-sm text-slate-500">Add team member with custom access</p>
              </div>
            </div>

            <div className="space-y-4">
              <Input label="Full Name *" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Bilal Ahmad" />
              <Input label="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="bilal@yourshop.pk" />
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+923001234567" />
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Temporary Password *</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min 8 characters"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Member first login pe change kar sakta hai</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['MANAGER', 'CASHIER', 'STAFF'] as const).map((r) => {
                    const cfg = roleColors[r];
                    const active = form.role === r;
                    const labels: any = { MANAGER: 'Manager', CASHIER: 'Cashier', STAFF: 'Staff' };
                    const hints: any = { MANAGER: 'Broad', CASHIER: 'POS', STAFF: 'Limited' };
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => applyRoleDefaults(r)}
                        className={`p-3 rounded-xl border-2 transition text-center ${
                          active ? `border-violet-500 bg-violet-50` : 'border-slate-200 hover:border-violet-300'
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${cfg.gradient} text-white flex items-center justify-center mx-auto mb-1 shadow`}>
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div className="text-sm font-extrabold text-slate-900">{labels[r]}</div>
                        <div className="text-[10px] text-slate-500 font-semibold">{hints[r]}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 inline-flex items-center gap-1.5">
                      <KeyRound className="h-4 w-4 text-violet-600" />
                      Access Control
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">Default load hota hai • customize kar sakte hain</p>
                  </div>
                  <div className="rounded-full bg-violet-100 text-violet-700 px-3 py-1 text-xs font-bold">
                    {form.permissions.length} permissions
                  </div>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {PERMISSION_GROUPS.map((group) => {
                    const allSelected = group.permissions.every((p: string) => form.permissions.includes(p));
                    const someSelected = group.permissions.some((p: string) => form.permissions.includes(p));
                    return (
                      <div key={group.title} className="rounded-xl bg-white border border-slate-200 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-extrabold" style={{ color: group.color }}>
                            {group.title}
                          </div>
                          <button
                            type="button"
                            onClick={() => selectAll(group)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                              allSelected ? 'bg-rose-100 text-rose-700' : someSelected ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-1.5">
                          {group.permissions.map((permission: string) => {
                            const active = form.permissions.includes(permission);
                            return (
                              <label
                                key={permission}
                                className={`flex items-center gap-2 rounded-lg border-2 px-2 py-1.5 text-xs cursor-pointer transition ${
                                  active ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-200'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={active}
                                  onChange={() => toggleCreatePermission(permission)}
                                  className="h-3.5 w-3.5 rounded"
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
                className="w-full bg-violet-600 hover:bg-violet-700"
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
          <div className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 p-6 h-fit">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-lg">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="mt-3 font-extrabold text-amber-900">Owner Access Required</h3>
            <p className="text-sm text-amber-800 mt-2">
              Sirf Owner team members ka access define kar sakta hai. Apne Owner se request karein.
            </p>
          </div>
        )}

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-xl font-bold text-slate-900">All Members</h3>
                <p className="text-sm text-slate-500">{filteredMembers.length} of {members.length}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm focus:outline-none focus:border-violet-500"
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
            </div>
            <div className="space-y-2">
              <div className="flex gap-1 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold self-center mr-1">Status:</span>
                {[
                  { v: 'all' as Filter, l: 'All' },
                  { v: 'active' as Filter, l: 'Active' },
                  { v: 'inactive' as Filter, l: 'Inactive' },
                ].map((opt) => (
                  <button
                    key={opt.v}
                    onClick={() => setFilter(opt.v)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                      filter === opt.v ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold self-center mr-1">Role:</span>
                <button
                  onClick={() => setRoleFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                    roleFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                {(['OWNER', 'MANAGER', 'CASHIER', 'STAFF'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                      roleFilter === r ? `${roleColors[r].bg} ${roleColors[r].text}` : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedMember && isOwner && (
            <div className="m-4 rounded-3xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-white p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center shadow">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-violet-900">Editing access for {selectedMember.fullName}</div>
                    <p className="text-xs text-violet-700 mt-0.5">
                      Role: {selectedMember.role} • Current: {editPermissions.length} permissions
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
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Save Access
                  </Button>
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {PERMISSION_GROUPS.map((group) => {
                  const allSelected = group.permissions.every((p: string) => editPermissions.includes(p));
                  const someSelected = group.permissions.some((p: string) => editPermissions.includes(p));
                  return (
                    <div key={group.title} className="rounded-xl bg-white border border-slate-200 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-extrabold" style={{ color: group.color }}>
                          {group.title}
                        </div>
                        <button
                          type="button"
                          onClick={() => selectAllEdit(group)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition ${
                            allSelected ? 'bg-rose-100 text-rose-700' : someSelected ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-1.5">
                        {group.permissions.map((permission: string) => {
                          const active = editPermissions.includes(permission);
                          return (
                            <label
                              key={permission}
                              className={`flex items-center gap-2 rounded-lg border-2 px-2 py-1.5 text-xs cursor-pointer transition ${
                                active ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-200'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={active}
                                onChange={() => toggleEditPermission(permission)}
                                className="h-3.5 w-3.5 rounded"
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

          {isLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                <Users className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="mt-4 text-lg font-bold text-slate-900">
                {search || filter !== 'all' || roleFilter !== 'all' ? 'No matches' : 'No members yet'}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {search || filter !== 'all' || roleFilter !== 'all' ? 'Try different filter' : 'Pehla member add karein'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredMembers.map((m: any) => {
                const cfg = roleColors[m.role as UserRole];
                return (
                  <div key={m.id} className="px-6 py-4 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${cfg.gradient} text-white flex items-center justify-center font-extrabold shadow-lg shrink-0`}>
                          {m.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 truncate">{m.fullName}</span>
                            {(m.role === 'OWNER' || m.role === 'SUPER_ADMIN') && (
                              <Crown className="h-4 w-4 text-amber-500 fill-amber-500" />
                            )}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${cfg.bg} ${cfg.text}`}>
                              {m.role}
                            </span>
                            {m.isActive ? (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                                <UserCheck className="h-2.5 w-2.5" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                                <UserX className="h-2.5 w-2.5" /> Inactive
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {m.email}
                            </span>
                            {m.phone && (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {m.phone}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 flex-wrap font-bold">
                            <span className="inline-flex items-center gap-1">
                              <KeyRound className="h-2.5 w-2.5" />
                              {(m.permissions ?? []).length} permissions
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Activity className="h-2.5 w-2.5" />
                              Last login: {formatRelative(m.lastLoginAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isOwner && m.role !== 'OWNER' && m.role !== 'SUPER_ADMIN' && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEditingPermissions(m)}
                            className="inline-flex items-center gap-1 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 px-3 py-1.5 text-xs font-bold transition"
                            title="Edit Access"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            Access
                          </button>
                          <button
                            onClick={() => toggleMutation.mutate(m.id)}
                            className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition"
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
                            className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition"
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

function StatCard({ label, value, icon: Icon, color, hint }: any) {
  const colors: any = {
    violet: 'from-violet-500 to-violet-700 shadow-violet-500/30',
    amber: 'from-amber-500 to-amber-700 shadow-amber-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
  };
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{value}</div>
          {hint && <div className="text-xs text-slate-500 font-semibold mt-1">{hint}</div>}
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
