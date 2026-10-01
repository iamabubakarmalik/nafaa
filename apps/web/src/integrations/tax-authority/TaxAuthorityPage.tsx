import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink, Landmark, Plus, Save, Send, Trash2 } from 'lucide-react';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { whenText } from '@integrations/online-orders/lib/labels';
import { Banner, Btn, Card, EmptyState, Field, Page, Segmented, SettingRow, Toggle, inputCls } from '@integrations/online-orders/components/ui/kit';
import { cn } from '@core/lib/cn';
import { taxAuthorityApi, type Authority, type TaxOverview } from './taxAuthority.api';

/* ═════════════════════════════════════════════════════════════
   SUBA'I TAX — PRA (Punjab), SRB (Sindh), KPRA (KP). Restaurant,
   salon, services ka har bill authority ko; bill par fiscal number +
   QR khud. Network na ho to bill ruk-ta nahi — baad me khud jata hai.
   ═════════════════════════════════════════════════════════════ */

const KEY = ['tax-authority'];

interface TermDraft { shopId: string | null; posId: string; ntn: string; token?: string; user?: string; pass?: string; key?: string; hasSecret?: boolean }

const STEPS: Record<Authority, string[]> = {
  PRA: [
    'reg.pra.punjab.gov.pk → Registration → POS Client Registration (business, branch, IP)',
    'POS ID aur Token milega (POS Details tab) — neeche daalein, pehle Sandbox me test',
    'Live se pehle eims@pra.punjab.gov.pk ko email: server IP whitelist (Nafaa support se IP lein)',
  ],
  SRB: [
    'pos.srb.gos.pk/PoSRegistration → SNTN se sign-up → email verify',
    'Portal → Branch Setup → Manage POS → "Add Now" → POS ID',
    'POS user / password neeche — pehle "Test", phir "Live"',
  ],
  FBR: [
    'Sirf FBR Tier-1 retailer (bara store / chain) ke liye — restaurant / services PRA, SRB ya KPRA chunein',
    'e.fbr.gov.pk → POS registration → POS ID aur security token',
    'Pehle Sandbox me test bill, phir Live',
  ],
  KPRA: [
    'posregistration.kpra.gov.pk par POS registration (NTN)',
    'KPRA se POS ID aur Key milegi — neeche daalein',
    'KPRA ka alag sandbox nahi — pehla asli bill dhyan se check karein',
  ],
};

/** Tax → Settings tab */
export function TaxSettingsTab() {
  const { data, isLoading, error } = useQuery({ queryKey: KEY, queryFn: taxAuthorityApi.overview });
  return isLoading ? <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
    : error || !data ? <Card><EmptyState title="Settings nahi khuli">{apiErrorMessage(error)}</EmptyState></Card>
    : <Editor data={data} />;
}

export default function TaxAuthorityPage() {
  return (
    <Page back={{ to: '/settings', label: 'Settings' }} title="Tax settings"
      subtitle="PRA, SRB, KPRA ya FBR POS — har bill authority ko, bill par fiscal number aur QR.">
      <TaxSettingsTab />
    </Page>
  );
}

