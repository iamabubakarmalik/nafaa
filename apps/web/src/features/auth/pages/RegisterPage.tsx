import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Sparkles, Store, ArrowRight, Gift } from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useEffect } from 'react';

const schema = z.object({
  shopName: z.string().min(2, 'Shop ka naam likhein'),
  fullName: z.string().min(2, 'Apna naam likhein'),
  email: z.string().email('Sahi email likhein'),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Sahi mobile number').optional().or(z.literal('')),
  password: z.string().min(8, 'Kam se kam 8 characters'),
  referralCode: z.string().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const refFromUrl = searchParams.get('ref');

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      shopName: '',
      fullName: '',
      email: '',
      phone: '',
      password: '',
      referralCode: refFromUrl || '',
    },
  });

  useEffect(() => {
    if (refFromUrl) {
      form.setValue('referralCode', refFromUrl);
    }
  }, [refFromUrl, form]);

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setSession(data);
      toast.success('Mubarak ho! Aap ka account ban gaya');
      navigate('/dashboard');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Kuch ghalat ho gaya');
    },
  });

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 text-white p-12">
        <div>
          <div className="flex items-center gap-2 text-2xl font-bold">
            <Sparkles className="h-7 w-7 text-accent-500" />
            Nafaa
          </div>
        </div>
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Pakistan ka sab se aasaan POS aur shop management system
          </h1>
          <p className="text-brand-100 text-lg leading-relaxed">
            Bakery, Kiryana, Mobile Shop, Pharmacy — koi bhi business ho. Nafaa ke saath aap apni dukan online laao,
            barcode scan karein, receipts print karein, aur har waqt apna nafaa dekho.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            {['Web + Mobile + POS', 'Urdu + English', 'JazzCash & EasyPaisa', 'Multi-shop support'].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-brand-100">
                <div className="h-1.5 w-1.5 rounded-full bg-accent-500" />
                {f}
              </div>
            ))}
          </div>
        </div>
        <div className="text-sm text-brand-200">© {new Date().getFullYear()} Nafaa.pk — Made for Pakistan</div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 text-brand-700 px-3 py-1 text-xs font-medium">
              <Store className="h-3.5 w-3.5" /> Apni dukan register karein
            </div>
            <h2 className="text-3xl font-bold text-slate-900">Free trial shuru karein</h2>
            <p className="text-slate-600 text-sm">
              7 din free, koi credit card nahi chahiye. Kabhi bhi cancel karein.
            </p>
          </div>

          {refFromUrl && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
              <Gift className="h-5 w-5 text-emerald-700 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-emerald-900">Referral Code Applied!</div>
                <div className="text-emerald-700 text-xs mt-1">
                  Aap ka friend Rs 500+ ka reward kamayega jab aap subscribe karenge.
                </div>
              </div>
            </div>
          )}

          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d as any))} className="space-y-4">
            <Input
              label="Shop / Business Name"
              placeholder="Ahmad Bakery"
              {...form.register('shopName')}
              error={form.formState.errors.shopName?.message}
            />
            <Input
              label="Aap ka naam"
              placeholder="Ahmad Ali"
              {...form.register('fullName')}
              error={form.formState.errors.fullName?.message}
            />
            <Input
              label="Email"
              type="email"
              placeholder="ahmad@example.com"
              {...form.register('email')}
              error={form.formState.errors.email?.message}
            />
            <Input
              label="Mobile (optional)"
              placeholder="+923001234567"
              {...form.register('phone')}
              error={form.formState.errors.phone?.message}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Strong password"
              {...form.register('password')}
              error={form.formState.errors.password?.message}
            />
            <Input
              label="Referral Code (optional)"
              placeholder="NAFAA-XXXX"
              {...form.register('referralCode')}
              hint="Agar kisi ne aap ko code diya hai to yahan likhein"
            />

            <Button type="submit" loading={mutation.isPending} className="w-full" size="lg">
              Account banayein <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600">
            Pehle se account hai?{' '}
            <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">
              Login karein
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
