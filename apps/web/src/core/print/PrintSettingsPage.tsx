/**
 * Settings → Printing. Two tabs:
 *   Kaghaz aur copies — paper and copies for every printed document on this
 *     computer (bills, POS auto print, return slips, purchase bills,
 *     vouchers…), the shop-wide bill defaults for people allowed to edit
 *     settings, and a live preview / test print through the receipt engine.
 *   Reports ka print — how reports and lists print or save as PDF: default
 *     format, colour, header and footer, thermal text size.
 * Printer connection lives on Settings → Hardware; the bill's design lives
 * on Settings → Receipt. The Settings frame supplies the page title; the
 * page actions go into its header.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRight, Copy, Download, Eye, FileText, GraduationCap, Layers, Palette, Printer, Receipt, ScrollText, Store, Unplug, Usb, Zap,
} from 'lucide-react';
import { Badge, Button, IconButton, Segmented, ViewTabs, Input } from '@/design-system/components';
import { useAppearance } from '@/design-system';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useDeviceStatus } from '@core/hardware/devices';
import { useHardwareSettings } from '@core/hardware/settings';
import { cn } from '@core/lib/cn';
import { ReceiptPreview } from '@core/receipt/ReceiptPreview';
import { printReceipt } from '@core/receipt/print';
import { sampleReceipt } from '@core/receipt/sample';
import { RECEIPT_SETUP_KEY, devicePaper, getReceiptSetup, receiptSetupApi, setDevicePaper, useReceiptSetup } from '@core/receipt/setup';
import type { ReceiptDesign, ReceiptPaper } from '@core/receipt/types';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { HeaderActions } from '@modules/organization/settings/components/SettingsFrame';
import { ChoiceGroup, Field, SectionCard, Toggle } from '@modules/organization/settings/components/SettingsBlocks';
import { renderHtml } from './render';
import { printDoc, renderContext } from './printDoc';
import { usePrintSettings, type ColorMode } from './settings';
import { useBusinessHeader } from './useBusinessHeader';
import { DOC_KINDS, readDocPref, writeDocPref, type DocKind, type DocPref } from './docPrefs';
import type { PrintDoc, PrintFormat } from './types';

type Tab = 'docs' | 'reports';

const SAMPLE: PrintDoc = {
  title: 'Test print',
  subtitle: 'Ye dekhne ke liye ke print kaisa nikalta hai',
  meta: [['Date', new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date())], ['Bill', '3']],
  sections: [
    { kind: 'rows', title: 'Galla', rows: [
      { label: 'Opening balance', value: 'Rs 5,000' },
      { label: '+ Cash sale', value: 'Rs 9,760' },
      { label: '- Expense', value: 'Rs 2,300' },
      { label: 'Closing balance', value: 'Rs 12,460', strong: true },
    ] },
    { kind: 'table', title: 'Kya bika',
      columns: [{ label: 'Item' }, { label: 'Qty', align: 'right' }, { label: 'Amount', align: 'right' }],
      rows: [['Cookies', '24', 'Rs 7,200'], ['  Kinder cookie', '11', 'Rs 3,300'], ['  Pistachio cookie', '13', 'Rs 3,900'], ['Tins', '4', 'Rs 5,060']],
      groupRows: [0, 3], footer: ['Kul', '28', 'Rs 12,260'] },
  ],
};

const FORMATS: Array<{ id: PrintFormat; label: string; hint: string; icon: typeof Printer }> = [
  { id: 'a4', label: 'A4 print', hint: 'Laser / inkjet printer', icon: FileText },
  { id: 'pdf', label: 'PDF download', hint: 'File save, email ya WhatsApp', icon: Download },
  { id: '80', label: 'Thermal 80mm', hint: 'Aam receipt printer', icon: Receipt },
  { id: '58', label: 'Thermal 58mm', hint: 'Chhota / Bluetooth printer', icon: Receipt },
];

const PAPER_ITEMS: Array<{ value: ReceiptPaper; label: string }> = [{ value: '58', label: '58mm' }, { value: '80', label: '80mm' }, { value: 'A4', label: 'A4' }];
const COPY_ITEMS = [{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }];
const PAPER_LABEL: Record<ReceiptPaper, string> = { '58': '58mm', '80': '80mm', A4: 'A4' };

/* POS counters built on the shared engine keep their preferences under the
   industry id (modules/pos/hooks/usePosPreferences). Industries listed here
   still run their own POS page with its own settings. */
