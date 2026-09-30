import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ImageUp, QrCode, Save, Trash2 } from 'lucide-react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { Badge, Banner, Btn, Card, Field, Page, SettingRow, Toggle, inputCls } from '@integrations/online-orders/components/ui/kit';
import { cn } from '@core/lib/cn';
import { qrWithAmount, readPaymentQr } from './emvQr';
import { PAY_QR_KEY, payQrApi, usePayQrs, type PayQr, type QrMethod } from './payQr';
import { qrSvg } from './qrSvg';

/* ═════════════════════════════════════════════════════════════
   PAYMENT QR — Raast / bank / JazzCash / Easypaisa ka merchant QR.
   Bank ka diya hua QR ek dafa yahan lagayein; phir POS har bill ki
   raqam wala QR dikhata hai aur udhaar wale bill par chhapta hai.
   Paisa seedha aap ke khate me — Nafaa beech me nahi, koi fee nahi.
   ═════════════════════════════════════════════════════════════ */

const SLOTS: Array<{ method: QrMethod; title: string; hint: string }> = [
  { method: 'BANK_TRANSFER', title: 'Raast / Bank QR', hint: 'Bank app → Raast → "My QR" / "Receive money" ka QR (HBL, Meezan, UBL, Allied…)' },
  { method: 'JAZZCASH', title: 'JazzCash merchant QR', hint: 'JazzCash Business app → QR' },
  { method: 'EASYPAISA', title: 'Easypaisa merchant QR', hint: 'Easypaisa Digital Dukaan / Business app → QR' },
];

type Draft = Pick<PayQr, 'method' | 'label' | 'payload' | 'amountInQr' | 'printOnBill'>;

