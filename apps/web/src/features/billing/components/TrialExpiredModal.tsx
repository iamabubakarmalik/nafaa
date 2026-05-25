import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, ArrowRight, LogOut } from 'lucide-react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useAuthStore } from '@/store/auth.store';

export function TrialExpiredModal() {
  const navigate = useNavigate();
  const { needsUpgrade, subscription } = useSubscriptionStatus();
  const logout = useAuthStore((s) => s.logout);

  if (!needsUpgrade) return null;

  const isPastDue = subscription?.status === 'PAST_DUE';

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div
            className={`h-24 w-24 rounded-3xl flex items-center justify-center ${isPastDue ? 'bg-amber-500' : 'bg-rose-600'}`}
            style={{ boxShadow: `0 0 40px ${isPastDue ? 'rgba(245,158,11,0.6)' : 'rgba(220,38,38,0.6)'}` }}
          >
            <Lock className="h-12 w-12 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-white text-center mb-3">
          {isPastDue ? 'Subscription Expired' : 'Trial Khatam Ho Gaya'}
        </h1>
        <p className="text-base text-neutral-300 text-center leading-relaxed mb-8">
          {isPastDue
            ? 'Aap ki subscription expire ho chuki hai. Service jaari rakhne ke liye renew karein.'
            : 'Aap ka 7-day free trial khatam ho gaya. Apni dukan ka data safe hai — abhi plan choose karein.'}
        </p>
        <div className="bg-white/10 rounded-2xl p-3 mb-6">
          <p className="text-xs text-emerald-300 text-center">✓ Aap ka data, customers, products — sab safe hain</p>
          <p className="text-xs text-emerald-300 text-center mt-1">✓ Plan choose karte hi turant access wapas</p>
        </div>
        <button
          onClick={() => navigate('/plan')}
          className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 transition flex items-center justify-center gap-2 mb-3 shadow-lg shadow-emerald-600/50"
        >
          <Sparkles className="h-5 w-5 text-white" />
          <span className="text-white font-extrabold">Plan Choose Karein</span>
          <ArrowRight className="h-5 w-5 text-white" />
        </button>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-neutral-400 hover:text-neutral-300 transition"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-bold">Logout</span>
        </button>
      </div>
    </div>
  );
}
