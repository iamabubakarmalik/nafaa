import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Shield, KeyRound, Lock, Award, AlertTriangle, CheckCircle2,
  Smartphone, Trash2, RefreshCw, Clock,
} from 'lucide-react';
import { settingsApi, type SecurityScore } from '@modules/organization/settings/api/settings.api';
import { Field, NumberInput, Toggle, SectionCard } from '../components/UI';
import { Button } from '@core/ui/Button';

export default function SecuritySection({ s, set }: any) {
  const qc = useQueryClient();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  const { data: score } = useQuery<SecurityScore>({ queryKey: ['security-score'], queryFn: settingsApi.securityScore });
  const { data: sessions, refetch: refetchSessions } = useQuery({ queryKey: ['tenant-sessions'], queryFn: settingsApi.listSessions });
  const { data: activity } = useQuery({ queryKey: ['activity-log'], queryFn: () => settingsApi.activityLog({ limit: 20 }) });

  const setPinMutation = useMutation({
    mutationFn: (p: string) => settingsApi.setPin(p),
    onSuccess: () => { toast.success('PIN save ho gaya'); setPin(''); qc.invalidateQueries({ queryKey: ['settings'] }); qc.invalidateQueries({ queryKey: ['security-score'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'PIN save fail'),
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (id: string) => settingsApi.revokeSession(id),
    onSuccess: () => { toast.success('Session revoke ho gaya'); refetchSessions(); },
  });

  const scoreColor = (score?.score ?? 0) >= 80 ? 'emerald' : (score?.score ?? 0) >= 50 ? 'amber' : 'rose';
  const scoreGradient = scoreColor === 'emerald' ? 'from-emerald-500 to-emerald-700' : scoreColor === 'amber' ? 'from-amber-500 to-orange-600' : 'from-rose-500 to-rose-700';

  return (
    <div className="space-y-5">
      {/* Security Score */}
      {score && (
        <div className={`rounded-3xl border-2 overflow-hidden ${scoreColor === 'emerald' ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300' : scoreColor === 'amber' ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300' : 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-300'}`}>
          <div className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className={`h-16 w-16 rounded-3xl flex items-center justify-center shadow-xl text-white bg-gradient-to-br ${scoreGradient}`}>
                <Award className="h-8 w-8" />
              </div>
              <div>
                <div className={`text-xs uppercase tracking-widest font-black ${scoreColor === 'emerald' ? 'text-emerald-700' : scoreColor === 'amber' ? 'text-amber-700' : 'text-rose-700'}`}>Security Score</div>
                <div className="text-4xl font-black text-slate-900 tabular-nums">{score.score}<span className="text-2xl">%</span></div>
                <div className="text-xs text-slate-600 font-bold mt-0.5">Level: {score.level}</div>
              </div>
            </div>
            <div className="h-3 bg-white/70 rounded-full overflow-hidden shadow-inner mb-4">
              <div className={`h-full bg-gradient-to-r ${scoreGradient} transition-all duration-500`} style={{ width: `${score.score}%` }} />
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {score.checks.map((c) => (
                <div key={c.key} className={`flex items-center gap-2 backdrop-blur rounded-xl px-3 py-2 ${c.done ? 'bg-white/80' : 'bg-white/40'}`}>
                  {c.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                  <span className={`text-xs font-black flex-1 ${c.done ? 'text-slate-800' : 'text-slate-500'}`}>{c.label}</span>
                  <span className={`text-[10px] font-black ${c.done ? 'text-emerald-700' : 'text-slate-400'}`}>+{c.weight}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manager PIN */}
      <SectionCard title="Manager PIN" desc="Sensitive actions ke liye PIN protection" icon={KeyRound} color="rose">
        {s.hasManagerPin && (
          <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-3 mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            <span className="text-xs font-black text-emerald-900">Manager PIN currently set hai</span>
          </div>
        )}
        <Field label={s.hasManagerPin ? 'Change PIN (4-6 digits)' : 'Set Manager PIN (4-6 digits)'}>
          <div className="flex gap-2">
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••"
              maxLength={6}
              className="flex-1 h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black tracking-[0.5em] outline-none focus:border-rose-500"
            />
            <button type="button" onClick={() => setShowPin(!showPin)} className="px-4 rounded-xl border-2 border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50">{showPin ? 'Hide' : 'Show'}</button>
            <Button onClick={() => setPinMutation.mutate(pin)} disabled={pin.length < 4 || setPinMutation.isPending} className="bg-rose-600 hover:bg-rose-700">
              Save
            </Button>
          </div>
        </Field>
        <div className="mt-4">
          <Toggle checked={s.requirePinForVoid} onChange={(v) => set('requirePinForVoid', v)} label="Require PIN for voiding sales" />
          <Toggle checked={s.requirePinForDiscount} onChange={(v) => set('requirePinForDiscount', v)} label="Require PIN for large discounts" />
          <Toggle checked={s.requirePinForRefund} onChange={(v) => set('requirePinForRefund', v)} label="Require PIN for refunds" />
        </div>
      </SectionCard>

      {/* Sessions */}
      <SectionCard title="Session Management" desc="Login timeout aur active sessions" icon={Clock} color="rose">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Auto Logout (minutes)" hint="Inactivity ke baad logout">
            <NumberInput value={s.autoLogoutMinutes} onChange={(v: number) => set('autoLogoutMinutes', v)} min={5} max={480} />
          </Field>
          <Field label="Max Login Attempts"><NumberInput value={s.maxLoginAttempts} onChange={(v: number) => set('maxLoginAttempts', v)} min={3} max={10} /></Field>
        </div>
      </SectionCard>

      {/* 2FA */}
      <SectionCard title="Two-Factor Auth (2FA)" desc="Extra security layer" icon={Shield} color="rose">
        <Toggle checked={s.enableTwoFactor} onChange={(v) => set('enableTwoFactor', v)} label="Enable 2FA on login" desc="Email OTP required for every login" />
      </SectionCard>

      {/* Active Sessions */}
      {sessions && sessions.length > 0 && (
        <SectionCard title="Active Sessions" desc={`${sessions.length} device(s) currently signed in`} icon={Smartphone} color="rose" action={
          <Button size="sm" variant="ghost" onClick={() => refetchSessions()}><RefreshCw className="h-3.5 w-3.5" /></Button>
        }>
          <div className="space-y-2">
            {sessions.map((sess: any) => (
              <div key={sess.id} className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-100 bg-slate-50/50">
                <div className="h-10 w-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-slate-900 text-sm truncate">{sess.deviceName || 'Unknown device'}</div>
                  <div className="text-xs text-slate-500 font-medium">
                    {sess.user?.fullName} · {sess.location || sess.ipAddress || 'Unknown location'}
                  </div>
                </div>
                <button
                  onClick={() => confirm('Revoke this session?') && revokeSessionMutation.mutate(sess.id)}
                  className="h-9 w-9 rounded-xl bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 text-rose-600 flex items-center justify-center"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Activity Log */}
      {activity && activity.length > 0 && (
        <SectionCard title="Recent Activity" desc="Aakhri 20 actions" icon={Lock} color="rose">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activity.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 text-xs">
                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-slate-800">{a.action}</div>
                  <div className="text-slate-500 truncate font-medium">{a.description}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    {a.user?.fullName || 'System'} · {new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
