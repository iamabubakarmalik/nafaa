import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Trash2, ToggleLeft, ToggleRight, ShieldCheck, Crown, KeyRound,
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

const roleColors: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-rose-100 text-rose-700',
  OWNER: 'bg-amber-100 text-amber-700',
  MANAGER: 'bg-violet-100 text-violet-700',
  CASHIER: 'bg-blue-100 text-blue-700',
  STAFF: 'bg-slate-100 text-slate-700',
};

const formatDate = (value: string | null) => {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

export default function TeamPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isOwner = currentUser?.role === 'OWNER' || currentUser?.role === 'SUPER_ADMIN';

  const [form, setForm] = useState<{
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: Exclude<UserRole, 'OWNER' | 'SUPER_ADMIN'>;
    permissions: string[];
  }>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
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
    setForm((prev) => ({
      ...prev,
      permissions: [...(effectiveDefaults[prev.role] ?? [])],
    }));
  }, [effectiveDefaults]);

  const createMutation = useMutation({
    mutationFn: teamApi.create,
    onSuccess: () => {
      toast.success('Team member added successfully');
      setForm({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        role: 'CASHIER',
        permissions: [...(effectiveDefaults.CASHIER ?? [])],
      });
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Member add nahi hua');
    },
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
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Permissions update nahi hui');
    },
  });

  const applyRoleDefaults = (role: Exclude<UserRole, 'OWNER' | 'SUPER_ADMIN'>) => {
    setForm((prev) => ({
      ...prev,
      role,
      permissions: [...(effectiveDefaults[role] ?? [])],
    }));
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
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission],
    );
  };

  const startEditingPermissions = (member: TeamMember) => {
    setSelectedMember(member);
    setEditPermissions([...(member.permissions ?? [])]);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-violet-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              Team Management
            </div>
            <h2 className="mt-3 text-3xl font-bold">Team Members</h2>
            <p className="mt-2 text-sm text-white/80">
              Owner ab har member ko checkbox-based access de sakta hai.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-5 py-4 min-w-[180px]">
            <div className="text-xs text-white/70">Total Members</div>
            <div className="mt-1 text-2xl font-bold">{members.length}</div>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[420px_1fr] gap-6">
        {isOwner ? (
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <h3 className="text-xl font-bold text-slate-900">Naya Member</h3>
            <p className="text-sm text-slate-500 mt-1">
              Role choose karein, phir neeche exact access tick karein.
            </p>

            <div className="space-y-4 mt-6">
              <Input
                label="Full Name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Bilal Ahmad"
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="bilal@nafaa.pk"
              />
              <Input
                label="Phone (optional)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+923001234567"
              />
              <Input
                label="Temporary Password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min 8 characters"
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    applyRoleDefaults(e.target.value as Exclude<UserRole, 'OWNER' | 'SUPER_ADMIN'>)
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="MANAGER">Manager — broad access</option>
                  <option value="CASHIER">Cashier — POS focused</option>
                  <option value="STAFF">Staff — limited access</option>
                </select>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h4 className="font-bold text-slate-900">Access Control</h4>
                    <p className="text-xs text-slate-500">
                      Default role access auto-load hota hai, aap customize kar sakte hain.
                    </p>
                  </div>
                  <div className="rounded-full bg-brand-50 text-brand-700 px-3 py-1 text-xs font-bold">
                    {form.permissions.length} permissions
                  </div>
                </div>

                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                  {PERMISSION_GROUPS.map((group) => (
                    <div
                      key={group.title}
                      className="rounded-2xl bg-white border border-slate-200 p-3"
                    >
                      <div
                        className="text-sm font-bold mb-2"
                        style={{ color: group.color }}
                      >
                        {group.title}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {group.permissions.map((permission) => {
                          const active = form.permissions.includes(permission);
                          return (
                            <label
                              key={permission}
                              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer transition ${
                                active
                                  ? 'border-brand-300 bg-brand-50'
                                  : 'border-slate-200 bg-white'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={active}
                                onChange={() => toggleCreatePermission(permission)}
                                className="h-4 w-4 rounded"
                              />
                              <span className="font-medium text-slate-700">
                                {PERMISSION_LABELS[permission] || permission}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                loading={createMutation.isPending}
                onClick={() => {
                  if (!form.fullName.trim()) return toast.error('Name likhein');
                  if (!form.email.trim()) return toast.error('Email likhein');
                  if (form.password.length < 8) {
                    return toast.error('Password 8+ characters honi chahiye');
                  }

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
                Member add karein
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-amber-50 border border-amber-200 p-6">
            <ShieldCheck className="h-8 w-8 text-amber-700" />
            <h3 className="mt-3 font-bold text-amber-900">Owner Access Required</h3>
            <p className="text-sm text-amber-800 mt-2">
              Sirf Owner team members ka access define kar sakta hai.
            </p>
          </div>
        )}

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">All Members</h3>
            <p className="text-sm text-slate-500">Aap ki team + unka access level</p>
          </div>

          {selectedMember && isOwner && (
            <div className="m-4 rounded-3xl border border-violet-200 bg-violet-50 p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="inline-flex items-center gap-2 text-violet-700 text-sm font-bold">
                    <KeyRound className="h-4 w-4" />
                    Editing access for {selectedMember.fullName}
                  </div>
                  <p className="text-xs text-violet-700/80 mt-1">
                    Role: {selectedMember.role} • current {editPermissions.length} permissions
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedMember(null);
                      setEditPermissions([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    loading={permissionsMutation.isPending}
                    onClick={() =>
                      permissionsMutation.mutate({
                        id: selectedMember.id,
                        permissions: editPermissions,
                      })
                    }
                  >
                    Save Access
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {PERMISSION_GROUPS.map((group) => (
                  <div
                    key={group.title}
                    className="rounded-2xl bg-white border border-slate-200 p-3"
                  >
                    <div className="text-sm font-bold mb-2" style={{ color: group.color }}>
                      {group.title}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {group.permissions.map((permission) => {
                        const active = editPermissions.includes(permission);
                        return (
                          <label
                            key={permission}
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer transition ${
                              active
                                ? 'border-violet-300 bg-violet-50'
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => toggleEditPermission(permission)}
                              className="h-4 w-4 rounded"
                            />
                            <span className="font-medium text-slate-700">
                              {PERMISSION_LABELS[permission] || permission}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="p-6 text-sm text-slate-500">Loading...</div>
          ) : members.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                <Users className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="mt-4 text-lg font-semibold text-slate-900">Abhi koi member nahi</h4>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {members.map((m) => (
                <div key={m.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold flex-shrink-0">
                      {m.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 truncate">{m.fullName}</span>
                        {(m.role === 'OWNER' || m.role === 'SUPER_ADMIN') && (
                          <Crown className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      <div className="text-xs text-slate-500 truncate">{m.email}</div>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${roleColors[m.role]}`}>
                          {m.role}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {m.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {(m.permissions ?? []).length} access
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 mt-1">
                        Last login: {formatDate(m.lastLoginAt ?? null)}
                      </div>
                    </div>
                  </div>

                  {isOwner && m.role !== 'OWNER' && m.role !== 'SUPER_ADMIN' && (
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      <button
                        onClick={() => startEditingPermissions(m)}
                        className="inline-flex items-center gap-1 rounded-lg bg-violet-50 text-violet-700 px-3 py-2 text-xs font-bold hover:bg-violet-100"
                        title="Edit Access"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Access
                      </button>

                      <button
                        onClick={() => toggleMutation.mutate(m.id)}
                        className="text-slate-700 hover:bg-slate-100 rounded-lg p-2"
                        title={m.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {m.isActive ? (
                          <ToggleRight className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Remove ${m.fullName}?`)) {
                            deleteMutation.mutate(m.id);
                          }
                        }}
                        className="text-red-600 hover:bg-red-50 rounded-lg p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
