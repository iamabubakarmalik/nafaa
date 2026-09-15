import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  KeyRound, Lock, Unlock, ShieldCheck, AlertTriangle, CheckCircle2,
  Globe, Clock, Loader2, Search, X, Eye, EyeOff, Smartphone, Save,
} from 'lucide-react';
import { SectionCard, Alert, Field } from '../components/UI';
import { Button } from '@core/ui/Button';
import { usePrivacyStore } from '@core/stores/privacy.store';
import { securityApi } from '@core/security/security.api';
import { PinSetupModal, PinPromptModal } from '@core/security/HiddenValue';

/* ═════════════════════════════════════════════════════════════
   SETTINGS → SECURITY — malik ka PIN aur page lock
   ─────────────────────────────────────────────────────────────
   Pehle yahan DO alag PIN ke box thay: ek "Global App PIN"
   (browser ke andar) aur ek "Manager PIN" (server par). Dukaan-daar
   ke liye ye samajhna hi mushkil tha ke kaun sa kahan chalta hai,
   aur pehla wala doosre mobile par kaam hi nahi karta tha.

   Ab ek hi box hai — ek hi PIN. Sath me ye ke kaun kaun se safhe
   is PIN ke baghair na khulein.
   ═════════════════════════════════════════════════════════════ */

/** Jo safhe lock kiye ja sakte hain — jahan paisa ya raaz hota hai */
const LOCKABLE: Array<{ group: string; items: Array<{ path: string; label: string; hint: string }> }> = [
  {
    group: 'Paisa',
    items: [
      { path: '/khata', label: 'Khata / Udhaar', hint: 'Kis ka kitna baqi hai' },
      { path: '/expenses', label: 'Kharch', hint: 'Dukaan ka har kharcha' },
      { path: '/cash-register', label: 'Golak', hint: 'Din ka cash' },
      { path: '/suppliers', label: 'Suppliers', hint: 'Hum ne kis ko kitna dena hai' },
    ],
  },
  {
    group: 'Hisab aur report',
    items: [
      { path: '/reports', label: 'Reports', hint: 'Sab report — andar ke safhe bhi' },
      { path: '/dashboard', label: 'Dashboard', hint: 'Din bhar ka khulasa' },
      { path: '/analytics', label: 'Analytics', hint: 'Munafe ka tafseeli hisab' },
    ],
  },
  {
    group: 'Maal',
    items: [
      { path: '/products', label: 'Products', hint: 'Lagat aur rate' },
      { path: '/purchases', label: 'Kharidari', hint: 'Kis se kitne ka maal aaya' },
      { path: '/inventory', label: 'Stock', hint: 'Kitna maal para hai' },
    ],
  },
  {
    group: 'Intezam',
    items: [
      { path: '/settings', label: 'Settings', hint: 'Dukaan ki saari settings' },
      { path: '/staff', label: 'Staff', hint: 'Mulazim aur tankhwah' },
      { path: '/sales', label: 'Bikri ka record', hint: 'Purane bill' },
    ],
  },
];

const fmtWhen = (v?: string | null) =>
  v ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v)) : '—';

