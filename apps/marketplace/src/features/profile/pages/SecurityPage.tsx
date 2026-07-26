import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, Shield, Lock, Mail, Smartphone, Monitor, Tablet, LogOut,
  Trash2, CheckCircle2, AlertCircle, KeyRound, Eye, EyeOff, X, Save,
  ShieldCheck, Zap, Sparkles, Activity, MapPin, Clock, Globe, Award,
  Laptop, Unlink,
} from 'lucide-react';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { Button, Card, Input, Badge, EmptyState } from '@/ui';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

function timeAgo(date: string | Date): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(min / 60);
  const days = Math.floor(hr / 24);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-PK', { dateStyle: 'medium' });
}

function getDeviceIcon(name: string) {
  const l = (name || '').toLowerCase();
  if (l.includes('iphone') || l.includes('mobile') || l.includes('android')) return Smartphone;
  if (l.includes('ipad') || l.includes('tablet')) return Tablet;
  if (l.includes('mac') || l.includes('laptop')) return Laptop;
  return Monitor;
}

export default function SecurityPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const customer = useAuthStore((s) => s.customer) as any;
  const [showChangePwd, setShowChangePwd] = useState(false);

  const { data: me } = useQuery({
    queryKey: ['auth-me'],
    queryFn: authApi.me,
    initialData: customer ?? undefined,
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['auth-sessions'],
    queryFn: authApi.sessions,
  });

  const u = (me || customer) as any;
  const emailVerified = u?.emailVerified || u?.isEmailVerified;
  const phoneVerified = u?.phoneVerified;
  const hasPassword = u?.hasPassword !== false;
  const hasGoogle = !!u?.googleId;

  const checks = [
    { label: 'Email verified', done: emailVerified, weight: 25 },
    { label: 'Phone verified', done: phoneVerified, weight: 25 },
    { label: 'Password set', done: hasPassword, weight: 25 },
    { label: 'Google linked', done: hasGoogle, weight: 25 },
  ];
  const score = checks.reduce((s, c) => s + (c.done ? c.weight : 0), 0);
  const scoreColor = score >= 75 ? 'emerald' : score >= 50 ? 'amber' : 'rose';

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth-sessions'] });
      toast.success('Session revoked');
    },
  });

  return (
    <>
      <Helmet><title>Security & Sessions — Nafaa Bazaar</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-5 pb-8">
        <button
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </button>

        {/* Hero */}
        <Card className="p-6 bg-gradient-to-br from-emerald-600 via-brand-600 to-emerald-800 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-xs font-black mb-3">
              <ShieldCheck className="h-3.5 w-3.5" />
              Security Center
            </div>
            <h1 className="text-2xl md:text-3xl font-black">Password & Security</h1>
            <p className="text-white/90 text-sm mt-1">Login methods aur active devices manage karain</p>
          </div>
        </Card>

        {/* Security Score */}
        <Card className={cn(
          'p-5 border-2',
          scoreColor === 'emerald' && 'bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-950/30 dark:to-emerald-950/30 border-brand-300',
          scoreColor === 'amber' && 'bg-gradient-to-br from-accent-50 to-orange-50 dark:from-accent-950/30 dark:to-orange-950/30 border-accent-300',
          scoreColor === 'rose' && 'bg-gradient-to-br from-danger/10 to-red-100/50 border-danger/30',
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              'h-16 w-16 rounded-3xl flex items-center justify-center shadow-xl text-white',
              scoreColor === 'emerald' && 'bg-gradient-to-br from-brand-500 to-emerald-700',
              scoreColor === 'amber' && 'bg-gradient-to-br from-accent-500 to-orange-600',
              scoreColor === 'rose' && 'bg-gradient-to-br from-danger to-red-700',
            )}>
              <Award className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <div className="text-2xs font-black uppercase tracking-wider text-content-muted">
                Security Score
              </div>
              <div className="text-4xl font-black text-content mt-0.5 leading-none">
                {score}<span className="text-2xl">%</span>
              </div>
              <div className="text-xs text-content-muted mt-1 font-bold">
                {score >= 75 && '🛡️ Aap ka account bohat secure hai'}
                {score >= 50 && score < 75 && '⚠️ Acha hai, aur improve karain'}
                {score < 50 && '🚨 Security improve karain foran'}
              </div>
            </div>
          </div>

          <div className="mt-4 h-3 rounded-full bg-white/60 dark:bg-black/20 overflow-hidden">
            <div
              className={cn(
                'h-full transition-all',
                scoreColor === 'emerald' && 'bg-gradient-to-r from-brand-400 to-emerald-600',
                scoreColor === 'amber' && 'bg-gradient-to-r from-accent-400 to-orange-600',
                scoreColor === 'rose' && 'bg-gradient-to-r from-danger to-red-700',
              )}
              style={{ width: `${score}%` }}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            {checks.map((c) => (
              <div
                key={c.label}
                className={cn(
                  'p-2.5 rounded-xl transition',
                  c.done ? 'bg-white/70 dark:bg-black/30 border border-brand-200 dark:border-brand-800' : 'bg-white/40 dark:bg-black/10 border border-border',
                )}
              >
                <div className="flex items-center gap-1.5">
                  {c.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-brand-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-content-subtle shrink-0" />
                  )}
                  <span className={cn(
                    'text-2xs font-black flex-1',
                    c.done ? 'text-content' : 'text-content-muted',
                  )}>
                    {c.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Email verification */}
        <Card className={cn(
          'p-4',
          emailVerified
            ? 'bg-brand-50 dark:bg-brand-950/30 border-brand-300 dark:border-brand-800'
            : 'bg-accent-50 dark:bg-accent-950/30 border-accent-300 dark:border-accent-800',
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'h-11 w-11 rounded-2xl flex items-center justify-center text-white shrink-0',
              emailVerified
                ? 'bg-gradient-to-br from-brand-500 to-emerald-700'
                : 'bg-gradient-to-br from-accent-500 to-orange-600',
            )}>
              {emailVerified ? <CheckCircle2 className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm">
                {emailVerified ? 'Email verified ✅' : 'Email verification pending'}
              </div>
              <div className="text-2xs text-content-muted truncate mt-0.5">
                {u?.email || 'No email set'}
              </div>
            </div>
            {!emailVerified && u?.email && (
              <Button variant="accent" size="sm" onClick={() => navigate('/verify-email')}>
                Verify
              </Button>
            )}
          </div>
        </Card>

        {/* Login Methods */}
        <div>
          <h3 className="text-xs font-black text-content-muted uppercase tracking-wider mb-2 px-1">
            Login Methods
          </h3>
          <Card className="divide-y divide-border overflow-hidden">
            {/* Password */}
            <div className="p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-info to-blue-700 flex items-center justify-center shrink-0">
                <Lock className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-sm flex items-center gap-2">
                  Password
                  {hasPassword && <Badge variant="brand" size="sm">Active</Badge>}
                </div>
                <div className="text-2xs text-content-muted mt-0.5">
                  {hasPassword
                    ? 'Aap password se login kar sakte hain'
                    : 'Password set nahi hai — sirf Google/OTP se login'}
                </div>
              </div>
              {hasPassword ? (
                <Button variant="secondary" size="sm" onClick={() => setShowChangePwd(true)}>
                  <KeyRound className="h-3.5 w-3.5" />
                  Change
                </Button>
              ) : (
                <SetPasswordButton />
              )}
            </div>

            {/* Google */}
            <div className="p-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white border-2 border-border flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="h-5 w-5">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-sm flex items-center gap-2">
                  Google
                  {hasGoogle && <Badge variant="brand" size="sm">Connected</Badge>}
                </div>
                <div className="text-2xs text-content-muted mt-0.5">
                  {hasGoogle ? 'One-tap Google login enabled' : 'Connect for quick login'}
                </div>
              </div>
              {hasGoogle ? (
                <button
                  onClick={() => {
                    if (!hasPassword) {
                      toast.error('Pehle password set karain', {
                        description: 'Warna aap login nahi kar paayenge',
                      });
                      return;
                    }
                    toast.info('Google disconnect feature coming soon');
                  }}
                  className="text-2xs font-black text-danger hover:underline inline-flex items-center gap-1"
                >
                  <Unlink className="h-3 w-3" />
                  Disconnect
                </button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => (window.location.href = authApi.googleLoginUrl())}
                >
                  Connect
                </Button>
              )}
            </div>

            {/* 2FA - Coming Soon */}
            <div className="p-4 flex items-center gap-3 opacity-70">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-sm flex items-center gap-2">
                  2-Factor Auth
                  <Badge variant="warning" size="sm">Coming Soon</Badge>
                </div>
                <div className="text-2xs text-content-muted mt-0.5">Extra security layer</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Active Sessions */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-xs font-black text-content-muted uppercase tracking-wider">
              Active Devices
            </h3>
            {sessions && sessions.length > 1 && (
              <button
                onClick={() => {
                  if (confirm('Baaqi sab devices se logout karain?')) {
                    sessions.slice(1).forEach((s: any) => revokeMutation.mutate(s.id));
                  }
                }}
                className="text-2xs font-black text-danger hover:underline"
              >
                Logout others
              </button>
            )}
          </div>

          {sessionsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="skeleton h-20 rounded-2xl" />
              ))}
            </div>
          ) : !sessions?.length ? (
            <EmptyState icon={Shield} title="No active sessions" size="sm" />
          ) : (
            <div className="space-y-2">
              {sessions.map((session: any, idx: number) => {
                const Icon = getDeviceIcon(session.deviceName);
                const isCurrent = idx === 0;
                return (
                  <Card
                    key={session.id}
                    className={cn(
                      'p-4',
                      isCurrent && 'bg-brand-50 dark:bg-brand-950/30 border-brand-300 dark:border-brand-800',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 text-white',
                        isCurrent
                          ? 'bg-gradient-to-br from-brand-500 to-emerald-700'
                          : 'bg-gradient-to-br from-slate-500 to-slate-700',
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm truncate">
                            {session.deviceName || 'Unknown device'}
                          </span>
                          {isCurrent && (
                            <Badge variant="brand" size="sm">
                              <CheckCircle2 className="h-3 w-3" />
                              This device
                            </Badge>
                          )}
                        </div>
                        <div className="text-2xs text-content-muted mt-1 space-y-0.5">
                          {session.location && (
                            <div className="flex items-center gap-1 font-bold">
                              <MapPin className="h-3 w-3" />
                              {session.location}
                            </div>
                          )}
                          {session.ipAddress && (
                            <div className="flex items-center gap-1 font-mono">
                              <Globe className="h-3 w-3" />
                              {session.ipAddress}
                            </div>
                          )}
                          <div className="flex items-center gap-1 font-bold">
                            <Clock className="h-3 w-3" />
                            {timeAgo(session.lastUsedAt || session.createdAt)}
                          </div>
                        </div>
                      </div>
                      {!isCurrent && (
                        <button
                          onClick={() => {
                            if (confirm('Is device se logout karain?')) {
                              revokeMutation.mutate(session.id);
                            }
                          }}
                          className="h-9 w-9 rounded-xl bg-danger/10 hover:bg-danger/20 text-danger flex items-center justify-center transition shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Account */}
        <Card className="p-4 bg-danger/5 border-danger/30">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-danger flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm text-danger">Delete account</div>
              <div className="text-2xs text-content-muted mt-0.5">
                Permanent action — sab data delete ho jayega
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm('Account permanently delete karain? Ye undo nahi ho sakta.')) {
                  authApi.deleteAccount('User requested').then(() => {
                    toast.success('Account deleted');
                    useAuthStore.getState().logout();
                    navigate('/login');
                  });
                }
              }}
              className="text-2xs font-black text-danger hover:underline"
            >
              Delete
            </button>
          </div>
        </Card>

        {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
      </div>
    </>
  );
}

function SetPasswordButton() {
  const [showModal, setShowModal] = useState(false);
  return (
    <>
      <Button variant="gradient" size="sm" onClick={() => setShowModal(true)}>
        Set password
      </Button>
      {showModal && <SetPasswordModal onClose={() => setShowModal(false)} />}
    </>
  );
}

function SetPasswordModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.setPassword(pwd),
    onSuccess: () => {
      toast.success('Password set! 🎉');
      qc.invalidateQueries({ queryKey: ['auth-me'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const canSubmit = pwd.length >= 6 && pwd === confirm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <Card className="max-w-sm w-full p-5 space-y-4 animate-scale-in">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-info to-blue-700 flex items-center justify-center">
              <KeyRound className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">Set password</h3>
              <p className="text-2xs text-content-muted">Ab email/password se bhi login</p>
            </div>
          </div>
          <button onClick={onClose} className="text-content-subtle hover:text-content">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <Input
            label="New password"
            type={show ? 'text' : 'password'}
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button type="button" onClick={() => setShow(!show)}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            inputSize="lg"
            placeholder="At least 6 characters"
            required
          />
        </div>

        <Input
          label="Confirm password"
          type={show ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          leftIcon={<Lock className="h-4 w-4" />}
          inputSize="lg"
          error={confirm && pwd !== confirm ? 'Passwords do not match' : undefined}
          required
        />

        <div className="flex gap-2">
          <Button variant="ghost" size="lg" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            size="lg"
            fullWidth
            disabled={!canSubmit}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Set
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: () => {
      toast.success('Password changed! 🎉');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const canSubmit = current.length >= 6 && next.length >= 6 && next === confirm && next !== current;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <Card className="max-w-sm w-full p-5 space-y-4 animate-scale-in">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-brand flex items-center justify-center">
              <KeyRound className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-lg">Change password</h3>
              <p className="text-2xs text-content-muted">Update your password</p>
            </div>
          </div>
          <button onClick={onClose} className="text-content-subtle hover:text-content">
            <X className="h-5 w-5" />
          </button>
        </div>

        <Input
          label="Current password"
          type={show ? 'text' : 'password'}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          leftIcon={<Lock className="h-4 w-4" />}
          rightIcon={
            <button type="button" onClick={() => setShow(!show)}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          inputSize="lg"
          required
        />

        <Input
          label="New password"
          type={show ? 'text' : 'password'}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          leftIcon={<Lock className="h-4 w-4" />}
          inputSize="lg"
          placeholder="At least 6 characters"
          required
        />

        <Input
          label="Confirm new password"
          type={show ? 'text' : 'password'}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          leftIcon={<Lock className="h-4 w-4" />}
          inputSize="lg"
          error={
            confirm && next !== confirm
              ? 'Passwords do not match'
              : next && next === current
                ? 'New password same as current'
                : undefined
          }
          required
        />

        <div className="flex gap-2">
          <Button variant="ghost" size="lg" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            size="lg"
            fullWidth
            disabled={!canSubmit}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Update
          </Button>
        </div>
      </Card>
    </div>
  );
}
