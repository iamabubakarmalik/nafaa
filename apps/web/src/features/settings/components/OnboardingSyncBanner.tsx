import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Sparkles, CheckCircle2, RotateCcw, ArrowRight, X, AlertTriangle,
} from 'lucide-react';
import { onboardingApi } from '@/api/onboarding.api';
import { Button } from '@/components/ui/Button';

const DISMISS_KEY = 'nafaa-onboarding-sync-banner-dismissed';

/**
 * Shown at top of Settings page to indicate:
 * - Data from onboarding is already filled here
 * - User can re-run onboarding if they want
 * - Dismissable for 7 days
 */
export function OnboardingSyncBanner() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmReset, setConfirmReset] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      const stored = sessionStorage.getItem(DISMISS_KEY);
      if (!stored) return false;
      const data = JSON.parse(stored);
      if (Date.now() - data.timestamp < 7 * 24 * 60 * 60 * 1000) return true;
      return false;
    } catch {
      return false;
    }
  });

  const { data: progress } = useQuery({
    queryKey: ['onboarding'],
    queryFn: onboardingApi.get,
    staleTime: 60000,
  });

  const resetMutation = useMutation({
    mutationFn: onboardingApi.reset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      toast.success('Onboarding reset ho gaya — chaliye dobara shuru karein');
      setTimeout(() => navigate('/onboarding'), 500);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Reset fail ho gaya'),
  });

  if (dismissed || !progress?.isCompleted) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(
        DISMISS_KEY,
        JSON.stringify({ timestamp: Date.now() }),
      );
    } catch {}
  };

  return (
    <>
      <div className="rounded-3xl bg-gradient-to-r from-emerald-50 via-blue-50 to-violet-50 border-2 border-emerald-200 p-4 mb-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-emerald-200/30 blur-2xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md flex-shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                  Setup Complete
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Onboarding ka data yahan synced hai
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Business type, shop details, working hours, payment methods, low stock alert — sab yahan se edit kar sakte hain
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmReset(true)}
              className="bg-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Re-run Setup
            </Button>
            <button
              onClick={handleDismiss}
              className="h-9 w-9 rounded-xl bg-white/60 hover:bg-white text-slate-600 inline-flex items-center justify-center transition"
              title="7 din ke liye band karein"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Reset confirmation modal */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white">
              <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-extrabold">Onboarding Dobara Shuru Karein?</h3>
              <p className="text-amber-100 text-sm mt-2 leading-relaxed">
                Aap ka existing data <strong>safe rahe ga</strong> (products, sales, customers) —
                sirf setup wizard dobara chalega
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
                <p className="text-xs text-blue-900 leading-relaxed">
                  ✅ Products, customers, sales preserved<br/>
                  ✅ Settings yahan se change kar sakte hain<br/>
                  ⚠️ Sirf use karein agar business type change karna ho ya wizard dobara dekhna ho
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setConfirmReset(false)}
                  disabled={resetMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                  loading={resetMutation.isPending}
                  onClick={() => resetMutation.mutate()}
                >
                  <ArrowRight className="h-4 w-4" />
                  Yes, Re-run Setup
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