export default function PayQrPage() {
  const qc = useQueryClient();
  const saved = usePayQrs();
  const [drafts, setDrafts] = useState<Record<string, Draft | null>>({});
  useEffect(() => {
    setDrafts(Object.fromEntries(SLOTS.map((s) => {
      const q = saved.find((x) => x.method === s.method);
      return [s.method, q ? { method: q.method, label: q.label, payload: q.payload, amountInQr: q.amountInQr, printOnBill: q.printOnBill } : null];
    })));
  }, [saved]);

  const list = Object.values(drafts).filter((d): d is Draft => !!d && !!d.payload);
  const dirty = JSON.stringify(list) !== JSON.stringify(saved.map(({ method, label, payload, amountInQr, printOnBill }) => ({ method, label, payload, amountInQr, printOnBill })));
  const invalid = list.some((d) => !readPaymentQr(d.payload).valid);

  const save = useMutation({
    mutationFn: () => payQrApi.save(list),
    onSuccess: (r) => { qc.setQueryData(PAY_QR_KEY, r); toast.success('QR mehfooz — ab POS checkout me dikhega'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Page narrow back={{ to: '/settings', label: 'Settings' }} title="Payment QR (Raast)"
      subtitle="Customer apne kisi bhi bank / JazzCash / Easypaisa app se scan kare — raqam khud bhari hui, paisa seedha aap ke khate me."
      actions={<Btn variant="primary" disabled={!dirty || invalid} loading={save.isPending} icon={<Save className="h-4 w-4" />} onClick={() => save.mutate()}>Mehfooz karein</Btn>}>
      <Banner tone="info" title="Kaise kaam karta hai">
        Apne bank / wallet app se apna <b>receive QR</b> ki tasveer (screenshot) yahan lagayein. Nafaa usi QR me bill ki raqam daal deta hai —
        aap ka khata wahi rehta hai. <b>Paisa aaya ya nahi, ye apne phone ke message / app me dekh kar</b> hi bill confirm karein (Nafaa ko bank khud nahi batata).
      </Banner>
      {SLOTS.map((s) => (
        <QrSlot key={s.method} slot={s} draft={drafts[s.method] ?? null}
          onChange={(d) => setDrafts((v) => ({ ...v, [s.method]: d }))} />
      ))}
    </Page>
  );
}

function QrSlot({ slot, draft, onChange }: { slot: (typeof SLOTS)[number]; draft: Draft | null; onChange: (d: Draft | null) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState('');
  const info = useMemo(() => (draft?.payload ? readPaymentQr(draft.payload) : null), [draft?.payload]);
  const testSvg = useMemo(() => {
    if (!draft || !info?.valid) return '';
    try { return qrSvg(draft.amountInQr ? qrWithAmount(draft.payload, 10, 'NAFAA-TEST') : draft.payload, 160); } catch { return ''; }
  }, [draft, info]);

  const setPayload = (payload: string) => {
    const r = readPaymentQr(payload);
    if (!r.valid) { toast.error(r.problems[0] ?? 'Ye payment QR nahi'); return; }
    onChange({ method: slot.method, label: draft?.label || slot.title.replace(' merchant QR', '').replace(' QR', ''), payload: r.payload, amountInQr: draft?.amountInQr ?? true, printOnBill: draft?.printOnBill ?? slot.method === 'BANK_TRANSFER' });
    toast.success(`QR mil gaya — ${r.merchantName || 'merchant'}`);
  };

  const fromImage = async (f: File) => {
    setBusy(true);
    const url = URL.createObjectURL(f);
    try {
      const res = await new BrowserQRCodeReader().decodeFromImageUrl(url);
      setPayload(res.getText());
    } catch {
      toast.error('Tasveer me QR nahi parha gaya — sirf QR wala hissa crop karke, saaf screenshot lagayein');
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
    }
  };

  return (
    <Card title={<span className="flex items-center gap-2"><QrCode className="h-4 w-4" /> {slot.title}
      {draft ? (info?.valid ? <Badge tone="success" dot>Laga hua</Badge> : <Badge tone="critical">Ghalat QR</Badge>) : <Badge tone="neutral">Nahi laga</Badge>}</span>}
      description={slot.hint}>
      {!draft ? (
        <div className="space-y-3">
          <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void fromImage(f); e.target.value = ''; }} />
          <Btn variant="primary" loading={busy} icon={<ImageUp className="h-4 w-4" />} onClick={() => file.current?.click()}>QR ki tasveer lagayein</Btn>
          <details className="text-[13px]">
            <summary className="cursor-pointer text-slate-500">Ya QR ka text paste karein</summary>
            <div className="mt-2 flex gap-2">
              <input value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="000201010211…" className={cn(inputCls, 'font-mono')} />
              <Btn disabled={!paste.trim()} onClick={() => setPayload(paste)}>Lagayein</Btn>
            </div>
          </details>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row">
          {testSvg && (
            <div className="shrink-0 text-center">
              <div className="inline-block rounded-xl border border-slate-200 bg-white p-1.5" dangerouslySetInnerHTML={{ __html: testSvg }} />
              <div className="mt-1 text-[11.5px] text-slate-500">Test: Rs 10 {draft.amountInQr ? '(raqam ke saath)' : ''}</div>
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            {info && !info.valid && <p className="text-[13px] font-semibold text-rose-600">{info.problems.join(' · ')}</p>}
            {info?.valid && (
              <div className="text-[13px] text-slate-700 dark:text-slate-200">
                <b>{info.merchantName || '—'}</b>{info.city ? `, ${info.city}` : ''} <span className="font-mono text-[11.5px] text-slate-500">{info.scheme}</span>
              </div>
            )}
            <Field label="POS par naam">
              <input value={draft.label} onChange={(e) => onChange({ ...draft, label: e.target.value })} className={cn(inputCls, 'w-56')} />
            </Field>
            <SettingRow title="Raqam QR me daalein" help="Customer ko raqam likhni na pare. Kisi app me QR na chale to band kar dein."
              control={<Toggle checked={draft.amountInQr} onChange={(v) => onChange({ ...draft, amountInQr: v })} />} />
            <SettingRow title="Udhaar wale bill par chhapein" help="Baqi raqam ka QR bill par — customer ghar se bhej de"
              control={<Toggle checked={draft.printOnBill} onChange={(v) => onChange({ ...draft, printOnBill: v })} />} />
            <p className="text-[12.5px] text-slate-500">
              Pehli dafa: apne doosre phone / ghar walon ke app se test QR scan karke Rs 10 bhej kar dekhein ke aap ke khate me aaye.
            </p>
            <Btn size="sm" variant="plain" className="text-rose-600" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onChange(null)}>Hatayein</Btn>
          </div>
        </div>
      )}
    </Card>
  );
}
