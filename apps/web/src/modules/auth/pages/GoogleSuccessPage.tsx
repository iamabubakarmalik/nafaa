/**
 * Google sign-in landing. The API redirects here with the tokens in the URL
 * hash; the session is stored exactly as before, then the user goes to
 * onboarding or the dashboard.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { apiClient } from '@core/api/client';
import { useAuthStore } from '@core/stores/auth.store';
import { Button } from '@/design-system/components';
import { onboardingApi } from '@modules/onboarding/api/onboarding.api';
import { AuthHeading, AuthLayout } from '../components/AuthLayout';
import { t } from '@core/i18n';

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
      toast.error(t('Google login poora nahi hua. Dobara try karein.'));
      navigate('/login', { replace: true });
      return;
    }

    (async () => {
      try {
        const meRes = await apiClient.get('/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } });
        const data = meRes.data?.data;
        if (!data?.user || !data?.tenant) throw new Error(t('Invalid user data'));

        setSession({ user: data.user, tenant: data.tenant, accessToken, refreshToken });
        // Drop cached data from any previous account on this device.
        queryClient.clear();

        const firstName = data.user.fullName.split(' ')[0];
        toast.success(isNewUser ? t('Mubarak ho, {{firstName}}!', { firstName }) : t('Khush aamdeed, {{firstName}}!', { firstName }));

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
    <AuthLayout side="signin">
      {failed ? (
        <>
          <AuthHeading
            icon={<AlertCircle className="h-5 w-5" />}
            title={t('Login poora nahi hua')}
            subtitle={t('Server se account ki maloomat nahi mili. Internet check karke dobara try karein.')}
          />
          <Button size="lg" fullWidth leftIcon={<ArrowLeft className="h-4 w-4 rtl-flip" />} onClick={() => navigate('/login', { replace: true })}>
            {t('Login par wapas')}
          </Button>
        </>
      ) : (
        <div role="status" aria-live="polite">
          <AuthHeading
            icon={<Loader2 className="h-5 w-5 animate-spin" />}
            title={t('Google se login ho raha hai…')}
            subtitle={t('Bas ek pal. Aap ka account khola ja raha hai.')}
          />
        </div>
      )}
    </AuthLayout>
  );
}
