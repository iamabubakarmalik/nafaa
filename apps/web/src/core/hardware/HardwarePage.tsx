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
import { t as tr, Trans } from '@core/i18n';

const BAUDS = [9600, 19200, 38400, 57600, 115200].map((b) => ({ value: String(b), label: String(b) }));
const THEMES: Record<DisplayTheme, string> = { dark: tr('Dark'), black: tr('Kaala (andhera kamra)'), light: tr('Roshan') };

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
    toast.success(s.printMode === 'browser' ? tr('Print window khul rahi hai') : tr('Sample bill printer ko bheja'));
  };
  const openDrawer = () => run('drawer', () => openCashDrawer());
  const openDisplay = () => { if (!openCustomerDisplay()) toast.error(tr('Popup band hai — browser me is site ke popups allow karein')); };

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
    { value: 'browser', label: tr('Browser print') },
    { value: 'direct', label: tr('Direct (tez)') },
    ...(desktop ? [{ value: 'desktop' as PrintMode, label: tr('Desktop app') }] : []),
  ];

  const printerValue = s.printMode === 'browser' ? tr('Browser print')
    : s.printMode === 'desktop' ? (deskPrinter ? tr('Desktop app') : tr('Set nahi'))
    : st.printer.ready ? tr('Jura hua') : tr('Jura nahi');
  const printerOk = s.printMode === 'browser' || (s.printMode === 'desktop' ? deskPrinter : st.printer.ready);
  const drawerUsable = s.printMode !== 'browser';

  return (
    <div className="space-y-4">
      <HeaderActions>
        <Button size="sm" variant="secondary" title={tr('Sample bill print (T)')} leftIcon={<Receipt className="h-4 w-4" />} onClick={sampleBill}>
          <span className="hidden sm:inline">{tr('Test bill')}</span>
        </Button>
        <Button size="sm" variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={() => navigate('/settings/printing')}>
          <span className="hidden sm:inline">{tr('Printing')}</span>
        </Button>
        <IconButton label={tr('Guide (G)')} variant="secondary" onClick={guide.open}><GraduationCap className="h-4 w-4" /></IconButton>
      </HeaderActions>

      {!sup.serial && !sup.usb && !desktop && (
        <Alert tone="warning" title={tr('Ye browser hardware se seedha baat nahi karta')}>
          {/* i18n-ignore: browser names */}
          <Trans text="Computer par {{chrome}} ya {{edge}} kholein. Tab tak browser print aur scanner waise hi chalte rahenge." values={{ chrome: <b>Google Chrome</b>, edge: <b>Microsoft Edge</b> }} />
        </Alert>
      )}

      <KpiRow cols={5}>
        <KpiCard icon={Printer} color={printerOk ? '#16a34a' : '#d97706'} label={tr('Printer')} value={printerValue}
          hint={s.printMode === 'browser' ? tr('Har bill par print window') : s.printMode === 'desktop' ? tr('Nafaa desktop app se') : prettyLabel(s.printerLabel) || tr('Abhi koi nahi')} onClick={() => goTo('printer')} />
        <KpiCard icon={Archive} color={drawerUsable ? '#0891b2' : '#64748b'} label={tr('Cash drawer')} value={!drawerUsable ? tr('Band') : s.drawerOnCash ? tr('Khud khulta') : tr('Haath se')}
          hint={drawerUsable ? tr('Printer ke RJ11 se') : tr('Printer Direct karein')} onClick={() => goTo('drawer')} />
        <KpiCard icon={Barcode} color={scanOk ? '#16a34a' : '#7c3aed'} label={tr('Barcode scanner')} value={scanOk ? tr('Test pass') : tr('Khud chalta hai')}
          hint={tr('Keyboard ki tarah')} onClick={() => goTo('scanner')} />
        <KpiCard icon={Scale} color={s.scaleEnabled && st.scale.ready ? '#16a34a' : '#64748b'} label={tr('Tarazu')}
          value={s.scaleEnabled ? (st.scale.weightKg != null ? tr('{{value}} kg', { value: st.scale.weightKg.toFixed(3) }) : st.scale.ready ? tr('Jura hua') : tr('Jura nahi')) : tr('Nahi laga')}
          hint={s.scaleEnabled ? tr('Speed {{scaleBaud}}', { scaleBaud: s.scaleBaud }) : tr('Wazan wali cheezon ke liye')} onClick={() => goTo('scale')} />
        <KpiCard icon={Monitor} color="#2563eb" label={tr('Customer screen')} value={THEMES[display.theme]}
          hint={display.promos.length ? tr('{{count}} offer', { count: display.promos.length }) : tr('Doosri screen par bill')} onClick={() => goTo('display')} />
      </KpiRow>

      <div className="grid gap-4 2xl:grid-cols-2">
        {/* ── Printer ── */}
        <DeviceCard id="printer" icon={Printer} title={tr('Receipt printer')}
          badge={s.printMode === 'direct' ? (st.printer.ready ? <Badge variant="success" dot>{tr('Jura hua')}</Badge> : <Badge variant="warning" dot>{tr('Jura nahi')}</Badge>) : undefined}
          description={tr('Direct me bill 1 second me nikalta hai — na popup, na print dialog. Ghalti ho to bill khud browser print par chala jata hai.')}>
          <div className="space-y-4">
            <Segmented label={tr('Print ka tareeqa')} value={s.printMode} onChange={(v) => s.set({ printMode: v })} items={modes} />

            {s.printMode === 'browser' && (
              <Steps items={[
                tr('Printer Windows me "Printers & scanners" me laga hona chahiye.'),
                tr('Bill ek chhoti print window me khulta hai — wahan printer chun kar Print dabayein.'),
                tr('Har dafa window na chahiye to "Direct" chunein.'),
              ]} />
            )}

            {s.printMode === 'desktop' && (
              <Alert tone={deskPrinter ? 'success' : 'warning'} title={deskPrinter ? tr('Desktop app ka printer chal raha hai') : tr('Pehle desktop app me printer set karein')}>
                <Trans text={'LAN (IP) printer ke liye Nafaa desktop app ki {{settings}} me IP daal kar "Enable" karein.'} values={{ settings: <b>{tr('Printer settings')}</b> }} />
              </Alert>
            )}

            {s.printMode === 'direct' && (
              <>
                <Field label={tr('Printer kaise jura hai?')} hint={tr('Jo tareeqa is browser me nahi chalta woh band dikhta hai.')}>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <TransportBtn t="usb" cur={s.transport} on={(t) => s.set({ transport: t })} icon={<Usb className="h-4 w-4" />} title={tr('USB')} sub={tr('Cable se (Xprinter, Black Copper…)')} disabled={!sup.usb} />
                    <TransportBtn t="serial" cur={s.transport} on={(t) => s.set({ transport: t })} icon={<Cable className="h-4 w-4" />} title={tr('Serial / COM')} sub={tr('Windows par sab se pakka')} disabled={!sup.serial} />
                    <TransportBtn t="bluetooth" cur={s.transport} on={(t) => s.set({ transport: t })} icon={<Bluetooth className="h-4 w-4" />} title={tr('Bluetooth')} sub={tr('Chhota 58mm printer')} disabled={!sup.bluetooth} />
                  </div>
                </Field>

                {s.transport === 'serial' && (
                  <Select label={tr('Speed (baud)')} hint={tr('Printer ke self-test kaghaz par likha hota hai — aksar 9600 ya 115200.')} wrapperClassName="max-w-[12rem]"
                    value={String(s.printerBaud)} onChange={(e) => s.set({ printerBaud: Number(e.target.value) })} options={BAUDS} />
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Button loading={busy === 'pair'} leftIcon={<Printer className="h-4 w-4" />}
                    onClick={() => run('pair', () => pairPrinter(s.transport), tr('Printer jur gaya — ab test print karein'))}>
                    {st.printer.ready ? tr('Doosra printer') : tr('Printer jorein')}
                  </Button>
                  {st.printer.ready && (
                    <>
                      <Button variant="secondary" loading={busy === 'test'} onClick={() => run('test', () => sendToPrinter(testPageBytes(width)), tr('Test page bheja — kaghaz dekhein'))}>{tr('Test page')}</Button>
                      <Button variant="ghost" className="text-rose-600" leftIcon={<Unplug className="h-3.5 w-3.5" />} onClick={() => { void disconnectPrinter(); s.set({ printerLabel: '' }); }}>{tr('Hatayein')}</Button>
                    </>
                  )}
                </div>
                {st.printer.ready && (
                  <p className="flex items-center gap-1.5 text-[0.8125rem] text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-success-600" /> {prettyLabel(st.printer.label)}
                  </p>
                )}
                {!st.printer.ready && s.printerLabel && (
                  <p className="text-[0.8125rem] text-amber-700">{tr('{{value}} — tab tak bill browser print se nikalte rahenge.', { value: st.printer.error ?? 'Pichla printer abhi nahi mila' })}</p>
                )}

                <Toggle label={tr('Bill par barcode')} desc={tr('Return par bill scan ho sake. Purana printer barcode na chhape to band kar dein.')}
                  checked={s.printBarcode} onChange={(v) => s.set({ printBarcode: v })} />

                <Help title={tr('USB printer list me aata hai par jurta nahi? (Windows)')}>
                  <Steps items={[
                    tr('Windows ne printer par apna driver laga rakha hai, is liye browser usay nahi le sakta.'),
                    tr('Aasaan hal: printer ki CD / website se "Virtual COM" (USB-to-Serial) driver lagayein, phir yahan Serial / COM chunein.'),
                    tr('Ya printer ke tool (Xprinter tool) me "USB mode" ko VCOM kar dein.'),
                    tr('Kuch na chale to Browser print par rahein — wo hamesha chalta hai.'),
                  ]} />
                </Help>
              </>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <span className="text-[0.8125rem] font-medium text-slate-700">{tr('Sample bill:')}</span>
              <Segmented label={tr('Kaghaz')} value={width} onChange={setWidth} items={[{ value: '80', label: tr('80mm') }, { value: '58', label: tr('58mm') }]} />
              <Button variant="secondary" size="sm" leftIcon={<Receipt className="h-4 w-4" />} onClick={sampleBill}>{tr('Test bill (T)')}</Button>
            </div>
          </div>
        </DeviceCard>

        {/* ── Cash drawer ── */}
        <DeviceCard id="drawer" icon={Archive} title={tr('Cash drawer')}
          description={tr('Drawer printer ke peeche wale RJ11 (phone jaisi) taar se jurta hai. Printer Direct ya Desktop app par ho tabhi khulta hai.')}>
          <div className="space-y-4">
            <Steps items={[
              tr('Drawer ki taar printer ke peeche "DK" ya "Cash drawer" likhe soorakh me lagayein.'),
              tr('Upar printer ko Direct (ya Desktop app) par jorein.'),
              tr('"Abhi kholein" dabayein — drawer khul jaye to sab theek hai.'),
            ]} />
            <Toggle label={tr('Cash sale par khud khule')} desc={tr('Bill chhapte hi drawer khule — sirf jab payment Cash ho.')}
              checked={s.drawerOnCash} disabled={!drawerUsable} onChange={(v) => s.set({ drawerOnCash: v })} />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" disabled={!drawerUsable} loading={busy === 'drawer'} leftIcon={<Archive className="h-4 w-4" />} onClick={() => void openDrawer()}>{tr('Abhi kholein (D)')}</Button>
              {!drawerUsable && <span className="text-[0.75rem] text-slate-500">{tr('Browser print se drawer nahi khul sakta — printer ko Direct karein.')}</span>}
            </div>
          </div>
        </DeviceCard>

        {/* ── Barcode scanner ── */}
        <DeviceCard id="scanner" icon={Barcode} title={tr('Barcode scanner')}
          badge={scanOk ? <Badge variant="success" dot>{tr('Test pass')}</Badge> : undefined}
          description={tr('USB ya wireless scanner keyboard ki tarah chalta hai — kuch jorna nahi. POS par kahin bhi scan karein, cheez bill me aa jati hai.')}>
          <div className="space-y-4">
            <Steps items={[
              tr('Scanner ki USB taar computer me lagayein (wireless ho to us ka chhota dongle).'),
              tr('Neeche dabbe me click karke kisi bhi cheez ka barcode scan karein.'),
              tr('Code aur "Scanner theek hai" aaye to kaam ho gaya.'),
            ]} />
            <ScannerTest onPass={() => setScanOk(true)} />
            <Help title={tr('Scan karne par ajeeb harf aate hain ya kuch nahi hota?')}>
              <Steps items={[
                tr('Computer ka keyboard English (US) par ho — Urdu keyboard par code ghalat aata hai.'),
                tr('Caps Lock band karein.'),
                tr('Scanner ki kitaab me "USB HID / Keyboard mode" aur "Enter suffix" wala barcode scan karein.'),
              ]} />
            </Help>
          </div>
        </DeviceCard>

        {/* ── Scale ── */}
        <DeviceCard id="scale" icon={Scale} title={tr('Tarazu (weighing scale)')}
          badge={s.scaleEnabled ? (st.scale.ready ? <Badge variant="success" dot>{tr('Jura hua')}</Badge> : <Badge variant="warning" dot>{tr('Jura nahi')}</Badge>) : undefined}
          description={tr('RS-232 / USB taar wala digital tarazu. Jurne ke baad wazan wali cheez par live wazan aata hai — \'Ye wazan lo\' dabayein.')}>
          <div className="space-y-4">
            <Steps items={[
              tr('Tarazu ki taar computer se jorein (purani RS-232 ho to USB-to-Serial cable).'),
              tr('Speed (baud) tarazu ke manual se chunein — aksar 9600.'),
              tr('"Tarazu jorein" dabayein, list me se tarazu chunein, phir us par kuch rakh kar wazan dekhein.'),
            ]} />
            <Select label={tr('Speed (baud)')} hint={tr('Wazan na aaye to speed badal kar dobara jorein.')} wrapperClassName="max-w-[12rem]"
              value={String(s.scaleBaud)} onChange={(e) => s.set({ scaleBaud: Number(e.target.value) })} options={BAUDS} />
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={!sup.serial} loading={busy === 'scale'} leftIcon={<Scale className="h-4 w-4" />}
                onClick={() => run('scale', pairScale, tr('Tarazu jur gaya — us par kuch rakh kar dekhein'))}>
                {st.scale.ready ? tr('Doosra tarazu') : tr('Tarazu jorein')}
              </Button>
              {s.scaleEnabled && (
                <Button variant="ghost" className="text-rose-600" leftIcon={<Unplug className="h-3.5 w-3.5" />}
                  onClick={() => { void disconnectScale(); s.set({ scaleEnabled: false, scaleLabel: '' }); }}>{tr('Hatayein')}</Button>
              )}
              {!sup.serial && <span className="text-[0.75rem] text-slate-500">{tr('Is browser me Serial nahi — Chrome ya Edge kholein.')}</span>}
            </div>
            {s.scaleEnabled && (
              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="text-[0.75rem] text-slate-500">{tr('Live wazan {{value}}', { value: st.scale.ready ? (st.scale.stable ? tr('· ruka hua') : tr('· hil raha')) : '' })}</div>
                <div className="text-3xl font-extrabold tabular-nums text-slate-900">{st.scale.weightKg === null ? '—' : tr('{{value}} kg', { value: st.scale.weightKg.toFixed(3) })}</div>
                <div className="mt-1 font-mono text-[0.71875rem] text-slate-400">{st.scale.error ?? (st.scale.raw ? tr('Tarazu ne bheja: {{raw}}', { raw: st.scale.raw }) : tr('Tarazu se abhi kuch nahi aaya — speed (baud) badal kar dekhein'))}</div>
              </div>
            )}
          </div>
        </DeviceCard>
      </div>

      {/* ── Customer display ── */}
      <DisplayCard shopName={getReceiptSetup().shop.name} onOpen={openDisplay} />

      {guide.isOpen && (
        <PageGuide title={tr('Hardware — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Printer, color: '#16a34a', title: tr('Printer'), text: tr('Shuru me Browser print chalta hai. Tez aur bina dialog chahiye to "Direct" chun kar USB, Serial ya Bluetooth se jorein.') },
            { icon: Archive, color: '#0891b2', title: tr('Cash drawer'), text: tr('Drawer printer se jurta hai. Printer Direct ho to cash bill par drawer khud khul sakta hai.') },
            { icon: Barcode, color: '#7c3aed', title: tr('Scanner'), text: tr('Kuch set nahi karna. Scanner dabbe me test karein — code sahi aaye to POS par bhi chalega.') },
            { icon: Scale, color: '#d97706', title: tr('Tarazu'), text: tr('Serial taar se jorein. POS me wazan wali cheez par live wazan aata hai.') },
            { icon: Monitor, color: '#2563eb', title: tr('Customer screen'), text: tr('Doosri screen par bill, QR aur return. Andhere kamre ke liye "Kaala" rang chunein, apne offers bhi likhein.') },
            { icon: Send, color: '#e11d48', title: tr('Test'), text: tr('Har cheez ke saath test button hai. Pehle test karein, phir counter par lagayein.') },
          ]}
          tips={[
            tr('Ye settings sirf is computer ki hain — har counter par alag set karein.'),
            tr('Direct print ke liye Chrome ya Edge chahiye.'),
            tr('Bill ka design (logo, footer) Settings → Receipt me hai; kaghaz aur copies Printing me.'),
          ]}
          shortcuts={[['T', tr('test bill')], ['D', tr('drawer')], ['C', tr('customer screen')], ['G', tr('guide')]]}
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
    <DeviceCard id="display" icon={Monitor} title={tr('Customer display')}
      description={tr('Customer ki taraf wali screen par live bill, payment QR aur return ki amount — bharosa barhta hai, jhagra kam.')}>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Steps items={[
            tr('Doosra monitor ya purana LCD computer se HDMI par jorein (ya customer ki taraf screen mor dein).'),
            tr('"Display kholein" dabayein — nayi window khulegi. Usay doosri screen par le jayein aur double-click karein (full screen).'),
            tr('POS me cheez daalte hi wahan nazar aayegi; QR se payment aur bill ke baad "Shukriya" aur wapsi.'),
          ]} />
          <div className="flex flex-wrap gap-2">
            <Button leftIcon={<Monitor className="h-4 w-4" />} onClick={onOpen}>{tr('Display kholein (C)')}</Button>
            <Button variant="secondary" leftIcon={<Send className="h-4 w-4" />} onClick={() => { sendDisplayTest(shopName); toast.success(tr('Test bill display par bheja')); }}>{tr('Test bill bhejein')}</Button>
          </div>
          <Field label={tr('Screen ka rang')} hint={tr('Andhere kamre ya raat ki dukaan me "Kaala" aankhon ko nahi chubhta.')}>
            <div>
              <Segmented label={tr('Screen ka rang')} value={d.theme} onChange={(v) => d.set({ theme: v })}
                items={(Object.keys(THEMES) as DisplayTheme[]).map((t) => ({ value: t, label: THEMES[t] }))} />
            </div>
          </Field>
          <div>
            <Toggle label={tr('Logo dikhayein')} desc={tr('Settings → Store details wala logo')} checked={d.showLogo} onChange={(v) => d.set({ showLogo: v })} />
            <Toggle label={tr('Ghari (waqt)')} checked={d.showClock} onChange={(v) => d.set({ showClock: v })} />
            <Toggle label={tr('Payment QR bara dikhayein')} desc={tr('Raast / JazzCash / Easypaisa se payment par customer seedha scan kare')} checked={d.showQr} onChange={(v) => d.set({ showQr: v })} />
          </div>
        </div>
        <div className="space-y-4">
          <Input label={tr('Khush-amdeed line')} maxLength={60} value={d.welcome} onChange={(e) => d.set({ welcome: e.target.value })}
            placeholder={tr('Khush-amdeed')} hint={tr('Jab koi bill na chal raha ho to bara likha aata hai')} />
          <Textarea label={tr('Dukaan ke offers')} rows={5} value={promos} onChange={(e) => setPromos(e.target.value)} onBlur={savePromos}
            placeholder={tr('Har line ek offer, maslan:\nJumma ko har cheez par 10% discount\nHome delivery: 0300-1234567')}
            hint={tr('Har line alag — {{MAX_PROMOS}} tak, har ek {{PROMO_LENGTH}} harf tak. Bari screen par baari baari aate hain.', { MAX_PROMOS, PROMO_LENGTH })} />
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
      <span className="text-[0.625rem] font-semibold uppercase tracking-wider opacity-50">{tr('Preview')}</span>
      <span className="text-xl font-black">{welcome || tr('Khush-amdeed')}</span>
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
      <Input label={tr('Yahan scan karein')} leftIcon={<Barcode className="h-4 w-4" />} value={value} placeholder={tr('Click karke barcode scan karein')}
        onChange={(e) => { setValue(e.target.value); if (!e.target.value) stamps.current = []; }} onKeyDown={onKeyDown} autoComplete="off" />
      {result && (
        result.scanner
          ? <Alert tone="success" title={tr('Scanner theek hai')}>{tr('Code:')}{' '} <span className="font-mono font-semibold">{result.code}</span></Alert>
          : <Alert tone="warning" title={tr('Ye haath se likha laga')}><Trans text="Code {{code}} aaya. Scanner se scan karein — Enter khud na aaye to neeche madad dekhein." values={{ code: <span className="font-mono">{result.code}</span> }} /></Alert>
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
      <summary className="flex cursor-pointer items-center gap-1.5 text-[0.8125rem] font-semibold text-slate-800"><ArrowRight className="h-3.5 w-3.5 rtl-flip" /> {title}</summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

function TransportBtn({ t, cur, on, icon, title, sub, disabled }: {
  t: Transport; cur: Transport; on: (t: Transport) => void; icon: ReactNode; title: string; sub: string; disabled?: boolean;
}) {
  return (
    <button type="button" disabled={disabled} onClick={() => on(t)}
      className={cn('rounded-xl border p-3 text-start transition disabled:cursor-not-allowed disabled:opacity-40',
        cur === t ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300')}>
      <div className="flex items-center gap-2 text-[0.84375rem] font-semibold text-slate-900">{icon} {title}</div>
      <div className="mt-0.5 text-[0.75rem] text-slate-500">{disabled ? tr('Is browser me nahi') : sub}</div>
    </button>
  );
}
