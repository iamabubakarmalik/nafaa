import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { marketplaceClient } from '@api/marketplace-client';
import { useCustomerAuthStore } from '@stores/customerAuth.store';

export default function GoogleSuccessPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setSession = useCustomerAuthStore((s) => s.setSession);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const access = params.get('access');
    const refresh = params.get('refresh');
    const isNew = params.get('isNew') === '1';

    if (!access || !refresh) {
      toast.error('Google login mein masla — dobara try karein');
      navigate('/login', { replace: true });
      return;
    }

    // Store tokens temporarily
    localStorage.setItem('marketplace_token', access);
    localStorage.setItem('marketplace_refresh_token', refresh);

    // Fetch full customer profile
    (async () => {
      try {
        const res = await marketplaceClient.get('/auth/me', {
          headers: { Authorization: `Bearer ${access}` },
        });
        const customer = res.data?.data ?? res.data;
        if (customer?.id) {
          setSession(customer, access);
          const firstName = customer.fullName?.split(' ')[0] || 'Dost';
          toast.success(
            isNew
              ? `Mubarak ho ${firstName}! Account ban gaya 🎉`
              : `Khush amdeed wapas, ${firstName}! 🎉`,
            { description: isNew ? '500 free loyalty points mile hain!' : undefined },
          );
          navigate('/', { replace: true });
        } else {
          throw new Error('Profile fetch failed');
        }
      } catch (err) {
        toast.error('Login incomplete — dobara try karein');
        navigate('/login', { replace: true });
      }
    })();
  }, [params, navigate, setSession]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-emerald-50 to-slate-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="relative inline-flex mb-6">
          <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-emerald-700 flex items-center justify-center shadow-brand-lg">
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
          <Loader2 className="absolute -bottom-2 -right-2 h-8 w-8 text-brand-600 animate-spin bg-white rounded-full p-1 shadow-md" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Google Login Successful!</h1>
        <p className="text-slate-600 text-sm mt-2">Aap ka profile load ho raha hai...</p>
      </div>
    </div>
  );
}
