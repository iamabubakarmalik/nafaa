/**
 * My security: two-step sign-in with an authenticator app (QR setup, backup
 * codes, turn off) and the devices this admin is signed in on.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { Copy, KeyRound, Laptop, Lightbulb, LogOut, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import { Alert, Badge, Button, Card, Input, PageHero, PageShell, confirmDialog, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminAuthApi } from '@/api/admin-auth.api';
import { useAuthStore } from '@/store/auth.store';
import { formatRelative } from '@/lib/format';
import { deviceLabel } from '@/lib/device';

const apiError = (e: unknown) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Something went wrong. Try again.';

function BackupCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const text = codes.join('\n');
  return (
    <div className="space-y-3">
      <Alert tone="warning" title="Save these backup codes now">
        Each code works once if you lose your phone. They will not be shown again.
      </Alert>
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-4 font-mono text-[0.9375rem] tracking-wider text-slate-900 ring-1 ring-slate-200 sm:grid-cols-5">
        {codes.map((c) => <span key={c}>{c}</span>)}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" leftIcon={<Copy className="h-4 w-4" />} onClick={() => navigator.clipboard?.writeText(text).then(() => toast.success('Codes copied'))}>Copy codes</Button>
        <Button onClick={onDone}>I saved them</Button>
      </div>
    </div>
  );
}

function TwoStepCard() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const enabled = !!user?.totpEnabled;
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);

  useEffect(() => {
    if (!setup) { setQr(''); return; }
    QRCode.toDataURL(setup.otpauthUrl, { margin: 1, width: 220 }).then(setQr).catch(() => setQr(''));
  }, [setup]);

  const refreshMe = async () => { const me = await adminAuthApi.me(); setUser(me); qc.setQueryData(['admin', 'me'], me); };
  const start = useMutation({ mutationFn: adminAuthApi.setupTwoFactor, onSuccess: setSetup, onError: (e) => toast.error(apiError(e)) });
  const enable = useMutation({
    mutationFn: () => adminAuthApi.enableTwoFactor(code),
    onSuccess: async (r) => { setCodes(r.backupCodes); setSetup(null); setCode(''); await refreshMe(); toast.success('Two-step sign-in is on'); },
    onError: (e) => toast.error(apiError(e)),
  });
  const disable = useMutation({
    mutationFn: (c: string) => adminAuthApi.disableTwoFactor(c),
    onSuccess: async () => { setCode(''); await refreshMe(); toast.success('Two-step sign-in is off'); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <Card
      title="Two-step sign-in"
      description="After your password, Nafaa asks for a 6-digit code from an authenticator app on your phone."
      actions={enabled ? <Badge variant="success">On</Badge> : <Badge variant="warning">Off</Badge>}
    >
      {codes ? <BackupCodes codes={codes} onDone={() => setCodes(null)} /> : enabled ? (
        <div className="space-y-3">
          <Alert tone="success" title="Your account is protected">Even with your password, nobody can sign in without your phone.</Alert>
          <div className="flex flex-wrap items-end gap-2">
            <Input label="Code to turn it off" placeholder="123456 or a backup code" value={code} onChange={(e) => setCode(e.target.value)} wrapperClassName="w-60" />
            <Button variant="outline" leftIcon={<ShieldOff className="h-4 w-4" />} loading={disable.isPending} disabled={code.trim().length < 6} onClick={async () => {
              if (await confirmDialog({ title: 'Turn off two-step sign-in?', text: 'Your account will be protected by the password alone.', yes: 'Turn off', danger: true })) disable.mutate(code.trim());
            }}>Turn off</Button>
          </div>
        </div>
      ) : setup ? (
        <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="flex h-[220px] w-[220px] items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200">
            {qr ? <img src={qr} alt="QR code for your authenticator app" width={220} height={220} className="rounded-2xl" /> : <Smartphone className="h-8 w-8 text-slate-300" />}
          </div>
          <div className="space-y-3 text-[0.875rem]">
            <ol className="list-decimal space-y-1.5 ps-5 text-slate-700">
              <li>Open Google Authenticator, Microsoft Authenticator or 1Password.</li>
              <li>Scan this QR code. No camera? Enter the key below by hand.</li>
              <li>Type the 6-digit code the app shows.</li>
            </ol>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-lg bg-slate-50 px-2.5 py-2 text-[0.8125rem] tracking-wider ring-1 ring-slate-200">{setup.secret.match(/.{1,4}/g)?.join(' ')}</code>
              <Button size="sm" variant="outline" leftIcon={<Copy className="h-4 w-4" />} onClick={() => navigator.clipboard?.writeText(setup.secret).then(() => toast.success('Key copied'))}>Copy</Button>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Input label="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} wrapperClassName="w-40" autoFocus />
              <Button loading={enable.isPending} disabled={code.length !== 6} onClick={() => enable.mutate()}>Turn on</Button>
              <Button variant="ghost" onClick={() => { setSetup(null); setCode(''); }}>Cancel</Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-[0.875rem] text-slate-600">Strongly recommended for everyone with admin access. Takes one minute.</p>
          <Button leftIcon={<ShieldCheck className="h-4 w-4" />} loading={start.isPending} onClick={() => start.mutate()}>Set up two-step sign-in</Button>
        </div>
      )}
    </Card>
  );
}

function SessionsCard() {
  const sessions = useQuery({ queryKey: ['admin', 'my-sessions'], queryFn: adminAuthApi.sessions });
  const end = useMutation({ mutationFn: adminAuthApi.endSession, onSuccess: () => { toast.success('Signed out on that device'); sessions.refetch(); } });
  return (
    <Card title="Where you’re signed in" description="Sign out of any device you don’t recognise." flush>
      <ul className="divide-y divide-slate-100">
        {(sessions.data ?? []).map((s, i) => (
          <li key={s.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <Laptop className="h-5 w-5 shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1 text-[0.8125rem]">
              <span className="block truncate font-medium text-slate-900">{s.deviceName || deviceLabel(s.userAgent)}{i === 0 && <span className="ms-2 text-[0.75rem] font-normal text-emerald-600">most recent</span>}</span>
              <span className="block text-[0.75rem] text-slate-500">{[s.ipAddress, s.location].filter(Boolean).join(' · ')} · signed in {formatRelative(s.createdAt)} · active {formatRelative(s.lastUsedAt)}</span>
            </span>
            <Button size="xs" variant="outline" leftIcon={<LogOut className="h-3.5 w-3.5" />} loading={end.isPending && end.variables === s.id} onClick={() => end.mutate(s.id)}>Sign out</Button>
          </li>
        ))}
        {sessions.data?.length === 0 && <li className="px-5 py-6 text-[0.8125rem] text-slate-500">No sessions.</li>}
      </ul>
    </Card>
  );
}

export default function SecurityPage() {
  const guide = usePageGuide();
  const user = useAuthStore((s) => s.user);
  const sessions = useQuery({ queryKey: ['admin', 'my-sessions'], queryFn: adminAuthApi.sessions });
  return (
    <PageShell>
      <PageHero
        title="My security"
        chip={user?.email}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={[
          { label: 'Two-step sign-in', value: user?.totpEnabled ? 'On' : 'Off' },
          { label: 'Signed-in devices', value: sessions.data?.length ?? '—' },
          { label: 'Access', value: user?.role === 'SUPER_ADMIN' ? 'Super admin' : user?.adminRole ?? 'Staff', hint: user?.role === 'SUPER_ADMIN' ? 'Everything' : `${user?.adminPermissions?.length ?? 0} permissions` },
        ]}
      />
      <TwoStepCard />
      <SessionsCard />
      {guide.isOpen && (
        <PageGuide
          title="My security"
          description="Protect your admin account. It can change every shop on Nafaa."
          flowTitle="Signing in with two-step"
          flow={[
            { label: 'Email + password', icon: KeyRound, color: '#4f46e5' },
            { label: 'Code from phone', hint: 'Changes every 30s', icon: Smartphone, color: '#059669' },
            { label: 'Admin panel', icon: ShieldCheck, color: '#0284c7' },
          ]}
          steps={[
            { icon: ShieldCheck, color: '#059669', title: 'Turn on two-step', text: 'Scan the QR code with an authenticator app and type the code it shows.' },
            { icon: KeyRound, color: '#4f46e5', title: 'Keep backup codes', text: 'If you lose your phone, a backup code signs you in once. Store them somewhere safe.' },
            { icon: LogOut, color: '#e11d48', title: 'Check devices', text: 'Sign out of any device you do not recognise.' },
          ]}
          tips={['If your phone’s clock is wrong, codes fail. Set the time to automatic.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