const OWN_POS = new Set([
  'restaurant', 'mobile', 'carpet', 'garments', 'gym', 'clinic', 'services-biz', 'pharmacy', 'jewelry', 'hardware', 'dairy', 'meat',
  'autoparts', 'bookstore', 'salon', 'hotel', 'appliances', 'florist', 'furniture', 'gaming', 'optical', 'petshop', 'shoe', 'sports', 'toystore',
]);
const posScope = (industryId?: string) => (!industryId ? 'general' : OWN_POS.has(industryId) ? null : industryId);

function readPos(scope: string) {
  try {
    return {
      autoPrint: localStorage.getItem(`nafaa.${scope}-pos.auto-print`) !== 'false',
      width: localStorage.getItem(`nafaa.${scope}-pos.printer-width`) === '58' ? '58' as const : '80' as const,
    };
  } catch { return { autoPrint: true, width: '80' as const }; }
}
function writePos(scope: string, key: 'auto-print' | 'printer-width', value: string) {
  try { localStorage.setItem(`nafaa.${scope}-pos.${key}`, value); } catch { /* storage blocked */ }
}

export default function PrintSettingsPage() {
  const guide = usePageGuide();
  const navigate = useNavigate();
  const hw = useHardwareSettings();
  const printer = useDeviceStatus((x) => x.printer);
  const industry = useCurrentIndustry();
  const scope = posScope(industry?.id);
  const setupQ = useReceiptSetup();
  const setup = setupQ.data ?? getReceiptSetup();

  const [tab, setTab] = useState<Tab>('docs');
  const [billPaper, setBillPaper] = useState<ReceiptPaper>(() => devicePaper() ?? setup.design.paper);
  const [pos, setPos] = useState(() => (scope ? readPos(scope) : null));
  const [preview, setPreview] = useState<{ paper: ReceiptPaper; title?: string }>({ paper: billPaper });
  const sample = useMemo(sampleReceipt, []);
  const previewSetup = useMemo(() => (preview.title ? { ...setup, design: { ...setup.design, a4Title: preview.title } } : setup), [setup, preview.title]);

  const testBill = (paper: ReceiptPaper = billPaper, title?: string) => {
    const s = getReceiptSetup();
    printReceipt({ ...sampleReceipt(), date: new Date() }, { paper, copies: 1, setup: title ? { ...s, design: { ...s.design, a4Title: title } } : s });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '1') setTab('docs');
      if (e.key === '2') setTab('reports');
      if (e.key === 't' || e.key === 'T') { e.preventDefault(); testBill(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const chooseBillPaper = (p: ReceiptPaper) => {
    setBillPaper(p);
    setDevicePaper(p);
    setPreview({ paper: p });
    // The POS prints on thermal widths only; A4 leaves its width as it is.
    if (scope && p !== 'A4') { writePos(scope, 'printer-width', p); setPos((x) => (x ? { ...x, width: p } : x)); }
  };

  const direct = hw.printMode === 'direct';

  return (
    <div className="space-y-4">
      <HeaderActions>
        <Button size="sm" variant="secondary" title="Test bill (T)" leftIcon={<Receipt className="h-4 w-4" />} onClick={() => testBill()}>
          <span className="hidden sm:inline">Test bill</span>
        </Button>
        <Button size="sm" variant="secondary" leftIcon={<Usb className="h-4 w-4" />} onClick={() => navigate('/settings/hardware')}>
          <span className="hidden sm:inline">Hardware</span>
        </Button>
        <IconButton label="Guide (G)" variant="secondary" onClick={guide.open}><GraduationCap className="h-4 w-4" /></IconButton>
      </HeaderActions>

      <ViewTabs<Tab> value={tab} onChange={setTab}
        tabs={[{ id: 'docs', label: 'Kaghaz aur copies', icon: Layers }, { id: 'reports', label: 'Reports ka print', icon: FileText }]}
        hint={<>1 / 2 tab badlein · T test bill · G guide</>} />

      {tab === 'docs' ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="min-w-0 space-y-4">
            <SectionCard title="Sale ka bill — is computer par" icon={Receipt} color="emerald"
              desc="Har counter ka printer alag ho sakta hai, is liye ye is computer par yaad rehta hai.">
              <Row title="Kaghaz" help={`Dukaan ka default: ${PAPER_LABEL[setup.design.paper]}. POS par A4 nahi — wahan 80 ya 58 chalta hai.`}>
                <Segmented label="Bill ka kaghaz" value={billPaper} onChange={chooseBillPaper} items={PAPER_ITEMS} />
              </Row>
              {pos && scope ? (
                <Toggle label="POS par bill khud print ho" desc={`Sale hote hi bill printer par — POS ka kaghaz ${pos.width}mm`} checked={pos.autoPrint}
                  onChange={(v) => { writePos(scope, 'auto-print', String(v)); setPos({ ...pos, autoPrint: v }); }} />
              ) : (
                <Row title="POS par khud print" help="Aap ka POS apni settings rakhta hai — POS screen par settings button se badlein.">
                  <Badge variant="outline">POS me</Badge>
                </Row>
              )}
            </SectionCard>

            <ShopBillCard design={setup.design} />

            <SectionCard title="Baqi parchiyan" icon={ScrollText} color="cyan"
              desc="Har parchi ka default kaghaz aur copies. Print karte waqt badal bhi sakte hain — wahan ki tabdeeli bhi yahan yaad rehti hai.">
              <ul className="divide-y divide-slate-100">
                {DOC_KINDS.map((k) => (
                  <DocRow key={k.id} kind={k} shopPaper={setup.design.paper}
                    onPreview={(paper) => setPreview({ paper, title: k.title })} onTest={(paper) => testBill(paper, k.title)} />
                ))}
              </ul>
            </SectionCard>
          </div>

          <aside className="min-w-0 space-y-3 xl:sticky xl:top-20 xl:self-start">
            <PreviewPanel title="Preview"
              control={<Segmented label="Preview kaghaz" value={preview.paper} onChange={(p) => setPreview({ ...preview, paper: p })} items={PAPER_ITEMS} />}>
              <div className="max-h-[560px] overflow-auto rounded-xl">
                <ReceiptPreview doc={sample} setup={previewSetup} paper={preview.paper} zoom={preview.paper === 'A4' ? 0.42 : 0.9} />
              </div>
            </PreviewPanel>
            <Button fullWidth variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={() => testBill(preview.paper, preview.title)}>
              Ye test print karein
            </Button>
            <p className="text-center text-xs text-slate-500">
              Bill ka design (logo, rang, footer) <Link to="/settings/receipt" className="font-semibold text-brand-700 hover:underline">Settings → Receipt</Link> me
            </p>
          </aside>
        </div>
      ) : (
        <ReportsTab direct={direct} printer={printer} />
      )}

      {guide.isOpen && (
        <PageGuide title="Printing — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Receipt, color: '#16a34a', title: 'Bill ka kaghaz', text: 'Is computer ka printer 80mm, 58mm ya A4 — ek dafa chunein. POS aur bill dobara print dono isi par.' },
            { icon: Zap, color: '#d97706', title: 'Khud print', text: 'POS par sale hote hi bill khud chhape — ya band karke har dafa Print dabayein.' },
            { icon: Copy, color: '#7c3aed', title: 'Copies', text: 'Dukaan ka default copies (1–3) malik ya settings wala badal sakta hai. Har parchi ki apni copies bhi.' },
            { icon: ScrollText, color: '#0891b2', title: 'Baqi parchiyan', text: 'Return, khareed, challan, voucher, salary slip — har ek ka kaghaz yahan, Test se dekh lein.' },
            { icon: FileText, color: '#2563eb', title: 'Reports', text: 'Reports aur lists ka print A4, PDF ya thermal; rang aur header footer "Reports ka print" tab me.' },
            { icon: Usb, color: '#e11d48', title: 'Printer jorna', text: 'Bina print window ke seedha chhapne ke liye Hardware me printer Direct par jorein.' },
          ]}
          tips={[
            'Ye settings is computer ki hain — doosre counter par alag set karein.',
            'Test print hamesha usi engine se chhapta hai jis se asli bill — jo test me dikhe wohi customer ko milega.',
          ]}
          shortcuts={[['1', 'kaghaz'], ['2', 'reports'], ['T', 'test bill'], ['G', 'guide']]}
        />
      )}
    </div>
  );
}

