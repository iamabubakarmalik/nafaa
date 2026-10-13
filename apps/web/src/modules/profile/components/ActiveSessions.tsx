/**
 * Devices tab: every signed-in device with "this device" marked, sign out
 * one or all others, and the recent login attempts (failed ones and new
 * devices stand out).
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Laptop, LogOut, MapPin, Monitor, ShieldAlert, Smartphone, Tablet, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, EmptyState, Modal, Skeleton } from '@/design-system/components';
import { useAuthStore } from '@core/stores/auth.store';
import { authApi, type ActiveSession } from '@modules/auth/api/auth.api';
import { ago, day, errorText } from './meta';

function deviceIcon(name: string) {
  const n = (name || '').toLowerCase();
  if (n.includes('ipad') || n.includes('tablet')) return Tablet;
  if (n.includes('iphone') || n.includes('android') || n.includes('mobile')) return Smartphone;
  if (n.includes('mac') || n.includes('windows') || n.includes('linux')) return Laptop;
  return Monitor;
}

/** The sessions endpoint has answered both as a bare list and wrapped. */
function asList(raw: unknown): ActiveSession[] {
  if (Array.isArray(raw)) return raw;
  const r = raw as { data?: unknown; sessions?: unknown } | null;
  if (Array.isArray(r?.data)) return r!.data as ActiveSession[];
  if (Array.isArray(r?.sessions)) return r!.sessions as ActiveSession[];
  return [];
}

export function ActiveSessions() {
  const qc = useQueryClient();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const [confirmAll, setConfirmAll] = useState(false);

  const sessions = useQuery({ queryKey: ['active-sessions'], queryFn: authApi.listSessions, refetchOnWindowFocus: false });
  const mine = useQuery({ queryKey: ['active-sessions', 'current'], queryFn: () => authApi.currentSession(refreshToken!), enabled: !!refreshToken, staleTime: 5 * 60_000 });
  const history = useQuery({ queryKey: ['login-history'], queryFn: authApi.loginHistory });

  const list = asList(sessions.data);
  const currentId = mine.data?.id ?? null;
  const ordered = [...list].sort((a, b) => Number(b.id === currentId) - Number(a.id === currentId));
  const others = list.filter((s) => s.id !== currentId).length;
  const failed = (history.data ?? []).filter((h) => !h.success).length;

  const revoke = useMutation({
    mutationFn: (id: string) => authApi.revokeSession(id),
    onSuccess: () => { toast.success('Us device se logout ho gaya'); qc.invalidateQueries({ queryKey: ['active-sessions'] }); },
    onError: (e) => toast.error(errorText(e, 'Logout nahi hua')),
  });
  const revokeOthers = useMutation({
    mutationFn: () => authApi.revokeOtherSessions(useAuthStore.getState().refreshToken ?? ''),
    onSuccess: () => { toast.success('Baqi sab devices se logout ho gaya'); setConfirmAll(false); qc.invalidateQueries({ queryKey: ['active-sessions'] }); },
    onError: (e) => toast.error(errorText(e, 'Logout nahi hua')),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      {confirmAll && (
        <Modal open onClose={() => setConfirmAll(false)} size="sm" title="Baqi devices se logout?"
          description={`${others} device se login khatam ho jayega. Is device par aap login rahenge.`}
          footer={<>
            <Button variant="secondary" onClick={() => setConfirmAll(false)}>Wapas</Button>
            <Button variant="danger" loading={revokeOthers.isPending} onClick={() => revokeOthers.mutate()}>Haan, logout karein</Button>
          </>}>
          <p className="text-[0.8125rem] text-slate-600">Agar koi phone gum ho gaya ho ya kisi aur ne login kiya ho to ye karein, phir password bhi badal lein.</p>
        </Modal>
      )}

      <Card className="rounded-3xl" flush title="Login wale devices" description={sessions.isLoading ? 'Dekh rahe hain…' : `${list.length} device par login hai`}
        actions={others > 0 ? <Button size="sm" variant="critical" onClick={() => setConfirmAll(true)}><LogOut className="h-4 w-4" /> Baqi sab se logout</Button> : undefined}>
        {sessions.isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : sessions.isError ? (
          <EmptyState title="Devices load nahi hue" action={<Button variant="secondary" onClick={() => sessions.refetch()}>Dobara koshish</Button>} />
        ) : !list.length ? (
          <EmptyState title="Koi device nahi mila" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {ordered.map((s) => {
              const Icon = deviceIcon(s.deviceName);
              const isMe = s.id === currentId;
              return (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isMe ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}><Icon className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[0.875rem] font-semibold text-slate-900">{s.deviceName}{isMe && <Badge variant="success" size="xs" dot>Ye device</Badge>}</p>
                    <p className="flex flex-wrap items-center gap-x-2 text-[0.75rem] text-slate-500">
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{s.location || 'Pata nahi'}</span>
                      <span>Aakhri dafa: {ago(s.lastActive)}</span>
                      <span>Login: {day(s.createdAt)}</span>
                    </p>
                  </div>
                  {!isMe && (
                    <Button size="sm" variant="ghost" loading={revoke.isPending && revoke.variables === s.id} onClick={() => revoke.mutate(s.id)} aria-label={`${s.deviceName} se logout`}>
                      <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Logout</span>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="rounded-3xl" flush title="Login ki koshishein" description={failed ? `${failed} nakaam koshish` : 'Pichle 30 login'}>
        {history.isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
        ) : !(history.data ?? []).length ? (
          <EmptyState title="Abhi koi record nahi" />
        ) : (
          <>
            {failed >= 3 && (
              <p className="mx-4 mb-2 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-200 sm:mx-5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Kai nakaam koshishein — agar ye aap nahi thay to password badal lein.
              </p>
            )}
            <ul className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto">
              {(history.data ?? []).map((h) => (
                <li key={h.id} className="flex items-start gap-2.5 px-4 py-2.5 sm:px-5">
                  {h.success ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />}
                  <div className="min-w-0 flex-1 text-[0.8125rem]">
                    <p className="flex flex-wrap items-center gap-1.5 font-medium text-slate-800">
                      {h.deviceName || 'Device'}
                      {h.isNewDevice && <Badge variant="info" size="xs"><ShieldAlert className="h-3 w-3" />Naya device</Badge>}
                    </p>
                    <p className="text-[0.75rem] text-slate-500">{ago(h.createdAt)}{h.location ? ` · ${h.location}` : ''}{!h.success && h.failureReason ? ` · ${h.failureReason}` : ''}</p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
