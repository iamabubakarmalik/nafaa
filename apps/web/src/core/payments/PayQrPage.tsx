/**
 * Settings → Payment QR. The shop adds its own receive QR from a bank
 * (Raast), JazzCash or Easypaisa once, from a screenshot or the QR text;
 * the POS then shows a QR with the bill amount at checkout, on the customer
 * display, and on unpaid bills. Money goes straight to the shop's account —
 * Nafaa is not in between and takes no fee. The page shows how the QR looks
 * on the bill, the customer screen and the POS before anything goes live.
 * The Settings frame supplies the page title; Save and the guide sit in its
 * header.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BrowserQRCodeReader } from '@zxing/browser';
import {
  Banknote, GraduationCap, ImageUp, Monitor, QrCode, Receipt, Save, ScanLine, ShieldCheck, Smartphone, Trash2,
} from 'lucide-react';
import { Alert, Badge, Button, IconButton, Input, Segmented, Skeleton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useDisplaySettings } from '@core/hardware/displaySettings';
import { ReceiptPreview } from '@core/receipt/ReceiptPreview';
import { sampleDueReceipt } from '@core/receipt/sample';
import { getReceiptSetup, useReceiptSetup } from '@core/receipt/setup';
import type { ReceiptPaper } from '@core/receipt/types';
import { HeaderActions } from '@modules/organization/settings/components/SettingsFrame';
import { SectionCard, Toggle } from '@modules/organization/settings/components/SettingsBlocks';
import { qrWithAmount, readPaymentQr } from './emvQr';
import { PAY_QR_KEY, payQrApi, payQrQuery, rememberPayQrs, type PayQr, type QrMethod } from './payQr';
import { qrSvg } from './qrSvg';

const SLOTS: Array<{ method: QrMethod; title: string; short: string; hint: string; tone: 'cyan' | 'rose' | 'emerald' }> = [
  { method: 'BANK_TRANSFER', title: 'Raast / Bank QR', short: 'Raast / Bank', tone: 'cyan', hint: 'Bank app → Raast → "My QR" / "Receive money" ka QR (HBL, Meezan, UBL, Allied…)' },
  { method: 'JAZZCASH', title: 'JazzCash merchant QR', short: 'JazzCash', tone: 'rose', hint: 'JazzCash Business app → QR' },
  { method: 'EASYPAISA', title: 'Easypaisa merchant QR', short: 'Easypaisa', tone: 'emerald', hint: 'Easypaisa Digital Dukaan / Business app → QR' },
];

/* Matches the API: only these roles may change the shop's QR. */
const QR_EDITORS = ['OWNER', 'MANAGER', 'SUPER_ADMIN'];
const SAMPLE_AMOUNT = 1000;

type Draft = Pick<PayQr, 'method' | 'label' | 'payload' | 'amountInQr' | 'printOnBill'>;
type PreviewTab = 'bill' | 'display' | 'pos';

function apiError(e: unknown, fallback: string) {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || fallback;
}

const toDraft = ({ method, label, payload, amountInQr, printOnBill }: Draft): Draft => ({ method, label, payload, amountInQr, printOnBill });

