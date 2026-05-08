import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ShieldCheck, Lock, ArrowRight } from 'lucide-react';
import { adminAuthApi } from '@/api/admin-auth.api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('admin@nafaa.pk');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => adminAuthApi.login(email, password),
    onSuccess: (data) => {
      setSession(data);
      toast.success('Welcome, Super Admin');
      navigate('/dashboard');
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Login failed');
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-admin-950 via-admin-900 to-slate-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-admin-500 to-admin-700 shadow-2xl">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-5 text-3xl font-bold text-white">Nafaa Admin</h1>
          <p className="mt-2 text-admin-200">Super Admin Control Center</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-5">
            <Lock className="h-4 w-4" />
            Secure Admin Access
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!email || !password) return toast.error('Email aur password chahiye');
              mutation.mutate();
            }}
            className="space-y-4"
          >
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@nafaa.pk"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <Button type="submit" className="w-full" size="lg" loading={mutation.isPending}>
              Sign in to Admin
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-admin-300">
          © {new Date().getFullYear()} Nafaa.pk — Admin Portal
        </p>
      </div>
    </div>
  );
}
