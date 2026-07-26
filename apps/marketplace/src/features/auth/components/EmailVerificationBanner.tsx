import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, X, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

export function EmailVerificationBanner() {
  const navigate = useNavigate();
  const customer = useAuthStore((s) => s.customer) as any;

  const [dismissed, setDismissed] = useState(() => {
    const d = localStorage.getItem('email-verify-dismissed-at');
    return d ? Date.now() - Number(d) < 24 * 60 * 60 * 1000 : false;
  });

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem('email-verify-dismissed-at', String(Date.now()));
  };

  if (
    !customer ||
    !customer.email ||
    customer.emailVerified ||
    customer.isEmailVerified ||
    dismissed
  ) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-accent-500 via-orange-500 to-red-500 text-white">
      <div className="container mx-auto px-4 py-2.5 flex items-center gap-3">
        <Mail className="h-4 w-4 shrink-0" />
        <div className="flex-1 text-xs md:text-sm min-w-0">
          <strong>Verify your email</strong>{' '}
          <span className="opacity-90 hidden sm:inline">— {customer.email}</span>
        </div>
        <button
          onClick={() => navigate('/verify-email')}
          className="h-7 px-3 rounded-full bg-white text-orange-600 text-2xs font-black hover:scale-105 transition inline-flex items-center gap-1 shrink-0"
        >
          Verify now
          <ArrowRight className="h-3 w-3" />
        </button>
        <button
          onClick={dismiss}
          className="h-6 w-6 rounded-full hover:bg-white/20 flex items-center justify-center shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
