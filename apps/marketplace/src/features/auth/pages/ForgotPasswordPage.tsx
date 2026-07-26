import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useMutation } from '@tanstack/react-query';
import {
  Phone, ArrowLeft, ArrowRight, Lock, ShieldCheck,
} from 'lucide-react';
import { authApi } from '../api/auth.api';
import { Button, Card, Input } from '@/ui';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');

  const mutation = useMutation({
    mutationFn: () => authApi.sendOtp({ phone, purpose: 'RESET_PASSWORD' }),
    onSuccess: (r) => {
      toast.success('OTP sent to your phone 📱');
      if (r.devCode) toast.info(`Dev OTP: ${r.devCode}`, { duration: 10000 });
      navigate('/reset-password', { state: { phone } });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Failed to send OTP'),
  });

  return (
    <>
      <Helmet><title>Forgot Password — Nafaa Bazaar</title></Helmet>

      <div className="min-h-screen-dvh flex items-center justify-center bg-gradient-mesh p-4">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        </div>

        <div className="w-full max-w-md">
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </button>

          <Card className="p-6 md:p-8 shadow-soft-lg space-y-5">
            <div className="text-center">
              <div className="h-16 w-16 mx-auto rounded-3xl bg-gradient-brand flex items-center justify-center shadow-brand mb-4">
                <Lock className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black">Forgot password?</h1>
              <p className="text-sm text-content-muted mt-2">
                Enter your phone — we'll send an OTP
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
              className="space-y-4"
            >
              <Input
                label="Phone number"
                type="tel"
                placeholder="03001234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<Phone className="h-4 w-4" />}
                inputSize="lg"
                hint="Pakistan format: 03001234567"
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
                Send reset code
              </Button>
            </form>

            <div className="rounded-2xl bg-info/10 border-2 border-info/30 p-3 flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-info shrink-0 mt-0.5" />
              <div className="text-2xs text-content font-bold">
                <strong>Security:</strong> Only your registered phone will receive the code. Kisi ko share na karain.
              </div>
            </div>

            <div className="text-center text-sm">
              <span className="text-content-muted">Remember it? </span>
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
