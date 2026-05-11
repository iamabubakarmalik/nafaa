import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock, ArrowRight, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/brand/Logo';

const schema = z
  .object({
    newPassword: z.string().min(8, 'Kam se kam 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm password ki zaroorat hai'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords match nahi karte',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const password = form.watch('newPassword');
  const strength = (() => {
    if (!password) return { score: 0, label: '', color: 'slate' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { score: 20, label: 'Bohat Weak', color: 'rose' };
    if (score === 2) return { score: 40, label: 'Weak', color: 'orange' };
    if (score === 3) return { score: 60, label: 'Theek', color: 'amber' };
    if (score === 4) return { score: 80, label: 'Strong', color: 'emerald' };
    return { score: 100, label: 'Bohat Strong', color: 'emerald' };
  })();

  const mutation = useMutation({
    mutationFn: (data: FormData) => authApi.resetPassword(token!, data.newPassword),
    onSuccess: () => {
      setDone(true);
      toast.success('Password reset successful! 🎉');
      setTimeout(() => navigate('/login'), 3000);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Reset fail ho gaya');
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-rose-100 mb-4">
            <XCircle className="h-10 w-10 text-rose-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Invalid Link</h2>
          <p className="text-slate-600 mt-2">Ye link valid nahi hai. Naya reset request karein.</p>
          <Link
            to="/forgot-password"
            className="inline-block mt-6 px-6 py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700"
          >
            Naya Link Request Karein
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Logo size={44} />
          <div>
            <div className="text-2xl font-extrabold text-slate-900">Nafaa</div>
            <div className="text-xs text-slate-500">Pakistan-first retail OS</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-brand-700 p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-white/10 blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
                <Lock className="h-7 w-7" />
              </div>
              <h2 className="text-3xl font-extrabold">Naya Password Set Karein</h2>
              <p className="text-emerald-100 text-sm mt-2">
                Apna account secure karein
              </p>
            </div>
          </div>

          <div className="p-8">
            {done ? (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-emerald-100">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">Password Set Ho Gaya! ✅</h3>
                <p className="text-sm text-slate-600">
                  Ab aap naye password se login kar sakte hain.
                </p>
                <p className="text-xs text-slate-500">3 second mein login page par redirect ho jayenge...</p>
              </div>
            ) : (
              <form
                onSubmit={form.handleSubmit((d) => mutation.mutate(d))}
                className="space-y-5"
              >
                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1.5 block">Naya Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showNew ? 'text' : 'password'}
                      placeholder="Min 8 characters"
                      className="w-full h-11 pl-10 pr-11 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      {...form.register('newPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.formState.errors.newPassword && (
                    <p className="text-xs text-rose-600 mt-1">
                      {form.formState.errors.newPassword.message}
                    </p>
                  )}

                  {password && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            strength.color === 'rose' ? 'bg-rose-500' :
                            strength.color === 'orange' ? 'bg-orange-500' :
                            strength.color === 'amber' ? 'bg-amber-500' :
                            'bg-emerald-500'
                          }`}
                          style={{ width: `${strength.score}%` }}
                        />
                      </div>
                      <p className={`text-xs mt-1 font-semibold ${
                        strength.color === 'rose' ? 'text-rose-600' :
                        strength.color === 'orange' ? 'text-orange-600' :
                        strength.color === 'amber' ? 'text-amber-600' :
                        'text-emerald-600'
                      }`}>
                        Strength: {strength.label}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700 mb-1.5 block">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Wahi password dobara"
                      className="w-full h-11 pl-10 pr-11 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      {...form.register('confirmPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.formState.errors.confirmPassword && (
                    <p className="text-xs text-rose-600 mt-1">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  loading={mutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  Password Set Karein
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          © {new Date().getFullYear()} Nafaa.pk
        </p>
      </div>
    </div>
  );
}