/* ── Shop-wide bill defaults (server) ── */

function ShopBillCard({ design }: { design: ReceiptDesign }) {
  const qc = useQueryClient();
  const canEdit = usePermission(PERMISSIONS.SETTINGS_EDIT);
  const [saving, setSaving] = useState<string | null>(null);

  const save = async (patch: Partial<ReceiptDesign>) => {
    const key = Object.keys(patch)[0];
    setSaving(key);
    try {
      await receiptSetupApi.save(patch);
      await qc.invalidateQueries({ queryKey: RECEIPT_SETUP_KEY });
      toast.success('Dukaan ki setting save ho gayi');
    } catch (e) {
      const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      toast.error((Array.isArray(m) ? m[0] : m) || 'Save nahi hua');
    } finally { setSaving(null); }
  };

  return (
    <SectionCard title="Poori dukaan ka bill" icon={Store} color="violet"
      desc="Har computer aur har staff par lagta hai — jab tak koi computer apna kaghaz na chune.">
      {!canEdit && (
        <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-slate-100 px-3.5 py-2.5 text-sm text-slate-700">
          <Eye className="h-4 w-4 shrink-0 text-slate-500" />
          Ye badalne ke liye "Settings badalna" ki permission chahiye. Aap sirf dekh sakte hain.
        </div>
      )}
      <fieldset disabled={!canEdit || !!saving} className="min-w-0">
        <Row title="Default kaghaz" help="Naye computer par bill isi kaghaz par">
          <Segmented label="Dukaan ka kaghaz" value={design.paper} onChange={(v) => void save({ paper: v })} items={PAPER_ITEMS} />
        </Row>
        <Row title="Copies" help="Har bill kitni dafa chhape — maslan ek customer, ek dukaan">
          <Segmented label="Copies" value={String(design.copies)} onChange={(v) => void save({ copies: Number(v) })} items={COPY_ITEMS} />
        </Row>
        <Toggle label="Bill kholte hi print" desc="Sale list se bill kholein to khud print window aaye"
          checked={design.autoPrint} onChange={(v) => void save({ autoPrint: v })} />
      </fieldset>
    </SectionCard>
  );
}

