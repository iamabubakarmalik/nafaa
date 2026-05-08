import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Trash2, ToggleLeft, ToggleRight, ShieldCheck, Crown,
} from 'lucide-react';
import { teamApi, type UserRole } from '@/api/team.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

const roleColors: Record<UserRole, string> = {
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
  const isOwner = currentUser?.role === 'OWNER';

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'CASHIER' as UserRole,
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: teamApi.list,
  });

  const createMutation = useMutation({
    mutationFn: teamApi.create,
    onSuccess: () => {
      toast.success('Team member added successfully');
      setForm({ fullName: '', email: '', phone: '', password: '', role: 'CASHIER' });
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
    },
  });

  const deleteMutation = useMutation({
    mutationFn: teamApi.remove,
    onSuccess: () => {
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });

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
              Apne shop ke liye Manager, Cashier aur Staff add karein.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-5 py-4 min-w-[180px]">
            <div className="text-xs text-white/70">Total Members</div>
            <div className="mt-1 text-2xl font-bold">{members.length}</div>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[400px_1fr] gap-6">
        {isOwner ? (
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <h3 className="text-xl font-bold text-slate-900">Naya Member</h3>
            <p className="text-sm text-slate-500 mt-1">Owner sirf member add kar sakta hai</p>

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
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <option value="MANAGER">Manager — Sab kuch ka access</option>
                  <option value="CASHIER">Cashier — POS aur sales</option>
                  <option value="STAFF">Staff — Limited access</option>
                </select>
              </div>

              <Button
                className="w-full"
                size="lg"
                loading={createMutation.isPending}
                onClick={() => {
                  if (!form.fullName.trim()) return toast.error('Name likhein');
                  if (!form.email.trim()) return toast.error('Email likhein');
                  if (form.password.length < 8) return toast.error('Password 8+ characters honi chahiye');
                  createMutation.mutate({
                    fullName: form.fullName.trim(),
                    email: form.email.trim(),
                    phone: form.phone.trim() || undefined,
                    password: form.password,
                    role: form.role,
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
              Sirf shop ka Owner team members add aur manage kar sakta hai.
            </p>
          </div>
        )}

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">All Members</h3>
            <p className="text-sm text-slate-500">Aap ki team</p>
          </div>

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
                        {m.role === 'OWNER' && <Crown className="h-4 w-4 text-amber-500" />}
                      </div>
                      <div className="text-xs text-slate-500 truncate">{m.email}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${roleColors[m.role]}`}>
                          {m.role}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {m.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Last login: {formatDate(m.lastLoginAt)}
                      </div>
                    </div>
                  </div>

                  {isOwner && m.role !== 'OWNER' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleMutation.mutate(m.id)}
                        className="text-slate-700 hover:bg-slate-100 rounded-lg p-2"
                        title={m.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {m.isActive ? <ToggleRight className="h-5 w-5 text-emerald-600" /> : <ToggleLeft className="h-5 w-5" />}
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
