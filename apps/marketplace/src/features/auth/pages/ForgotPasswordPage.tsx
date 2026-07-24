import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useMutation } from '@tanstack/react-query';
import { Phone, ArrowLeft, ArrowRight } from 'lucide-react';
import { authApi } from '../api/auth.api';
import { Button, Card, Input } from '@/ui';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');

  const mutation = useMutation({
    mutationFn: () => authApi.sendOtp({ phone, purpose: 'RESET_PASSWORD' }),
    onSuccess: (r) => {
      toast.success('OTP sent 📱');
      if (r.devCode) toast.info(`Dev OTP: ${r.devCode}`);
      navigate('/reset-password', { state: { phone } });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <>
      <Helmet><title>Forgot Password — Nafaa Bazaar</title></Helmet>

      <div className="min-h-screen-dvh flex items-center justify-center bg-gradient-mesh p-4">
        <div className="w-full max-w-md">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <Card className="p-6 md:p-8 shadow-soft-lg space-y-5">
            <div className="text-center">
              <div className="h-16 w-16 mx-auto rounded-3xl bg-gradient-brand flex items-center justify-center shadow-brand mb-4">
                <Phone className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black">Forgot password?</h1>
              <p className="text-sm text-content-muted mt-2">
                Enter your phone number to receive an OTP
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-4">
              <Input
                label="Phone number"
                type="tel"
                placeholder="03001234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<Phone className="h-4 w-4" />}
                inputSize="lg"
                required
              />
              <Button
                type="submit"
                variant="gradient"
                size="lg"
                fullWidth
                loading={mutation.isPending}
                rightIcon={<ArrowRight className="h-5 w-5" />}
              >
                Send OTP
              </Button>
            </form>

            <div className="text-center text-sm">
              <span className="text-content-muted">Remembered? </span>
              <Link to="/login" className="text-brand-600 dark:text-brand-400 font-black hover:underline">
                Back to login
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
