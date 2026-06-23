import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User, Mail, Phone, Edit3, X, Crown, Shield, Calendar, LogOut,
  Building2, Save, Sparkles, Camera, CheckCircle2, AlertCircle,
  Smartphone, Award, Activity, ArrowRight, KeyRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api/auth.api';
import { isValidPakistanPhone, normalizePakistanPhone } from '@/lib/phone';
import { apiClient } from '@/api/client';
import { AvatarUpload } from '@/components/uploads';
import AccountSecurity from '../components/AccountSecurity';
import { ActiveSessions } from '../components/ActiveSessions';
import { toast } from 'sonner';

const formatDate = (v?: string) => {
  if (!v) return '—';
  return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));
};

const roleConfig: Record<string, { color: string; bg: string; label: string; icon: any }> = {
  OWNER:   { color: '#b45309', bg: '#fef3c7', label: 'Owner', icon: Crown },
  MANAGER: { color: '#6d28d9', bg: '#ede9fe', label: 'Manager', icon: Shield },
  CASHIER: { color: '#1d4ed8', bg: '#dbeafe', label: 'Cashier', icon: User },
  STAFF:   { color: '#4b5563', bg: '#f3f4f6', label: 'Staff', icon: User },
  SUPER_ADMIN: { color: '#dc2626', bg: '#fee2e2', label: 'Super Admin', icon: Crown },
};

