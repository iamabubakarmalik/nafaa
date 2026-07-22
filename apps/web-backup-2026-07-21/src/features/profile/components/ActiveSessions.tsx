import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Smartphone, Monitor, Tablet, MapPin, Clock, Trash2, AlertTriangle,
  CheckCircle2, Shield, RefreshCw, LogOut, Globe, Sparkles, Activity,
  Laptop, Wifi, Calendar, Eye,
} from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';

function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(d);
}

function getDeviceInfo(deviceName: string) {
  const lower = (deviceName || '').toLowerCase();
  if (lower.includes('iphone')) return { Icon: Smartphone, color: 'blue', label: 'iPhone' };
  if (lower.includes('android') || lower.includes('mobile')) return { Icon: Smartphone, color: 'emerald', label: 'Mobile' };
  if (lower.includes('ipad') || lower.includes('tablet')) return { Icon: Tablet, color: 'violet', label: 'Tablet' };
  if (lower.includes('mac') || lower.includes('macbook')) return { Icon: Laptop, color: 'slate', label: 'Mac' };
  if (lower.includes('windows') || lower.includes('laptop')) return { Icon: Laptop, color: 'blue', label: 'Windows' };
  return { Icon: Monitor, color: 'slate', label: 'Desktop' };
}

export function ActiveSessions() {
  const queryClient = useQueryClient();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  const { data: sessionsRaw, isLoading, refetch, isRefetching, isError } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: authApi.listSessions,
    refetchOnWindowFocus: false,
  });

  // ─── BUG FIX: Defensive normalization ───
  const sessions = useMemo(() => {
    if (!sessionsRaw) return [];
    if (Array.isArray(sessionsRaw)) return sessionsRaw;
    if (typeof sessionsRaw === 'object') {
      const r = sessionsRaw as any;
      if (Array.isArray(r.data)) return r.data;
      if (Array.isArray(r.sessions)) return r.sessions;
      if (Array.isArray(r.items)) return r.items;
    }
    return [];
  }, [sessionsRaw]);

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: () => {
      toast.success('Device session revoke ho gaya');
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Revoke fail'),
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => {
      if (!refreshToken) throw new Error('No refresh token');
      return authApi.revokeOtherSessions(refreshToken);
    },
    onSuccess: (data: any) => {
      toast.success(data?.message || 'Other devices revoked');
      setConfirmRevokeAll(false);
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const otherSessionsCount = sessions.length > 1 ? sessions.length - 1 : 0;

  return (
    <div className="space-y-5">
      {/* ═══ HERO ═══ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-blue-700 text-white p-5 shadow-2xl">
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-cyan-400/15 blur-2xl" />

        <div className="relative flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg ring-2 ring-white/20 shrink-0">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider mb-1 border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                Device Manager
              </div>
              <h3 className="font-extrabold text-lg leading-tight">Active Devices</h3>
              <p className="text-[11px] text-white/80 font-semibold mt-0.5">
                {sessions.length} device{sessions.length !== 1 ? 's' : ''} currently signed in
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-bold transition disabled:opacity-50 backdrop-blur border border-white/15"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {otherSessionsCount > 0 && (
              <button
                onClick={() => setConfirmRevokeAll(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 px-3 py-2 text-xs font-extrabold transition shadow-md"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout {otherSessionsCount} Others
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ ERROR STATE ═══ */}
      {isError && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-extrabold text-rose-900">Failed to load devices</div>
            <p className="text-xs text-rose-700 mt-1 font-semibold">
              Please refresh or check your connection
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* ═══ STATS BANNER ═══ */}
      {!isLoading && sessions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-700">Total</div>
                <div className="text-lg font-extrabold text-slate-900 tabular-nums">{sessions.length}</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 p-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-sm">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider font-extrabold text-blue-700">Current</div>
                <div className="text-lg font-extrabold text-slate-900 tabular-nums">1</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 p-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-wider font-extrabold text-amber-700">Others</div>
                <div className="text-lg font-extrabold text-slate-900 tabular-nums">{otherSessionsCount}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ LOADING ═══ */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* ═══ EMPTY STATE ═══ */}
      {!isLoading && !isError && sessions.length === 0 && (
        <div className="rounded-3xl bg-gradient-to-br from-slate-50 to-white border-2 border-dashed border-slate-200 p-12 text-center">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 mx-auto flex items-center justify-center shadow-inner">
            <Shield className="h-10 w-10 text-slate-400" />
          </div>
          <p className="mt-4 font-extrabold text-slate-900 text-lg">No active sessions</p>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Aap ke account mein koi active session nahi
          </p>
        </div>
      )}

      {/* ═══ SESSIONS LIST ═══ */}
      {!isLoading && sessions.length > 0 && (
        <div className="space-y-2.5">
          {sessions.map((session: any, idx: number) => {
            const info = getDeviceInfo(session.deviceName);
            const Icon = info.Icon;
            const isCurrent = idx === 0;

            const iconColors: any = {
              blue: 'bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-500/30',
              emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-500/30',
              violet: 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/30',
              slate: 'bg-gradient-to-br from-slate-500 to-slate-700 shadow-slate-500/30',
            };

            return (
              <div
                key={session.id || idx}
                className={`group rounded-2xl border-2 p-4 transition-all ${
                  isCurrent
                    ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-green-50 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-100'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg text-white ${
                      isCurrent ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-emerald-500/30' : iconColors[info.color]
                    }`}
                  >
                    <Icon className="h-7 w-7" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-extrabold text-slate-900 truncate">
                        {session.deviceName || 'Unknown Device'}
                      </div>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-extrabold shadow-sm">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          THIS DEVICE
                        </span>
                      )}
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[9px] font-extrabold uppercase tracking-wider">
                        {info.label}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5 text-xs">
                      <div className="inline-flex items-center gap-1 text-slate-700">
                        <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                        <span className="font-bold truncate">{session.location || 'Unknown'}</span>
                      </div>

                      {session.ipAddress && (
                        <div className="inline-flex items-center gap-1 text-slate-700">
                          <Globe className="h-3 w-3 text-blue-500 shrink-0" />
                          <span className="font-mono font-bold text-[10px]">{session.ipAddress}</span>
                        </div>
                      )}

                      <div className="inline-flex items-center gap-1 text-slate-700">
                        <Clock className="h-3 w-3 text-violet-500 shrink-0" />
                        <span className="font-bold">{formatRelativeTime(session.lastActive)}</span>
                      </div>
                    </div>

                    {session.createdAt && (
                      <div className="mt-1.5 text-[10px] text-slate-500 font-semibold inline-flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        Logged in: {new Intl.DateTimeFormat('en-PK', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(session.createdAt))}
                      </div>
                    )}
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => {
                        if (confirm(`Logout from "${session.deviceName}"?`)) {
                          revokeMutation.mutate(session.id);
                        }
                      }}
                      disabled={revokeMutation.isPending}
                      className="h-10 w-10 rounded-xl bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 text-rose-600 flex items-center justify-center shrink-0 transition disabled:opacity-50 group-hover:shadow-md"
                      title="Logout this device"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ SECURITY TIP ═══ */}
      {!isLoading && sessions.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-md">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="flex-1 text-xs text-blue-900 leading-relaxed font-semibold">
            <strong className="block mb-1 text-sm">🛡️ Security Tip</strong>
            Agar koi <strong>unknown device</strong> dikhe to foran <strong>"Revoke"</strong> karein.
            Saath hi apna password change karein. New device pe login karne par aap ko email alert milta hai.
          </div>
        </div>
      )}

      {/* ═══ REVOKE ALL MODAL ═══ */}
      {confirmRevokeAll && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="relative overflow-hidden bg-gradient-to-br from-rose-600 to-rose-800 p-6 text-white">
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-rose-400/30 blur-2xl" />
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-3 ring-2 ring-white/30">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-extrabold">Logout All Other Devices?</h3>
                <p className="text-rose-100 text-sm mt-2 font-semibold">
                  <strong>{otherSessionsCount}</strong> doosre device{otherSessionsCount !== 1 ? 's' : ''} se foran logout ho jayega
                </p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4">
                <p className="text-xs text-amber-900 leading-relaxed font-semibold">
                  ⚠️ Sirf <strong>current device</strong> (jis se aap abhi browse kar rahe hain) active rahe ga.
                  Baaqi sab devices ko dobara login karna padega.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setConfirmRevokeAll(false)}
                  disabled={revokeAllMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white shadow-lg shadow-rose-500/30"
                  loading={revokeAllMutation.isPending}
                  onClick={() => revokeAllMutation.mutate()}
                >
                  <LogOut className="h-4 w-4" />
                  Yes, Logout All
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
