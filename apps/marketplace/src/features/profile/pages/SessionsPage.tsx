import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, Monitor, Smartphone, Tablet, LogOut, ShieldCheck,
  MapPin, Clock,
} from 'lucide-react';
import { authApi } from '@/features/auth/api/auth.api';
import { Card, Badge, Button, EmptyState } from '@/ui';
import { timeAgo } from '@/lib/format';
import { toast } from 'sonner';

const DEVICE_ICONS: Record<string, any> = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
};

export default function SessionsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['auth-sessions'],
    queryFn: authApi.sessions,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => authApi.revokeSession(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth-sessions'] });
      toast.success('Session revoked');
    },
  });

  return (
    <>
      <Helmet><title>Active Sessions — Nafaa Bazaar</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-5">
        <button
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </button>

        <div>
          <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-brand-600" />
            Active Sessions
          </h1>
          <p className="text-sm text-content-muted mt-0.5">
            Devices currently signed into your account
          </p>
        </div>

        <Card className="p-3 bg-info/10 border-info/30 flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 text-info shrink-0 mt-0.5" />
          <div className="text-xs text-content">
            Don't recognize a device? Revoke it immediately and change your password.
          </div>
        </Card>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-2xl" />
            ))}
          </div>
        ) : !sessions?.length ? (
          <EmptyState icon={ShieldCheck} title="No active sessions" />
        ) : (
          <div className="space-y-3">
            {sessions.map((s: any) => {
              const Icon = DEVICE_ICONS[s.deviceType] || Monitor;
              return (
                <Card key={s.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      s.isCurrent ? 'bg-gradient-brand' : 'bg-surface-muted'
                    }`}>
                      <Icon className={`h-5 w-5 ${s.isCurrent ? 'text-white' : 'text-content-muted'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm">{s.deviceName || 'Unknown device'}</span>
                        {s.isCurrent && <Badge variant="brand" size="sm">This device</Badge>}
                      </div>
                      <div className="text-2xs text-content-muted mt-1 space-y-0.5">
                        {s.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {s.location}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last active {timeAgo(s.lastActiveAt)}
                        </div>
                      </div>
                    </div>
                    {!s.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeMutation.mutate(s.id)}
                        loading={revokeMutation.isPending}
                        leftIcon={<LogOut className="h-3.5 w-3.5" />}
                        className="text-danger hover:bg-danger/10"
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
