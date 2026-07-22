import { useState } from 'react';
import { Lock, Unlock, X, Eye, EyeOff, Shield, Key, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { useSalesPrivacy } from '../hooks/useSalesPrivacy';

interface Props {
  mode: 'unlock' | 'setup' | 'disable';
  onClose: () => void;
  onSuccess?: () => void;
}

export function SalesPrivacyModal({ mode, onClose, onSuccess }: Props) {
  const { enable, disable, unlock } = useSalesPrivacy();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (loading) return;
    if (!password.trim()) { toast.error('Password enter karein'); return; }

    setLoading(true);
    try {
      if (mode === 'setup') {
        if (password !== confirmPassword) throw new Error('Passwords match nahi kar rahe');
        if (password.length < 4) throw new Error('Password minimum 4 characters');
        await enable(password);
        toast.success('🔒 Sales privacy enabled', {
          description: 'Ab sales data password protected hai',
        });
      } else if (mode === 'unlock') {
        await unlock(password);
        toast.success('🔓 Unlocked');
      } else if (mode === 'disable') {
        await disable(password);
        toast.success('Privacy disabled');
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const config = {
    setup: {
      title: 'Setup Privacy',
      subtitle: 'Sales page ko password se protect karein',
      icon: Shield,
      color: 'from-violet-600 to-purple-700',
      accent: 'violet',
      cta: 'Enable Privacy',
    },
    unlock: {
      title: 'Unlock Sales',
      subtitle: 'Sales data dekhne ke liye password enter karein',
      icon: Unlock,
      color: 'from-emerald-600 to-emerald-700',
      accent: 'emerald',
      cta: 'Unlock',
    },
    disable: {
      title: 'Disable Privacy',
      subtitle: 'Password protection remove karein',
      icon: Lock,
      color: 'from-rose-600 to-rose-700',
      accent: 'rose',
      cta: 'Disable',
    },
  }[mode];

  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className={`relative overflow-hidden bg-gradient-to-br ${config.color} text-white`}>
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
          <div className="relative px-6 py-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg ring-2 ring-white/20">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border border-white/20">
                  <Sparkles className="h-2.5 w-2.5" />
                  Owner Only
                </div>
                <h3 className="font-extrabold text-lg mt-1">{config.title}</h3>
                <p className="text-xs text-white/80 font-semibold">{config.subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {mode === 'setup' && (
            <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 font-semibold leading-snug">
                <strong>Important:</strong> Yeh password sirf iss device par kaam kare ga. Bhool jane par local storage clear karna hoga.
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Key className="h-3 w-3 text-slate-500" />
              {mode === 'setup' ? 'New Password' : 'Password'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && mode !== 'setup' && handleSubmit()}
                placeholder="Minimum 4 characters"
                className="h-12 w-full rounded-xl border-2 border-slate-200 pl-4 pr-12 text-base font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {mode === 'setup' && (
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5 block">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Same password again"
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition"
              />
            </div>
          )}

          <Button
            size="lg"
            className={`w-full bg-gradient-to-r ${config.color}`}
            onClick={handleSubmit}
            loading={loading}
          >
            <Icon className="h-4 w-4" />
            {config.cta}
          </Button>
        </div>
      </div>
    </div>
  );
}
