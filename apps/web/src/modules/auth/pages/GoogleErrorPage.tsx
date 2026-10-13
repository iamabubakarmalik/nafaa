/** Google sign-in failed: the API redirects here with ?message=… */

import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Alert } from '@/design-system/components';
import { AuthHeading, AuthLayout, OrDivider } from '../components/AuthLayout';
import { GoogleButton } from '../components/GoogleButton';

export default function GoogleErrorPage() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('message');

  return (
    <AuthLayout side="signin">
      <AuthHeading
        icon={<AlertCircle className="h-5 w-5" />}
        title="Google se login nahi hua"
        subtitle="Aksar ye tab hota hai jab Google wali window beech me band ho jaye ya net ruk jaye. Dobara try karein."
      />
      {reason && (
        <Alert tone="warning" className="mb-5">
          <span className="break-words">Wajah: {reason}</span>
        </Alert>
      )}

      <GoogleButton label="Google se dobara try karein" />
      <OrDivider label="ya" />
      <Link
        to="/login"
        className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-brand-fg shadow-sm hover:bg-brand-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Email se login karein
      </Link>
      <p className="mt-6 text-center text-sm text-slate-600">
        Account nahi hai?{' '}
        <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-800">Naya account banayein</Link>
      </p>
    </AuthLayout>
  );
}
