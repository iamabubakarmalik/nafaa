import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sparkles, CheckCircle2, RotateCcw, ArrowRight, X, AlertTriangle, Shield } from 'lucide-react';
import { onboardingApi } from '@modules/onboarding/api/onboarding.api';
import { Button } from '@core/ui/Button';

const DISMISS_KEY = 'nafaa-onb-sync-dismissed';

export function OnboardingSyncBanner() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmReset, setConfirmReset] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      const s = sessionStorage.getItem(DISMISS_KEY);
      if (!s) return false;
      const d = JSON.parse(s);
      return Date.now() - d.timestamp < 7 * 24 * 60 * 60 * 1000;
    } catch { return false; }
  });

  const { data: progress } = useQuery({ queryKey: ['onboarding'], queryFn: onboardingApi.get, staleTime: 60000 });

  const resetMutation = useMutation({
    mutationFn: onboardingApi.reset,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['onboarding'] });
      toast.success('Onboarding reset ho gaya');
      setTimeout(() => navigate('/onboarding'), 500);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Reset fail'),
  });

  if (dismissed || !progress?.isCompleted) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, JSON.stringify({ timestamp: Date.now() })); } catch {}
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-50 via-cyan-50 to-violet-50 dark:from-emerald-950/40 dark:via-cyan-950/40 dark:to-violet-950/40 border-2 border-emerald-200 dark:border-emerald-500/30 p-4 shadow-sm">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-emerald-300/25 dark:bg-emerald-400/10 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-violet-300/20 dark:bg-violet-400/10 blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Setup Complete</span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Onboarding data yahan synced hai
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-semibold leading-snug">
                Business, shop, hours, payments — sab yahan edit karein. <span className="hidden sm:inline">Changes live ho jayenge.</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmReset(true)}
              className="bg-white/80 dark:bg-slate-900/60 backdrop-blur border-2 border-slate-200 dark:border-slate-700 font-extrabold"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Re-run Setup</span>
              <span className="sm:hidden">Reset</span>
            </Button>
            <button
              onClick={handleDismiss}
              title="Chhupao (7 din ke liye)"
              className="h-9 w-9 rounded-xl bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 backdrop-blur border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700 inline-flex items-center justify-center transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Reset confirm modal */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-800">
            <div className="relative bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white overflow-hidden">
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-3 ring-4 ring-white/10">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-black">Onboarding Dobara Shuru Karein?</h3>
                <p className="text-amber-100 text-sm mt-2 leading-relaxed font-semibold">
                  Existing data safe rahega — sirf setup wizard chalega. Ye tab karein jab business type ya major setup change karna ho.
                </p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3 text-xs font-semibold text-emerald-900 dark:text-emerald-200 space-y-1">
                <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Products, customers, sales preserved</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> Settings yahan se change ho sakti hain</div>
                <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300"><AlertTriangle className="h-3.5 w-3.5" /> Sirf major setup change ke liye</div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1 h-12 font-extrabold" onClick={() => setConfirmReset(false)} disabled={resetMutation.isPending}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-12 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold shadow-lg"
                  loading={resetMutation.isPending}
                  onClick={() => resetMutation.mutate()}
                >
                  <ArrowRight className="h-4 w-4" />
                  Yes, Re-run
                </Button>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center font-semibold inline-flex items-center gap-1 justify-center w-full">
                <Shield className="h-3 w-3" /> Data 100% safe hai — sirf wizard restart hoga
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
