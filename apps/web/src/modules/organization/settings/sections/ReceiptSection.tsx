/**
 * Receipt designer: paper, style, colours and background, what the header
 * shows, what goes on every bill, the shop's own words at the bottom, and
 * printing. A live bill beside the controls shows each change as it prints;
 * changes save by themselves.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, Image as ImageIcon, LayoutTemplate, MessageSquareText, Printer, ScrollText, Sparkles } from 'lucide-react';
import { Button, Segmented } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { ReceiptPreview } from '@core/receipt/ReceiptPreview';
import { printReceipt } from '@core/receipt/print';
import { NAFAA, RECEIPT_SETUP_KEY, getReceiptSetup, receiptSetupApi, useReceiptSetup } from '@core/receipt/setup';
import type { ReceiptDesign, ReceiptDoc, ReceiptPaper } from '@core/receipt/types';
import { ChoiceGroup, Field, SectionCard, Select, TextArea, TextInput, Toggle } from '../components/UI';
import { SaveStatusBar } from './_SaveStatus';
import type { TenantSettings } from '../api/settings.api';

const SAMPLE: ReceiptDoc = {
  saleNumber: 'NF-10234', date: new Date(), customerName: 'Ahmed Raza', customerPhone: '0300-1234567', cashierName: 'Bilal',
  lines: [
    { name: "Olper's Doodh 1L", qty: 2, unit: 'pcs', price: 290, total: 580 },
    { name: 'Dawn Bread Bari', qty: 1, unit: 'pcs', price: 180, total: 160, discount: 20 },
    { name: 'Samsung Galaxy A15', qty: 1, unit: 'pcs', price: 42000, total: 42000, details: ['IMEI 356789104523117', 'Warranty 12 mahine'] },
  ],
  subtotal: 42760, discount: 20, total: 42740, paid: 40000, paymentLabel: 'Paid (Cash)', previousDue: 1500,
};

const ACCENTS = ['#0f766e', '#15803d', '#1d4ed8', '#7c3aed', '#be123c', '#c2410c', '#b45309', '#0f172a'];

export function ReceiptSection(_props: { settings: TenantSettings }) {
  const qc = useQueryClient();
  const setupQ = useReceiptSetup();
  const base = setupQ.data ?? getReceiptSetup();
  const [draft, setDraft] = useState<ReceiptDesign>(base.design);
  const [previewPaper, setPreviewPaper] = useState<ReceiptPaper | null>(null);
  const [saving, setSaving] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const pending = useRef<Partial<ReceiptDesign>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

  // Take the saved design once it arrives; later refetches must not undo typing.
  useEffect(() => {
    if (setupQ.isFetched && !loaded.current && setupQ.data) { loaded.current = true; setDraft(setupQ.data.design); }
  }, [setupQ.isFetched, setupQ.data]);

  const flush = async () => {
    const patch = pending.current;
    if (!Object.keys(patch).length) return;
    pending.current = {};
    setWaiting(false);
    setSaving(true);
    try {
      await receiptSetupApi.save(patch);
      await qc.invalidateQueries({ queryKey: RECEIPT_SETUP_KEY });
    } catch (e: any) {
      pending.current = { ...patch, ...pending.current };
      setWaiting(true);
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'Save nahi hua');
    } finally { setSaving(false); }
  };
  useEffect(() => () => { if (timer.current) { clearTimeout(timer.current); void flush(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof ReceiptDesign>(k: K, v: ReceiptDesign[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    pending.current = { ...pending.current, [k]: v };
    setWaiting(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 700);
  };

  const paper = previewPaper ?? draft.paper;
  const setup = useMemo(() => ({ shop: base.shop, design: draft }), [base.shop, draft]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SaveStatusBar saving={saving} dirty={waiting} />
        <Button size="sm" variant="secondary" className="ml-auto" leftIcon={<Printer className="h-4 w-4" />}
          onClick={() => printReceipt({ ...SAMPLE, date: new Date() }, { setup, paper, copies: 1 })}>Test print</Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="min-w-0 space-y-4">
          <SectionCard title="Kaghaz aur shakal" desc="Printer ka kaghaz, bill ka andaaz aur harf ka size" icon={LayoutTemplate} color="sky">
            <Field label="Kaghaz">
              <ChoiceGroup value={draft.paper} onChange={(v) => { set('paper', v); setPreviewPaper(null); }} columns={3}
                options={[
                  { value: '58', label: '58mm', desc: 'Chhota thermal' },
                  { value: '80', label: '80mm', desc: 'Bara thermal' },
                  { value: 'A4', label: 'A4', desc: 'Invoice / PDF' },
                ]} />
            </Field>
            <div className="mt-4">
              <Field label="Andaaz">
                <ChoiceGroup value={draft.style} onChange={(v) => set('style', v)} columns={3}
                  options={[
                    { value: 'classic', label: 'Saada', desc: 'Lakeeron wala bill' },
                    { value: 'modern', label: 'Modern', desc: 'Upar kaali patti me naam' },
                    { value: 'bold', label: 'Mota', desc: 'Bara naam, kaala total' },
                  ]} />
              </Field>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Harf ka size">
                <Select value={draft.font} onChange={(v) => set('font', v as ReceiptDesign['font'])}
                  options={[{ value: 'small', label: 'Chhota' }, { value: 'normal', label: 'Normal' }, { value: 'large', label: 'Bara (saaf parhne ke liye)' }]} />
              </Field>
              <Field label="Background par naam" hint="A4 / PDF par halka naam; thermal kaghaz halka rang nahi chhaapta">
                <Select value={draft.watermark} onChange={(v) => set('watermark', v as ReceiptDesign['watermark'])}
                  options={[{ value: 'both', label: 'Dukaan + Nafaa' }, { value: 'shop', label: 'Sirf dukaan' }, { value: 'nafaa', label: 'Sirf Nafaa' }, { value: 'none', label: 'Kuch nahi (saada safed)' }]} />
              </Field>
            </div>
            <div className="mt-4">
              <p className="mb-1.5 text-[0.8125rem] font-semibold text-slate-800">Rang (A4 / PDF)</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {ACCENTS.map((c) => (
                  <button key={c} type="button" onClick={() => set('accent', c)} aria-label={c} aria-pressed={draft.accent === c}
                    className={cn('h-8 w-8 rounded-full ring-offset-2 transition', draft.accent === c && 'ring-2 ring-slate-900')} style={{ background: c }} />
                ))}
                <input type="color" value={draft.accent} onChange={(e) => set('accent', e.target.value)} aria-label="Apna rang"
                  className="h-8 w-10 cursor-pointer rounded-lg border border-slate-200 bg-white" />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Upar ka hissa" desc="Dukaan ka naam, logo aur pata 'Dukaan ki maloomat' se aate hain" icon={ImageIcon} color="violet">
            <Field label="Naam ke neeche chhoti line" hint="Misaal: Taaza aur asli maal · 1985 se">
              <TextInput value={draft.tagline} onChange={(v) => set('tagline', v)} maxLength={80} placeholder="Apni dukaan ki pehchaan" />
            </Field>
            <div className="mt-2">
              <Toggle checked={draft.showLogo} onChange={(v) => set('showLogo', v)} label="Logo"
                desc={base.shop.logoUrl ? 'Thermal par kaala-safed chhapta hai' : 'Pehle Dukaan ki maloomat me logo lagayein'} />
              <Toggle checked={draft.showAddress} onChange={(v) => set('showAddress', v)} label="Pata" desc="Branch ka pata ho to woh" />
              <Toggle checked={draft.showPhone} onChange={(v) => set('showPhone', v)} label="Phone aur WhatsApp" />
              <Toggle checked={draft.showTaxNumber} onChange={(v) => set('showTaxNumber', v)} label="Tax number (NTN)" desc="Sirf jab Tax chalu ho" />
            </div>
          </SectionCard>

          <SectionCard title="Bill me kya dikhe" desc="Har bill par" icon={FileText} color="emerald">
            <Toggle checked={draft.showCustomer} onChange={(v) => set('showCustomer', v)} label="Customer ka naam aur phone" />
            <Toggle checked={draft.showCashier} onChange={(v) => set('showCashier', v)} label="Cashier ka naam" />
            <Toggle checked={draft.showItemNumbers} onChange={(v) => set('showItemNumbers', v)} label="Cheezon par number (1, 2, 3)" />
            <Toggle checked={draft.showItemDetails} onChange={(v) => set('showItemDetails', v)} label="Tafseel: IMEI, serial, warranty, size" />
            <Toggle checked={draft.showSavings} onChange={(v) => set('showSavings', v)} label="'Aap ne itne bachaye'" desc="Chhoot wale bill par" />
            <Toggle checked={draft.showKhata} onChange={(v) => set('showKhata', v)} label="Khata ka hisaab" desc="Pichla udhaar + is bill ka = kul" />
            <Toggle checked={draft.showAmountInWords} onChange={(v) => set('showAmountInWords', v)} label="Raqam alfaaz me (A4)" />
            <Toggle checked={draft.showSignature} onChange={(v) => set('showSignature', v)} label="Dastkhat ki jagah (A4)" />
          </SectionCard>

          <SectionCard title="Neeche ka hissa" desc="Aap ke apne alfaaz — har bill ke neeche" icon={MessageSquareText} color="amber">
            <div className="grid gap-4">
              <Field label="Neeche apna paigham" hint="Misaal: Eid par 10% chhoot · Home delivery free">
                <TextArea value={draft.footer} onChange={(v) => set('footer', v)} rows={2} maxLength={300} />
              </Field>
              <Field label="Wapsi ke usool" hint="Har line alag usool ban kar chhapti hai">
                <TextArea value={draft.terms} onChange={(v) => set('terms', v)} rows={3} maxLength={600}
                  placeholder={'3 din me wapsi, bill ke saath\nIstemal shuda maal wapas nahi'} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Shukriya ki line"><TextInput value={draft.thanks} onChange={(v) => set('thanks', v)} maxLength={80} /></Field>
                <Field label="Facebook / Instagram / website">
                  <TextInput value={draft.social} onChange={(v) => set('social', v)} maxLength={100} placeholder="fb.com/meridukaan" />
                </Field>
              </div>
            </div>
            <div className="mt-2">
              <Toggle checked={draft.showBarcode} onChange={(v) => set('showBarcode', v)} label="Bill ka barcode" desc="Scan karke wahi bill khulta hai (wapsi me kaam)" />
              <Toggle checked={draft.showPayQr} onChange={(v) => set('showPayQr', v)} label="Udhaar par payment QR" desc="Settings → Payment QR laga ho to" />
              <Toggle checked={draft.showReviewQr} onChange={(v) => set('showReviewQr', v)} label="Google review QR" desc="Settings → Google me link ho to" />
            </div>
            <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-brand-50 p-3 text-xs leading-relaxed text-brand-900 ring-1 ring-brand-100">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Har bill ke bilkul neeche <b>{NAFAA.name}</b> ki chhoti si line aati hai ({NAFAA.phone}).</p>
            </div>
          </SectionCard>

          <SectionCard title="Print" desc="Kitni copies aur kab" icon={ScrollText} color="blue">
            <Field label="Copies">
              <ChoiceGroup value={String(draft.copies)} onChange={(v) => set('copies', Number(v))} columns={3}
                options={[{ value: '1', label: '1', desc: 'Customer' }, { value: '2', label: '2', desc: 'Customer + dukaan' }, { value: '3', label: '3' }]} />
            </Field>
            <div className="mt-2">
              <Toggle checked={draft.autoPrint} onChange={(v) => set('autoPrint', v)} label="Bill khulte hi print"
                desc="Sale ke baad bill ka safha khule to khud print. POS par seedha print har counter ke ⚙️ me hai." />
            </div>
          </SectionCard>
        </div>

        <aside className="min-w-0 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">Live bill</p>
              <Segmented label="Preview kaghaz" value={paper} onChange={(v) => setPreviewPaper(v as ReceiptPaper)}
                items={[{ value: '58', label: '58' }, { value: '80', label: '80' }, { value: 'A4', label: 'A4' }]} />
            </div>
            <div className="max-h-[75vh] overflow-auto rounded-xl">
              <ReceiptPreview doc={SAMPLE} setup={setup} paper={paper} zoom={paper === 'A4' ? 0.42 : 1} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