function Editor({ data }: { data: TaxOverview }) {
  const qc = useQueryClient();
  const c = data.config;
  // Purane FBR safhe ka NTN / POS ID — pehli dafa khud bhar do
  const legacy = !c ? data.legacyFbr : null;
  const [authority, setAuthority] = useState<Authority>(c?.authority ?? (legacy ? 'FBR' : 'PRA'));
  const [env, setEnv] = useState<'sandbox' | 'live'>(c?.env ?? 'sandbox');
  const [businessName, setBusinessName] = useState(c?.businessName ?? legacy?.businessName ?? '');
  const [pctCode, setPct] = useState(c?.pctCode ?? '');
  const [cashRate, setCash] = useState(String(c?.cashRate ?? data.defaults[c?.authority ?? 'PRA'].cash));
  const [cardRate, setCard] = useState(String(c?.cardRate ?? data.defaults[c?.authority ?? 'PRA'].card));
  const [onlyPos, setOnlyPos] = useState(c?.onlyPos ?? true);
  const [terms, setTerms] = useState<TermDraft[]>(c?.terminals.length ? c.terminals : [{ shopId: null, posId: legacy?.posId ?? '', ntn: legacy?.ntn ?? '' }]);

  useEffect(() => {
    if (!c || c.authority !== authority) { setCash(String(data.defaults[authority].cash)); setCard(String(data.defaults[authority].card)); }
  }, [authority]); // eslint-disable-line react-hooks/exhaustive-deps

  const meta = data.authorities[authority];
  const body = (enabled?: boolean) => ({
    authority, env, businessName, pctCode, cashRate: Number(cashRate), cardRate: Number(cardRate), onlyPos,
    terminals: terms.map((t) => ({ shopId: t.shopId, posId: t.posId, ntn: t.ntn, token: t.token, user: t.user, pass: t.pass, key: t.key })),
    ...(enabled !== undefined && { enabled }),
  });
  const save = useMutation({
    mutationFn: (enabled?: boolean) => taxAuthorityApi.save(body(enabled)),
    onSuccess: (r) => { qc.setQueryData(KEY, r); qc.invalidateQueries({ queryKey: ['tax-authority-pos'] }); toast.success(r.config?.enabled ? `${authority} chalu — naye bill authority ko jayenge` : 'Mehfooz'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const test = useMutation({
    mutationFn: taxAuthorityApi.test,
    onSuccess: (r) => (r.ok ? toast.success(`Test kamyab ✓ — number ${r.fiscalNumber}`) : toast.error(r.error ?? 'Test fail')),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const setT = (i: number, p: Partial<TermDraft>) => setTerms((v) => v.map((t, j) => (j === i ? { ...t, ...p } : t)));
  const secretFields = meta.fields.filter((f) => f.key !== 'posId' && f.key !== 'ntn');

  return (
    <>
      {c?.enabled && (
        <Banner tone={c.env === 'live' ? 'success' : 'warning'} title={`${c.authority} chalu — ${c.env === 'live' ? 'LIVE (asli tax bill)' : 'Sandbox (test)'}`}
          action={<Btn size="sm" variant="plain" onClick={() => { if (confirm('Band karein? Naye bill authority ko nahi jayenge.')) save.mutate(false); }}>Band karein</Btn>}>
          {c.startAt && <>{whenText(c.startAt)} se har naya bill authority ko ja raha hai.</>}
        </Banner>
      )}

      <Card title={<span className="flex items-center gap-2"><Landmark className="h-4 w-4" /> Authority</span>}>
        <div className="space-y-4">
          <Segmented value={authority} onChange={setAuthority} items={[{ value: 'PRA', label: 'PRA · Punjab' }, { value: 'SRB', label: 'SRB · Sindh' }, { value: 'KPRA', label: 'KPRA · KP' }, { value: 'FBR', label: 'FBR POS (retail)' }]} />
          <ol className="space-y-1 rounded-lg bg-slate-50 p-3 text-[13px] text-slate-700 dark:bg-slate-800/40 dark:text-slate-200">
            {STEPS[authority].map((s, i) => <li key={i}><b>{i + 1}.</b> {s}</li>)}
            <li className="flex flex-wrap gap-3 pt-1">
              <a href={meta.portal} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline">Registration portal <ExternalLink className="h-3.5 w-3.5" /></a>
              <a href={meta.docs} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline">Authority ka document <ExternalLink className="h-3.5 w-3.5" /></a>
            </li>
          </ol>
          {authority !== 'KPRA' && (
            <Segmented value={env} onChange={setEnv} items={[{ value: 'sandbox', label: 'Sandbox / Test' }, { value: 'live', label: 'Live (asli)' }]} />
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business naam (authority me registered)">
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputCls} />
            </Field>
            <Field label={authority === 'PRA' || authority === 'FBR' ? 'PCT code (8 number)' : 'Service code (optional)'} help={authority === 'PRA' || authority === 'FBR' ? 'Registration me aap ka PCT / HS code — jaise 9801.2000' : undefined}>
              <input value={pctCode} onChange={(e) => setPct(e.target.value)} placeholder={authority === 'PRA' || authority === 'FBR' ? '9801.2000' : ''} className={cn(inputCls, 'font-mono')} />
            </Field>
            <Field label="Tax % — cash bill" help="Qeemat tax samet maani jati hai (bill ka total hi kul raqam)">
              <input type="number" value={cashRate} onChange={(e) => setCash(e.target.value)} className={cn(inputCls, 'w-28')} />
            </Field>
            <Field label="Tax % — card / JazzCash / bank" help={authority === 'PRA' ? 'PRA restaurant: card par kam rate (July 2026 se 8%)' : undefined}>
              <input type="number" value={cardRate} onChange={(e) => setCard(e.target.value)} className={cn(inputCls, 'w-28')} />
            </Field>
          </div>
          <SettingRow title="Sirf POS ke bill" help="Online orders (website / Daraz) authority ko na bhejein"
            control={<Toggle checked={onlyPos} onChange={setOnlyPos} />} />
        </div>
      </Card>

      <Card title="POS ID (har branch ka)" description="Har branch / counter authority me alag POS ke taur par registered hota hai. 'Sab branches' = ek hi POS ID.">
        <div className="space-y-3">
          {terms.map((t, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800 sm:grid-cols-2">
              <Field label="Branch">
                <select value={t.shopId ?? ''} onChange={(e) => setT(i, { shopId: e.target.value || null })} className={inputCls}>
                  <option value="">Sab branches</option>
                  {data.shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="POS ID"><input value={t.posId} onChange={(e) => setT(i, { posId: e.target.value })} className={cn(inputCls, 'font-mono')} /></Field>
              <Field label={authority === 'SRB' ? 'SNTN' : 'NTN'}><input value={t.ntn} onChange={(e) => setT(i, { ntn: e.target.value })} className={cn(inputCls, 'font-mono')} /></Field>
              {secretFields.map((f) => (
                <Field key={f.key} label={f.label} help={f.secret && t.hasSecret ? 'Pehle se mehfooz — badalna ho to hi likhein' : undefined}>
                  <input type={f.secret ? 'password' : 'text'} autoComplete="off" value={(t as any)[f.key] ?? ''} placeholder={f.secret && t.hasSecret ? '••••••' : ''}
                    onChange={(e) => setT(i, { [f.key]: e.target.value } as Partial<TermDraft>)} className={cn(inputCls, 'font-mono')} />
                </Field>
              ))}
              {terms.length > 1 && (
                <div className="sm:col-span-2"><Btn size="sm" variant="plain" className="text-rose-600" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setTerms((v) => v.filter((_, j) => j !== i))}>Hatayein</Btn></div>
              )}
            </div>
          ))}
          {data.shops.length > 1 && <Btn size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setTerms((v) => [...v, { shopId: data.shops[0]?.id ?? null, posId: '', ntn: '' }])}>Aur branch</Btn>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <Btn loading={save.isPending && save.variables === undefined} icon={<Save className="h-4 w-4" />} onClick={() => save.mutate(undefined)}>Mehfooz karein</Btn>
            {env === 'sandbox' && authority !== 'KPRA' && <Btn loading={test.isPending} icon={<Send className="h-4 w-4" />} onClick={() => test.mutate()}>Test bill (sandbox)</Btn>}
            {!c?.enabled && (
              <Btn variant="primary" loading={save.isPending && save.variables === true}
                onClick={() => { if (env === 'live' && !confirm('LIVE chalu karein? Ab se har bill asli tax invoice banega.')) return; save.mutate(true); }}>Chalu karein</Btn>
            )}
          </div>
        </div>
      </Card>

      {Object.keys(data.stats).length > 0 && (
        <p className="text-[12.5px] text-slate-500">Bheje gaye bill aur un ka haal: <a href="/tax/invoices" className="font-semibold text-emerald-700 hover:underline">Tax → Invoices</a></p>
      )}
    </>
  );
}
