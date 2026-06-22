import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Smartphone, Monitor, Tablet, MapPin, Clock, Trash2, AlertTriangle,
  CheckCircle2, Shield, RefreshCw, LogOut, Globe,
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
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  if (diffDay < 7) return `${diffDay} din pehle`;
  return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(d);
}

function getDeviceIcon(deviceName: string) {
  const lower = deviceName.toLowerCase();
  if (lower.includes('iphone') || lower.includes('android') || lower.includes('mobile')) {
    return Smartphone;
  }
  if (lower.includes('ipad') || lower.includes('tablet')) {
    return Tablet;
  }
  return Monitor;
}

export function ActiveSessions() {
  const queryClient = useQueryClient();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: authApi.listSessions,
    refetchOnWindowFocus: false,
  });

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: () => {
      toast.success('Device session revoke ho gaya');
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Revoke fail'),
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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-600" />
            Active Devices
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Aap ke account mein kahan kahan se login hai — ye sab devices manage karein
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {otherSessionsCount > 0 && (
            <Button
              size="sm"
              onClick={() => setConfirmRevokeAll(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout All Others ({otherSessionsCount})
            </Button>
          )}
        </div>
      </div>

      {/* Stats banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-blue-50 border-2 border-emerald-200 p-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-emerald-900">
              {sessions.length} active device{sessions.length !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-emerald-700 mt-0.5">
              Agar koi unknown device dikhe to foran revoke karein
            </div>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sessions.length === 0 && (
        <div className="rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 p-8 text-center">
          <Shield className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700">No active sessions</p>
          <p className="text-xs text-slate-500 mt-1">
            Aap ke account mein koi active session nahi
          </p>
        </div>
      )}

      {/* Sessions list */}
      <div className="space-y-2">
        {sessions.map((session, idx) => {
          const Icon = getDeviceIcon(session.deviceName);
          // First/most recent session is likely current device
          const isCurrent = idx === 0;

          return (
            <div
              key={session.id}
              className={`rounded-2xl border-2 p-4 transition ${
                isCurrent
                  ? 'border-emerald-300 bg-emerald-50/40 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Device icon */}
                <div
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>

                {/* Device details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-extrabold text-slate-900 truncate">
                      {session.deviceName || 'Unknown Device'}
                    </div>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-extrabold">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        CURRENT
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {/* Location */}
                    <div className="flex items-center gap-1 text-slate-600">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate font-semibold">
                        {session.location || 'Unknown'}
                      </span>
                    </div>

                    {/* IP */}
                    {session.ipAddress && (
                      <div className="flex items-center gap-1 text-slate-600">
                        <Globe className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate font-mono text-[10px]">
                          {session.ipAddress}
                        </span>
                      </div>
                    )}

                    {/* Last active */}
                    <div className="flex items-center gap-1 text-slate-600">
                      <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate font-semibold">
                        {formatRelativeTime(session.lastActive)}
                      </span>
                    </div>
                  </div>

                  {/* Created date */}
                  <div className="mt-1 text-[10px] text-slate-400 font-semibold">
                    Logged in: {new Intl.DateTimeFormat('en-PK', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(session.createdAt))}
                  </div>
                </div>

                {/* Revoke button — not for current session */}
                {!isCurrent && (
                  <button
                    onClick={() => {
                      if (confirm(`Is device se logout karein? "${session.deviceName}"`)) {
                        revokeMutation.mutate(session.id);
                      }
                    }}
                    disabled={revokeMutation.isPending}
                    className="h-9 w-9 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 transition disabled:opacity-50"
                    title="Revoke this device"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Help info */}
      <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-blue-700 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <strong className="block mb-1">Security Tip:</strong>
          Agar koi unknown device dikhe to foran "Revoke" karein. Saath hi apna password change karein.
          New device pe login karne par aap ko email alert milta hai.
        </div>
      </div>

      {/* Revoke all confirmation modal */}
      {confirmRevokeAll && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-rose-500 to-rose-700 p-6 text-white">
              <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-extrabold">Logout All Other Devices?</h3>
              <p className="text-rose-100 text-sm mt-2">
                {otherSessionsCount} doosre devices se foran logout ho jayega
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                <p className="text-xs text-amber-900 leading-relaxed">
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
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
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
