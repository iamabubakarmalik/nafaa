import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '../api/auth.api';
import { Card } from '@/ui';
import { toast } from 'sonner';

/**
 * Backend redirects here with query params:
 * ?access=...&refresh=...&isNew=1
 */
export default function GoogleSuccessPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    // Try both query string and hash
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    const access =
      params.get('access') ||
      params.get('accessToken') ||
      hashParams.get('access') ||
      hashParams.get('accessToken');
    const refresh =
      params.get('refresh') ||
      params.get('refreshToken') ||
      hashParams.get('refresh') ||
      hashParams.get('refreshToken') ||
      '';
    const isNew =
      params.get('isNew') === '1' ||
      params.get('isNewUser') === 'true' ||
      hashParams.get('isNew') === '1';

    if (!access) {
      toast.error('Google login incomplete');
      navigate('/login', { replace: true });
      return;
    }

    // Persist tokens
    localStorage.setItem('marketplace_access_token', access);
    localStorage.setItem('marketplace_token', access);
    if (refresh) localStorage.setItem('marketplace_refresh_token', refresh);

    // Fetch profile
    authApi
      .me()
      .then((customer) => {
        setSession(customer, {
          accessToken: access,
          refreshToken: refresh,
        });
        qc.clear();
        const firstName = customer.fullName?.split(' ')[0] || 'friend';
        toast.success(
          isNew
            ? `Welcome to Nafaa, ${firstName}! 🎉`
            : `Welcome back, ${firstName}! 👋`,
        );
        navigate(isNew ? '/welcome' : '/', { replace: true });
      })
      .catch((e: any) => {
        toast.error(e?.response?.data?.message || 'Login failed');
        localStorage.removeItem('marketplace_access_token');
        localStorage.removeItem('marketplace_token');
        localStorage.removeItem('marketplace_refresh_token');
        setTimeout(() => navigate('/login', { replace: true }), 1500);
      });
  }, []);

  return (
    <div className="min-h-screen-dvh flex items-center justify-center bg-gradient-mesh p-4">
      <Card className="max-w-sm w-full p-8 text-center space-y-4 shadow-soft-lg">
        <div className="relative">
          <div className="h-16 w-16 mx-auto rounded-3xl bg-gradient-brand flex items-center justify-center shadow-brand animate-pulse-soft">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <Loader2 className="h-6 w-6 text-brand-600 mx-auto mt-4 animate-spin" />
        </div>
        <div>
          <div className="font-black text-lg text-content">Signing you in...</div>
          <div className="text-sm text-content-muted mt-1">Setting up your account</div>
        </div>
      </Card>
    </div>
  );
}