type Tab = 'overview' | 'security' | 'devices';

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
      if (data && setUser && currentTenant) setUser(data, currentTenant);
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update failed'),
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
  const RoleIcon = rc.icon;
  const emailVerified = !!u?.emailVerified;
  const hasPassword = u?.hasPassword !== false;
  const hasGoogle = !!u?.googleId;

  const securityScore = [emailVerified, hasPassword, hasGoogle].filter(Boolean).length;
  const securityPercent = Math.round((securityScore / 3) * 100);
  const securityColor = securityScore >= 3 ? 'emerald' : securityScore >= 2 ? 'amber' : 'rose';

  return (
    <div className="space-y-6">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-5 flex-wrap">
          <div className="flex items-center gap-5">
            <div className="relative">
              {u?.avatarUrl ? (
                <img
                  src={u.avatarUrl}
                  alt={u?.fullName}
                  className="h-28 w-28 rounded-3xl object-cover border-4 border-white/30 shadow-2xl"
                />
              ) : (
                <div className="h-28 w-28 rounded-3xl bg-white/15 backdrop-blur flex items-center justify-center text-white text-5xl font-extrabold shadow-2xl ring-4 ring-white/20">
                  {u?.fullName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <button
                onClick={() => setEditOpen(true)}
                className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-white text-emerald-700 flex items-center justify-center shadow-xl hover:scale-110 transition ring-4 ring-emerald-900"
                title="Edit profile"
              >
                <Camera className="h-4 w-4" />
              </button>
              {emailVerified && (
                <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg ring-4 ring-emerald-900">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              )}
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <Sparkles className="h-3 w-3 text-amber-300" />
                My Profile
              </div>
              <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold leading-tight">
                {u?.fullName || 'Loading...'}
              </h2>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-white/85 font-semibold">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">{u?.email}</span>
                {emailVerified && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/30 backdrop-blur text-[9px] font-extrabold ml-1">
                    <CheckCircle2 className="h-2 w-2" />
                    VERIFIED
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider backdrop-blur"
                  style={{ backgroundColor: `${rc.color}40`, border: `1px solid ${rc.color}60` }}
                >
                  <RoleIcon className="h-2.5 w-2.5" />
                  {rc.label}
                </span>
                {tenant?.name && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold bg-white/15 backdrop-blur border border-white/20">
                    <Building2 className="h-2.5 w-2.5" />
                    {tenant.name}
                  </span>
                )}
                {(u as any)?.createdAt && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold bg-white/15 backdrop-blur border border-white/20">
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
              className="bg-white text-emerald-700 hover:bg-slate-100 shadow-xl"
            >
              <Edit3 className="h-4 w-4" />
              Edit Profile
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ TABS ═══ */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'overview' as Tab, label: 'Overview', icon: User, color: 'emerald' },
          { id: 'security' as Tab, label: 'Security', icon: Shield, color: 'blue' },
          { id: 'devices' as Tab, label: 'Devices', icon: Smartphone, color: 'violet' },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          const colors: any = {
            emerald: active ? 'bg-emerald-600 border-emerald-600 shadow-emerald-500/30' : 'border-slate-200 hover:border-emerald-300',
            blue: active ? 'bg-blue-600 border-blue-600 shadow-blue-500/30' : 'border-slate-200 hover:border-blue-300',
            violet: active ? 'bg-violet-600 border-violet-600 shadow-violet-500/30' : 'border-slate-200 hover:border-violet-300',
          };
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-extrabold whitespace-nowrap transition border-2 ${colors[t.color]} ${
                active ? 'text-white shadow-lg' : 'bg-white text-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ═══ OVERVIEW ═══ */}
      {tab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Account info */}
          <div className="lg:col-span-2 rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b-2 border-slate-100 bg-gradient-to-br from-slate-50 to-white">
              <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
                Account Information
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-semibold">Your personal details</p>
            </div>
            <div className="divide-y divide-slate-100">
              <InfoRow icon={Mail} iconBg="bg-gradient-to-br from-blue-500 to-blue-700" label="Email" value={u?.email} verified={emailVerified} />
              <InfoRow icon={Phone} iconBg="bg-gradient-to-br from-emerald-500 to-emerald-700" label="Phone" value={u?.phone || 'Not set'} />
              <InfoRow
                icon={RoleIcon}
                iconBg=""
                customIconStyle={{ backgroundColor: rc.bg, color: rc.color }}
                label="Role"
                value={rc.label}
              />
              <InfoRow icon={Calendar} iconBg="bg-gradient-to-br from-violet-500 to-purple-600" label="Member Since" value={formatDate((u as any)?.createdAt)} />
              {u?.lastLoginAt && (
                <InfoRow icon={Activity} iconBg="bg-gradient-to-br from-amber-500 to-orange-600" label="Last Login" value={formatDate(u.lastLoginAt)} />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Security score */}
            <div
              className={`rounded-3xl border-2 p-5 ${
                securityColor === 'emerald'
                  ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300'
                  : securityColor === 'amber'
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300'
                    : 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-xl text-white ${
                    securityColor === 'emerald'
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-500/30'
                      : securityColor === 'amber'
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30'
                        : 'bg-gradient-to-br from-rose-500 to-rose-700 shadow-rose-500/30'
                  }`}
                >
                  <Award className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <div
                    className={`text-[10px] uppercase tracking-wider font-extrabold ${
                      securityColor === 'emerald'
                        ? 'text-emerald-700'
                        : securityColor === 'amber'
                          ? 'text-amber-700'
                          : 'text-rose-700'
                    }`}
                  >
                    Security Score
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900 tabular-nums leading-none">
                    {securityPercent}<span className="text-lg">%</span>
                  </div>
                </div>
              </div>
              <div className="h-2.5 bg-white/70 rounded-full overflow-hidden shadow-inner mb-3">
                <div
                  className={`h-full transition-all duration-500 ${
                    securityColor === 'emerald'
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                      : securityColor === 'amber'
                        ? 'bg-gradient-to-r from-amber-400 to-orange-600'
                        : 'bg-gradient-to-r from-rose-400 to-rose-600'
                  }`}
                  style={{ width: `${securityPercent}%` }}
                />
              </div>
              <div className="space-y-1.5">
                <SecurityCheck label="Email verified" done={emailVerified} />
                <SecurityCheck label="Password set" done={hasPassword} />
                <SecurityCheck label="Google connected" done={hasGoogle} />
              </div>
              <button
                onClick={() => setTab('security')}
                className="mt-3 w-full text-center text-xs font-extrabold text-slate-700 hover:text-slate-900 underline inline-flex items-center justify-center gap-1"
              >
                Manage security
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* Business card */}
            {tenant && (
              <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-5">
                <h3 className="font-extrabold text-slate-900 mb-3 flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Building2 className="h-4 w-4" />
                  </div>
                  Business
                </h3>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/30">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-slate-900 truncate">{tenant.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate font-semibold">
                      {(tenant as any).businessType || 'General'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/settings')}
                  className="mt-3 w-full text-center text-xs font-extrabold text-amber-700 hover:text-amber-800 underline inline-flex items-center justify-center gap-1"
                >
                  Open settings
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Logout */}
            <Button
              variant="secondary"
              size="lg"
              onClick={handleLogout}
              className="w-full bg-rose-50 border-2 border-rose-200 text-rose-700 hover:bg-rose-100"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      )}

      {/* ═══ SECURITY ═══ */}
      {tab === 'security' && (
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-6">
          <AccountSecurity />
        </div>
      )}

      {/* ═══ DEVICES ═══ */}
      {tab === 'devices' && (
        <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-6">
          <ActiveSessions />
        </div>
      )}

      {/* ═══ EDIT MODAL ═══ */}
      {editOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 text-white">
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/30 blur-2xl" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center ring-2 ring-white/30">
                    <Edit3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold">Edit Profile</h3>
                    <p className="text-emerald-100 text-xs font-semibold">Update your information</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditOpen(false)}
                  className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur hover:bg-white/25 border border-white/20 flex items-center justify-center transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
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

            <div className="px-6 py-4 border-t-2 border-slate-100 flex gap-2 bg-slate-50">
              <Button variant="secondary" className="flex-1" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-500/30"
                loading={updateProfileMutation.isPending}
                onClick={() => {
                  if (!fullName.trim()) { toast.error('Name required'); return; }
                  if (phone && !isValidPakistanPhone(phone)) {
                    toast.error('Pakistan ka sahi mobile number likhein', {
                      description: 'Example: 03001234567',
                    });
                    return;
                  }
                  if (phone) setPhone(normalizePakistanPhone(phone));
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

function InfoRow({ icon: Icon, iconBg, customIconStyle, label, value, verified }: any) {
  return (
    <div className="px-6 py-4 flex items-center gap-3 hover:bg-slate-50/50 transition group">
      <div
        className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md text-white ${iconBg}`}
        style={customIconStyle}
      >
        <Icon className="h-5 w-5" style={customIconStyle ? { color: customIconStyle.color } : {}} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">{label}</div>
        <div className="text-sm font-extrabold text-slate-900 truncate flex items-center gap-1.5 mt-0.5">
          {value}
          {verified && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-extrabold">
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
    <div className="flex items-center gap-2 bg-white/60 backdrop-blur rounded-lg px-2 py-1.5">
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
      )}
      <span className={`text-xs font-extrabold ${done ? 'text-slate-800' : 'text-slate-500'}`}>
        {label}
      </span>
    </div>
  );
}
