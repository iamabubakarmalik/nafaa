import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Shield, KeyRound, Lock, Award, AlertTriangle, CheckCircle2,
  Smartphone, Trash2, RefreshCw, Clock, Unlock, Sparkles,
  Globe, Eye, EyeOff, ShieldCheck, Activity,
} from 'lucide-react';
import { settingsApi, type SecurityScore } from '@modules/organization/settings/api/settings.api';
import { Field, NumberInput, Toggle, SectionCard } from '../components/UI';
import { Button } from '@core/ui/Button';
import { useAppLock } from '@core/security/useAppLock';
import { AppLockSetupModal } from '@core/security/AppLockGate';

export default function SecuritySection({ s, set }: any) {
  const qc = useQueryClient();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  // ═══ Global App PIN (client-side) ═══
  const appLock = useAppLock();
  const [appLockModal, setAppLockModal] = useState<'setup' | 'change' | 'disable' | null>(null);

  // ═══ Server-side Manager PIN + Security data ═══
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

  const setPinMutation = useMutation({
    mutationFn: (p: string) => settingsApi.setPin(p),
    onSuccess: () => {
      toast.success('Manager PIN save ho gaya ✓');
      setPin('');
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['security-score'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'PIN save fail'),
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
      {appLockModal && (
        <AppLockSetupModal mode={appLockModal} onClose={() => setAppLockModal(null)} />
      )}

      <div className="space-y-5">
        {/* ═══════════════════════════════════════════════════════════
             1. GLOBAL APP PIN — Client-side, works across all pages
        ═══════════════════════════════════════════════════════════ */}
        <div className="rounded-3xl border-2 border-sky-300 bg-gradient-to-br from-sky-50 via-white to-cyan-50 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b-2 border-sky-100 bg-gradient-to-r from-sky-100/60 to-cyan-100/60">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-700 text-white flex items-center justify-center shadow-md shrink-0">
                <Globe className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">🌐 Global App PIN</h3>
                  {appLock.isEnabled ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-extrabold uppercase inline-flex items-center gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Enabled
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold uppercase">
                      Off
                    </span>
                  )}
                  {appLock.isEnabled && (
                    appLock.isUnlocked ? (
                      <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-extrabold uppercase inline-flex items-center gap-1">
                        <Unlock className="h-2.5 w-2.5" /> Unlocked
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-extrabold uppercase inline-flex items-center gap-1">
                        <Lock className="h-2.5 w-2.5" /> Locked
                      </span>
                    )
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-1">
                  Ek hi PIN — <strong className="text-sky-800">sab jagah</strong> kaam karega.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Feature list */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { icon: '💰', label: 'Sales History' },
                { icon: '📔', label: 'Khata Payments' },
                { icon: '📊', label: 'Reports Profit' },
                { icon: '💵', label: 'Cost / Profit' },
                { icon: '🧾', label: 'Purchase Cost' },
                { icon: '❌', label: 'Damage / Void' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl bg-white border-2 border-sky-100 px-3 py-2 flex items-center gap-2"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-xs font-extrabold text-slate-700">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Hide Stats quick toggle */}
            <div className="rounded-xl bg-white border-2 border-slate-200 p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={[
                  'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                  appLock.hideStats ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500',
                ].join(' ')}>
                  {appLock.hideStats ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-extrabold text-slate-900">
                    Hide Amounts Globally
                  </div>
                  <div className="text-[11px] text-slate-500 font-bold">
                    {appLock.hideStats
                      ? 'Sab jagah paisay •••• dikh rahe hain'
                      : 'Amounts visible — click to hide'}
                  </div>
                </div>
              </div>
              <button
                onClick={appLock.toggleHideStats}
                className={[
                  'h-10 px-3 rounded-xl font-extrabold text-xs inline-flex items-center gap-1.5 shrink-0 transition active:scale-95',
                  appLock.hideStats
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700',
                ].join(' ')}
              >
                {appLock.hideStats ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {appLock.hideStats ? 'Show' : 'Hide'}
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              {!appLock.isEnabled ? (
                <button
                  onClick={() => setAppLockModal('setup')}
                  className="h-12 px-5 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-700 hover:from-sky-700 hover:to-cyan-800 active:scale-95 text-white font-extrabold text-sm inline-flex items-center gap-2 shadow-md transition flex-1 sm:flex-none justify-center"
                >
                  <KeyRound className="h-4 w-4" /> PIN Set Karo
                </button>
              ) : (
                <>
                  {appLock.isUnlocked && (
                    <button
                      onClick={appLock.lock}
                      className="h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-extrabold text-xs inline-flex items-center gap-1.5 transition"
                    >
                      <Lock className="h-4 w-4" /> Lock Abhi
                    </button>
                  )}
                  <button
                    onClick={() => setAppLockModal('change')}
                    className="h-11 px-4 rounded-xl bg-sky-100 hover:bg-sky-200 active:scale-95 text-sky-800 font-extrabold text-xs inline-flex items-center gap-1.5 transition"
                  >
                    <KeyRound className="h-4 w-4" /> Change PIN
                  </button>
                  <button
                    onClick={() => setAppLockModal('disable')}
                    className="h-11 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 font-extrabold text-xs inline-flex items-center gap-1.5 transition"
                  >
                    <Unlock className="h-4 w-4" /> Disable
                  </button>
                </>
              )}
            </div>

            {!appLock.isEnabled && (
              <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs font-bold text-amber-900">
                  <strong>Recommended:</strong> PIN set karo taake koi bhi Sales, Khata, ya Cost dekhne se pehle PIN dale.
                  Ye local device pe hashed store hoti hai — server pe kabhi nahi jati.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
             2. SECURITY SCORE — Server-side gamified score
        ═══════════════════════════════════════════════════════════ */}
        {score && (
          <div className={[
            'rounded-3xl border-2 overflow-hidden shadow-sm',
            scoreColor === 'emerald' ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300' :
            scoreColor === 'amber' ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300' :
            'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-300',
          ].join(' ')}>
            <div className="p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className={`h-16 w-16 rounded-3xl flex items-center justify-center shadow-xl text-white bg-gradient-to-br ${scoreGradient}`}>
                  <Award className="h-8 w-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={[
                    'text-xs uppercase tracking-widest font-black',
                    scoreColor === 'emerald' ? 'text-emerald-700' :
                    scoreColor === 'amber' ? 'text-amber-700' :
                    'text-rose-700',
                  ].join(' ')}>
                    Security Score
                  </div>
                  <div className="text-4xl font-black text-slate-900 tabular-nums">
                    {score.score}<span className="text-2xl">%</span>
                  </div>
                  <div className="text-xs text-slate-600 font-bold mt-0.5">Level: {score.level}</div>
                </div>
              </div>
              <div className="h-3 bg-white/70 rounded-full overflow-hidden shadow-inner mb-4">
                <div
                  className={`h-full bg-gradient-to-r ${scoreGradient} transition-all duration-500`}
                  style={{ width: `${score.score}%` }}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {score.checks.map((c) => (
                  <div
                    key={c.key}
                    className={[
                      'flex items-center gap-2 backdrop-blur rounded-xl px-3 py-2',
                      c.done ? 'bg-white/80' : 'bg-white/40',
                    ].join(' ')}
                  >
                    {c.done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                    <span className={[
                      'text-xs font-black flex-1',
                      c.done ? 'text-slate-800' : 'text-slate-500',
                    ].join(' ')}>
                      {c.label}
                    </span>
                    <span className={[
                      'text-[10px] font-black',
                      c.done ? 'text-emerald-700' : 'text-slate-400',
                    ].join(' ')}>
                      +{c.weight}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
             3. SERVER MANAGER PIN — For void/discount/refund actions
        ═══════════════════════════════════════════════════════════ */}
        <SectionCard
          title="Manager PIN (Server-side)"
          desc="Void / Discount / Refund jaise actions ke liye manager PIN"
          icon={KeyRound}
          color="rose"
        >
          {s.hasManagerPin && (
            <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-3 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <span className="text-xs font-black text-emerald-900">
                Manager PIN currently set hai
              </span>
            </div>
          )}

          <Field label={s.hasManagerPin ? 'Change PIN (4-6 digits)' : 'Set Manager PIN (4-6 digits)'}>
            <div className="flex gap-2 flex-wrap">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••"
                maxLength={6}
                inputMode="numeric"
                className="flex-1 min-w-[140px] h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black tracking-[0.5em] outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="px-4 h-11 rounded-xl border-2 border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPin ? 'Hide' : 'Show'}
              </button>
              <Button
                onClick={() => setPinMutation.mutate(pin)}
                disabled={pin.length < 4 || setPinMutation.isPending}
                loading={setPinMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700"
              >
                <Shield className="h-4 w-4" /> Save
              </Button>
            </div>
          </Field>

          <div className="mt-4 space-y-1">
            <Toggle
              checked={s.requirePinForVoid}
              onChange={(v) => set('requirePinForVoid', v)}
              label="Void sales ke liye PIN required"
            />
            <Toggle
              checked={s.requirePinForDiscount}
              onChange={(v) => set('requirePinForDiscount', v)}
              label="Bade discount ke liye PIN required"
            />
            <Toggle
              checked={s.requirePinForRefund}
              onChange={(v) => set('requirePinForRefund', v)}
              label="Refund ke liye PIN required"
            />
          </div>

          <div className="mt-3 rounded-xl bg-slate-50 border-2 border-slate-200 p-3 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
            <div className="text-[11px] font-bold text-slate-600">
              <strong>Farq:</strong> Manager PIN cashier ko void/discount karne se rokta hai (server side check).
              Global App PIN sensitive data (sales, cost, khata) dekhne se pehle chahiye hoti hai.
            </div>
          </div>
        </SectionCard>

        {/* ═══════════════════════════════════════════════════════════
             4. SESSION MANAGEMENT
        ═══════════════════════════════════════════════════════════ */}
        <SectionCard
          title="Session Management"
          desc="Login timeout aur attempts limits"
          icon={Clock}
          color="rose"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Auto Logout (minutes)" hint="Inactivity ke baad logout">
              <NumberInput
                value={s.autoLogoutMinutes}
                onChange={(v: number) => set('autoLogoutMinutes', v)}
                min={5}
                max={480}
              />
            </Field>
            <Field label="Max Login Attempts" hint="Lock account after fail attempts">
              <NumberInput
                value={s.maxLoginAttempts}
                onChange={(v: number) => set('maxLoginAttempts', v)}
                min={3}
                max={10}
              />
            </Field>
          </div>
        </SectionCard>

        {/* ═══════════════════════════════════════════════════════════
             5. TWO-FACTOR AUTHENTICATION
        ═══════════════════════════════════════════════════════════ */}
        <SectionCard
          title="Two-Factor Auth (2FA)"
          desc="Extra security layer for login"
          icon={ShieldCheck}
          color="rose"
        >
          <Toggle
            checked={s.enableTwoFactor}
            onChange={(v) => set('enableTwoFactor', v)}
            label="Enable 2FA on login"
            desc="Har login pe Email OTP required hoga"
          />
        </SectionCard>

        {/* ═══════════════════════════════════════════════════════════
             6. ACTIVE SESSIONS
        ═══════════════════════════════════════════════════════════ */}
        {sessions && sessions.length > 0 && (
          <SectionCard
            title="Active Sessions"
            desc={`${sessions.length} device(s) currently signed in`}
            icon={Smartphone}
            color="rose"
            action={
              <Button size="sm" variant="ghost" onClick={() => refetchSessions()}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            }
          >
            <div className="space-y-2">
              {sessions.map((sess: any) => (
                <div
                  key={sess.id}
                  className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
                >
                  <div className="h-10 w-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-900 text-sm truncate">
                      {sess.deviceName || 'Unknown device'}
                    </div>
                    <div className="text-xs text-slate-500 font-medium truncate">
                      {sess.user?.fullName} · {sess.location || sess.ipAddress || 'Unknown location'}
                    </div>
                    {sess.lastActiveAt && (
                      <div className="text-[10px] text-slate-400 font-bold mt-0.5">
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
                    className="h-9 w-9 rounded-xl bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 text-rose-600 flex items-center justify-center shrink-0 active:scale-95 transition disabled:opacity-50"
                    title="Revoke session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ═══════════════════════════════════════════════════════════
             7. ACTIVITY LOG
        ═══════════════════════════════════════════════════════════ */}
        {activity && activity.length > 0 && (
          <SectionCard
            title="Recent Activity"
            desc="Aakhri 20 actions ka log"
            icon={Activity}
            color="rose"
          >
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {activity.map((a: any) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50/50 transition text-xs"
                >
                  <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Lock className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-800 truncate">{a.action}</div>
                    {a.description && (
                      <div className="text-slate-500 truncate font-medium">{a.description}</div>
                    )}
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
    </>
  );
}
