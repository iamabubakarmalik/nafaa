/**
 * Receipt designer: paper, style, colours and background, what the header
 * shows, what goes on every bill, the shop's own words at the bottom, and
 * printing. A live bill beside the controls shows each change as it prints;
 * changes save by themselves.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, FileType2, Image as ImageIcon, LayoutTemplate, MessageSquareText, Plus, Printer, ScrollText, Sparkles, Trash2, Wallet } from 'lucide-react';
import { Button, Segmented, Input, Select, Textarea, IconButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { ReceiptPreview } from '@core/receipt/ReceiptPreview';
import { printReceipt } from '@core/receipt/print';
import { NAFAA, RECEIPT_SETUP_KEY, getReceiptSetup, receiptSetupApi, useReceiptSetup } from '@core/receipt/setup';
import type { PayAccount, ReceiptDesign, ReceiptDoc, ReceiptPaper } from '@core/receipt/types';
import { PAY_KIND_LABEL } from '@core/receipt/html';
import { ChoiceGroup, Field, NumberInput, SectionCard, Toggle } from '../components/SettingsBlocks';
import { HeaderActions } from '../components/SettingsFrame';
import { SaveStatusBar } from './_SaveStatus';
import { t } from '@core/i18n';

const SAMPLE: ReceiptDoc = {
  saleNumber: 'NF-10234', date: new Date(), customerName: 'Ahmed Raza', customerPhone: '0300-1234567', customerAddress: 'House 4, Street 9, Model Town', cashierName: 'Bilal',
  lines: [
    { name: "Olper's Doodh 1L", qty: 2, unit: 'pcs', price: 290, total: 580 },
    { name: 'Dawn Bread Bari', qty: 1, unit: 'pcs', price: 180, total: 160, discount: 20 },
    { name: 'Samsung Galaxy A15', qty: 1, unit: 'pcs', price: 42000, total: 42000, details: ['IMEI 356789104523117', 'Warranty 12 mahine'] },
  ],
  subtotal: 42760, discount: 20, total: 42740, paid: 40000, paymentLabel: t('Paid (Cash)'), previousDue: 1500,
};

const ACCENTS = ['#0f766e', '#15803d', '#1d4ed8', '#7c3aed', '#be123c', '#c2410c', '#b45309', '#0f172a'];

export function ReceiptSection() {
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
      toast.error(Array.isArray(m) ? m[0] : m || t('Save nahi hua'));
    } finally { setSaving(false); }
  };
  useEffect(() => () => { if (timer.current) { clearTimeout(timer.current); void flush(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof ReceiptDesign>(k: K, v: ReceiptDesign[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    // Rows still being typed (no number yet) stay on screen but are not saved.
    const saved = k === 'payAccounts' ? (v as PayAccount[]).filter((a) => a.number.trim()) : v;
    pending.current = { ...pending.current, [k]: saved };
    setWaiting(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 700);
  };

  const accounts = draft.payAccounts ?? [];
  const setAccount = (i: number, patch: Partial<PayAccount>) => set('payAccounts', accounts.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const addAccount = () => set('payAccounts', [...accounts, { kind: 'JAZZCASH', title: base.shop.name, number: '' }]);
  const removeAccount = (i: number) => set('payAccounts', accounts.filter((_, j) => j !== i));

  const paper = previewPaper ?? draft.paper;
  const setup = useMemo(() => ({ shop: base.shop, design: draft }), [base.shop, draft]);

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={waiting} />
      <HeaderActions>
        <Button size="sm" variant="secondary" leftIcon={<Printer className="h-4 w-4" />}
          onClick={() => printReceipt({ ...SAMPLE, date: new Date() }, { setup, paper, copies: 1 })}>
          <span className="hidden sm:inline">{t('Test print')}</span>
        </Button>
      </HeaderActions>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="min-w-0 space-y-4">
          <SectionCard title={t('Kaghaz aur shakal')} desc={t('Printer ka kaghaz, bill ka andaaz aur harf ka size')} icon={LayoutTemplate} color="sky">
            <Field label={t('Kaghaz')} hint={t('Jo kaghaz aap ke printer me laga hai. A4 PDF aur WhatsApp ke liye bhi kaam aata hai.')}>
              <ChoiceGroup value={draft.paper} onChange={(v) => { set('paper', v); setPreviewPaper(null); }} columns={3}
                options={[
                  { value: '58', label: t('58mm'), desc: t('Chhota thermal') },
                  { value: '80', label: t('80mm'), desc: t('Bara thermal') },
                  { value: 'A4', label: t('A4'), desc: t('Invoice / PDF') },
                ]} />
            </Field>
            <div className="mt-4">
              <Field label={t('Andaaz')} hint={t('Bill ki shakal — live bill me foran dikhta hai.')}>
                <ChoiceGroup value={draft.style} onChange={(v) => set('style', v)} columns={3}
                  options={[
                    { value: 'classic', label: t('Saada'), desc: t('Lakeeron wala bill') },
                    { value: 'modern', label: t('Modern'), desc: t('Upar kaali patti me naam') },
                    { value: 'bold', label: t('Mota'), desc: t('Bara naam, kaala total') },
                  ]} />
              </Field>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Select label={t('Harf ka size')} hint={t('Bare harf door se parhne me aasaan, magar bill lamba hota hai.')} value={draft.font ?? ''} onChange={(e) => set('font', e.target.value as ReceiptDesign['font'])} options={[{ value: 'small', label: t('Chhota') }, { value: 'normal', label: t('Normal') }, { value: 'large', label: t('Bara (saaf parhne ke liye)') }]} />
              <Select label={t('Background par naam')} hint={t('A4 / PDF par halka naam; thermal kaghaz halka rang nahi chhaapta')} value={draft.watermark ?? ''} onChange={(e) => set('watermark', e.target.value as ReceiptDesign['watermark'])} options={[{ value: 'both', label: t('Dukaan + Nafaa') }, { value: 'shop', label: t('Sirf dukaan') }, { value: 'nafaa', label: t('Sirf Nafaa') }, { value: 'none', label: t('Kuch nahi (saada safed)') }]} />
            </div>
            <div className="mt-4">
              <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">{t('Rang (A4 / PDF)')}</p>
              <p className="mb-2 text-xs text-slate-500">{t('Thermal printer sirf kaala chhaapta hai; rang A4 aur PDF par aata hai.')}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {ACCENTS.map((c) => (
                  <button key={c} type="button" onClick={() => set('accent', c)} aria-label={c} aria-pressed={draft.accent === c}
                    className={cn('h-8 w-8 rounded-full ring-offset-2 transition', draft.accent === c && 'ring-2 ring-slate-900')} style={{ background: c }} />
                ))}
                <input type="color" value={draft.accent} onChange={(e) => set('accent', e.target.value)} aria-label={t('Apna rang')}
                  className="h-8 w-10 cursor-pointer rounded-lg border border-slate-200 bg-white" />
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t('Upar ka hissa')} desc={t('Store ka naam, logo aur pata \'Store details\' se aate hain')} icon={ImageIcon} color="violet">
            <Input label={t('Naam ke neeche chhoti line')} hint={t('Misaal: Taaza aur asli maal · 1985 se')} value={draft.tagline ?? ''} onChange={(e) => set('tagline', e.target.value)} maxLength={80} placeholder={t('Apni dukaan ki pehchaan')} />
            <div className="mt-2">
              <Toggle checked={draft.showLogo} onChange={(v) => set('showLogo', v)} label={t('Logo')}
                desc={base.shop.logoUrl ? t('Thermal par kaala-safed chhapta hai') : t('Pehle Store details me logo lagayein')} />
              <Toggle checked={draft.showAddress} onChange={(v) => set('showAddress', v)} label={t('Pata')} desc={t('Branch ka pata ho to woh')} />
              <Toggle checked={draft.showPhone} onChange={(v) => set('showPhone', v)} label={t('Phone aur WhatsApp')} desc={t('Store details wale numbers')} />
              <Toggle checked={draft.showTaxNumber} onChange={(v) => set('showTaxNumber', v)} label={t('Tax number (NTN)')} desc={t('Sirf jab Tax chalu ho')} />
            </div>
          </SectionCard>

          <SectionCard title={t('Bill me kya dikhe')} desc={t('Har bill par')} icon={FileText} color="emerald">
            <Toggle checked={draft.showCustomer} onChange={(v) => set('showCustomer', v)} label={t('Customer ka naam aur phone')} desc={t('Jab bill par customer chuna ho')} />
            <Toggle checked={draft.showCashier} onChange={(v) => set('showCashier', v)} label={t('Cashier ka naam')} desc={t('Jis ne bill banaya')} />
            <Toggle checked={draft.showItemNumbers} onChange={(v) => set('showItemNumbers', v)} label={t('Cheezon par number (1, 2, 3)')} desc={t('Lambe bill ginne me aasaan')} />
            <Toggle checked={draft.showItemDetails} onChange={(v) => set('showItemDetails', v)} label={t('Details: IMEI, serial, warranty, size')} desc={t('Har cheez ke neeche chhoti line me')} />
            <Toggle checked={draft.showSavings} onChange={(v) => set('showSavings', v)} label={t('\'Aap ne itne bachaye\'')} desc={t('Discount wale bill par')} />
            <Toggle checked={draft.showKhata} onChange={(v) => set('showKhata', v)} label={t('Khata ka hisaab')} desc={t('Pichla udhaar + is bill ka = kul')} />
            <Toggle checked={draft.showAmountInWords} onChange={(v) => set('showAmountInWords', v)} label={t('Amount in words (A4)')} desc={t('Misaal: Five thousand rupees only')} />
            <Toggle checked={draft.showSignature} onChange={(v) => set('showSignature', v)} label={t('Dastkhat ki jagah (A4)')} desc={t('Neeche dastkhat aur mohar ke liye khaali jagah')} />
          </SectionCard>

          <SectionCard title={t('Neeche ka hissa')} desc={t('Aap ke apne alfaaz — har bill ke neeche')} icon={MessageSquareText} color="amber">
            <div className="grid gap-4">
              <Textarea label={t('Neeche apna message')} hint={t('Misaal: Eid par 10% Discount · Home delivery free · {{count}}/300', { count: (draft.footer ?? '').length })}
                value={draft.footer ?? ''} onChange={(e) => set('footer', e.target.value)} rows={2} maxLength={300} />
              <Textarea label={t('Return ke usool')} hint={t('Har line alag usool ban kar chhapti hai · {{count}}/600', { count: (draft.terms ?? '').length })}
                value={draft.terms ?? ''} onChange={(e) => set('terms', e.target.value)} rows={3} maxLength={600}
                placeholder={t('3 din me return, bill ke saath\nIstemal shuda maal wapas nahi')} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label={t('Shukriya ki line')} hint={t('Bill ki aakhri line')} value={draft.thanks ?? ''} onChange={(e) => set('thanks', e.target.value)} maxLength={80} />
                <Input label={t('Facebook / Instagram / website')} hint={t('Customer aap ko online dhoond sake')} value={draft.social ?? ''} onChange={(e) => set('social', e.target.value)} maxLength={100} placeholder={t('fb.com/meridukaan')} />
              </div>
            </div>
            <div className="mt-2">
              <Toggle checked={draft.showBarcode} onChange={(v) => set('showBarcode', v)} label={t('Bill ka barcode')} desc={t('Scan karke wahi bill khulta hai (return me kaam)')} />
              <Toggle checked={draft.showPayQr} onChange={(v) => set('showPayQr', v)} label={t('Udhaar par payment QR')} desc={t('Settings → Payment QR laga ho to')} />
              <Toggle checked={draft.showReviewQr} onChange={(v) => set('showReviewQr', v)} label={t('Google review QR')} desc={t('Settings → Google me link ho to')} />
            </div>
            <div className="mt-3 flex items-start gap-2.5 rounded-lg bg-brand-50 p-3 text-xs leading-relaxed text-brand-900 ring-1 ring-inset ring-brand-200">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{t('Har bill ke bilkul neeche')}{' '} <b>{NAFAA.name}</b> {' '}{t('ki chhoti si line aati hai ({{phone}}).', { phone: NAFAA.phone })}</p>
            </div>
          </SectionCard>

          <SectionCard title={t('Paise kaise bhejein')} desc={t('Udhaar ya online order wale bill par aap ke account chhapte hain, taake customer seedha bhej sake')} icon={Wallet} color="emerald">
            <div className="space-y-3">
              {accounts.map((a, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <Select value={a.kind ?? ''} onChange={(e) => setAccount(i, { kind: e.target.value as PayAccount['kind'] })} options={Object.entries(PAY_KIND_LABEL).map(([value, label]) => ({ value, label }))} />
                  <Input value={a.number ?? ''} onChange={(e) => setAccount(i, { number: e.target.value })} maxLength={40} placeholder={a.kind === 'BANK' ? t('Account number') : a.kind === 'RAAST' ? t('Raast ID / number') : '03xx-xxxxxxx'} />
                  <Input value={a.title ?? ''} onChange={(e) => setAccount(i, { title: e.target.value })} maxLength={80} placeholder={t('Account title (naam)')} />
                  <IconButton label={t('Hatayein')} variant="ghost" onClick={() => removeAccount(i)} className="text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></IconButton>
                  {a.kind === 'BANK' && (
                    <div className="grid gap-2 sm:col-span-4 sm:grid-cols-2">
                      <Input value={a.bank ?? ''} onChange={(e) => setAccount(i, { bank: e.target.value })} maxLength={60} placeholder={t('Bank ka naam (Meezan, HBL…)')} />
                      <Input value={a.iban ?? ''} onChange={(e) => setAccount(i, { iban: e.target.value.toUpperCase().replace(/\s/g, '') })} maxLength={40} placeholder={t('IBAN (PK..)')} />
                    </div>
                  )}
                </div>
              ))}
              {accounts.length < 6 && (
                <Button size="sm" variant="secondary" onClick={addAccount} leftIcon={<Plus className="h-4 w-4" />}>{t('Account jorein')}</Button>
              )}
              <p className="text-xs text-slate-500">{t('Number aur title bilkul waise likhein jaise account me hai. 6 accounts tak; khaali number wala account save nahi hota.')}</p>
            </div>
            <div className="mt-4 grid gap-4">
              <Field label={t('Kab chhapein')} hint={t('Aam taur par sirf baqi wale bill par kaafi hai')}>
                <ChoiceGroup value={draft.payWhen} onChange={(v) => set('payWhen', v)} columns={3}
                  options={[
                    { value: 'due', label: t('Jab paise baqi hon'), desc: t('Udhaar / online order') },
                    { value: 'always', label: t('Har bill par') },
                    { value: 'never', label: t('Kabhi nahi') },
                  ]} />
              </Field>
              <Input label={t('Saath ki hidayat')} hint={t('Misaal: Paise bhej kar screenshot 0321-xxxxxxx par WhatsApp karein')} value={draft.payNote ?? ''} onChange={(e) => set('payNote', e.target.value)} maxLength={120} />
            </div>
          </SectionCard>

          <SectionCard title={t('A4 invoice')} desc={t('Bari companies jaisa invoice — PDF, online order aur wholesale ke liye')} icon={FileType2} color="indigo">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('Upar ka unwaan')} hint={t('INVOICE, TAX INVOICE, BILL, CASH MEMO…')} value={draft.a4Title ?? ''} onChange={(e) => set('a4Title', e.target.value.toUpperCase())} maxLength={30} />
              <Field label={t('Paise dene ki period')} hint={t('Baqi wale bill par aakhri date (0 = nahi)')}>
                <NumberInput value={draft.dueDays} onChange={(v) => set('dueDays', v)} min={0} max={365} suffix="din" />
              </Field>
            </div>
            <div className="mt-4">
              <Field label={t('Header')} hint={t('A4 invoice ka upar wala hissa')}>
                <ChoiceGroup value={draft.a4Layout} onChange={(v) => { set('a4Layout', v); setPreviewPaper('A4'); }} columns={3}
                  options={[
                    { value: 'band', label: t('Rangeen patti'), desc: t('Upar poori rangeen patti') },
                    { value: 'split', label: t('Do taraf'), desc: t('Naam baayen, invoice daayen') },
                    { value: 'minimal', label: t('Saada'), desc: t('Beech me, kam rang') },
                  ]} />
              </Field>
            </div>
            <div className="mt-2">
              <Toggle checked={draft.showStatus} onChange={(v) => set('showStatus', v)} label={t('PAID / UNPAID ka nishan')} desc={t('Invoice ke kone par mohar jaisa')} />
              <Toggle checked={draft.showCustomerDetails} onChange={(v) => set('showCustomerDetails', v)} label={t('Customer ka pata aur NTN / CNIC')} desc={t('Wholesale aur company customers ke liye')} />
              <Toggle checked={draft.showSku} onChange={(v) => set('showSku', v)} label={t('SKU / code ka khana')} desc={t('Har line par product ka code')} />
            </div>
          </SectionCard>

          <SectionCard title={t('Peeche ka hissa')} desc={t('Bill ke baad aap ki shartein aur hidayat, dukaan aur Nafaa ki pehchaan ke saath')} icon={ScrollText} color="rose">
            <Textarea label={t('Shartein / hidayat')} hint={t('Har line alag number ban kar chhapti hai · {{count}}/2000', { count: (draft.backText ?? '').length })}
              value={draft.backText ?? ''} onChange={(e) => set('backText', e.target.value)} rows={5} maxLength={2000}
              placeholder={t('Maal 3 din me wapas ho sakta hai, bill ke saath\nElectronics par sirf company warranty\nUdhaar 30 din me ada karein')} />
            <div className="mt-3">
              <Field label={t('Kahan chhapein')} hint={t('Thermal par kaghaz zyada lagta hai — zaroorat ho to hi chalu karein')}>
                <ChoiceGroup value={draft.backPrint} onChange={(v) => set('backPrint', v)} columns={3}
                  options={[
                    { value: 'none', label: t('Nahi') },
                    { value: 'a4', label: t('Sirf A4'), desc: t('Doosra safha') },
                    { value: 'all', label: t('Har bill'), desc: t('Thermal par ✂ ke baad') },
                  ]} />
              </Field>
            </div>
            <div className="mt-2">
              <Toggle checked={draft.thermalPattern} onChange={(v) => set('thermalPattern', v)} label={t('Thermal bill ke peeche halka naam')}
                desc={t('Dukaan aur Nafaa ka naam halke nuqton me. Kuch printers par dhabbe aa sakte hain — test print kar ke dekhein.')} />
            </div>
          </SectionCard>

          <SectionCard title={t('Print')} desc={t('Kitni copies aur kab')} icon={ScrollText} color="blue">
            <Field label={t('Copies')} hint={t('Har print par kitne bill nikalein')}>
              <ChoiceGroup value={String(draft.copies)} onChange={(v) => set('copies', Number(v))} columns={3}
                options={[{ value: '1', label: '1', desc: t('Customer') }, { value: '2', label: '2', desc: t('Customer + dukaan') }, { value: '3', label: '3' }]} />
            </Field>
            <div className="mt-2">
              <Toggle checked={draft.autoPrint} onChange={(v) => set('autoPrint', v)} label={t('Bill khulte hi print')}
                desc={t('Sale ke baad bill ka safha khule to khud print. POS par seedha print har counter ke ⚙️ me hai.')} />
            </div>
          </SectionCard>
        </div>

        <aside className="min-w-0 xl:sticky xl:top-20 xl:self-start">
          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">{t('Live bill')}</p>
              <Segmented label={t('Preview kaghaz')} value={paper} onChange={(v) => setPreviewPaper(v as ReceiptPaper)}
                items={[{ value: '58', label: '58' }, { value: '80', label: '80' }, { value: 'A4', label: t('A4') }]} />
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
