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
import { t } from '@core/i18n';

/** Pages that can be locked — where money or private figures are. */
const LOCKABLE: Array<{ group: string; items: Array<{ path: string; label: string; hint: string }> }> = [
  {
    group: t('Paisa'),
    items: [
      { path: '/khata', label: t('Khata / Udhaar'), hint: t('Kis ka kitna baqi hai') },
      { path: '/expenses', label: t('Expenses'), hint: t('Store ka har Expense') },
      { path: '/cash-register', label: t('Cash register'), hint: t('Din ka cash') },
      { path: '/suppliers', label: t('Suppliers'), hint: t('Kis ko kitna dena hai') },
    ],
  },
  {
    group: t('Hisaab aur reports'),
    items: [
      { path: '/reports', label: t('Reports'), hint: t('Sab reports — andar ke pages bhi') },
      { path: '/dashboard', label: t('Dashboard'), hint: t('Din bhar ka khulasa') },
      { path: '/analytics', label: t('Analytics'), hint: t('Profit ka tafseeli hisaab') },
    ],
  },
  {
    group: t('Maal'),
    items: [
      { path: '/products', label: t('Products'), hint: t('Cost aur rate') },
      { path: '/purchases', label: t('Purchase'), hint: t('Kis se kitne ka maal aaya') },
      { path: '/inventory', label: t('Stock'), hint: t('Kitna maal para hai') },
    ],
  },
  {
    group: t('Intezam'),
    items: [
      { path: '/settings', label: t('Settings'), hint: t('Store ki saari settings') },
      { path: '/staff', label: t('Staff'), hint: t('Staff aur tankhwah') },
      { path: '/sales', label: t('Sales history'), hint: t('Purane bill') },
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
      toast.success(t('Ab PIN {{mins}} minute tak khula rahega', { mins }));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('Save nahi hua'));
    } finally {
      setSavingMins(false);
    }
  };

  return (
    <>
      {setupOpen && <PinSetupModal onClose={() => { setSetupOpen(false); refetch(); }} />}
      {promptOpen && (
        <PinPromptModal onClose={() => setPromptOpen(false)} onSuccess={() => setPromptOpen(false)}
          title={t('PIN daal kar kholein')} subtitle={t('Muqarrar der tak sab kuch khula rahega')} />
      )}

      <SectionCard title={t('Malik ka PIN')} desc={t('Ek hi PIN — cost chhupane, khata aur locked pages ke liye')} icon={KeyRound} color="sky"
        badge={hasPin
          ? <Badge size="xs" variant={unlocked ? 'success' : 'default'}>{unlocked ? t('Abhi khula hai') : t('Lock hai')}</Badge>
          : <Badge size="xs" variant="warning">{t('Nahi laga')}</Badge>}>
        {hasPin ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
              <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white', unlocked ? 'bg-success-600' : 'bg-slate-700')}>
                {unlocked ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{unlocked ? t('Is device par abhi khula hai') : t('Is device par lock hai')}</p>
                <p className="text-xs text-slate-500">{t('PIN {{pinUpdatedAt}} ko laga ya badla', { pinUpdatedAt: fmtWhen(status?.pinUpdatedAt) })}</p>
              </div>
              {unlocked ? (
                <Button size="sm" variant="secondary" onClick={() => { store.lock(); toast.success(t('Lock ho gaya')); }} leftIcon={<Lock className="h-4 w-4" />}>{t('Abhi lock karein')}</Button>
              ) : (
                <Button size="sm" onClick={() => setPromptOpen(true)} leftIcon={<Unlock className="h-4 w-4" />}>{t('Kholein')}</Button>
              )}
            </div>

            <Field label={t('PIN kitni der khula rahe')} hint={t('Ek dafa PIN daalne ke baad itne minute tak dobara nahi maanga jata.')}>
              <div className="flex flex-wrap items-center gap-2">
                {UNLOCK_MINUTES.map((m) => (
                  <button key={m} type="button" onClick={() => setMins(m)} aria-pressed={mins === m}
                    className={cn('h-9 rounded-lg px-3.5 text-xs font-semibold ring-1 ring-inset transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
                      mins === m ? 'bg-brand-600 text-brand-fg ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:ring-slate-300')}>
                    {m < 60 ? t('{{m}} min', { m }) : t('{{value}} ghanta', { value: m / 60 })}
                  </button>
                ))}
                {mins !== (status?.unlockMinutes ?? 15) && (
                  <Button size="sm" loading={savingMins} onClick={saveMins}>{t('Save')}</Button>
                )}
              </div>
            </Field>

            <Button variant="secondary" onClick={() => setSetupOpen(true)} leftIcon={<KeyRound className="h-4 w-4" />}>{t('PIN badlein ya hatayein')}</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Alert className="mt-3" tone="warning" title={t('PIN lagana behtar hai')} icon={<AlertTriangle className="h-4 w-4" />}>
              {t('PIN ke bagair maal ki Cost aur Profit har us bande ko dikhta hai jo app khol le. PIN lagate hi Cost chhup jati hai — aur jo pages aap chunein woh bhi band ho jate hain.')}
            </Alert>
            <Button onClick={() => setSetupOpen(true)} leftIcon={<KeyRound className="h-4 w-4" />}>{t('PIN lagayein')}</Button>
          </div>
        )}

        <Alert className="mt-3" tone="success" title={t('Har device par wohi PIN')} icon={<Smartphone className="h-4 w-4" />}>
          {t('PIN aap ke')}{' '} <strong>{t('account ke saath')}</strong> {' '}{t('mehfooz hai, kisi ek phone ya computer ke saath nahi. Store ka laptop ho ya ghar ka phone — wohi PIN chalta hai.')}
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
    if (picked.includes(v)) { toast.error(t('Yeh page pehle se list me hai')); return; }
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
      toast.success(res.lockedRoutes.length ? t('{{count}} pages lock ho gaye', { count: res.lockedRoutes.length }) : t('Sab pages ka lock hat gaya'));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('Save nahi hua'));
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
    <SectionCard title={t('Locked pages')} desc={t('Jo page aap chunein woh PIN ke bagair nahi khulega')} icon={Lock} color="violet"
      badge={picked.length > 0 ? <Badge size="xs" variant="info">{t('{{count}} lock', { count: picked.length })}</Badge> : undefined}
      action={dirty ? (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => { setPicked(status?.lockedRoutes ?? []); setDirty(false); }}>{t('Cancel')}</Button>
          <Button size="sm" loading={saving} onClick={save} leftIcon={<CheckCircle2 className="h-4 w-4" />}>{t('Save ({{count}})', { count: picked.length })}</Button>
        </div>
      ) : undefined}>
      {!store.hasPin ? (
        <Alert className="mt-3" tone="warning" title={t('Pehle PIN lagayein')} icon={<AlertTriangle className="h-4 w-4" />}>
          {t('Bina PIN ke page lock karne ka matlab hai khud ko bahar band kar lena — koi khol hi nahi sakega. Upar se pehle PIN lagayein.')}
        </Alert>
      ) : (
        <div className="space-y-4">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
            <span>
              {t('Locked page kholte hi PIN maanga jata hai. Ek dafa PIN daalne par')}{' '} <strong>{t('{{unlockMinutes}} minute', { unlockMinutes: store.unlockMinutes })}</strong> {' '}{t('tak saare locked pages khule rehte hain. Bara page lock karne se us ke andar ke pages bhi lock hote hain — jaise')}{' '} <span className="font-mono">/reports</span> {' '}{t('se')}{' '} <span className="font-mono">/reports/staff</span> {' '}{t('bhi.')}
            </span>
          </p>

          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('Page search karein…')} aria-label={t('Page search karein')}
            leftIcon={<Search className="h-4 w-4" />}
            rightIcon={search ? (
              <IconButton label={t('Search saaf karein')} size="sm" onClick={() => setSearch('')} className="-me-2 h-7 w-7">
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
                      className={cn('flex items-start gap-2.5 rounded-lg border p-3 text-start shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
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

          <Field label={t('Koi aur page')} hint={t('Apni industry ka page, jaise /appliances/reports — Enter dabayein ya Add')}>
            <div className="flex gap-2">
              <Input value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
                placeholder="/appliances/profit-report" aria-label={t('Page ka raasta')} className="font-mono" wrapperClassName="min-w-0 flex-1" />
              <Button variant="secondary" onClick={addCustom} leftIcon={<Plus className="h-4 w-4" />}>{t('Add')}</Button>
            </div>
          </Field>

          {extra.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {extra.map((p) => (
                <button key={p} type="button" onClick={() => toggle(p)} aria-label={t('{{p}} ka lock hatayein', { p })}
                  className="inline-flex items-center gap-1.5 rounded-md bg-brand-50 px-2.5 py-1.5 font-mono text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200 transition hover:bg-brand-100">
                  {p} <X className="h-3 w-3" />
                </button>
              ))}
            </div>
          )}

          {dirty && (
            <Alert tone="warning" action={<Button size="sm" loading={saving} onClick={save}>{t('{{count}} pages lock karein', { count: picked.length })}</Button>}>
              {t('Tabdeeli abhi save nahi hui.')}
            </Alert>
          )}
        </div>
      )}
    </SectionCard>
  );
}
