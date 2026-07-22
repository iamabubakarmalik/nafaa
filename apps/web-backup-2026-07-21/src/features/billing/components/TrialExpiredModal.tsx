import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, ArrowRight, LogOut, Shield, CheckCircle2 } from 'lucide-react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useAuthStore } from '@/store/auth.store';

export function TrialExpiredModal() {
  const navigate = useNavigate();
  const { needsUpgrade, subscription } = useSubscriptionStatus();
  const logout = useAuthStore((s) => s.logout);

  if (!needsUpgrade) return null;

  const isPastDue = subscription?.status === 'PAST_DUE';

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-black/95 via-slate-950/95 to-black/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
      {/* Floating particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 h-2 w-2 rounded-full bg-emerald-400/40 animate-pulse" />
        <div className="absolute top-3/4 right-1/4 h-1.5 w-1.5 rounded-full bg-blue-400/40 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 left-1/3 h-2 w-2 rounded-full bg-amber-400/40 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md relative animate-in zoom-in-95 duration-300">
        {/* Glowing icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className={`absolute inset-0 ${isPastDue ? 'bg-amber-500' : 'bg-rose-600'} rounded-3xl blur-2xl opacity-50 animate-pulse`} />
            <div
              className={`relative h-24 w-24 rounded-3xl flex items-center justify-center ${
                isPastDue ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-rose-600 to-red-700'
              } shadow-2xl ring-4 ring-white/10`}
            >
              <Lock className="h-12 w-12 text-white" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white text-center mb-3 leading-tight">
          {isPastDue ? 'Subscription Expired' : 'Trial Khatam Ho Gaya'}
        </h1>

        {/* Description */}
        <p className="text-base text-slate-300 text-center leading-relaxed mb-6 font-semibold">
          {isPastDue
            ? 'Aap ki subscription expire ho chuki hai. Service jaari rakhne ke liye renew karein.'
            : 'Aap ka 7-day free trial complete ho gaya. Apni dukan ka data safe hai — abhi plan choose karein.'}
        </p>

        {/* Trust card */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-2 border-emerald-500/30 rounded-2xl p-4 mb-6 backdrop-blur">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">Your Data is Safe</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2 text-xs text-emerald-200 font-semibold">
              <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
              <span>Aap ka data, customers, products — sab safe</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-emerald-200 font-semibold">
              <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
              <span>Plan choose karte hi turant access wapas</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-emerald-200 font-semibold">
              <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
              <span>Free trial ke saare features still available</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={() => navigate('/plan')}
          className="group w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 transition-all flex items-center justify-center gap-2 mb-3 shadow-2xl shadow-emerald-600/50 hover:scale-[1.02]"
        >
          <Sparkles className="h-5 w-5 text-white group-hover:rotate-12 transition-transform" />
          <span className="text-white font-extrabold text-base">Plan Choose Karein</span>
          <ArrowRight className="h-5 w-5 text-white group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:text-slate-200 hover:bg-white/5 transition"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-bold">Logout</span>
        </button>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-[10px] text-slate-500 font-bold">
            Need help? WhatsApp us at support
          </p>
        </div>
      </div>
    </div>
  );
}
