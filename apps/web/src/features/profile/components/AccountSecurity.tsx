import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Lock, Mail, Shield, Plus, Unlink, CheckCircle2, AlertCircle,
  Eye, EyeOff, KeyRound,
} from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';

export default function AccountSecurity() {
  const queryClient = useQueryClient();
  const { user, tenant } = useAuthStore();
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showVerifyEmail, setShowVerifyEmail] = useState(false);

  const { data: me } = useQuery({
    queryKey: ['auth-me'],
    queryFn: authApi.me,
  });

  const u = (me?.user || user) as any;
  const hasPassword = u?.hasPassword !== false;
  const hasGoogle = !!u?.googleId;
  const emailVerified = !!u?.emailVerified;

  const disconnectGoogleMutation = useMutation({
    mutationFn: authApi.disconnectGoogle,
    onSuccess: () => {
      toast.success('Google account disconnect ho gaya');
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Disconnect fail'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-extrabold text-slate-900 mb-1">Account & Security</h3>
        <p className="text-sm text-slate-500">Apne login methods aur security manage karein</p>
      </div>

      {/* Email verification status */}
      <div
        className={`rounded-2xl border-2 p-4 ${
          emailVerified
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
              emailVerified ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          >
            {emailVerified ? (
              <CheckCircle2 className="h-6 w-6 text-white" />
            ) : (
              <AlertCircle className="h-6 w-6 text-white" />
            )}
          </div>
          <div className="flex-1">
            <div className={`font-bold ${emailVerified ? 'text-emerald-900' : 'text-amber-900'}`}>
              {emailVerified ? 'Email Verified ✓' : 'Email Verification Pending'}
            </div>
            <div className={`text-xs ${emailVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
              {u?.email}
            </div>
          </div>
          {!emailVerified && (
            <Button size="sm" onClick={() => setShowVerifyEmail(true)}>
              Verify Now
            </Button>
          )}
        </div>
      </div>

      {/* Login Methods */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            <h4 className="font-bold text-slate-900">Login Methods</h4>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Aap ke account mein at least ek login method active hona chahiye
          </p>
        </div>

        {/* Email/Password row */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-100">
          <div className="h-11 w-11 rounded-2xl bg-blue-100 flex items-center justify-center">
            <Mail className="h-5 w-5 text-blue-700" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-slate-900">Email & Password</div>
            <div className="text-xs text-slate-500">
              {hasPassword ? 'Active' : 'Set nahi hai — abhi sirf Google se login ho sakta hai'}
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
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-rose-100 flex items-center justify-center">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="font-bold text-slate-900">Google</div>
            <div className="text-xs text-slate-500">
              {hasGoogle ? 'Connected ✓' : 'Not connected'}
            </div>
          </div>
          {hasGoogle ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!hasPassword) {
                  toast.error('Pehle password set karein — warna login nahi kar paayenge');
                  return;
                }
                if (confirm('Google account disconnect karein? Aap email/password se login kar sakenge.')) {
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
      </div>

      {/* Modals */}
      {showSetPassword && (
        <SetPasswordModal onClose={() => setShowSetPassword(false)} />
      )}
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
      {showVerifyEmail && (
        <VerifyEmailModal onClose={() => setShowVerifyEmail(false)} />
      )}
    </div>
  );
}

function SetPasswordModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [pwd, setPwd] = useState('');
  const [show, setShow] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.setPassword(pwd),
    onSuccess: () => {
      toast.success('Password set ho gaya! 🎉');
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Set fail'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6">
        <h3 className="text-xl font-extrabold text-slate-900 mb-1">Password Set Karein</h3>
        <p className="text-sm text-slate-500 mb-5">Ab aap email/password se bhi login kar sakenge</p>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1.5 block">Naya Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={show ? 'text' : 'password'}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200"
              />
              <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {show ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1"
            loading={mutation.isPending}
            disabled={pwd.length < 8}
            onClick={() => mutation.mutate()}
          >
            Set Password
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');

  const mutation = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: () => {
      toast.success('Password change ho gaya');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Change fail'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6">
        <h3 className="text-xl font-extrabold text-slate-900 mb-5">Change Password</h3>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1.5 block">Current Password</label>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200"
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700 mb-1.5 block">New Password</label>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full h-11 px-3 rounded-xl border border-slate-200"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1"
            loading={mutation.isPending}
            disabled={!current || next.length < 8}
            onClick={() => mutation.mutate()}
          >
            Update
          </Button>
        </div>
      </div>
    </div>
  );
}

function VerifyEmailModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);

  const sendMutation = useMutation({
    mutationFn: authApi.sendVerifyEmail,
    onSuccess: (data: any) => {
      if (data.alreadyVerified) {
        toast.success('Already verified');
        queryClient.invalidateQueries({ queryKey: ['auth-me'] });
        onClose();
        return;
      }
      setSent(true);
      toast.success('OTP code bhej diya gaya email pe');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => authApi.confirmVerifyEmail(code),
    onSuccess: () => {
      toast.success('Email verified! ✅');
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Invalid OTP'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6">
        <h3 className="text-xl font-extrabold text-slate-900 mb-1">Verify Email</h3>
        <p className="text-sm text-slate-500 mb-5">
          Hum aap ke email pe 6 digit code bhejenge
        </p>

        {!sent ? (
          <Button
            className="w-full"
            loading={sendMutation.isPending}
            onClick={() => sendMutation.mutate()}
          >
            Code Bhejein
          </Button>
        ) : (
          <>
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1.5 block">OTP Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6 digit code"
                className="w-full h-12 px-3 rounded-xl border border-slate-200 text-center text-2xl font-bold tracking-widest"
                maxLength={6}
                autoFocus
              />
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button
                className="flex-1"
                loading={verifyMutation.isPending}
                disabled={code.length !== 6}
                onClick={() => verifyMutation.mutate()}
              >
                Verify
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
