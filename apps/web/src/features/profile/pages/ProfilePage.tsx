import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User, Mail, Phone, Edit3, X, Crown, Shield,
  Calendar, LogOut, Building2, Save, Sparkles, Camera,
  CheckCircle2, AlertCircle, KeyRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api/auth.api';
import { apiClient } from '@/api/client';
import { AvatarUpload } from '@/components/uploads';
import AccountSecurity from '../components/AccountSecurity';
import { toast } from 'sonner';

const formatDate = (v?: string) => {
  if (!v) return '—';
  return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));
};

const roleConfig: Record<string, { color: string; bg: string; label: string; ring: string }> = {
  OWNER:   { color: '#b45309', bg: '#fef3c7', label: 'Owner',   ring: 'ring-amber-200' },
  MANAGER: { color: '#6d28d9', bg: '#ede9fe', label: 'Manager', ring: 'ring-violet-200' },
  CASHIER: { color: '#1d4ed8', bg: '#dbeafe', label: 'Cashier', ring: 'ring-blue-200' },
  STAFF:   { color: '#4b5563', bg: '#f3f4f6', label: 'Staff',   ring: 'ring-slate-200' },
  SUPER_ADMIN: { color: '#dc2626', bg: '#fee2e2', label: 'Super Admin', ring: 'ring-rose-200' },
};

type Tab = 'overview' | 'security';

