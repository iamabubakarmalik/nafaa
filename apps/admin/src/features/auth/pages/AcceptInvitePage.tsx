/**
 * Invite link landing page: shows who invited is for and lets the new team
 * member set their password, then sends them to sign in.
 */

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, CircleAlert } from 'lucide-react';
import { Alert, Button, Input, Skeleton } from '@/design-system/components';
import { adminAuthApi } from '@/api/admin-auth.api';
import { AuthFrame } from '../components/AuthFrame';

export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const info = useQuery({ queryKey: ['invite', token], queryFn: () => adminAuthApi.inviteInfo(token), enabled: !!token, retry: false });
  const accept = useMutation({
    mutationFn: () => adminAuthApi.acceptInvite(token, password),
    onSuccess: () => { toast.success('Password set. Sign in now.'); navigate('/login'); },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e?.response?.data?.message || 'Could not set the password'),
  });
  const tooShort = password.length > 0 && password.length < 10;
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <AuthFrame title="Join Nafaa Admin" subtitle="Set a password for your admin account">
      {!token || info.isError ? (
        <div className="space-y-4">
          <Alert tone="danger" icon={<CircleAlert className="h-5 w-5" />} title="This invite link does not work">
            It may have expired or been replaced. Ask the person who invited you for a new link.
          </Alert>
          <Link to="/login" className="block text-center text-[0.875rem] font-medium text-brand-700 hover:underline">Go to sign in</Link>
        </div>
      ) : info.isLoading ? <Skeleton className="h-48 rounded-2xl" /> : (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!tooShort && !mismatch && password) accept.mutate(); }}>
          <div className="rounded-2xl bg-slate-50 p-3 text-[0.875rem] ring-1 ring-slate-200">
            <div className="font-semibold text-slate-900">{info.data?.fullName}</div>
            <div className="text-slate-500">{info.data?.email}{info.data?.roleName ? ` · ${info.data.roleName}` : ''}</div>
          </div>
          <Input label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={tooShort ? 'Use at least 10 characters.' : undefined} size="lg" autoFocus />
          <Input label="Type it again" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={mismatch ? 'The two passwords are different.' : undefined} size="lg" />
          <Button type="submit" fullWidth size="lg" loading={accept.isPending} disabled={!password || tooShort || mismatch || confirm !== password} rightIcon={<ArrowRight className="h-4 w-4" />}>Set password</Button>
          <p className="text-center text-[0.75rem] text-slate-500">After signing in, turn on two-step sign-in under My security.</p>
        </form>
      )}
    </AuthFrame>
  );
}
