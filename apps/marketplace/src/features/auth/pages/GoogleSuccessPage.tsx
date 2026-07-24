import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '../api/auth.api';
import { Card } from '@/ui';
import { toast } from 'sonner';

export default function GoogleSuccessPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    const accessToken = params.get('access');
    const refreshToken = params.get('refresh');
    const isNew = params.get('isNew') === '1';

    if (!accessToken || !refreshToken) {
      toast.error('Google login incomplete');
      navigate('/login');
      return;
    }

    localStorage.setItem('marketplace_token', accessToken);
    localStorage.setItem('marketplace_refresh_token', refreshToken);

    authApi.me()
      .then((customer) => {
        setSession(customer, { accessToken, refreshToken });
        toast.success(isNew ? `Welcome to Nafaa, ${customer.fullName}! 🎉` : `Welcome back, ${customer.fullName}! 👋`);
        navigate('/', { replace: true });
      })
      .catch(() => {
        toast.error('Login failed');
        navigate('/login');
      });
  }, [params]);

  return (
    <div className="min-h-screen-dvh flex items-center justify-center bg-gradient-mesh p-4">
      <Card className="max-w-sm w-full p-8 text-center space-y-4">
        <Loader2 className="h-12 w-12 text-brand-600 mx-auto animate-spin" />
        <div className="font-black text-lg">Signing you in...</div>
        <div className="text-sm text-content-muted">Just a moment</div>
      </Card>
    </div>
  );
}