export default function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, tenant, refreshToken, logout, setUser } = useAuthStore();

  const [tab, setTab] = useState<Tab>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>((user as any)?.avatarUrl || null);

  const { data: me } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/auth/me');
        return res.data?.data ?? res.data;
      } catch {
        return null;
      }
    },
  });

  useEffect(() => {
    if (me?.user) {
      setFullName(me.user.fullName || '');
      setPhone(me.user.phone || '');
      setAvatarUrl(me.user.avatarUrl || null);
    }
  }, [me]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch('/auth/me', {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      });
      return res.data?.data ?? res.data;
    },
    onSuccess: (data) => {
      toast.success('✅ Profile updated!');
      const currentTenant = useAuthStore.getState().tenant;
      if (data && setUser && currentTenant) {
        setUser(data, currentTenant);
      }
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Update failed'),
  });

  const handleLogout = async () => {
    if (!confirm('Logout karna chahte hain?')) return;
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {}
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const u = (me?.user || user) as any;
  const role = u?.role || 'STAFF';
  const rc = roleConfig[role] || roleConfig.STAFF;
  const emailVerified = !!u?.emailVerified;
  const hasPassword = u?.hasPassword !== false;
  const hasGoogle = !!u?.googleId;

  // Security score calculation
  const securityScore = [emailVerified, hasPassword, hasGoogle].filter(Boolean).length;
  const securityPercent = Math.round((securityScore / 3) * 100);
  const securityColor = securityScore >= 3 ? 'emerald' : securityScore >= 2 ? 'amber' : 'rose';

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="relative">
              {u?.avatarUrl ? (
                <img
                  src={u.avatarUrl}
                  alt={u?.fullName}
                  className="h-24 w-24 rounded-3xl object-cover border-4 border-white/20 shadow-xl"
                />
              ) : (
                <div className="h-24 w-24 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-4xl font-extrabold shadow-xl">
                  {u?.fullName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <button
                onClick={() => setEditOpen(true)}
                className="absolute -bottom-1 -right-1 h-9 w-9 rounded-2xl bg-white text-emerald-700 flex items-center justify-center shadow-lg hover:scale-110 transition"
                title="Edit profile"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                <Sparkles className="h-3 w-3 text-amber-300" />
                My Profile
              </div>
              <h2 className="mt-2 text-3xl font-extrabold">{u?.fullName || 'Loading...'}</h2>
              <div className="flex items-center gap-2 mt-1 text-sm text-white/80">
                <Mail className="h-3 w-3" />
                <span>{u?.email}</span>
                {emailVerified && <CheckCircle2 className="h-3 w-3 text-emerald-300" />}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-white/20 backdrop-blur">
                  {role === 'OWNER' && <Crown className="h-2.5 w-2.5" />}
                  {rc.label}
                </span>
                {tenant?.name && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20 backdrop-blur">
                    <Building2 className="h-2.5 w-2.5" />
                    {tenant.name}
                  </span>
                )}
                {(u as any)?.createdAt && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20 backdrop-blur">
                    <Calendar className="h-2.5 w-2.5" />
                    Member since {formatDate((u as any).createdAt)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="lg"
              onClick={() => setEditOpen(true)}
              className="bg-white text-emerald-700 hover:bg-slate-100 shadow-lg"
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>
      </section>

      {/* TABS */}
      <div className="flex gap-2">
        {[
          { id: 'overview' as Tab, label: 'Overview', icon: User },
          { id: 'security' as Tab, label: 'Security', icon: Shield },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition ${
                active
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* CONTENT */}
      {tab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Account Info Card */}
          <div className="lg:col-span-2 rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-600" />
                Account Information
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Your personal details</p>
            </div>
            <div className="divide-y divide-slate-100">
              <InfoRow icon={Mail} iconBg="bg-blue-100" iconColor="text-blue-600" label="Email" value={u?.email} verified={emailVerified} />
              <InfoRow icon={Phone} iconBg="bg-emerald-100" iconColor="text-emerald-600" label="Phone" value={u?.phone || 'Not set'} />
              <InfoRow
                icon={Shield}
                iconBg=""
                iconColor=""
                customIconStyle={{ backgroundColor: rc.bg, color: rc.color }}
                label="Role"
                value={rc.label}
              />
              <InfoRow icon={Calendar} iconBg="bg-violet-100" iconColor="text-violet-600" label="Member Since" value={formatDate((u as any)?.createdAt)} />
              {u?.lastLoginAt && (
                <InfoRow icon={Calendar} iconBg="bg-amber-100" iconColor="text-amber-600" label="Last Login" value={formatDate(u.lastLoginAt)} />
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Security score */}
            <div className={`rounded-3xl border-2 p-5 ${
              securityColor === 'emerald' ? 'bg-emerald-50 border-emerald-200' :
              securityColor === 'amber' ? 'bg-amber-50 border-amber-200' :
              'bg-rose-50 border-rose-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                  securityColor === 'emerald' ? 'bg-emerald-500' :
                  securityColor === 'amber' ? 'bg-amber-500' :
                  'bg-rose-500'
                }`}>
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className={`text-xs uppercase tracking-wider font-bold ${
                    securityColor === 'emerald' ? 'text-emerald-700' :
                    securityColor === 'amber' ? 'text-amber-700' :
                    'text-rose-700'
                  }`}>
                    Security Score
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">{securityPercent}%</div>
                </div>
              </div>
              <div className="mt-3 h-2 bg-white/60 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    securityColor === 'emerald' ? 'bg-emerald-500' :
                    securityColor === 'amber' ? 'bg-amber-500' :
                    'bg-rose-500'
                  }`}
                  style={{ width: `${securityPercent}%` }}
                />
              </div>
              <div className="mt-3 space-y-1 text-xs">
                <SecurityCheck label="Email verified" done={emailVerified} />
                <SecurityCheck label="Password set" done={hasPassword} />
                <SecurityCheck label="Google connected" done={hasGoogle} />
              </div>
              <button
                onClick={() => setTab('security')}
                className="mt-3 w-full text-center text-xs font-bold text-slate-700 hover:text-slate-900 underline"
              >
                Manage security →
              </button>
            </div>

            {/* Business card */}
            {tenant && (
              <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-600" />
                  Business
                </h3>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-amber-700" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 truncate">{tenant.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                      {(tenant as any).businessType || 'General'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/settings')}
                  className="mt-3 w-full text-center text-xs font-bold text-amber-700 hover:text-amber-800 underline"
                >
                  Open settings →
                </button>
              </div>
            )}

            {/* Logout */}
            <Button
              variant="secondary"
              size="lg"
              onClick={handleLogout}
              className="w-full bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <AccountSecurity />
        </div>
      )}

      {/* EDIT MODAL */}
      {editOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-br from-emerald-50 to-white">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-600 flex items-center justify-center">
                  <Edit3 className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Edit Profile</h3>
              </div>
              <button
                onClick={() => setEditOpen(false)}
                className="h-9 w-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Profile Photo</label>
                <AvatarUpload
                  value={avatarUrl}
                  onChange={(url) => setAvatarUrl(url ?? null)}
                  purpose="avatar"
                  size="lg"
                  fallbackText={fullName || u?.fullName || 'U'}
                />
              </div>

              <Input
                label="Full Name *"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Input
                label="Email"
                value={u?.email || ''}
                disabled
                hint="Email change ke liye support contact karein"
              />
              <Input
                label="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+923001234567"
              />
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-2 bg-slate-50/50">
              <Button variant="secondary" className="flex-1" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                loading={updateProfileMutation.isPending}
                onClick={() => {
                  if (!fullName.trim()) {
                    toast.error('Name required');
                    return;
                  }
                  updateProfileMutation.mutate();
                }}
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon, iconBg, iconColor, customIconStyle, label, value, verified,
}: {
  icon: any; iconBg: string; iconColor: string; customIconStyle?: any;
  label: string; value: string; verified?: boolean;
}) {
  return (
    <div className="px-6 py-4 flex items-center gap-3 hover:bg-slate-50/50 transition">
      <div
        className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
        style={customIconStyle}
      >
        <Icon className={`h-5 w-5 ${iconColor}`} style={customIconStyle ? { color: customIconStyle.color } : {}} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          {label}
        </div>
        <div className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
          {value}
          {verified && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold">
              <CheckCircle2 className="h-2.5 w-2.5" />
              VERIFIED
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SecurityCheck({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
      )}
      <span className={`text-xs ${done ? 'text-slate-700 font-semibold' : 'text-slate-500'}`}>
        {label}
      </span>
    </div>
  );
}
