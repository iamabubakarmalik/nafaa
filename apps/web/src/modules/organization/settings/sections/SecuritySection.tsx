import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Shield, KeyRound, Lock, Award, AlertTriangle, CheckCircle2,
  Smartphone, Trash2, RefreshCw, Clock, Unlock, Sparkles,
  Globe, Eye, EyeOff, ShieldCheck, Activity, LogOut,
} from 'lucide-react';
import { settingsApi, type SecurityScore } from '@modules/organization/settings/api/settings.api';
import { Field, NumberInput, Toggle, SectionCard, Alert, Divider } from '../components/UI';
import { Button } from '@core/ui/Button';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';
import { OwnerPinCard, PageLocksCard } from './_OwnerPin';
import { AccountPasswordCard } from './_AccountPassword';

export function SecuritySection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);
  const qc = useQueryClient();

  const { data: score } = useQuery<SecurityScore>({
    queryKey: ['security-score'],
    queryFn: settingsApi.securityScore,
  });
  const { data: sessions, refetch: refetchSessions } = useQuery({
    queryKey: ['tenant-sessions'],
    queryFn: settingsApi.listSessions,
  });
  const { data: activity } = useQuery({
    queryKey: ['activity-log'],
    queryFn: () => settingsApi.activityLog({ limit: 20 }),
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (id: string) => settingsApi.revokeSession(id),
    onSuccess: () => {
      toast.success('Session revoke ho gaya');
      refetchSessions();
    },
  });

  const scoreColor = (score?.score ?? 0) >= 80 ? 'emerald' : (score?.score ?? 0) >= 50 ? 'amber' : 'rose';
  const scoreGradient =
    scoreColor === 'emerald' ? 'from-emerald-500 to-emerald-700' :
    scoreColor === 'amber' ? 'from-amber-500 to-orange-600' :
    'from-rose-500 to-rose-700';

  return (
    <>
      <div className="space-y-4">
        <SaveStatusBar saving={saving} dirty={dirty} />

        {/* Security score */}
        {score && (
          <div className={[
            'relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 shadow-sm p-5',
            scoreColor === 'emerald' ? 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border-emerald-300 dark:border-emerald-500/40' :
            scoreColor === 'amber' ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-amber-300 dark:border-amber-500/40' :
            'bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/10 border-rose-300 dark:border-rose-500/40',
          ].join(' ')}>
            <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-white/30 dark:bg-white/5 blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-4 mb-4">
                <div className={`h-16 w-16 rounded-3xl bg-gradient-to-br ${scoreGradient} text-white flex items-center justify-center shadow-xl ring-4 ring-white/50 dark:ring-white/10`}>
                  <Award className="h-8 w-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={[
                    'text-[10px] uppercase tracking-widest font-extrabold',
                    scoreColor === 'emerald' ? 'text-emerald-700 dark:text-emerald-300' :
                    scoreColor === 'amber' ? 'text-amber-700 dark:text-amber-300' :
                    'text-rose-700 dark:text-rose-300',
                  ].join(' ')}>
                    Security Score
                  </div>
                  <div className="text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums leading-none mt-0.5">
                    {score.score}<span className="text-2xl text-slate-500 dark:text-slate-400">%</span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-extrabold mt-1">
                    Level: <span className="uppercase tracking-wider">{score.level}</span>
                  </div>
                </div>
              </div>

              <div className="h-3 bg-white/70 dark:bg-slate-800/60 rounded-full overflow-hidden shadow-inner mb-4">
                <div
                  className={`h-full bg-gradient-to-r ${scoreGradient} transition-all duration-700`}
                  style={{ width: `${score.score}%` }}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                {score.checks.map((c) => (
                  <div
                    key={c.key}
                    className={[
                      'flex items-center gap-2 rounded-xl px-3 py-2 backdrop-blur',
                      c.done ? 'bg-white/80 dark:bg-slate-800/60' : 'bg-white/40 dark:bg-slate-800/30',
                    ].join(' ')}
                  >
                    {c.done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                    <span className={[
                      'text-xs font-extrabold flex-1',
                      c.done ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400',
                    ].join(' ')}>
                      {c.label}
                    </span>
                    <span className={[
                      'text-[10px] font-extrabold',
                      c.done ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500',
                    ].join(' ')}>
                      +{c.weight}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ MALIK KA PIN — ek hi PIN, har device par ═══ */}
        <OwnerPinCard />

        {/* ═══ Safhe lock — malik jo chahe band kar de ═══ */}
        <PageLocksCard />

        {/* ═══ Account ka password ═══ */}
        <AccountPasswordCard />

        {/* Session settings */}
        <SectionCard title="Session Management" desc="Auto logout aur login attempts" icon={Clock} color="amber">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Auto Logout" hint="Inactivity ke baad user logout ho jaye">
              <NumberInput
                value={draft.autoLogoutMinutes}
                onChange={(v) => set('autoLogoutMinutes', v)}
                min={5}
                max={480}
                suffix="min"
              />
            </Field>
            <Field label="Max Login Attempts" hint="Ghalat password ke baad account lock ho">
              <NumberInput
                value={draft.maxLoginAttempts}
                onChange={(v) => set('maxLoginAttempts', v)}
                min={3}
                max={10}
                suffix="tries"
              />
            </Field>
          </div>
        </SectionCard>

        {/* 2FA */}
        <SectionCard title="Two-Factor Authentication" desc="Login pe extra security" icon={ShieldCheck} color="emerald">
          <Toggle
            checked={draft.enableTwoFactor}
            onChange={(v) => set('enableTwoFactor', v)}
            label="Enable 2FA on Login"
            desc="Har login pe Email OTP verification hoga"
            icon={ShieldCheck}
          />
        </SectionCard>

        {/* Active sessions */}
        {sessions && sessions.length > 0 && (
          <SectionCard
            title="Active Sessions"
            desc={`${sessions.length} device(s) currently signed in`}
            icon={Smartphone}
            color="blue"
            action={
              <button
                onClick={() => refetchSessions()}
                className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </button>
            }
          >
            <div className="space-y-2">
              {sessions.map((sess: any) => (
                <div
                  key={sess.id}
                  className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">
                      {sess.deviceName || 'Unknown device'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold truncate">
                      {sess.user?.fullName || 'User'} · {sess.location || sess.ipAddress || 'Unknown location'}
                    </div>
                    {sess.lastActiveAt && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                        Last active: {new Date(sess.lastActiveAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      confirm('Ye session revoke karein? User ko dobara login karna hoga.') &&
                      revokeSessionMutation.mutate(sess.id)
                    }
                    disabled={revokeSessionMutation.isPending}
                    className="h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 border-2 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 active:scale-95 transition disabled:opacity-50"
                    title="Revoke session"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Activity log */}
        {activity && activity.length > 0 && (
          <SectionCard title="Recent Activity" desc="Aakhri 20 actions" icon={Activity} color="violet">
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {activity.map((a: any) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition text-xs"
                >
                  <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Lock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-800 dark:text-slate-100 truncate">{a.action}</div>
                    {a.description && (
                      <div className="text-slate-500 dark:text-slate-400 truncate font-semibold">{a.description}</div>
                    )}
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-bold">
                      {a.user?.fullName || 'System'} · {new Date(a.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </>
  );
}
