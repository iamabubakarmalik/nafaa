/**
 * The owner's PIN and the pages locked behind it.
 *
 * There is one PIN, kept with the account (not the device): it hides cost,
 * opens the credit book and unlocks locked pages on any phone or computer.
 * The second card picks which pages ask for it.
 */

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, KeyRound, Lock, Plus, Search, ShieldCheck, Smartphone, Unlock, X } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { Alert, Badge, Button, IconButton, Input } from '@/design-system/components';
import { usePrivacyStore } from '@core/stores/privacy.store';
import { securityApi } from '@core/security/security.api';
import { PinSetupModal, PinPromptModal } from '@core/security/HiddenValue';
import { Field, SectionCard } from '../components/SettingsBlocks';

/** Pages that can be locked — where money or private figures are. */
const LOCKABLE: Array<{ group: string; items: Array<{ path: string; label: string; hint: string }> }> = [
  {
    group: 'Paisa',
    items: [
      { path: '/khata', label: 'Khata / Udhaar', hint: 'Kis ka kitna baqi hai' },
      { path: '/expenses', label: 'Expenses', hint: 'Store ka har Expense' },
      { path: '/cash-register', label: 'Cash register', hint: 'Din ka cash' },
      { path: '/suppliers', label: 'Suppliers', hint: 'Kis ko kitna dena hai' },
    ],
  },
  {
    group: 'Hisaab aur reports',
    items: [
      { path: '/reports', label: 'Reports', hint: 'Sab reports — andar ke pages bhi' },
      { path: '/dashboard', label: 'Dashboard', hint: 'Din bhar ka khulasa' },
      { path: '/analytics', label: 'Analytics', hint: 'Profit ka tafseeli hisaab' },
    ],
  },
  {
    group: 'Maal',
    items: [
      { path: '/products', label: 'Products', hint: 'Cost aur rate' },
      { path: '/purchases', label: 'Purchase', hint: 'Kis se kitne ka maal aaya' },
      { path: '/inventory', label: 'Stock', hint: 'Kitna maal para hai' },
    ],
  },
  {
    group: 'Intezam',
    items: [
      { path: '/settings', label: 'Settings', hint: 'Store ki saari settings' },
      { path: '/staff', label: 'Staff', hint: 'Staff aur tankhwah' },
      { path: '/sales', label: 'Sales history', hint: 'Purane bill' },
    ],
  },
];

const UNLOCK_MINUTES = [5, 15, 30, 60, 120];

const fmtWhen = (v?: string | null) =>
  v ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v)) : '—';

/* ═══ PIN ═══ */
export function OwnerPinCard() {
  const store = usePrivacyStore();
  const [setupOpen, setSetupOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [savingMins, setSavingMins] = useState(false);
  const [mins, setMins] = useState(store.unlockMinutes || 15);

  const { data: status, refetch } = useQuery({ queryKey: ['pin-status'], queryFn: securityApi.status });

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

      <SectionCard title="Malik ka PIN" desc="Ek hi PIN — cost chhupane, khata aur locked pages ke liye" icon={KeyRound} color="sky"
        badge={hasPin
          ? <Badge size="xs" variant={unlocked ? 'success' : 'default'}>{unlocked ? 'Abhi khula hai' : 'Lock hai'}</Badge>
          : <Badge size="xs" variant="warning">Nahi laga</Badge>}>
        {hasPin ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
              <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white', unlocked ? 'bg-success-600' : 'bg-slate-700')}>
                {unlocked ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{unlocked ? 'Is device par abhi khula hai' : 'Is device par lock hai'}</p>
                <p className="text-xs text-slate-500">PIN {fmtWhen(status?.pinUpdatedAt)} ko laga ya badla</p>
              </div>
              {unlocked ? (
                <Button size="sm" variant="secondary" onClick={() => { store.lock(); toast.success('Lock ho gaya'); }} leftIcon={<Lock className="h-4 w-4" />}>Abhi lock karein</Button>
              ) : (
                <Button size="sm" onClick={() => setPromptOpen(true)} leftIcon={<Unlock className="h-4 w-4" />}>Kholein</Button>
              )}
            </div>

            <Field label="PIN kitni der khula rahe" hint="Ek dafa PIN daalne ke baad itne minute tak dobara nahi maanga jata.">
              <div className="flex flex-wrap items-center gap-2">
                {UNLOCK_MINUTES.map((m) => (
                  <button key={m} type="button" onClick={() => setMins(m)} aria-pressed={mins === m}
                    className={cn('h-9 rounded-lg px-3.5 text-xs font-semibold ring-1 ring-inset transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
                      mins === m ? 'bg-brand-600 text-brand-fg ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300')}>
                    {m < 60 ? `${m} min` : `${m / 60} ghanta`}
                  </button>
                ))}
                {mins !== (status?.unlockMinutes ?? 15) && (
                  <Button size="sm" loading={savingMins} onClick={saveMins}>Save</Button>
                )}
              </div>
            </Field>

            <Button variant="secondary" onClick={() => setSetupOpen(true)} leftIcon={<KeyRound className="h-4 w-4" />}>PIN badlein ya hatayein</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Alert className="mt-3" tone="warning" title="PIN lagana behtar hai" icon={<AlertTriangle className="h-4 w-4" />}>
              PIN ke bagair maal ki Cost aur Profit har us bande ko dikhta hai jo app khol le. PIN lagate hi Cost chhup jati hai — aur jo pages aap chunein woh bhi band ho jate hain.
            </Alert>
            <Button onClick={() => setSetupOpen(true)} leftIcon={<KeyRound className="h-4 w-4" />}>PIN lagayein</Button>
          </div>
        )}

        <Alert className="mt-3" tone="success" title="Har device par wohi PIN" icon={<Smartphone className="h-4 w-4" />}>
          PIN aap ke <strong>account ke saath</strong> mehfooz hai, kisi ek phone ya computer ke saath nahi. Store ka laptop ho ya ghar ka phone — wohi PIN chalta hai.
        </Alert>
      </SectionCard>
    </>
  );
}