export default function PayQrPage() {
  const qc = useQueryClient();
  const q = useQuery(payQrQuery);
  const saved = useMemo(() => q.data ?? [], [q.data]);
  const role = useAuthStore((x) => x.user?.role);
  const canSave = QR_EDITORS.includes(String(role));
  const guide = usePageGuide();
  const [drafts, setDrafts] = useState<Record<string, Draft | null>>({});

  useEffect(() => {
    setDrafts(Object.fromEntries(SLOTS.map((s) => {
      const x = saved.find((y) => y.method === s.method);
      return [s.method, x ? toDraft(x) : null];
    })));
  }, [saved]);

  const list = Object.values(drafts).filter((d): d is Draft => !!d && !!d.payload);
  const dirty = JSON.stringify(list) !== JSON.stringify(saved.map(toDraft));
  const invalid = list.some((d) => !readPaymentQr(d.payload).valid);

  const save = useMutation({
    mutationFn: () => payQrApi.save(list),
    onSuccess: (r) => { rememberPayQrs(r); qc.setQueryData(PAY_QR_KEY, r); toast.success('QR save ho gaya — ab POS par chalega'); },
    onError: (e) => toast.error(apiError(e, 'QR save nahi hua')),
  });
  const canSubmit = canSave && dirty && !invalid && !save.isPending;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !isDialogOpen()) {
        e.preventDefault();
        if (canSubmit) save.mutate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="space-y-4">
      <HeaderActions>
        <IconButton label="Guide (G)" variant="secondary" onClick={guide.open}><GraduationCap className="h-4 w-4" /></IconButton>
        {canSave && (
          <Button size="sm" disabled={!canSubmit} loading={save.isPending} title="Save (Ctrl+S)" leftIcon={<Save className="h-4 w-4" />} onClick={() => save.mutate()}>
            {save.isPending ? 'Save ho raha…' : dirty ? 'Save karein' : 'Saved'}
          </Button>
        )}
      </HeaderActions>

      {!canSave && (
        <Alert tone="info" title="Sirf dekh sakte hain">QR sirf malik ya manager laga ya badal sakta hai.</Alert>
      )}
      {dirty && canSave && (
        <Alert tone="warning" title="Tabdeeli abhi save nahi hui" action={<Button size="sm" disabled={!canSubmit} loading={save.isPending} onClick={() => save.mutate()}>Save (Ctrl+S)</Button>}>
          {invalid ? 'Ek QR ghalat hai — usay hata kar dobara lagayein.' : 'Save karne ke baad POS, bill aur customer screen par naya QR aayega.'}
        </Alert>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="min-w-0 space-y-4">
          <SectionCard title="Kaise kaam karta hai" icon={ShieldCheck} color="emerald" desc="Paisa seedha aap ke account me — Nafaa beech me nahi, koi fee nahi">
            <ol className="grid gap-3 text-[0.8125rem] text-slate-700 sm:grid-cols-3">
              {[
                { icon: ImageUp, text: 'Apne bank / wallet app se apna "receive" QR ka screenshot yahan lagayein.' },
                { icon: ScanLine, text: 'POS par customer scan karta hai — bill ki amount QR me khud bhari hoti hai.' },
                { icon: Smartphone, text: 'Apne phone par paisa aane ka message dekh kar hi bill confirm karein.' },
              ].map(({ icon: Icon, text }, i) => (
                <li key={text} className="flex gap-2.5 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                  <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <Icon className="h-4 w-4" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[0.5625rem] font-bold text-white">{i + 1}</span>
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </SectionCard>

          {q.isLoading
            ? SLOTS.map((s) => <Skeleton key={s.method} className="h-40 rounded-2xl" />)
            : (
              <fieldset disabled={!canSave} className="min-w-0 space-y-4">
                {SLOTS.map((s) => (
                  <QrSlot key={s.method} slot={s} draft={drafts[s.method] ?? null}
                    onChange={(d) => setDrafts((v) => ({ ...v, [s.method]: d }))} />
                ))}
              </fieldset>
            )}
        </div>

        <aside className="min-w-0 xl:sticky xl:top-20 xl:self-start">
          <QrPreview saved={saved} drafts={list} dirty={dirty} />
        </aside>
      </div>

      {guide.isOpen && (
        <PageGuide title="Payment QR — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: ImageUp, color: '#0891b2', title: 'QR lagayein', text: 'Bank app (Raast "My QR"), JazzCash ya Easypaisa Business app ka QR screenshot lein aur yahan "QR ki tasveer" se lagayein.' },
            { icon: Banknote, color: '#16a34a', title: 'Amount QR me', text: 'On ho to customer ko amount likhni nahi parti. Kisi app me QR na chale to band kar dein.' },
            { icon: Receipt, color: '#d97706', title: 'Udhaar bill par', text: 'On karein to baqi amount ka QR bill par chhapta hai — customer ghar se bhej de.' },
            { icon: Monitor, color: '#2563eb', title: 'Customer screen', text: 'Customer display khula ho to payment ke waqt bara QR wahan bhi aata hai.' },
            { icon: Smartphone, color: '#7c3aed', title: 'Pehle test', text: 'Test QR (Rs 10) apne doosre phone se scan karke bhejein aur dekhein paisa aap ke khate me aaya.' },
            { icon: ShieldCheck, color: '#e11d48', title: 'Confirm khud karein', text: 'Bank Nafaa ko nahi batata. Phone par paisa aane ka message dekh kar hi bill confirm karein.' },
          ]}
          tips={[
            'QR sirf malik ya manager laga sakta hai.',
            'Bill par QR tab chhapta hai jab Settings → Receipt me "Payment QR" on ho aur bill par amount baqi ho.',
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['G', 'guide']]}
        />
      )}
    </div>
  );
}

/* ── One QR ── */

function QrSlot({ slot, draft, onChange }: { slot: (typeof SLOTS)[number]; draft: Draft | null; onChange: (d: Draft | null) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState('');
  const info = useMemo(() => (draft?.payload ? readPaymentQr(draft.payload) : null), [draft?.payload]);
  const testSvg = useMemo(() => {
    if (!draft || !info?.valid) return '';
    try { return qrSvg(draft.amountInQr ? qrWithAmount(draft.payload, 10, 'NAFAA-TEST') : draft.payload, 150); } catch { return ''; }
  }, [draft, info]);

  const setPayload = (payload: string) => {
    const r = readPaymentQr(payload);
    if (!r.valid) { toast.error(r.problems[0] ?? 'Ye payment QR nahi'); return; }
    onChange({ method: slot.method, label: draft?.label || slot.short, payload: r.payload, amountInQr: draft?.amountInQr ?? true, printOnBill: draft?.printOnBill ?? slot.method === 'BANK_TRANSFER' });
    setPaste('');
    toast.success(`QR mil gaya — ${r.merchantName || 'merchant'}`);
  };

  const fromImage = async (f: File) => {
    setBusy(true);
    const url = URL.createObjectURL(f);
    try {
      const res = await new BrowserQRCodeReader().decodeFromImageUrl(url);
      setPayload(res.getText());
    } catch {
      toast.error('Tasveer me QR nahi parha gaya — sirf QR wala hissa crop karke saaf screenshot lagayein');
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
    }
  };

  return (
    <SectionCard title={slot.title} icon={QrCode} color={slot.tone} desc={slot.hint}
      badge={draft ? (info?.valid ? <Badge variant="success" dot>Laga hua</Badge> : <Badge variant="danger">Ghalat QR</Badge>) : <Badge>Nahi laga</Badge>}>
      {!draft ? (
        <div className="space-y-3">
          <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void fromImage(f); e.target.value = ''; }} />
          <Button loading={busy} leftIcon={<ImageUp className="h-4 w-4" />} onClick={() => file.current?.click()}>QR ki tasveer lagayein</Button>
          <details className="text-[0.8125rem]">
            <summary className="cursor-pointer text-slate-500">Ya QR ka text paste karein</summary>
            <div className="mt-2 flex gap-2">
              <Input aria-label="QR ka text" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="000201010211…" className="font-mono" wrapperClassName="min-w-0 flex-1" />
              <Button variant="secondary" disabled={!paste.trim()} onClick={() => setPayload(paste)}>Lagayein</Button>
            </div>
          </details>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row">
          {testSvg && (
            <div className="shrink-0 text-center">
              <div className="inline-block rounded-xl bg-ink-white p-1.5 ring-1 ring-slate-200" dangerouslySetInnerHTML={{ __html: testSvg }} />
              <div className="mt-1 text-[0.71875rem] text-slate-500">Test: Rs 10 {draft.amountInQr ? '(amount ke saath)' : ''}</div>
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-3">
            {info && !info.valid && <Alert tone="danger">{info.problems.join(' · ')}</Alert>}
            {info?.valid && (
              <div className="text-[0.8125rem] text-slate-700">
                <b>{info.merchantName || '—'}</b>{info.city ? `, ${info.city}` : ''} <span className="font-mono text-[0.71875rem] text-slate-500">{info.scheme}</span>
              </div>
            )}
            <div className="max-w-xs">
              <Input label="POS par naam" hint="Checkout aur bill par yahi naam" value={draft.label ?? ''} onChange={(e) => onChange({ ...draft, label: e.target.value })} maxLength={40} />
            </div>
            <div>
              <Toggle label="Amount QR me daalein" desc="Customer ko amount likhni na pare. Kisi app me QR na chale to band kar dein."
                checked={draft.amountInQr} onChange={(v) => onChange({ ...draft, amountInQr: v })} />
              <Toggle label="Udhaar wale bill par chhapein" desc="Baqi amount ka QR bill par — customer ghar se bhej de"
                checked={draft.printOnBill} onChange={(v) => onChange({ ...draft, printOnBill: v })} />
            </div>
            <p className="text-xs text-slate-500">Pehli dafa: doosre phone se test QR scan karke Rs 10 bhejein aur dekhein ke aap ke khate me aaye.</p>
            <Button size="sm" variant="ghost" className="text-rose-600" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onChange(null)}>Hatayein</Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/* ── Preview ── */

function QrPreview({ saved, drafts, dirty }: { saved: PayQr[]; drafts: Draft[]; dirty: boolean }) {
  const [tab, setTab] = useState<PreviewTab>('bill');
  const [paper, setPaper] = useState<ReceiptPaper>('80');
  const setupQ = useReceiptSetup();
  const setup = setupQ.data ?? getReceiptSetup();
  const doc = useMemo(sampleDueReceipt, []);
  const due = doc.total - doc.paid;
  const first = drafts.find((d) => readPaymentQr(d.payload).valid);
  const [method, setMethod] = useState<QrMethod | null>(null);
  const shown = drafts.find((d) => d.method === method) ?? first;
  const svg = useMemo(() => {
    if (!shown) return '';
    try { return qrSvg(shown.amountInQr ? qrWithAmount(shown.payload, SAMPLE_AMOUNT) : shown.payload, 220); } catch { return ''; }
  }, [shown]);
  const merchant = shown ? readPaymentQr(shown.payload).merchantName : '';
  const savedKey = JSON.stringify(saved.map((x) => [x.method, x.printOnBill, x.amountInQr, x.payload]));
  const onBill = saved.some((x) => x.printOnBill);
  const showQr = useDisplaySettings((x) => x.showQr);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">Kahan kaisa dikhega</p>
        <Segmented label="Preview" value={tab} onChange={setTab}
          items={[{ value: 'bill', label: 'Bill' }, { value: 'display', label: 'Screen' }, { value: 'pos', label: 'POS' }]} />
      </div>
      <div className="space-y-3">
        {tab === 'bill' ? (<>
          {!setup.design.showPayQr && (
            <Alert tone="warning">Settings → Receipt me "Payment QR" band hai. <Link to="/settings/receipt" className="font-semibold underline">On karein</Link></Alert>
          )}
          {!onBill && <Alert tone="info">Kisi QR par "Udhaar wale bill par chhapein" on karein — tab baqi amount ka QR bill par aayega.</Alert>}
          {dirty && <p className="text-[0.75rem] text-amber-700">Preview save shuda QR ka hai — save karne ke baad naya dikhega.</p>}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.75rem] text-slate-500">Udhaar bill: baqi {formatPKR(due)}</span>
            <Segmented label="Kaghaz" value={paper} onChange={setPaper} items={[{ value: '58', label: '58' }, { value: '80', label: '80' }, { value: 'A4', label: 'A4' }]} />
          </div>
          <div className="max-h-[520px] overflow-auto rounded-xl">
            <ReceiptPreview key={savedKey} doc={doc} setup={setup} paper={paper} zoom={paper === 'A4' ? 0.4 : 0.85} />
          </div>
        </>) : !shown || !svg ? (
          <div className="rounded-xl bg-white px-4 py-10 text-center text-[0.8125rem] text-slate-500 ring-1 ring-slate-200">
            <QrCode className="mx-auto mb-2 h-8 w-8 text-slate-300" /> Pehle koi QR lagayein — phir yahan dikhega.
          </div>
        ) : (<>
          {drafts.length > 1 && (
            <Segmented label="Kaunsa QR" value={shown.method} onChange={setMethod}
              items={drafts.map((d) => ({ value: d.method, label: SLOTS.find((s) => s.method === d.method)?.short ?? d.label }))} />
          )}
          {tab === 'display' ? (
            <div className="flex flex-col items-center gap-3 rounded-xl bg-ink-950 p-5 text-center text-ink-white">
              <div className="rounded-2xl bg-ink-white p-2 [&_svg]:h-40 [&_svg]:w-40" dangerouslySetInnerHTML={{ __html: svg }} />
              <div className="text-[0.8125rem] font-bold text-brand-400">{shown.label} se pay karein</div>
              <div className="text-3xl font-black tabular-nums">{formatPKR(SAMPLE_AMOUNT)}</div>
              {merchant && <div className="text-[0.75rem] text-ink-white/60">{merchant}</div>}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border-4 border-violet-200 bg-violet-50 p-3">
              <div className="shrink-0 rounded-xl bg-ink-white p-1 shadow [&_svg]:h-24 [&_svg]:w-24" dangerouslySetInnerHTML={{ __html: svg }} />
              <div className="min-w-0 text-sm">
                <div className="text-[0.6875rem] font-extrabold uppercase tracking-wider text-violet-700">{shown.label} QR</div>
                <div className="text-xl font-extrabold tabular-nums text-slate-900">{formatPKR(SAMPLE_AMOUNT)}</div>
                <div className="truncate text-[0.75rem] font-bold text-slate-600">{merchant}</div>
              </div>
            </div>
          )}
          <p className="text-center text-[0.75rem] text-slate-500">
            {tab === 'display'
              ? <>Customer screen par bara QR abhi {showQr ? 'on' : 'band'} hai — <Link to="/settings/hardware" className="font-semibold text-brand-700 hover:underline">Hardware</Link> me badlein</>
              : 'POS checkout me payment chunte hi'}
          </p>
        </>)}
      </div>
    </div>
  );
}
