import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, X, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const DISMISS_KEY = 'nafaa-verify-banner-dismissed';

/**
 * Shows a banner on top of dashboard if email is not verified.
 * - Sticky at top
 * - Dismissable for 24 hours (saved to sessionStorage)
 * - Click "Verify Now" → goes to /verify-email page
 */
export function EmailVerifyBanner() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [dismissed, setDismissed] = useState(() => {
    try {
      const stored = sessionStorage.getItem(DISMISS_KEY);
      if (!stored) return false;
      const data = JSON.parse(stored);
      // Dismiss for 24h
      if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) return true;
      return false;
    } catch {
      return false;
    }
  });

  // Don't show if verified, or no user, or dismissed
  if (!user || user.emailVerified || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(
        DISMISS_KEY,
        JSON.stringify({ timestamp: Date.now() }),
      );
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 p-4 mb-4 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-amber-200/30 blur-2xl -translate-y-1/2 translate-x-1/2" />

      <div className="relative flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-11 w-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md flex-shrink-0">
            <Mail className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                Action Required
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-amber-900">
              Email verify karein
            </h3>
            <p className="text-xs text-amber-800 mt-0.5 truncate">
              Aap ke email <strong className="font-bold">{user.email}</strong> pe code bheja gaya hai
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate('/verify-email')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-md transition"
          >
            Verify Now
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDismiss}
            className="h-9 w-9 rounded-xl bg-white/60 hover:bg-white text-amber-700 inline-flex items-center justify-center transition"
            title="24 ghante ke liye band karein"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
