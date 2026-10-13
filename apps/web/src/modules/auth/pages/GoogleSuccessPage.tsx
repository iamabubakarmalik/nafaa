/**
 * Google sign-in landing. The API redirects here with the tokens in the URL
 * hash; the session is stored exactly as before, then the user goes to
 * onboarding or the dashboard.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@core/api/client';
import { useAuthStore } from '@core/stores/auth.store';
import { Logo } from '@core/components/brand/Logo';
import { onboardingApi } from '@modules/onboarding/api/onboarding.api';

export default function GoogleSuccessPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const ranRef = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const isNewUser = params.get('isNewUser') === 'true';

    if (!accessToken || !refreshToken) {
      toast.error('Google login poora nahi hua. Dobara try karein.');
      navigate('/login', { replace: true });
      return;
    }

    (async () => {
      try {
        const meRes = await apiClient.get('/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } });
        const data = meRes.data?.data;
        if (!data?.user || !data?.tenant) throw new Error('Invalid user data');

        setSession({ user: data.user, tenant: data.tenant, accessToken, refreshToken });
        // Drop cached data from any previous account on this device.
        queryClient.clear();

        const firstName = data.user.fullName.split(' ')[0];
        toast.success(isNewUser ? `Mubarak ho, ${firstName}!` : `Khush aamdeed, ${firstName}!`);

        try {
          const progress = await queryClient.fetchQuery({ queryKey: ['onboarding'], queryFn: onboardingApi.get });
          if (!progress.isCompleted) {
            navigate('/onboarding', { replace: true });
            return;
          }
        } catch {
          // OnboardingGate decides on the next screen.
        }
        navigate('/dashboard', { replace: true });
      } catch {
        setFailed(true);
      }
    })();
  }, [navigate, setSession, queryClient]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Logo size={48} className="mx-auto" />
        {failed ? (
          <>
            <AlertCircle className="mx-auto mt-6 h-8 w-8 text-rose-600" aria-hidden />
            <h1 className="mt-3 text-lg font-bold text-slate-900">Login poora nahi hua</h1>
            <p className="mt-1 text-sm text-slate-600">Server se account ki maloomat nahi mili. Internet check karke dobara try karein.</p>
            <Link to="/login" replace className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-brand-fg hover:bg-brand-700">
              Login par wapas
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto mt-6 h-8 w-8 animate-spin text-brand-600" aria-hidden />
            <h1 className="mt-3 text-lg font-bold text-slate-900">Google se login ho raha hai…</h1>
            <p className="mt-1 text-sm text-slate-600">Bas ek pal.</p>
          </>
        )}
      </div>
    </div>
  );
}
