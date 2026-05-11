import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User, Mail, Phone, Lock, Edit3, X, Check, Crown, Shield,
  Calendar, LogOut, Building2, Eye, EyeOff, Save, Briefcase, Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api/auth.api';
import { apiClient } from '@/api/client';
import { toast } from 'sonner';

const formatDate = (v?: string) => {
  if (!v) return '—';
  return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));
};

const roleConfig: Record<string, { color: string; bg: string; label: string }> = {
  OWNER: { color: '#b45309', bg: '#fef3c7', label: 'Owner' },
  MANAGER: { color: '#6d28d9', bg: '#ede9fe', label: 'Manager' },
  CASHIER: { color: '#1d4ed8', bg: '#dbeafe', label: 'Cashier' },
  STAFF: { color: '#4b5563', bg: '#f3f4f6', label: 'Staff' },
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, tenant, refreshToken, logout, setUser } = useAuthStore();
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const { data: me } = useQuery({
    queryKey: ['me'],
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
    }
  }, [me]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch('/auth/me', {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
      });
      return res.data?.data ?? res.data;
    },
    onSuccess: (data) => {
      toast.success('✅ Profile updated!');
      if (data && setUser) setUser(data);
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Update failed'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('✅ Password changed!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOpen(false);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Wrong current password'),
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

  const role = user?.role || 'STAFF';
  const rc = roleConfig[role] || roleConfig.STAFF;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-3xl bg-white/20 flex items-center justify-center">
              <span className="text-white text-3xl font-extrabold">
                {user?.fullName?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                My Profile
              </div>
              <h2 className="mt-2 text-3xl font-bold">{user?.fullName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="h-3 w-3 text-white/70" />
                <span className="text-sm text-white/80">{user?.email}</span>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-white/20 text-white"
                >
                  {role === 'OWNER' && <Crown className="h-2.5 w-2.5" />}
                  {rc.label}
                </span>
                {tenant?.name && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20 text-white">
                    <Building2 className="h-2.5 w-2.5" />
                    {tenant.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Button
            size="lg"
            onClick={() => setEditOpen(true)}
            className="bg-white text-emerald-700 hover:bg-slate-100"
          >
            <Edit3 className="h-4 w-4" />
            Edit Profile
          </Button>
        </div>
      </section>

      {/* Account Info */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-600" />
              Account Information
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="px-6 py-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Email
                </div>
                <div className="text-sm font-bold text-slate-900">{user?.email}</div>
              </div>
            </div>

            <div className="px-6 py-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Phone className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Phone
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {user?.phone || 'Not set'}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: rc.bg }}
              >
                <Shield className="h-5 w-5" style={{ color: rc.color }} />
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Role
                </div>
                <div className="text-sm font-bold text-slate-900">{rc.label}</div>
              </div>
            </div>

            <div className="px-6 py-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Member Since
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {formatDate((user as any)?.createdAt)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {tenant && (
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-amber-600" />
                Business Info
              </h3>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-amber-700" />
                </div>
                <div>
                  <div className="font-extrabold text-slate-900">{tenant.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Tenant ID: {tenant.id?.slice(0, 8)}...
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Lock className="h-4 w-4 text-rose-600" />
                Security
              </h3>
            </div>
            <button
              onClick={() => setPasswordOpen(true)}
              className="w-full px-6 py-4 flex items-center gap-3 hover:bg-slate-50 transition text-left"
            >
              <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Lock className="h-5 w-5 text-rose-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-900">Change Password</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Update your account password
                </div>
              </div>
            </button>
          </div>

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
      </section>

      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-600 flex items-center justify-center">
                  <Edit3 className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Edit Profile</h3>
              </div>
              <button
                onClick={() => setEditOpen(false)}
                className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <Input
                label="Full Name *"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                leftIcon={<User className="h-4 w-4 text-slate-400" />}
              />
              <Input
                label="Email"
                value={user?.email || ''}
                disabled
                leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
                hint="Email change karne ke liye support contact karein"
              />
              <Input
                label="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<Phone className="h-4 w-4 text-slate-400" />}
                placeholder="+923001234567"
              />
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                loading={updateProfileMutation.isPending}
                onClick={() => {
                  if (!fullName.trim()) return toast.error('Name required');
                  updateProfileMutation.mutate();
                }}
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {passwordOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-rose-600 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
              </div>
              <button
                onClick={() => setPasswordOpen(false)}
                className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="relative">
                <Input
                  label="Current Password *"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4 text-slate-400" />}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-9 text-slate-400"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="New Password *"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  leftIcon={<Lock className="h-4 w-4 text-slate-400" />}
                  hint="Min 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-9 text-slate-400"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Input
                label="Confirm New Password *"
                type={showNew ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4 text-slate-400" />}
              />

              {newPassword.length > 0 && confirmPassword.length > 0 && (
                <div
                  className={`rounded-xl p-3 flex items-center gap-2 ${
                    newPassword === confirmPassword
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {newPassword === confirmPassword ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span className="text-xs font-bold">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4" />
                      <span className="text-xs font-bold">Passwords don't match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setPasswordOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-rose-600 hover:bg-rose-700"
                loading={changePasswordMutation.isPending}
                onClick={() => {
                  if (!currentPassword) return toast.error('Current password required');
                  if (newPassword.length < 8) return toast.error('Password min 8 chars');
                  if (newPassword !== confirmPassword) return toast.error('Passwords don\'t match');
                  changePasswordMutation.mutate();
                }}
              >
                <Lock className="h-4 w-4" />
                Update
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
