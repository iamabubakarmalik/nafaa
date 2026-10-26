/**
 * Settings → Hardware: receipt printer, cash drawer, barcode scanner,
 * weighing scale and customer display for this computer (each counter has
 * its own devices, so everything here is stored in the browser). Each
 * device has setup steps and a test button. Nothing changes until the shop
 * picks it: by default bills use browser print and the scanner works as a
 * keyboard. The Settings frame supplies the page title; the page actions go
 * into its header.
 */

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Archive, ArrowRight, Barcode, Bluetooth, Cable, CheckCircle2, GraduationCap, Monitor, Printer, Receipt, Scale, Send, Unplug, Usb,
} from 'lucide-react';
import {
  Alert, Badge, Button, IconButton, Input, KpiCard, KpiRow, Segmented, Select, Textarea,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { HeaderActions } from '@modules/organization/settings/components/SettingsFrame';
import { Field, SectionCard, Toggle } from '@modules/organization/settings/components/SettingsBlocks';
import { isElectron } from '@core/lib/desktop/electron';
import { usePrinterStore } from '@core/lib/desktop/printerStore';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { printReceipt } from '@core/receipt/print';
import { getReceiptSetup } from '@core/receipt/setup';
import { sampleReceipt } from '@core/receipt/sample';
import { disconnectPrinter, disconnectScale, pairPrinter, pairScale, prettyLabel, sendToPrinter, useDeviceStatus } from './devices';
import { openCashDrawer } from './print';
import { testPageBytes } from './receiptBytes';
import { openCustomerDisplay, sendDisplayTest } from './customerDisplay';
import { MAX_PROMOS, PROMO_LENGTH, cleanPromos, useDisplaySettings, type DisplayTheme } from './displaySettings';
import { hardwareSupport, useHardwareSettings, type PrintMode, type Transport } from './settings';

const BAUDS = [9600, 19200, 38400, 57600, 115200].map((b) => ({ value: String(b), label: String(b) }));
const THEMES: Record<DisplayTheme, string> = { dark: 'Dark', black: 'Kaala (andhera kamra)', light: 'Roshan' };

type Section = 'printer' | 'drawer' | 'scanner' | 'scale' | 'display';

const goTo = (id: Section) => document.getElementById(`hw-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export default function HardwarePage() {
  const s = useHardwareSettings();
  const st = useDeviceStatus();
  const display = useDisplaySettings();
  const sup = hardwareSupport();
  const desktop = isElectron();
  const deskPrinter = usePrinterStore((x) => x.enabled && x.config.connectionType !== 'system');
  const guide = usePageGuide();
  const navigate = useNavigate();
  const [width, setWidth] = useState<'80' | '58'>('80');
  const [busy, setBusy] = useState('');
  const [scanOk, setScanOk] = useState(false);

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); } catch (e) {
      const msg = (e as Error).message;
      // Closing the browser's device list is not an error.
      if (!/No device selected|No port selected|cancelled|User cancelled/i.test(msg)) toast.error(msg);
    } finally { setBusy(''); }
  };

  const sampleBill = () => {
    printReceipt(sampleReceipt(), { paper: width, copies: 1 });
    toast.success(s.printMode === 'browser' ? 'Print window khul rahi hai' : 'Sample bill printer ko bheja');
  };
  const openDrawer = () => run('drawer', () => openCashDrawer());
  const openDisplay = () => { if (!openCustomerDisplay()) toast.error('Popup band hai — browser me is site ke popups allow karein'); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (k === 't') { e.preventDefault(); sampleBill(); }
      if (k === 'd' && s.printMode !== 'browser') { e.preventDefault(); void openDrawer(); }
      if (k === 'c') { e.preventDefault(); openDisplay(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const modes: Array<{ value: PrintMode; label: string }> = [
    { value: 'browser', label: 'Browser print' },
    { value: 'direct', label: 'Direct (tez)' },
    ...(desktop ? [{ value: 'desktop' as PrintMode, label: 'Desktop app' }] : []),
  ];

  const printerValue = s.printMode === 'browser' ? 'Browser print'
    : s.printMode === 'desktop' ? (deskPrinter ? 'Desktop app' : 'Set nahi')
    : st.printer.ready ? 'Jura hua' : 'Jura nahi';
  const printerOk = s.printMode === 'browser' || (s.printMode === 'desktop' ? deskPrinter : st.printer.ready);
  const drawerUsable = s.printMode !== 'browser';

  return (
    <div className="space-y-4">
      <HeaderActions>
        <Button size="sm" variant="secondary" title="Sample bill print (T)" leftIcon={<Receipt className="h-4 w-4" />} onClick={sampleBill}>
          <span className="hidden sm:inline">Test bill</span>
        </Button>
        <Button size="sm" variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={() => navigate('/settings/printing')}>
          <span className="hidden sm:inline">Printing</span>
        </Button>
        <IconButton label="Guide (G)" variant="secondary" onClick={guide.open}><GraduationCap className="h-4 w-4" /></IconButton>
      </HeaderActions>

      {!sup.serial && !sup.usb && !desktop && (
        <Alert tone="warning" title="Ye browser hardware se seedha baat nahi karta">
          Computer par <b>Google Chrome</b> ya <b>Microsoft Edge</b> kholein. Tab tak browser print aur scanner waise hi chalte rahenge.
        </Alert>
      )}

      <KpiRow cols={5}>
        <KpiCard icon={Printer} color={printerOk ? '#16a34a' : '#d97706'} label="Printer" value={printerValue}
          hint={s.printMode === 'browser' ? 'Har bill par print window' : s.printMode === 'desktop' ? 'Nafaa desktop app se' : prettyLabel(s.printerLabel) || 'Abhi koi nahi'} onClick={() => goTo('printer')} />
        <KpiCard icon={Archive} color={drawerUsable ? '#0891b2' : '#64748b'} label="Cash drawer" value={!drawerUsable ? 'Band' : s.drawerOnCash ? 'Khud khulta' : 'Haath se'}
          hint={drawerUsable ? 'Printer ke RJ11 se' : 'Printer Direct karein'} onClick={() => goTo('drawer')} />
        <KpiCard icon={Barcode} color={scanOk ? '#16a34a' : '#7c3aed'} label="Barcode scanner" value={scanOk ? 'Test pass' : 'Khud chalta hai'}
          hint="Keyboard ki tarah" onClick={() => goTo('scanner')} />
        <KpiCard icon={Scale} color={s.scaleEnabled && st.scale.ready ? '#16a34a' : '#64748b'} label="Tarazu"
          value={s.scaleEnabled ? (st.scale.weightKg != null ? `${st.scale.weightKg.toFixed(3)} kg` : st.scale.ready ? 'Jura hua' : 'Jura nahi') : 'Nahi laga'}
          hint={s.scaleEnabled ? `Speed ${s.scaleBaud}` : 'Wazan wali cheezon ke liye'} onClick={() => goTo('scale')} />
        <KpiCard icon={Monitor} color="#2563eb" label="Customer screen" value={THEMES[display.theme]}
          hint={display.promos.length ? `${display.promos.length} offer` : 'Doosri screen par bill'} onClick={() => goTo('display')} />
      </KpiRow>

      <div className="grid gap-4 2xl:grid-cols-2">
        {/* ── Printer ── */}
        <DeviceCard id="printer" icon={Printer} title="Receipt printer"
          badge={s.printMode === 'direct' ? (st.printer.ready ? <Badge variant="success" dot>Jura hua</Badge> : <Badge variant="warning" dot>Jura nahi</Badge>) : undefined}
          description="Direct me bill 1 second me nikalta hai — na popup, na print dialog. Ghalti ho to bill khud browser print par chala jata hai.">
          <div className="space-y-4">
            <Segmented label="Print ka tareeqa" value={s.printMode} onChange={(v) => s.set({ printMode: v })} items={modes} />

            {s.printMode === 'browser' && (
              <Steps items={[
                'Printer Windows me "Printers & scanners" me laga hona chahiye.',
                'Bill ek chhoti print window me khulta hai — wahan printer chun kar Print dabayein.',
                'Har dafa window na chahiye to "Direct" chunein.',
              ]} />
            )}

            {s.printMode === 'desktop' && (
              <Alert tone={deskPrinter ? 'success' : 'warning'} title={deskPrinter ? 'Desktop app ka printer chal raha hai' : 'Pehle desktop app me printer set karein'}>
                LAN (IP) printer ke liye Nafaa desktop app ki <b>Printer settings</b> me IP daal kar "Enable" karein.
              </Alert>
            )}

            {s.printMode === 'direct' && (
              <>
                <Field label="Printer kaise jura hai?" hint="Jo tareeqa is browser me nahi chalta woh band dikhta hai.">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <TransportBtn t="usb" cur={s.transport} on={(t) => s.set({ transport: t })} icon={<Usb className="h-4 w-4" />} title="USB" sub="Cable se (Xprinter, Black Copper…)" disabled={!sup.usb} />
                    <TransportBtn t="serial" cur={s.transport} on={(t) => s.set({ transport: t })} icon={<Cable className="h-4 w-4" />} title="Serial / COM" sub="Windows par sab se pakka" disabled={!sup.serial} />
                    <TransportBtn t="bluetooth" cur={s.transport} on={(t) => s.set({ transport: t })} icon={<Bluetooth className="h-4 w-4" />} title="Bluetooth" sub="Chhota 58mm printer" disabled={!sup.bluetooth} />
                  </div>
                </Field>

                {s.transport === 'serial' && (
                  <Select label="Speed (baud)" hint="Printer ke self-test kaghaz par likha hota hai — aksar 9600 ya 115200." wrapperClassName="max-w-[12rem]"
                    value={String(s.printerBaud)} onChange={(e) => s.set({ printerBaud: Number(e.target.value) })} options={BAUDS} />
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Button loading={busy === 'pair'} leftIcon={<Printer className="h-4 w-4" />}
                    onClick={() => run('pair', () => pairPrinter(s.transport), 'Printer jur gaya — ab test print karein')}>
                    {st.printer.ready ? 'Doosra printer' : 'Printer jorein'}
                  </Button>
                  {st.printer.ready && (
                    <>
                      <Button variant="secondary" loading={busy === 'test'} onClick={() => run('test', () => sendToPrinter(testPageBytes(width)), 'Test page bheja — kaghaz dekhein')}>Test page</Button>
                      <Button variant="ghost" className="text-rose-600" leftIcon={<Unplug className="h-3.5 w-3.5" />} onClick={() => { void disconnectPrinter(); s.set({ printerLabel: '' }); }}>Hatayein</Button>
                    </>
                  )}
                </div>
                {st.printer.ready && (
                  <p className="flex items-center gap-1.5 text-[0.8125rem] text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-success-600" /> {prettyLabel(st.printer.label)}
                  </p>
                )}
                {!st.printer.ready && s.printerLabel && (
                  <p className="text-[0.8125rem] text-amber-700">{st.printer.error ?? 'Pichla printer abhi nahi mila'} — tab tak bill browser print se nikalte rahenge.</p>
                )}

                <Toggle label="Bill par barcode" desc="Return par bill scan ho sake. Purana printer barcode na chhape to band kar dein."
                  checked={s.printBarcode} onChange={(v) => s.set({ printBarcode: v })} />

                <Help title="USB printer list me aata hai par jurta nahi? (Windows)">
                  <Steps items={[
                    'Windows ne printer par apna driver laga rakha hai, is liye browser usay nahi le sakta.',
                    'Aasaan hal: printer ki CD / website se "Virtual COM" (USB-to-Serial) driver lagayein, phir yahan Serial / COM chunein.',
                    'Ya printer ke tool (Xprinter tool) me "USB mode" ko VCOM kar dein.',
                    'Kuch na chale to Browser print par rahein — wo hamesha chalta hai.',
                  ]} />
                </Help>
              </>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-[0.8125rem] font-medium text-slate-700">Sample bill:</span>
              <Segmented label="Kaghaz" value={width} onChange={setWidth} items={[{ value: '80', label: '80mm' }, { value: '58', label: '58mm' }]} />
              <Button variant="secondary" size="sm" leftIcon={<Receipt className="h-4 w-4" />} onClick={sampleBill}>Test bill (T)</Button>
            </div>
          </div>
        </DeviceCard>

        {/* ── Cash drawer ── */}
        <DeviceCard id="drawer" icon={Archive} title="Cash drawer"
          description="Drawer printer ke peeche wale RJ11 (phone jaisi) taar se jurta hai. Printer Direct ya Desktop app par ho tabhi khulta hai.">
          <div className="space-y-4">
            <Steps items={[
              'Drawer ki taar printer ke peeche "DK" ya "Cash drawer" likhe soorakh me lagayein.',
              'Upar printer ko Direct (ya Desktop app) par jorein.',
              '"Abhi kholein" dabayein — drawer khul jaye to sab theek hai.',
            ]} />
            <Toggle label="Cash sale par khud khule" desc="Bill chhapte hi drawer khule — sirf jab payment Cash ho."
              checked={s.drawerOnCash} disabled={!drawerUsable} onChange={(v) => s.set({ drawerOnCash: v })} />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" disabled={!drawerUsable} loading={busy === 'drawer'} leftIcon={<Archive className="h-4 w-4" />} onClick={() => void openDrawer()}>Abhi kholein (D)</Button>
              {!drawerUsable && <span className="text-[0.75rem] text-slate-500">Browser print se drawer nahi khul sakta — printer ko Direct karein.</span>}
            </div>
          </div>
        </DeviceCard>

        {/* ── Barcode scanner ── */}
        <DeviceCard id="scanner" icon={Barcode} title="Barcode scanner"
          badge={scanOk ? <Badge variant="success" dot>Test pass</Badge> : undefined}
          description="USB ya wireless scanner keyboard ki tarah chalta hai — kuch jorna nahi. POS par kahin bhi scan karein, cheez bill me aa jati hai.">
          <div className="space-y-4">
            <Steps items={[
              'Scanner ki USB taar computer me lagayein (wireless ho to us ka chhota dongle).',
              'Neeche dabbe me click karke kisi bhi cheez ka barcode scan karein.',
              'Code aur "Scanner theek hai" aaye to kaam ho gaya.',
            ]} />
            <ScannerTest onPass={() => setScanOk(true)} />
            <Help title="Scan karne par ajeeb harf aate hain ya kuch nahi hota?">
              <Steps items={[
                'Computer ka keyboard English (US) par ho — Urdu keyboard par code ghalat aata hai.',
                'Caps Lock band karein.',
                'Scanner ki kitaab me "USB HID / Keyboard mode" aur "Enter suffix" wala barcode scan karein.',
              ]} />
            </Help>
          </div>
        </DeviceCard>

        {/* ── Scale ── */}
        <DeviceCard id="scale" icon={Scale} title="Tarazu (weighing scale)"
          badge={s.scaleEnabled ? (st.scale.ready ? <Badge variant="success" dot>Jura hua</Badge> : <Badge variant="warning" dot>Jura nahi</Badge>) : undefined}
          description="RS-232 / USB taar wala digital tarazu. Jurne ke baad wazan wali cheez par live wazan aata hai — 'Ye wazan lo' dabayein.">
          <div className="space-y-4">
            <Steps items={[
              'Tarazu ki taar computer se jorein (purani RS-232 ho to USB-to-Serial cable).',
              'Speed (baud) tarazu ke manual se chunein — aksar 9600.',
              '"Tarazu jorein" dabayein, list me se tarazu chunein, phir us par kuch rakh kar wazan dekhein.',
            ]} />
            <Select label="Speed (baud)" hint="Wazan na aaye to speed badal kar dobara jorein." wrapperClassName="max-w-[12rem]"
              value={String(s.scaleBaud)} onChange={(e) => s.set({ scaleBaud: Number(e.target.value) })} options={BAUDS} />
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={!sup.serial} loading={busy === 'scale'} leftIcon={<Scale className="h-4 w-4" />}
                onClick={() => run('scale', pairScale, 'Tarazu jur gaya — us par kuch rakh kar dekhein')}>
                {st.scale.ready ? 'Doosra tarazu' : 'Tarazu jorein'}
              </Button>
              {s.scaleEnabled && (
                <Button variant="ghost" className="text-rose-600" leftIcon={<Unplug className="h-3.5 w-3.5" />}
                  onClick={() => { void disconnectScale(); s.set({ scaleEnabled: false, scaleLabel: '' }); }}>Hatayein</Button>
              )}
              {!sup.serial && <span className="text-[0.75rem] text-slate-500">Is browser me Serial nahi — Chrome ya Edge kholein.</span>}
            </div>
            {s.scaleEnabled && (
              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-[0.75rem] text-slate-500">Live wazan {st.scale.ready && (st.scale.stable ? '· ruka hua' : '· hil raha')}</div>
                <div className="text-3xl font-extrabold tabular-nums text-slate-900">{st.scale.weightKg === null ? '—' : `${st.scale.weightKg.toFixed(3)} kg`}</div>
                <div className="mt-1 font-mono text-[0.71875rem] text-slate-400">{st.scale.error ?? (st.scale.raw ? `Tarazu ne bheja: ${st.scale.raw}` : 'Tarazu se abhi kuch nahi aaya — speed (baud) badal kar dekhein')}</div>
              </div>
            )}
          </div>
        </DeviceCard>
      </div>

      {/* ── Customer display ── */}
      <DisplayCard shopName={getReceiptSetup().shop.name} onOpen={openDisplay} />

      {guide.isOpen && (
        <PageGuide title="Hardware — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Printer, color: '#16a34a', title: 'Printer', text: 'Shuru me Browser print chalta hai. Tez aur bina dialog chahiye to "Direct" chun kar USB, Serial ya Bluetooth se jorein.' },
            { icon: Archive, color: '#0891b2', title: 'Cash drawer', text: 'Drawer printer se jurta hai. Printer Direct ho to cash bill par drawer khud khul sakta hai.' },
            { icon: Barcode, color: '#7c3aed', title: 'Scanner', text: 'Kuch set nahi karna. Scanner dabbe me test karein — code sahi aaye to POS par bhi chalega.' },
            { icon: Scale, color: '#d97706', title: 'Tarazu', text: 'Serial taar se jorein. POS me wazan wali cheez par live wazan aata hai.' },
            { icon: Monitor, color: '#2563eb', title: 'Customer screen', text: 'Doosri screen par bill, QR aur return. Andhere kamre ke liye "Kaala" rang chunein, apne offers bhi likhein.' },
            { icon: Send, color: '#e11d48', title: 'Test', text: 'Har cheez ke saath test button hai. Pehle test karein, phir counter par lagayein.' },
          ]}
          tips={[
            'Ye settings sirf is computer ki hain — har counter par alag set karein.',
            'Direct print ke liye Chrome ya Edge chahiye.',
            'Bill ka design (logo, footer) Settings → Receipt me hai; kaghaz aur copies Printing me.',
          ]}
          shortcuts={[['T', 'test bill'], ['D', 'drawer'], ['C', 'customer screen'], ['G', 'guide']]}
        />
      )}
    </div>
  );
}

/* ── Customer display settings ── */

function DisplayCard({ shopName, onOpen }: { shopName: string; onOpen: () => void }) {
  const d = useDisplaySettings();
  const [promos, setPromos] = useState(d.promos.join('\n'));
  const savePromos = () => { const list = cleanPromos(promos.split('\n')); d.set({ promos: list }); setPromos(list.join('\n')); };

  return (
    <DeviceCard id="display" icon={Monitor} title="Customer display"
      description="Customer ki taraf wali screen par live bill, payment QR aur return ki amount — bharosa barhta hai, jhagra kam.">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Steps items={[
            'Doosra monitor ya purana LCD computer se HDMI par jorein (ya customer ki taraf screen mor dein).',
            '"Display kholein" dabayein — nayi window khulegi. Usay doosri screen par le jayein aur double-click karein (full screen).',
            'POS me cheez daalte hi wahan nazar aayegi; QR se payment aur bill ke baad "Shukriya" aur wapsi.',
          ]} />
          <div className="flex flex-wrap gap-2">
            <Button leftIcon={<Monitor className="h-4 w-4" />} onClick={onOpen}>Display kholein (C)</Button>
            <Button variant="secondary" leftIcon={<Send className="h-4 w-4" />} onClick={() => { sendDisplayTest(shopName); toast.success('Test bill display par bheja'); }}>Test bill bhejein</Button>
          </div>
          <Field label="Screen ka rang" hint='Andhere kamre ya raat ki dukaan me "Kaala" aankhon ko nahi chubhta.'>
            <div>
              <Segmented label="Screen ka rang" value={d.theme} onChange={(v) => d.set({ theme: v })}
                items={(Object.keys(THEMES) as DisplayTheme[]).map((t) => ({ value: t, label: THEMES[t] }))} />
            </div>
          </Field>
          <div>
            <Toggle label="Logo dikhayein" desc="Settings → Store details wala logo" checked={d.showLogo} onChange={(v) => d.set({ showLogo: v })} />
            <Toggle label="Ghari (waqt)" checked={d.showClock} onChange={(v) => d.set({ showClock: v })} />
            <Toggle label="Payment QR bara dikhayein" desc="Raast / JazzCash / Easypaisa se payment par customer seedha scan kare" checked={d.showQr} onChange={(v) => d.set({ showQr: v })} />
          </div>
        </div>
        <div className="space-y-4">
          <Input label="Khush-amdeed line" maxLength={60} value={d.welcome} onChange={(e) => d.set({ welcome: e.target.value })}
            placeholder="Khush-amdeed" hint="Jab koi bill na chal raha ho to bara likha aata hai" />
          <Textarea label="Dukaan ke offers" rows={5} value={promos} onChange={(e) => setPromos(e.target.value)} onBlur={savePromos}
            placeholder={'Har line ek offer, maslan:\nJumma ko har cheez par 10% discount\nHome delivery: 0300-1234567'}
            hint={`Har line alag — ${MAX_PROMOS} tak, har ek ${PROMO_LENGTH} harf tak. Bari screen par baari baari aate hain.`} />
          <DisplayPreview theme={d.theme} welcome={d.welcome} promo={cleanPromos(promos.split('\n'))[0]} />
        </div>
      </div>
    </DeviceCard>
  );
}

/** Small picture of the waiting screen in the chosen colours. */
function DisplayPreview({ theme, welcome, promo }: { theme: DisplayTheme; welcome: string; promo?: string }) {
  const bg = theme === 'black' ? 'bg-black text-ink-300' : theme === 'light' ? 'bg-ink-50 text-ink-900 ring-1 ring-ink-200' : 'bg-ink-950 text-ink-white';
  return (
    <div className={cn('flex aspect-video flex-col items-center justify-center gap-1.5 rounded-xl px-4 text-center', bg)}>
      <span className="text-[0.625rem] font-semibold uppercase tracking-wider opacity-50">Preview</span>
      <span className="text-xl font-black">{welcome || 'Khush-amdeed'}</span>
      {promo && <span className="max-w-full truncate rounded-lg bg-ink-white/10 px-3 py-1 text-xs font-semibold">{promo}</span>}
    </div>
  );
}

/* ── Scanner test ── */

/** Scanners type a whole code in a few milliseconds and press Enter; people are slower. */
function ScannerTest({ onPass }: { onPass: () => void }) {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<{ code: string; scanner: boolean } | null>(null);
  const stamps = useRef<number[]>([]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') { if (e.key.length === 1) stamps.current.push(performance.now()); return; }
    e.preventDefault();
    const code = value.trim();
    const t = stamps.current;
    stamps.current = [];
    setValue('');
    if (!code) return;
    const avgGap = t.length > 1 ? (t[t.length - 1] - t[0]) / (t.length - 1) : Infinity;
    const scanner = code.length >= 4 && avgGap < 40;
    setResult({ code, scanner });
    if (scanner) onPass();
  };

  return (
    <div className="space-y-2">
      <Input label="Yahan scan karein" leftIcon={<Barcode className="h-4 w-4" />} value={value} placeholder="Click karke barcode scan karein"
        onChange={(e) => { setValue(e.target.value); if (!e.target.value) stamps.current = []; }} onKeyDown={onKeyDown} autoComplete="off" />
      {result && (
        result.scanner
          ? <Alert tone="success" title="Scanner theek hai">Code: <span className="font-mono font-semibold">{result.code}</span></Alert>
          : <Alert tone="warning" title="Ye haath se likha laga">Code <span className="font-mono">{result.code}</span> aaya. Scanner se scan karein — Enter khud na aaye to neeche madad dekhein.</Alert>
      )}
    </div>
  );
}

/* ── Pieces ── */

const DEVICE_TONE: Record<Section, 'emerald' | 'cyan' | 'violet' | 'amber' | 'blue'> = {
  printer: 'emerald', drawer: 'cyan', scanner: 'violet', scale: 'amber', display: 'blue',
};

function DeviceCard({ id, icon, title, badge, description, children }: {
  id: Section; icon: typeof Printer; title: string; badge?: ReactNode; description: ReactNode; children: ReactNode;
}) {
  return (
    <SectionCard id={`hw-${id}`} icon={icon} color={DEVICE_TONE[id]} title={title} badge={badge} desc={description}>
      {children}
    </SectionCard>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-1.5 text-[0.8125rem] text-slate-700">
      {items.map((t, i) => (
        <li key={t} className="flex gap-2.5">
          <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[0.6875rem] font-bold text-slate-600">{i + 1}</span>
          <span>{t}</span>
        </li>
      ))}
    </ol>
  );
}

function Help({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <summary className="flex cursor-pointer items-center gap-1.5 text-[0.8125rem] font-semibold text-slate-800"><ArrowRight className="h-3.5 w-3.5" /> {title}</summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

function TransportBtn({ t, cur, on, icon, title, sub, disabled }: {
  t: Transport; cur: Transport; on: (t: Transport) => void; icon: ReactNode; title: string; sub: string; disabled?: boolean;
}) {
  return (
    <button type="button" disabled={disabled} onClick={() => on(t)}
      className={cn('rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40',
        cur === t ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300')}>
      <div className="flex items-center gap-2 text-[0.84375rem] font-semibold text-slate-900">{icon} {title}</div>
      <div className="mt-0.5 text-[0.75rem] text-slate-500">{disabled ? 'Is browser me nahi' : sub}</div>
    </button>
  );
}