/* ═══════════════════ PIN CARD ═══════════════════ */
export function OwnerPinCard() {
  const store = usePrivacyStore();
  const [setupOpen, setSetupOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [savingMins, setSavingMins] = useState(false);
  const [mins, setMins] = useState(store.unlockMinutes || 15);

  const { data: status, refetch } = useQuery({
    queryKey: ['pin-status'],
    queryFn: securityApi.status,
  });

  useEffect(() => {
    if (status) {
      store.applyStatus(status);
      setMins(status.unlockMinutes || 15);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const hasPin = store.hasPin;
  const unlocked = store.isUnlocked();

  const saveMins = async () => {
    setSavingMins(true);
    try {
      await securityApi.updatePrefs({ unlockMinutes: mins });
      await refetch();
      toast.success(`Ab PIN ${mins} minute tak khula rahega`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save nahi hua');
    } finally {
      setSavingMins(false);
    }
  };

  return (
    <>
      {setupOpen && <PinSetupModal onClose={() => { setSetupOpen(false); refetch(); }} />}
      {promptOpen && (
        <PinPromptModal onClose={() => setPromptOpen(false)} onSuccess={() => setPromptOpen(false)}
          title="PIN daal kar kholein" subtitle="Muqarrar der tak sab kuch khula rahega" />
      )}

      <SectionCard
        title="🔐 Malik ka PIN"
        desc="Ek hi PIN — cost chhupane, khata aur lock safhon ke liye"
        icon={KeyRound}
        color="sky"
        badge={
          hasPin ? (
            unlocked ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-black">
                Abhi khula hai
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black">
                Lock hai
              </span>
            )
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-black">
              Set nahi
            </span>
          )
        }
      >
        {/* Har device wali baat — yehi asal tabdeeli hai */}
        <Alert tone="emerald" icon={Smartphone} title="Har device par wohi PIN">
          Ye PIN aap ke <strong>account ke sath</strong> mehfooz hai, is mobile ya computer ke sath nahi.
          Aap dukaan ke laptop, ghar ke computer ya kisi bhi phone se login karein — wohi PIN chalega.
          Aur agar aap kisi bhroosay walay ko bata dein, to wo bhi apne phone se dekh sakta hai.
        </Alert>

        {hasPin ? (
          <>
            <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3.5 flex items-center gap-3 flex-wrap">
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 text-white ${
                unlocked ? 'bg-emerald-600' : 'bg-slate-900'
              }`}>
                {unlocked ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {unlocked ? 'Is device par abhi khula hai' : 'Is device par lock hai'}
                </div>
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  PIN {fmtWhen(status?.pinUpdatedAt)} ko set/badla gaya
                </div>
              </div>
              {unlocked ? (
                <Button variant="secondary" onClick={() => { store.lock(); toast.success('Lock ho gaya'); }} className="font-extrabold shrink-0">
                  <Lock className="h-4 w-4" /> Abhi Lock Karein
                </Button>
              ) : (
                <Button onClick={() => setPromptOpen(true)} className="font-extrabold shrink-0">
                  <Unlock className="h-4 w-4" /> Kholein
                </Button>
              )}
            </div>

            <Field label="PIN kitni der khula rahe" hint="minute — is ke baad khud band">
              <div className="flex gap-2 flex-wrap items-center">
                {[5, 15, 30, 60, 120].map((m) => (
                  <button key={m} type="button" onClick={() => setMins(m)}
                    className={`h-10 px-3.5 rounded-xl text-xs font-extrabold border-2 transition ${
                      mins === m
                        ? 'bg-sky-600 border-sky-600 text-white'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-400'
                    }`}>
                    {m < 60 ? `${m} min` : `${m / 60} ghanta`}
                  </button>
                ))}
                {mins !== (status?.unlockMinutes ?? 15) && (
                  <Button onClick={saveMins} disabled={savingMins} className="font-extrabold">
                    {savingMins ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
                  </Button>
                )}
              </div>
            </Field>

            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" onClick={() => setSetupOpen(true)} className="font-extrabold">
                <KeyRound className="h-4 w-4" /> PIN Badlein / Hatayein
              </Button>
            </div>
          </>
        ) : (
          <>
            <Alert tone="amber" icon={AlertTriangle} title="PIN set karna behtar hai">
              PIN ke baghair kharid ka bhao aur munafa har us bande ko dikhega jo app khol le.
              PIN lagate hi cost chhup jayegi — aur jo safhe aap chunenge wo bhi band ho jayenge.
            </Alert>
            <Button onClick={() => setSetupOpen(true)}
              className="bg-gradient-to-r from-sky-600 to-cyan-700 hover:from-sky-700 hover:to-cyan-800 text-white font-extrabold shadow-lg shadow-sky-500/30">
              <KeyRound className="h-4 w-4" /> PIN Set Karein
            </Button>
          </>
        )}
      </SectionCard>
    </>
  );
}

/* ═══════════════════ PAGE LOCKS ═══════════════════ */
export function PageLocksCard() {
  const store = usePrivacyStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [custom, setCustom] = useState('');
  const [saving, setSaving] = useState(false);
  const [picked, setPicked] = useState<string[]>(store.lockedRoutes);
  const [dirty, setDirty] = useState(false);

  const { data: status, refetch } = useQuery({
    queryKey: ['pin-status'],
    queryFn: securityApi.status,
  });

  useEffect(() => {
    if (status && !dirty) setPicked(status.lockedRoutes ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const toggle = (path: string) => {
    setPicked((p) => (p.includes(path) ? p.filter((x) => x !== path) : [...p, path]));
    setDirty(true);
  };

  const addCustom = () => {
    let v = custom.trim();
    if (!v) return;
    if (!v.startsWith('/')) v = `/${v}`;
    if (picked.includes(v)) return toast.error('Ye safha pehle se list me hai');
    setPicked((p) => [...p, v]);
    setCustom('');
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await securityApi.setLockedRoutes(picked);
      usePrivacyStore.setState({ lockedRoutes: res.lockedRoutes });
      setDirty(false);
      await refetch();
      qc.invalidateQueries({ queryKey: ['security-score'] });
      toast.success(res.lockedRoutes.length
        ? `${res.lockedRoutes.length} safhe lock ho gaye`
        : 'Sab page lock hata diye');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save nahi hua');
    } finally {
      setSaving(false);
    }
  };

  /** Jo raaste list me nahi magar malik ne khud likhe */
  const known = useMemo(() => new Set(LOCKABLE.flatMap((g) => g.items.map((i) => i.path))), []);
  const extra = picked.filter((p) => !known.has(p));

  const groups = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return LOCKABLE;
    return LOCKABLE
      .map((g) => ({
        ...g,
        items: g.items.filter((i) =>
          i.label.toLowerCase().includes(q) || i.path.includes(q) || i.hint.toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length > 0);
  }, [search]);

  return (
    <SectionCard
      title="🔒 Kaun Se Safhe Lock Ho"
      desc="Jo safha aap chunenge wo PIN ke baghair nahi khulega"
      icon={Globe}
      color="violet"
      badge={
        picked.length > 0 ? (
          <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[10px] font-black tabular-nums">
            {picked.length} lock
          </span>
        ) : undefined
      }
    >
      {!store.hasPin ? (
        <Alert tone="amber" icon={AlertTriangle} title="Pehle PIN set karein">
          Bina PIN ke safha lock karne ka matlab hai khud ko bahar band kar lena — koi khol hi nahi sakega.
          Upar wale box se pehle PIN set karein.
        </Alert>
      ) : (
        <>
          <Alert tone="violet" icon={ShieldCheck} title="Kaise kaam karta hai">
            Lock safha kholte hi PIN maanga jata hai. Ek dafa PIN daalne par{' '}
            <strong>{store.unlockMinutes} minute</strong> tak saray lock safhe khule rehte hain.
            Bara safha lock karne par uske andar ke safhe bhi lock ho jate hain —
            jaise <span className="font-mono">/reports</span> lock karne se{' '}
            <span className="font-mono">/reports/profit</span> bhi.
          </Alert>

          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Safha dhoondein…"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white pl-9 pr-9 text-sm font-bold outline-none focus:border-violet-500 transition" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                <X className="h-3.5 w-3.5 text-slate-500" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.group}>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
                  {g.group}
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {g.items.map((i) => {
                    const on = picked.includes(i.path);
                    return (
                      <button key={i.path} onClick={() => toggle(i.path)}
                        className={`rounded-2xl border-2 p-3 text-left transition flex items-start gap-2.5 ${
                          on
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 ring-2 ring-violet-200 dark:ring-violet-500/20'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-violet-400'
                        }`}>
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                          on ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}>
                          {on ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{i.label}</div>
                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">{i.hint}</div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">{i.path}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Apni marzi ka raasta */}
          <Field label="Koi aur safha" hint="apni industry ka safha, jaise /appliances/reports">
            <div className="flex gap-2">
              <input value={custom} onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                placeholder="/appliances/profit-report"
                className="flex-1 h-11 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 text-sm font-mono font-bold outline-none focus:border-violet-500 transition" />
              <Button variant="secondary" onClick={addCustom} className="font-extrabold shrink-0">
                Add
              </Button>
            </div>
          </Field>

          {extra.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {extra.map((p) => (
                <button key={p} onClick={() => toggle(p)}
                  className="px-2.5 py-1.5 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[11px] font-mono font-extrabold inline-flex items-center gap-1.5 transition">
                  {p} <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

          {dirty && (
            <div className="flex gap-2 items-center flex-wrap">
              <Button onClick={save} disabled={saving}
                className="bg-gradient-to-r from-violet-600 to-purple-700 text-white font-extrabold shadow-lg">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {picked.length} Safhe Lock Karein
              </Button>
              <Button variant="secondary"
                onClick={() => { setPicked(status?.lockedRoutes ?? []); setDirty(false); }}
                className="font-extrabold">
                Cancel
              </Button>
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}