/* ── One document kind ── */

function DocRow({ kind, shopPaper, onPreview, onTest }: {
  kind: DocKind; shopPaper: ReceiptPaper; onPreview: (p: ReceiptPaper) => void; onTest: (p: ReceiptPaper) => void;
}) {
  const [pref, setPref] = useState<DocPref>(() => readDocPref(kind, shopPaper));
  const change = (patch: Partial<DocPref>) => {
    writeDocPref(kind, patch);
    setPref((p) => ({ ...p, ...patch }));
    if (patch.paper) onPreview(patch.paper);
  };
  return (
    <li className="flex flex-col gap-2 py-3 first:pt-1 last:pb-1 md:flex-row md:items-center md:justify-between md:gap-4">
      <button type="button" onClick={() => onPreview(pref.paper)} className="min-w-0 text-left">
        <span className="block text-sm font-semibold text-slate-900">{kind.label}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{kind.where}</span>
      </button>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented label={`${kind.label} kaghaz`} value={pref.paper} onChange={(v) => change({ paper: v })}
          items={kind.papers ? PAPER_ITEMS.filter((p) => kind.papers!.includes(p.value as ReceiptPaper)) : PAPER_ITEMS} />
        <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Copy className="h-3.5 w-3.5" />
          <Segmented label={`${kind.label} copies`} value={String(pref.copies)} onChange={(v) => change({ copies: Number(v) })} items={COPY_ITEMS} />
        </span>
        <Button size="sm" variant="ghost" leftIcon={<Printer className="h-3.5 w-3.5" />} onClick={() => onTest(pref.paper)}>Test</Button>
      </div>
    </li>
  );
}

