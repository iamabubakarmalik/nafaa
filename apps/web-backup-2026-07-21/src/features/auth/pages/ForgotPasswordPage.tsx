import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, ArrowLeft, KeyRound, CheckCircle2, Sparkles } from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/brand/Logo';

const schema = z.object({
  email: z.string().email('Sahi email likhein'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
    onSuccess: (_, email) => {
      setSent(email);
      toast.success('Email bhej diya gaya hai');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Kuch ghalat ho gaya');
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Logo size={44} />
          <div>
            <div className="text-2xl font-extrabold text-slate-900">Nafaa</div>
            <div className="text-xs text-slate-500">Pakistan-first retail OS</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-emerald-600 to-brand-700 p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-white/10 blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
                <KeyRound className="h-7 w-7" />
              </div>
              <h2 className="text-3xl font-extrabold">Password Bhool Gaye?</h2>
              <p className="text-emerald-100 text-sm mt-2">
                Koi baat nahi! Email pe reset link bhej dete hain.
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-8">
            {sent ? (
              <div className="space-y-6 text-center">
                <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-emerald-100">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Email Bhej Diya! 📬</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    Hum ne <strong className="text-slate-900">{sent}</strong> par reset link bhej diya hai.
                    Apna inbox check karein (spam folder bhi).
                  </p>
                </div>
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-left">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-1">
                    <Sparkles className="h-4 w-4" />
                    Important
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Link sirf <strong>1 ghante</strong> ke liye valid hai. Agar email nahi mila to 1 min wait karke phir try karein.
                  </p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => setSent(null)}
                    className="w-full text-sm font-semibold text-brand-700 hover:text-brand-800"
                  >
                    Doosra email try karein
                  </button>
                  <Link
                    to="/login"
                    className="block text-center text-sm text-slate-600 hover:text-slate-800"
                  >
                    ← Login par wapas jayein
                  </Link>
                </div>
              </div>
            ) : (
              <form
                onSubmit={form.handleSubmit((d) => mutation.mutate(d.email))}
                className="space-y-5"
              >
                <p className="text-sm text-slate-600 leading-relaxed">
                  Apna registered email enter karein. Hum aap ko reset link bhej denge.
                </p>

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="ahmad@example.com"
                  leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
                  {...form.register('email')}
                  error={form.formState.errors.email?.message}
                  autoFocus
                />

                <Button
                  type="submit"
                  loading={mutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  Reset Link Bhejein
                </Button>

                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-slate-900 pt-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Login par wapas jayein
                </Link>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          © {new Date().getFullYear()} Nafaa.pk • Made with ❤️ in Pakistan 🇵🇰
        </p>
      </div>
    </div>
  );
}