/* ═══ LOCKED PAGES ═══ */
export function PageLocksCard() {
  const store = usePrivacyStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [custom, setCustom] = useState('');
  const [saving, setSaving] = useState(false);
  const [picked, setPicked] = useState<string[]>(store.lockedRoutes);
  const [dirty, setDirty] = useState(false);

  const { data: status, refetch } = useQuery({ queryKey: ['pin-status'], queryFn: securityApi.status });

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
    if (picked.includes(v)) { toast.error('Yeh page pehle se list me hai'); return; }
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
      toast.success(res.lockedRoutes.length ? `${res.lockedRoutes.length} pages lock ho gaye` : 'Sab pages ka lock hat gaya');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Save nahi hua');
    } finally {
      setSaving(false);
    }
  };

  /** Paths the owner typed that are not in the list above. */
  const known = useMemo(() => new Set(LOCKABLE.flatMap((g) => g.items.map((i) => i.path))), []);
  const extra = picked.filter((p) => !known.has(p));

  const groups = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return LOCKABLE;
    return LOCKABLE
      .map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q) || i.path.includes(q) || i.hint.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [search]);

  return (
    <SectionCard title="Locked pages" desc="Jo page aap chunein woh PIN ke bagair nahi khulega" icon={Lock} color="violet"
      badge={picked.length > 0 ? <Badge size="xs" variant="info">{`${picked.length} lock`}</Badge> : undefined}
      action={dirty ? (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => { setPicked(status?.lockedRoutes ?? []); setDirty(false); }}>Cancel</Button>
          <Button size="sm" loading={saving} onClick={save} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Save ({picked.length})</Button>
        </div>
      ) : undefined}>
      {!store.hasPin ? (
        <Alert className="mt-3" tone="warning" title="Pehle PIN lagayein" icon={<AlertTriangle className="h-4 w-4" />}>
          Bina PIN ke page lock karne ka matlab hai khud ko bahar band kar lena — koi khol hi nahi sakega. Upar se pehle PIN lagayein.
        </Alert>
      ) : (
        <div className="space-y-4">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
            <span>
              Locked page kholte hi PIN maanga jata hai. Ek dafa PIN daalne par <strong>{store.unlockMinutes} minute</strong> tak saare locked pages khule rehte hain.
              Bara page lock karne se us ke andar ke pages bhi lock hote hain — jaise <span className="font-mono">/reports</span> se <span className="font-mono">/reports/staff</span> bhi.
            </span>
          </p>

          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Page search karein…" aria-label="Page search karein"
            leftIcon={<Search className="h-4 w-4" />}
            rightIcon={search ? (
              <IconButton label="Search saaf karein" size="sm" onClick={() => setSearch('')} className="-mr-2 h-7 w-7">
                <X className="h-3.5 w-3.5" />
              </IconButton>
            ) : undefined} />

          {groups.map((g) => (
            <div key={g.group}>
              <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500">{g.group}</p>
              <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                {g.items.map((i) => {
                  const on = picked.includes(i.path);
                  return (
                    <button key={i.path} type="button" onClick={() => toggle(i.path)} aria-pressed={on}
                      className={cn('flex items-start gap-2.5 rounded-lg border p-3 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
                        on ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')}>
                      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', on ? 'bg-brand-600 text-brand-fg' : 'bg-slate-100 text-slate-500')}>
                        {on ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900">{i.label}</span>
                        <span className="block truncate text-xs text-slate-500">{i.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <Field label="Koi aur page" hint="Apni industry ka page, jaise /appliances/reports — Enter dabayein ya Add">
            <div className="flex gap-2">
              <Input value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
                placeholder="/appliances/profit-report" aria-label="Page ka raasta" className="font-mono" wrapperClassName="min-w-0 flex-1" />
              <Button variant="secondary" onClick={addCustom} leftIcon={<Plus className="h-4 w-4" />}>Add</Button>
            </div>
          </Field>

          {extra.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {extra.map((p) => (
                <button key={p} type="button" onClick={() => toggle(p)} aria-label={`${p} ka lock hatayein`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2.5 py-1.5 font-mono text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200 transition hover:bg-brand-100">
                  {p} <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

          {dirty && (
            <Alert tone="warning" action={<Button size="sm" loading={saving} onClick={save}>{picked.length} pages lock karein</Button>}>
              Tabdeeli abhi save nahi hui.
            </Alert>
          )}
        </div>
      )}
    </SectionCard>
  );
}
