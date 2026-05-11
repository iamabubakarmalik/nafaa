import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft, Store, ArrowRight, Sparkles } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

export default function GoogleErrorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const message = searchParams.get('message') || 'Google login fail ho gaya';
  const idToken = searchParams.get('idToken'); // backend ko ye pass karna padega

  const needsShopName = message.toLowerCase().includes('shop name');
  const [shopName, setShopName] = useState('');

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/auth/google/complete', {
        idToken,
        shopName: shopName.trim(),
      });
      return res.data?.data ?? res.data;
    },
    onSuccess: (data: any) => {
      setSession({
        user: data.user,
        tenant: data.tenant,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      toast.success('🎉 Account ban gaya!');
      navigate('/onboarding', { replace: true });
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Account banane mein masla');
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Logo size={44} />
          <div>
            <div className="text-2xl font-extrabold text-slate-900">Nafaa</div>
            <div className="text-xs text-slate-500">Pakistan-first retail OS</div>
          </div>
        </div>

        {needsShopName && idToken ? (
          // Show inline shop name form
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-600 to-brand-700 p-8 text-white">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/20 mb-4">
                <Store className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-extrabold">Bas Ek Last Step!</h2>
              <p className="text-emerald-100 text-sm mt-2">
                Apni shop ka naam batayein, account ban jayega
              </p>
            </div>
            <div className="p-8 space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1.5 block">
                  Shop / Business Name <span className="text-rose-600">*</span>
                </label>
                <div className="flex items-center gap-2 rounded-xl border-2 border-slate-200 px-3 h-12 focus-within:border-emerald-500">
                  <Store className="h-4 w-4 text-slate-400" />
                  <input
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="Ahmad Bakery"
                    autoFocus
                    className="flex-1 bg-transparent outline-none text-sm"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  if (shopName.trim().length < 2) {
                    toast.error('Shop ka naam likhein');
                    return;
                  }
                  completeMutation.mutate();
                }}
                disabled={completeMutation.isPending}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center justify-center gap-2 disabled:bg-slate-400"
              >
                {completeMutation.isPending ? 'Account banaya jaa raha hai...' : (
                  <>
                    Account Banayein
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span className="text-slate-500">7 din free trial • No credit card</span>
              </div>
            </div>
          </div>
        ) : (
          // Generic error fallback
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center space-y-5">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-rose-100">
              <AlertCircle className="h-10 w-10 text-rose-600" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Google Login Fail</h2>
              <p className="text-sm text-slate-600 mt-2">{message}</p>
            </div>
            <div className="space-y-2 pt-2">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Login par wapas
              </Link>
              <Link
                to="/register"
                className="block text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                Ya naya account banayein
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
