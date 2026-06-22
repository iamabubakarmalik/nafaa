import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Lock, Mail, Shield, Plus, Unlink, CheckCircle2, AlertCircle,
  Eye, EyeOff, KeyRound, ArrowRight, Smartphone, Zap, Star, Clock,
} from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';

export default function AccountSecurity() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const { data: me } = useQuery({
    queryKey: ['auth-me'],
    queryFn: authApi.me,
  });

  const u = (me?.user || user) as any;
  const hasPassword = u?.hasPassword !== false;
  const hasGoogle = !!u?.googleId;
  const emailVerified = !!u?.emailVerified;
  const has2FA = !!u?.twoFactorEnabled; // future-ready

  const disconnectGoogleMutation = useMutation({
    mutationFn: authApi.disconnectGoogle,
    onSuccess: () => {
      toast.success('Google account disconnect ho gaya');
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Disconnect fail'),
  });

  // Security score
  const checks = [
    { label: 'Email verified', done: emailVerified, weight: 30 },
    { label: 'Password set', done: hasPassword, weight: 25 },
    { label: 'Google connected', done: hasGoogle, weight: 20 },
    { label: '2-Factor enabled', done: has2FA, weight: 25 },
  ];
  const score = checks.reduce((s, c) => s + (c.done ? c.weight : 0), 0);
  const scoreColor = score >= 75 ? 'emerald' : score >= 50 ? 'amber' : 'rose';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-extrabold text-slate-900 mb-1 flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-600" />
          Account & Security
        </h3>
        <p className="text-sm text-slate-500">Apne login methods aur security manage karein</p>
      </div>

      {/* SECURITY SCORE CARD */}
      <div
        className={`rounded-3xl border-2 p-5 ${
          scoreColor === 'emerald'
            ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300'
            : scoreColor === 'amber'
              ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300'
              : 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-300'
        }`}
      >
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg ${
                scoreColor === 'emerald'
                  ? 'bg-emerald-500'
                  : scoreColor === 'amber'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
              }`}
            >
              <Shield className="h-7 w-7 text-white" />
            </div>
            <div>
              <div
                className={`text-xs uppercase tracking-wider font-extrabold ${
                  scoreColor === 'emerald'
                    ? 'text-emerald-700'
                    : scoreColor === 'amber'
                      ? 'text-amber-700'
                      : 'text-rose-700'
                }`}
              >
                Security Score
              </div>
              <div className="text-3xl font-extrabold text-slate-900">{score}%</div>
              <div className="text-xs text-slate-600 mt-0.5">
                {score >= 75 && 'Aap ka account secure hai 🛡️'}
                {score >= 50 && score < 75 && 'Acha hai, lekin improve ho sakta hai'}
                {score < 50 && 'Apne account ko aur secure karein'}
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-white/60 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full transition-all ${
              scoreColor === 'emerald'
                ? 'bg-emerald-500'
                : scoreColor === 'amber'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>

        {/* Checklist */}
        <div className="grid sm:grid-cols-2 gap-2">
          {checks.map((c) => (
            <div
              key={c.label}
              className="flex items-center gap-2 bg-white/60 backdrop-blur rounded-xl px-3 py-2"
            >
              {c.done ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-slate-400 shrink-0" />
              )}
              <span
                className={`text-xs font-bold flex-1 ${
                  c.done ? 'text-slate-800' : 'text-slate-500'
                }`}
              >
                {c.label}
              </span>
              <span
                className={`text-[10px] font-extrabold ${
                  c.done ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                +{c.weight}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* EMAIL VERIFICATION CARD */}
      <div
        className={`rounded-2xl border-2 p-4 ${
          emailVerified
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-300'
        }`}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
              emailVerified ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          >
            {emailVerified ? (
              <CheckCircle2 className="h-6 w-6 text-white" />
            ) : (
              <Mail className="h-6 w-6 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`font-extrabold ${emailVerified ? 'text-emerald-900' : 'text-amber-900'}`}>
              {emailVerified ? 'Email Verified ✓' : 'Email Verification Pending'}
            </div>
            <div className={`text-xs truncate ${emailVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
              {u?.email}
            </div>
          </div>
          {!emailVerified && (
            <Button
              size="sm"
              onClick={() => navigate('/verify-email')}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Verify Now
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* LOGIN METHODS */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            <h4 className="font-bold text-slate-900">Login Methods</h4>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            At least ek login method active hona chahiye
          </p>
        </div>

        {/* Email/Password row */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-100">
          <div className="h-11 w-11 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
            <Mail className="h-5 w-5 text-blue-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              Email & Password
              {hasPassword && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-extrabold">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  ACTIVE
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">
              {hasPassword
                ? 'Aap email/password se login kar sakte hain'
                : 'Sirf Google se login ho sakta hai — password set karein'}
            </div>
          </div>
          {hasPassword ? (
            <Button variant="secondary" size="sm" onClick={() => setShowChangePassword(true)}>
              <KeyRound className="h-3.5 w-3.5" />
              Change
            </Button>
          ) : (
            <Button size="sm" onClick={() => setShowSetPassword(true)}>
              <Plus className="h-3.5 w-3.5" />
              Set Password
            </Button>
          )}
        </div>

        {/* Google row */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-100">
          <div className="h-11 w-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              Google Account
              {hasGoogle && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-extrabold">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  CONNECTED
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {hasGoogle ? 'One-tap login enabled' : 'Quick login ke liye connect karein'}
            </div>
          </div>
          {hasGoogle ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!hasPassword) {
                  toast.error('Pehle password set karein — warna login nahi kar paayenge', {
                    description: '"Set Password" button use karein',
                  });
                  return;
                }
                if (
                  confirm('Google account disconnect karein? Aap email/password se login kar sakenge.')
                ) {
                  disconnectGoogleMutation.mutate();
                }
              }}
              disabled={disconnectGoogleMutation.isPending}
              className="text-rose-600 hover:bg-rose-50"
            >
              <Unlink className="h-3.5 w-3.5" />
              Disconnect
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                window.location.href = authApi.googleLoginUrl();
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Connect
            </Button>
          )}
        </div>

        {/* 2FA row (future-ready placeholder) */}
        <div className="px-5 py-4 flex items-center gap-3 opacity-75">
          <div className="h-11 w-11 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-violet-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              2-Factor Authentication
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-extrabold">
                <Star className="h-2.5 w-2.5" />
                COMING SOON
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Extra security layer — SMS / Authenticator app
            </div>
          </div>
          <Button variant="ghost" size="sm" disabled>
            Notify Me
          </Button>
        </div>
      </div>

      {/* DANGER ZONE */}
      <div className="rounded-2xl bg-rose-50/50 border-2 border-rose-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-rose-200 bg-rose-100/50">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-700" />
            <h4 className="font-bold text-rose-900">Danger Zone</h4>
          </div>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 text-sm">Logout All Devices</div>
              <div className="text-xs text-slate-600 mt-0.5">
                Saari active sessions revoke ho jayengi — current device bhi
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (
                  confirm('Sab devices se logout karein? Aap ko dobara login karna padega.')
                ) {
                  // Will logout from this device too — handled by /devices tab "revoke all others"
                  toast.info('"Devices" tab pe jayein — "Logout All Others" button use karein');
                }
              }}
              className="text-rose-700 hover:bg-rose-100"
            >
              <Smartphone className="h-3.5 w-3.5" />
              Manage Devices
            </Button>
          </div>
        </div>
      </div>

      {/* MODALS */}
      {showSetPassword && (
        <SetPasswordModal onClose={() => setShowSetPassword(false)} />
      )}
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}

// ─── Set Password Modal ───────────────────────────────────
function SetPasswordModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [pwd, setPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [show, setShow] = useState(false);

  const strength = (() => {
    if (!pwd) return { score: 0, label: '', color: 'slate' };
    let s = 0;
    if (pwd.length >= 8) s++;
    if (pwd.length >= 12) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    if (s <= 1) return { score: 20, label: 'Weak', color: 'rose' };
    if (s === 2) return { score: 40, label: 'Fair', color: 'orange' };
    if (s === 3) return { score: 60, label: 'Good', color: 'amber' };
    if (s === 4) return { score: 80, label: 'Strong', color: 'emerald' };
    return { score: 100, label: 'Very Strong', color: 'emerald' };
  })();

  const mutation = useMutation({
    mutationFn: () => authApi.setPassword(pwd),
    onSuccess: () => {
      toast.success('Password set ho gaya! 🎉');
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Set fail'),
  });

  const canSubmit = pwd.length >= 8 && pwd === confirmPwd;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white">
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
            <KeyRound className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-extrabold">Set Password</h3>
          <p className="text-blue-100 text-sm mt-1">
            Ab aap email/password se bhi login kar sakenge
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1.5 block">
              Naya Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={show ? 'text' : 'password'}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pwd && (
              <div className="mt-2">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      strength.color === 'rose'
                        ? 'bg-rose-500'
                        : strength.color === 'orange'
                          ? 'bg-orange-500'
                          : strength.color === 'amber'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                    }`}
                    style={{ width: `${strength.score}%` }}
                  />
                </div>
                <p
                  className={`text-[10px] font-bold mt-1 ${
                    strength.color === 'rose'
                      ? 'text-rose-600'
                      : strength.color === 'orange'
                        ? 'text-orange-600'
                        : strength.color === 'amber'
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                  }`}
                >
                  Strength: {strength.label}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700 mb-1.5 block">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={show ? 'text' : 'password'}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Same password again"
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            {confirmPwd && pwd !== confirmPwd && (
              <p className="text-xs text-rose-600 font-bold mt-1">Passwords match nahi karte</p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-2 bg-slate-50">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            loading={mutation.isPending}
            disabled={!canSubmit}
            onClick={() => mutation.mutate()}
          >
            Set Password
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Change Password Modal ────────────────────────────────
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmNext, setConfirmNext] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: () => {
      toast.success('Password change ho gaya');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Change fail'),
  });

  const canSubmit =
    current.length >= 6 && next.length >= 8 && next === confirmNext && next !== current;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 text-white">
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
            <KeyRound className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-extrabold">Change Password</h3>
          <p className="text-emerald-100 text-sm mt-1">Apna password update karein</p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1.5 block">
              Current Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showCurrent ? 'text' : 'password'}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700 mb-1.5 block">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showNext ? 'text' : 'password'}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowNext(!showNext)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700 mb-1.5 block">
              Confirm New Password
            </label>
            <input
              type={showNext ? 'text' : 'password'}
              value={confirmNext}
              onChange={(e) => setConfirmNext(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-500"
            />
            {confirmNext && next !== confirmNext && (
              <p className="text-xs text-rose-600 font-bold mt-1">
                Passwords match nahi karte
              </p>
            )}
            {next && next === current && (
              <p className="text-xs text-amber-600 font-bold mt-1">
                Naya password current se alag hona chahiye
              </p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-2 bg-slate-50">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            loading={mutation.isPending}
            disabled={!canSubmit}
            onClick={() => mutation.mutate()}
          >
            Update Password
          </Button>
        </div>
      </div>
    </div>
  );
}
