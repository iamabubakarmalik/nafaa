/**
 * Tax settings, one authority at a time: which branches and POS IDs report to
 * it, keys (never shown back, only "saved"), rates, sandbox test and on/off.
 * A branch can report to one authority only.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, ExternalLink, KeyRound, Plus, Power, Save, Send, Store, Trash2 } from 'lucide-react';
import { Badge, Button, Input, Segmented, Select, Skeleton, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { TAX_KEY, taxApi, type Authority, type Env, type ProfileView, type TaxSettings, type TerminalInput } from '../api';
import { AUTH, AUTHORITY_ORDER, apiError, fullTime } from '../meta';

const STEPS: Record<Authority, string[]> = {
  PRA: [
    'reg.pra.punjab.gov.pk par jayein: Registration → POS Client Registration (business, branch aur server IP).',
    'POS Details tab se POS ID aur Token milega. Neeche likhein aur pehle Sandbox me test bill bhejein.',
    'Live se pehle eims@pra.punjab.gov.pk ko email karein ke server IP whitelist kar dein (IP Nafaa support se lein).',
  ],
  SRB: [
    'pos.srb.gos.pk/PoSRegistration par SNTN se sign-up karein aur email verify karein.',
    'Portal → Branch Setup → Manage POS → "Add Now" se har counter ka POS ID banayein.',
    'POS user aur password neeche likhein. Pehle "Test", phir "Live".',
  ],
  KPRA: [
    'posregistration.kpra.gov.pk par NTN se POS registration karein.',
    'KPRA se POS ID aur Key milegi, neeche likhein.',
    'KPRA ka test server nahi. Chalu karne ke baad pehla bill Invoices me zaroor dekhein.',
  ],
  FBR: [
    'Sirf FBR Tier-1 retailer (bara store, chain) ke liye. Restaurant aur services PRA, SRB ya KPRA chunein.',
    'e.fbr.gov.pk par POS registration karke POS ID aur security token lein.',
    'Pehle Sandbox me test bill, phir Live.',
  ],
};

interface TermDraft extends TerminalInput { hasSecret?: boolean }

export function SettingsView() {
  const q = useQuery({ queryKey: [TAX_KEY, 'settings'], queryFn: taxApi.settings });
  const [picked, setPicked] = useState<Authority | null>(null);
  const data = q.data;
  if (q.isLoading) return <div className="space-y-3"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}</div><Skeleton className="h-96 rounded-3xl" /></div>;
  if (q.isError || !data) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <p className="font-semibold text-slate-900">Settings nahi khulin</p>
        <p className="mt-1 text-sm text-slate-500">{apiError(q.error, '')}</p>
        <Button className="mt-3" variant="secondary" onClick={() => q.refetch()}>Dobara koshish</Button>
      </div>
    );
  }
  const selected: Authority = picked ?? data.profiles.find((p) => p.enabled)?.authority ?? data.profiles[0]?.authority ?? (data.legacyFbr ? 'FBR' : 'PRA');

  return (
    <div className="space-y-4">
      {data.migrationPending && (
        <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">Server par tax ka database update abhi baqi hai. Settings save ho jayengi, bill update ke baad jayenge.</p>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {AUTHORITY_ORDER.map((a) => {
          const p = data.profiles.find((x) => x.authority === a);
          const act = data.activity[a];
          return (
            <button key={a} type="button" onClick={() => setPicked(a)} aria-pressed={selected === a}
              className={cn('flex flex-col rounded-3xl bg-white p-4 text-left shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md', selected === a ? 'ring-2 ring-brand-500' : 'ring-slate-200/80')}>
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold text-slate-900"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: AUTH[a].color }} />{AUTH[a].label}</span>
                {!p ? <Badge>Set nahi</Badge> : !p.enabled ? <Badge>Band</Badge> : p.env === 'live' ? <Badge variant="success" dot>Live</Badge> : <Badge variant="warning" dot>Test</Badge>}
              </span>
              <span className="mt-1 text-[0.75rem] text-slate-500">{AUTH[a].who}</span>
              {p && (
                <span className="mt-2 text-[0.75rem] text-slate-600">
                  {p.terminals.length} POS ID · {branchText(p, data)}
                  {act?.lastSentAt ? ` · aakhri bill ${fullTime(act.lastSentAt)}` : ''}
                  {act?.failed ? <span className="font-semibold text-rose-700"> · {act.failed} fail</span> : null}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <Editor key={selected} authority={selected} data={data} />
    </div>
  );
}

function branchText(p: ProfileView, data: TaxSettings) {
  if (p.terminals.some((t) => !t.shopId)) return 'sab branches';
  return p.terminals.map((t) => data.shops.find((s) => s.id === t.shopId)?.name ?? 'branch').join(', ');
}

function Editor({ authority, data }: { authority: Authority; data: TaxSettings }) {
  const qc = useQueryClient();
  const canEdit = usePermission(PERMISSIONS.SETTINGS_EDIT);
  const p = data.profiles.find((x) => x.authority === authority) ?? null;
  const info = data.authorities[authority];
  const legacy = !data.profiles.length && authority === 'FBR' ? data.legacyFbr : null;
  const isPct = authority === 'PRA' || authority === 'FBR';

  const [env, setEnv] = useState<Env>(p?.env ?? 'sandbox');
  const [businessName, setBusinessName] = useState(p?.businessName ?? legacy?.businessName ?? '');
  const [pctCode, setPct] = useState(p?.pctCode ?? '');
  const [cashRate, setCash] = useState(String(p?.cashRate ?? data.defaults[authority].cash));
  const [cardRate, setCard] = useState(String(p?.cardRate ?? data.defaults[authority].card));
  const [onlyPos, setOnlyPos] = useState(p?.onlyPos ?? true);
  const [terms, setTerms] = useState<TermDraft[]>(p?.terminals.length
    ? p.terminals.map((t) => ({ shopId: t.shopId, posId: t.posId, ntn: t.ntn, user: t.user, hasSecret: t.hasSecret }))
    : [{ shopId: null, posId: legacy?.posId ?? '', ntn: legacy?.ntn ?? '' }]);

  // Branches already sending to another enabled authority
  const taken = new Map<string, Authority>();
  let fallbackElsewhere: Authority | null = null;
  for (const o of data.profiles) {
    if (o.authority === authority || !o.enabled) continue;
    for (const t of o.terminals) {
      if (t.shopId) taken.set(t.shopId, o.authority);
      else fallbackElsewhere = o.authority;
    }
  }

  const done = (r: TaxSettings, msg: string) => {
    qc.setQueryData([TAX_KEY, 'settings'], r);
    qc.invalidateQueries({ queryKey: [TAX_KEY] });
    qc.invalidateQueries({ queryKey: ['tax-authority-pos'] });
    toast.success(msg);
  };
  const save = useMutation({
    mutationFn: (enabled?: boolean) => taxApi.save({
      authority, env, businessName, pctCode, onlyPos, cashRate: Number(cashRate), cardRate: Number(cardRate),
      terminals: terms.map(({ hasSecret: _h, ...t }) => t),
      ...(enabled !== undefined && { enabled }),
    }),
    onSuccess: (r, enabled) => done(r, enabled === true ? `${authority} chalu: naye bill ab authority ko jayenge` : enabled === false ? `${authority} band kar diya` : 'Save ho gaya'),
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  const test = useMutation({
    mutationFn: (shopId: string | null) => taxApi.test({ authority, shopId }),
    onSuccess: (r) => (r.ok ? toast.success(`Test kamyab. Authority ka number: ${r.fiscalNumber}`) : toast.error(r.error ?? 'Test fail')),
    onError: (e) => toast.error(apiError(e, 'Test nahi hua')),
  });
  const setT = (i: number, patch: Partial<TermDraft>) => setTerms((v) => v.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const secretFields = info.fields.filter((f) => f.key !== 'posId' && f.key !== 'ntn');
  const busy = save.isPending;
  const enable = () => {
    if (env === 'live' && !window.confirm(`${authority} LIVE chalu karein?\n\nAb se har naya bill asli tax invoice banega.`)) return;
    save.mutate(true);
  };
  const disable = () => { if (window.confirm(`${authority} band karein?\n\nNaye bill authority ko nahi jayenge. Purana record rehta hai.`)) save.mutate(false); };

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{info.name}</h3>
          <p className="text-[0.8125rem] text-slate-500">{p?.enabled && p.startAt ? `${fullTime(p.startAt)} se har naya bill ja raha hai` : 'Abhi band hai'}</p>
        </div>
        {p?.enabled && canEdit && <Button variant="critical" size="sm" loading={busy && save.variables === false} onClick={disable} leftIcon={<Power className="h-4 w-4" />}>Band karein</Button>}
      </div>

      <ol className="mt-4 space-y-1.5 rounded-2xl bg-slate-50 p-3.5 text-[0.8125rem] text-slate-700 ring-1 ring-slate-100">
        {STEPS[authority].map((s, i) => <li key={i} className="flex gap-2"><span className="font-bold text-slate-900">{i + 1}.</span><span>{s}</span></li>)}
        <li className="flex flex-wrap gap-4 pt-1">
          <a href={info.portal} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">Registration portal <ExternalLink className="h-3.5 w-3.5" /></a>
          <a href={info.docs} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">Authority ka document <ExternalLink className="h-3.5 w-3.5" /></a>
        </li>
      </ol>

      <fieldset disabled={!canEdit} className="mt-5 space-y-5">
        {authority !== 'KPRA' && (
          <div>
            <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Kahan bhejein</p>
            <Segmented value={env} onChange={setEnv} items={[{ value: 'sandbox', label: 'Sandbox (test)' }, { value: 'live', label: 'Live (asli)' }]} />
            <p className="mt-1.5 text-xs text-slate-500">Sandbox me bill sirf test hote hain. Sab theek chale to Live karein.</p>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Business ka naam" value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={120}
            hint="Bilkul wahi naam jo authority me registered hai" />
          <Input label={isPct ? 'PCT code (8 number)' : 'Service code (zaroori nahi)'} value={pctCode} onChange={(e) => setPct(e.target.value)}
            placeholder={isPct ? '9801.2000' : ''} className="font-mono"
            hint={isPct ? 'Registration ke kaghaz par likha hota hai, jaise restaurant ka 9801.2000' : 'SRB/KPRA ka service code, agar mila ho'} />
          <Input label="Tax % — cash bill" type="number" min={0} max={50} step="0.5" value={cashRate} onChange={(e) => setCash(e.target.value)}
            hint="Bill ki qeemat tax samet maani jati hai; tax us me se nikalta hai" />
          <Input label="Tax % — card, JazzCash, bank" type="number" min={0} max={50} step="0.5" value={cardRate} onChange={(e) => setCard(e.target.value)}
            hint={authority === 'PRA' ? 'PRA restaurant me card par kam rate hai (abhi 8%)' : 'Card ya digital payment ka rate'} />
        </div>
        <Switch label="Sirf POS ke bill bhejein" description="Online orders (website, Daraz) authority ko na jayein" checked={onlyPos} onChange={(e) => setOnlyPos(e.target.checked)} />

        <div>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold text-slate-900">Branch aur POS ID</p>
            <p className="text-[0.75rem] text-slate-500">Har branch ya counter authority me alag POS ke taur par register hota hai</p>
          </div>
          <div className="space-y-3">
            {terms.map((t, i) => (
              <div key={i} className="rounded-2xl p-3 ring-1 ring-slate-200">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Select label="Branch" value={t.shopId ?? ''} onChange={(e) => setT(i, { shopId: e.target.value || null })}
                    hint={!t.shopId && fallbackElsewhere ? `"Sab branches" pehle se ${fallbackElsewhere} me hai` : undefined}
                    options={[
                      { value: '', label: 'Sab branches' },
                      ...data.shops.map((s) => ({ value: s.id, label: taken.has(s.id) ? `${s.name} (${taken.get(s.id)} me hai)` : s.name, disabled: taken.has(s.id) })),
                    ]} />
                  <Input label="POS ID" value={t.posId} onChange={(e) => setT(i, { posId: e.target.value })} className="font-mono" inputMode={authority === 'KPRA' ? 'text' : 'numeric'}
                    hint="Authority ke portal se" />
                  <Input label={authority === 'SRB' ? 'SNTN' : 'NTN'} value={t.ntn} onChange={(e) => setT(i, { ntn: e.target.value })} className="font-mono" />
                  {secretFields.map((f) => (
                    <Input key={f.key} label={f.label} type={f.secret ? 'password' : 'text'} autoComplete="off" className="font-mono"
                      value={(t[f.key as keyof TerminalInput] as string | undefined) ?? ''}
                      placeholder={f.secret && t.hasSecret ? '•••••• (save hai)' : ''}
                      leftIcon={f.secret ? <KeyRound className="h-4 w-4" /> : undefined}
                      hint={f.secret ? (t.hasSecret ? 'Save hai. Badalna ho to hi naya likhein, warna khali chhor dein' : 'Sirf server par chhupa kar rakha jata hai') : undefined}
                      onChange={(e) => setT(i, { [f.key]: e.target.value } as Partial<TermDraft>)} />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {t.hasSecret && <span className="inline-flex items-center gap-1 text-[0.75rem] font-medium text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Keys save hain</span>}
                  {authority !== 'KPRA' && env === 'sandbox' && p?.terminals.some((x) => (x.shopId ?? null) === (t.shopId ?? null)) && (
                    <Button size="sm" variant="secondary" loading={test.isPending && test.variables === (t.shopId ?? null)} onClick={() => test.mutate(t.shopId ?? null)} leftIcon={<Send className="h-4 w-4" />}>
                      Test bill bhejein
                    </Button>
                  )}
                  {terms.length > 1 && (
                    <Button size="sm" variant="ghost" className="ml-auto text-rose-700" onClick={() => setTerms((v) => v.filter((_, j) => j !== i))} leftIcon={<Trash2 className="h-4 w-4" />}>Hatayein</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {data.shops.length > 1 && terms.length < data.shops.length + 1 && (
            <Button className="mt-3" size="sm" variant="secondary" leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setTerms((v) => [...v, { shopId: data.shops.find((s) => !taken.has(s.id) && !v.some((x) => x.shopId === s.id))?.id ?? null, posId: '', ntn: v[0]?.ntn ?? '' }])}>
              Aur branch jorein
            </Button>
          )}
          <p className="mt-2 flex items-center gap-1.5 text-[0.75rem] text-slate-500"><Store className="h-3.5 w-3.5" />Branch ka apna POS ID "Sab branches" wale se pehle chalta hai.</p>
        </div>
      </fieldset>

      {canEdit ? (
        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          {authority !== 'KPRA' && env === 'sandbox' && !p?.terminals.length && <span className="mr-auto self-center text-[0.75rem] text-slate-500">Test bill ke liye pehle save karein</span>}
          <Button variant="secondary" loading={busy && save.variables === undefined} onClick={() => save.mutate(undefined)} leftIcon={<Save className="h-4 w-4" />}>Save karein</Button>
          {!p?.enabled && <Button loading={busy && save.variables === true} onClick={enable} leftIcon={<Power className="h-4 w-4" />}>Save karke chalu karein</Button>}
        </div>
      ) : (
        <p className="mt-5 border-t border-slate-100 pt-4 text-[0.8125rem] text-slate-500">Badalne ke liye "Settings badalna" ki ijazat chahiye.</p>
      )}
    </section>
  );
}
