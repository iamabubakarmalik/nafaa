import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Search, ToggleLeft, ToggleRight, Crown, ShieldCheck,
} from 'lucide-react';
import { adminUsersApi, type UserRole } from '@/api/admin-users.api';
import { toast } from 'sonner';

const roleColors: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-amber-100 text-amber-700',
  OWNER: 'bg-violet-100 text-violet-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  CASHIER: 'bg-emerald-100 text-emerald-700',
  STAFF: 'bg-slate-100 text-slate-700',
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, role, page],
    queryFn: () =>
      adminUsersApi.list({
        search: search || undefined,
        role: role || undefined,
        page,
        limit: 20,
      }),
  });

  const toggleMutation = useMutation({
    mutationFn: adminUsersApi.toggle,
    onSuccess: () => {
      toast.success('User status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update failed'),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-admin-950 via-admin-900 to-admin-700 text-white p-6 shadow-soft">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            User Management
          </div>
          <h2 className="mt-3 text-3xl font-bold">All Users</h2>
          <p className="mt-2 text-sm text-white/80">
            Saare users across all tenants
          </p>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-admin-500/30"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value as UserRole | '');
              setPage(1);
            }}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm"
          >
            <option value="">All Roles</option>
            <option value="OWNER">Owner</option>
            <option value="MANAGER">Manager</option>
            <option value="CASHIER">Cashier</option>
            <option value="STAFF">Staff</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading...</div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-slate-300 mx-auto" />
            <h4 className="mt-4 text-lg font-semibold text-slate-900">No users found</h4>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-6 py-4 font-medium">User</th>
                    <th className="text-left px-6 py-4 font-medium">Tenant</th>
                    <th className="text-left px-6 py-4 font-medium">Role</th>
                    <th className="text-left px-6 py-4 font-medium">Last Login</th>
                    <th className="text-left px-6 py-4 font-medium">Status</th>
                    <th className="text-right px-6 py-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-admin-500 to-admin-700 text-white flex items-center justify-center text-xs font-bold">
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-slate-900 truncate">{u.fullName}</span>
                              {u.role === 'SUPER_ADMIN' && <Crown className="h-3 w-3 text-amber-500" />}
                            </div>
                            <div className="text-xs text-slate-500 truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="font-medium text-slate-900 text-xs">{u.tenant.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{u.tenant.slug}</div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${roleColors[u.role]}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-600">
                        {u.lastLoginAt
                          ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(u.lastLoginAt))
                          : 'Never'}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {u.role !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => toggleMutation.mutate(u.id)}
                            className="text-slate-700 hover:bg-slate-100 rounded-lg p-2"
                            title={u.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {u.isActive ? (
                              <ToggleRight className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="h-5 w-5 text-slate-400" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                Page {data.meta.page} of {data.meta.totalPages} • {data.meta.total} total
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.meta.totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
