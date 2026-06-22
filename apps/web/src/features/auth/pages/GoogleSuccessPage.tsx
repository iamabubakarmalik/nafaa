import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';
import { onboardingApi } from '@/api/onboarding.api';

/**
 * Handles redirect from backend Google OAuth callback.
 * URL hash contains: accessToken, refreshToken, isNewUser
 *
 * Flow:
 * 1. Parse tokens from URL hash
 * 2. Fetch user/tenant via /auth/me
 * 3. Set session in store
 * 4. Check onboarding status
 * 5. Redirect to /onboarding (if incomplete) or /dashboard
 */
export default function GoogleSuccessPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const isNewUser = params.get('isNewUser') === 'true';

    if (!accessToken || !refreshToken) {
      toast.error('Google login fail ho gaya');
      navigate('/login', { replace: true });
      return;
    }

    (async () => {
      try {
        // Step 1: Get user + tenant
        const meRes = await apiClient.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = meRes.data?.data;
        if (!data?.user || !data?.tenant) {
          throw new Error('Invalid user data');
        }

        // Step 2: Set session
        setSession({
          user: data.user,
          tenant: data.tenant,
          accessToken,
          refreshToken,
        });

        const firstName = data.user.fullName.split(' ')[0];
        toast.success(
          isNewUser
            ? `Mubarak ho ${firstName}! 🎉`
            : `Welcome back, ${firstName}! 👋`,
        );

        // Step 3: Check onboarding status
        try {
          const progress = await onboardingApi.get();
          if (!progress.isCompleted) {
            navigate('/onboarding', { replace: true });
            return;
          }
        } catch {
          // If onboarding fetch fails, just go to dashboard
          // OnboardingGate will handle it
        }

        // Step 4: Onboarding complete → dashboard
        navigate('/dashboard', { replace: true });
      } catch {
        toast.error('Authentication fail ho gayi');
        navigate('/login', { replace: true });
      }
    })();
  }, [navigate, setSession]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-brand-700 to-emerald-900 flex items-center justify-center p-6">
      <div className="text-center text-white space-y-6">
        <div className="flex items-center justify-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Sparkles className="h-7 w-7 text-amber-300" />
          </div>
          <span className="text-3xl font-extrabold">Nafaa</span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 px-5 py-2 text-sm font-semibold">
          Sign in ho raha hai...
        </div>
        <div className="flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        </div>
        <p className="text-sm text-white/70 max-w-sm mx-auto">
          Bas ek lamha — aap ka account ready ho raha hai
        </p>
      </div>
    </div>
  );
}