/* ── Reports and lists ── */

function ReportsTab({ direct, printer }: { direct: boolean; printer: { ready: boolean; label: string } }) {
  const s = usePrintSettings();
  const biz = useBusinessHeader();
  const { accentHex } = useAppearance();
  const userName = useAuthStore((x) => x.user?.fullName);
  const [preview, setPreview] = useState<'a4' | '80' | '58'>(s.format === 'pdf' ? 'a4' : s.format);

  const ctx = renderContext(biz, accentHex, userName);
  const html = useMemo(() => renderHtml(SAMPLE, preview, ctx),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preview, s.colorMode, s.showLogo, s.showAddress, s.showPhone, s.footerNote, s.thermalText, s.showStamp, biz.name, biz.address, biz.phone, biz.logoUrl, accentHex]);
  const test = (f: PrintFormat) => printDoc(SAMPLE, f, ctx);
  const connected = direct && printer.ready;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="min-w-0 space-y-4">
        <SectionCard title="Print button ka default" icon={Printer} color="blue" desc="Ek click par isi tarah print hoga. Arrow se har dafa badal bhi sakte hain.">
          <Field label="Format" hint="PDF chunein to file save hoti hai — WhatsApp ya email par bhej sakte hain.">
            <ChoiceGroup value={s.format} columns={2}
              onChange={(v: PrintFormat) => { s.set({ format: v }); if (v !== 'pdf') setPreview(v); }}
              options={FORMATS.map((f) => ({ value: f.id, label: f.label, desc: f.hint, icon: f.icon }))} />
          </Field>
        </SectionCard>

        <SectionCard title="Rang" icon={Palette} color="pink" desc="A4 aur PDF ke liye. Thermal printer hamesha black & white chhapta hai.">
          <ChoiceGroup value={s.colorMode} columns={2} onChange={(v: ColorMode) => s.set({ colorMode: v })}
            options={[
              { value: 'color', label: 'Colour', desc: 'Headings aur table aap ke brand rang me', icon: BrandSwatch },
              { value: 'mono', label: 'Black & white', desc: 'Laser / photocopy ke liye saaf, ink bachta hai', icon: InkSwatch },
            ]} />
        </SectionCard>

        <SectionCard title="Header aur footer" icon={Store} color="violet"
          desc={<>Dukaan ka naam, address, phone aur logo <Link to="/settings/store" className="font-semibold text-brand-700 hover:underline">Settings → Store details</Link> se aate hain.</>}>
          <Toggle label="Logo" desc={biz.logoUrl ? 'Logo laga hua hai' : 'Abhi logo set nahi'} checked={s.showLogo} onChange={(v) => s.set({ showLogo: v })} />
          <Toggle label="Address" desc={biz.address ?? 'Address set nahi'} checked={s.showAddress} onChange={(v) => s.set({ showAddress: v })} />
          <Toggle label="Phone" desc={biz.phone ?? 'Phone set nahi'} checked={s.showPhone} onChange={(v) => s.set({ showPhone: v })} />
          <Toggle label="Kab aur kis ne print kiya" desc="Neeche chhota sa likha aata hai" checked={s.showStamp} onChange={(v) => s.set({ showStamp: v })} />
          <div className="mt-2">
            <Input label="Footer line" hint="Har report ke neeche — khali chhor dein to kuch nahi aayega" value={s.footerNote ?? ''} onChange={(e) => s.set({ footerNote: e.target.value })} maxLength={120} placeholder="Maslan: Shukriya! Dobara tashreef layein" />
          </div>
        </SectionCard>

        <SectionCard title="Thermal printer" icon={Receipt} color="emerald" desc="58mm aur 80mm printer par reports ka print">
          <Row title="Text ka size" help="Chhota printer ho ya nazar kamzor, to bara rakhein">
            <Segmented label="Thermal text" value={s.thermalText} onChange={(v) => s.set({ thermalText: v })}
              items={[{ value: 'sm', label: 'Chhota' }, { value: 'md', label: 'Normal' }, { value: 'lg', label: 'Bara' }]} />
          </Row>
          <Row title="Printer connection" help={direct ? (connected ? `Direct: ${printer.label}` : 'Direct on hai magar printer jura nahi') : 'Browser print — har dafa print window khulti hai'}>
            <div className="flex items-center gap-2">
              {connected ? <Badge variant="success" size="sm" dot>Jura hua</Badge> : <Badge variant={direct ? 'warning' : 'default'} size="sm">{direct ? <><Unplug className="mr-1 h-3 w-3" />Nahi jura</> : 'Browser'}</Badge>}
              <Link to="/settings/hardware" className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">Hardware <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
          </Row>
        </SectionCard>
      </div>

      <aside className="min-w-0 space-y-3 xl:sticky xl:top-20 xl:self-start">
        <PreviewPanel title="Preview"
          control={<Segmented label="Preview" value={preview} onChange={setPreview} items={[{ value: 'a4', label: 'A4' }, { value: '80', label: '80' }, { value: '58', label: '58' }]} />}>
          <div className="flex justify-center">
            <iframe title="Print preview" srcDoc={html} sandbox=""
              className={cn('rounded bg-ink-white shadow-sm', preview === 'a4' ? 'h-[460px] w-full' : preview === '80' ? 'h-[460px] w-[290px]' : 'h-[460px] w-[210px]')} />
          </div>
        </PreviewPanel>
        <SectionCard title="Test karein" desc="Dekh lein printer par kaisa nikalta hai" icon={Printer} color="slate">
          <div className="grid grid-cols-2 gap-2">
            {FORMATS.map((f) => (
              <Button key={f.id} variant="secondary" size="sm" leftIcon={<f.icon className="h-4 w-4" />} onClick={() => void test(f.id)}>{f.label}</Button>
            ))}
          </div>
        </SectionCard>
      </aside>
    </div>
  );
}

/* ── Pieces ── */

/** Grey panel beside the settings that holds a live preview. */
function PreviewPanel({ title, control, children }: { title: string; control: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {control}
      </div>
      {children}
    </div>
  );
}

/** A setting with its control on the right; spaced like the switch rows. */
function Row({ title, help, children }: { title: string; help?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {help && <div className="mt-0.5 text-xs leading-snug text-slate-500">{help}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function BrandSwatch({ className }: { className?: string }) {
  const { accentHex } = useAppearance();
  return <span className={cn(className, 'rounded')} style={{ background: accentHex }} />;
}

function InkSwatch({ className }: { className?: string }) {
  return <span className={cn(className, 'rounded bg-ink-900')} />;
}
