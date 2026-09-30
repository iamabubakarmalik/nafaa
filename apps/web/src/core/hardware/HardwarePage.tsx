import { useState } from 'react';
import { toast } from 'sonner';
import { Archive, Bluetooth, Cable, CheckCircle2, Monitor, Printer, Scale, Unplug, Usb } from 'lucide-react';
import { Badge, Banner, Btn, Card, Field, Page, Segmented, SettingRow, Toggle, inputCls } from '@integrations/online-orders/components/ui/kit';
import { isElectron } from '@core/lib/desktop/electron';
import { usePrinterStore } from '@core/lib/desktop/printerStore';
import { cn } from '@core/lib/cn';
import { disconnectPrinter, disconnectScale, pairPrinter, pairScale, prettyLabel, sendToPrinter, useDeviceStatus } from './devices';
import { openCashDrawer } from './print';
import { testPageBytes } from './receiptBytes';
import { openCustomerDisplay } from './customerDisplay';
import { hardwareSupport, useHardwareSettings, type PrintMode, type Transport } from './settings';

/* ═════════════════════════════════════════════════════════════
   HARDWARE — printer, cash drawer, tarazu, customer screen.
   Sab is computer ke liye (har counter apna). Kuch na chhera jaye
   to sab pehle jaisa: browser print aur keyboard wala scanner.
   ═════════════════════════════════════════════════════════════ */

const BAUDS = [9600, 19200, 38400, 57600, 115200];

export default function HardwarePage() {
  const s = useHardwareSettings();
  const st = useDeviceStatus();
  const sup = hardwareSupport();
  const desktop = isElectron();
  const deskPrinter = usePrinterStore((x) => x.enabled && x.config.connectionType !== 'system');
  const [width, setWidth] = useState<'80' | '58'>('80');
  const [busy, setBusy] = useState('');

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); } catch (e) {
      const msg = (e as Error).message;
      // User ne list band kar di — ghalti nahi
      if (!/No device selected|No port selected|cancelled|User cancelled/i.test(msg)) toast.error(msg);
    } finally { setBusy(''); }
  };

  const modes: Array<{ value: PrintMode; label: string }> = [
    { value: 'browser', label: 'Browser print (purana)' },
    { value: 'direct', label: 'Direct (tez)' },
    ...(desktop ? [{ value: 'desktop' as PrintMode, label: 'Desktop app printer' }] : []),
  ];

  return (
    <Page narrow back={{ to: '/settings', label: 'Settings' }} title="Hardware"
      subtitle="Thermal printer, cash drawer, tarazu aur customer screen — is computer ke liye.">
      {!sup.serial && !sup.usb && !desktop && (
        <Banner tone="warning" title="Ye browser hardware se seedha baat nahi karta">
          Computer par <b>Google Chrome</b> ya <b>Microsoft Edge</b> kholein. Tab tak browser print aur scanner waise hi chalte rahenge.
        </Banner>
      )}

      {/* ─────────────── PRINTER ─────────────── */}
      <Card title={<span className="flex items-center gap-2"><Printer className="h-4 w-4" /> Receipt printer
        {s.printMode === 'direct' && (st.printer.ready ? <Badge tone="success" dot>Jura hua</Badge> : <Badge tone="warning" dot>Jura nahi</Badge>)}</span>}
        description="Direct me bill 1 second me — popup ya Print dialog nahi. Ghalti ho to khud browser print par aa jata hai.">
        <div className="space-y-4">
          <Segmented value={s.printMode} onChange={(v) => s.set({ printMode: v })} items={modes} />

          {s.printMode === 'browser' && (
            <p className="text-[13px] text-slate-600 dark:text-slate-300">
              Abhi wala tareeqa: bill ek chhoti window me khulta hai aur Windows ka printer chhapta hai. Tez aur bina dialog chahiye to <b>Direct</b> chunein.
            </p>
          )}

          {s.printMode === 'desktop' && (
            <Banner tone={deskPrinter ? 'success' : 'warning'} title={deskPrinter ? 'Desktop app ka printer istemal ho raha hai' : 'Pehle desktop printer set karein'}>
              LAN (IP) printer ke liye Nafaa desktop app ki <b>Printer settings</b> me IP daal kar "Enable" karein.
            </Banner>
          )}

          {s.printMode === 'direct' && (
            <>
              <Field label="Printer kaise jura hai?">
                <div className="grid gap-2 sm:grid-cols-3">
                  <TransportBtn t="usb" cur={s.transport} on={(t) => s.set({ transport: t })} icon={<Usb className="h-4 w-4" />} title="USB" sub="Cable se (Xprinter, Black Copper…)" disabled={!sup.usb} />
                  <TransportBtn t="serial" cur={s.transport} on={(t) => s.set({ transport: t })} icon={<Cable className="h-4 w-4" />} title="Serial / COM" sub="Windows par sab se pakka" disabled={!sup.serial} />
                  <TransportBtn t="bluetooth" cur={s.transport} on={(t) => s.set({ transport: t })} icon={<Bluetooth className="h-4 w-4" />} title="Bluetooth" sub="Chhota 58mm printer" disabled={!sup.bluetooth} />
                </div>
              </Field>

              {s.transport === 'serial' && (
                <Field label="Speed (baud)" help="Printer ke self-test kaghaz par likha hota hai — aksar 9600 ya 115200.">
                  <select value={s.printerBaud} onChange={(e) => s.set({ printerBaud: Number(e.target.value) })} className={cn(inputCls, 'w-40')}>
                    {BAUDS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </Field>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Btn variant="primary" loading={busy === 'pair'} icon={<Printer className="h-4 w-4" />}
                  onClick={() => run('pair', () => pairPrinter(s.transport), 'Printer jur gaya ✓ — ab Test print karein')}>
                  {st.printer.ready ? 'Doosra printer' : 'Printer jorein'}
                </Btn>
                {st.printer.ready && (
                  <>
                    <Segmented value={width} onChange={setWidth} items={[{ value: '80', label: '80mm' }, { value: '58', label: '58mm' }]} />
                    <Btn loading={busy === 'test'} onClick={() => run('test', () => sendToPrinter(testPageBytes(width)), 'Test bheja — kaghaz dekhein')}>Test print</Btn>
                    <Btn variant="plain" className="text-rose-600" icon={<Unplug className="h-3.5 w-3.5" />} onClick={() => { void disconnectPrinter(); s.set({ printerLabel: '' }); }}>Hatayein</Btn>
                  </>
                )}
              </div>
              {st.printer.ready && (
                <p className="flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {prettyLabel(st.printer.label)}
                </p>
              )}
              {!st.printer.ready && s.printerLabel && (
                <p className="text-[13px] text-amber-700 dark:text-amber-300">
                  {st.printer.error ?? 'Pichla printer abhi nahi mila'} — tab tak bill browser print se nikalte rahenge.
                </p>
              )}

              <SettingRow title="Bill par barcode" help="Wapsi par bill scan ho sake. Purana printer barcode na chhape to band kar dein."
                control={<Toggle checked={s.printBarcode} onChange={(v) => s.set({ printBarcode: v })} />} />

              <details className="rounded-lg bg-slate-50 p-3 text-[13px] text-slate-700 dark:bg-slate-800/40 dark:text-slate-200">
                <summary className="cursor-pointer font-semibold">USB printer list me aata hai par jurta nahi? (Windows)</summary>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  <li>Windows ne printer ka apna driver laga rakha hai, is liye browser usay nahi le sakta.</li>
                  <li>Aasaan hal: printer ke saath aayi CD/website se <b>"Virtual COM" (USB-to-Serial)</b> driver lagayein, phir yahan <b>Serial / COM</b> chunein.</li>
                  <li>Ya printer ki settings (Xprinter tool) me "USB mode" ko <b>VCOM</b> kar dein.</li>
                  <li>Kuch bhi na ho to <b>Browser print</b> par rehein — wo hamesha chalta hai.</li>
                </ol>
              </details>
            </>
          )}
        </div>
      </Card>

      {/* ─────────────── CASH DRAWER ─────────────── */}
      <Card title={<span className="flex items-center gap-2"><Archive className="h-4 w-4" /> Cash drawer</span>}
        description="Drawer printer ke peeche wale RJ11 (phone jaisi) taar se jurta hai. Printer Direct ya Desktop par ho to hi khulta hai.">
        <div className="space-y-3">
          <SettingRow title="Cash sale par khud khule" help="Bill chhapte hi drawer khul jaye — sirf jab payment Cash ho."
            control={<Toggle checked={s.drawerOnCash} onChange={(v) => s.set({ drawerOnCash: v })} disabled={s.printMode === 'browser'} />} />
          <Btn disabled={s.printMode === 'browser'} loading={busy === 'drawer'} icon={<Archive className="h-4 w-4" />}
            onClick={() => run('drawer', () => openCashDrawer())}>Abhi kholein (test)</Btn>
          {s.printMode === 'browser' && <p className="text-[12.5px] text-slate-500">Browser print se drawer nahi khul sakta — upar printer ko Direct karein.</p>}
        </div>
      </Card>

      {/* ─────────────── SCALE ─────────────── */}
      <Card title={<span className="flex items-center gap-2"><Scale className="h-4 w-4" /> Tarazu (weighing scale)
        {s.scaleEnabled && (st.scale.ready ? <Badge tone="success" dot>Jura hua</Badge> : <Badge tone="warning" dot>Jura nahi</Badge>)}</span>}
        description="RS-232 / USB taar wala digital tarazu. Jurne ke baad wazan wali cheez par live wazan aata hai — 'Ye wazan lo' dabayein.">
        <div className="space-y-3">
          <Field label="Speed (baud)" help="Tarazu ke manual me — aksar 9600.">
            <select value={s.scaleBaud} onChange={(e) => s.set({ scaleBaud: Number(e.target.value) })} className={cn(inputCls, 'w-40')}>
              {BAUDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="primary" disabled={!sup.serial} loading={busy === 'scale'} icon={<Scale className="h-4 w-4" />}
              onClick={() => run('scale', pairScale, 'Tarazu jur gaya ✓ — us par kuch rakh kar dekhein')}>
              {st.scale.ready ? 'Doosra tarazu' : 'Tarazu jorein'}
            </Btn>
            {s.scaleEnabled && (
              <Btn variant="plain" className="text-rose-600" icon={<Unplug className="h-3.5 w-3.5" />}
                onClick={() => { void disconnectScale(); s.set({ scaleEnabled: false, scaleLabel: '' }); }}>Hatayein</Btn>
            )}
          </div>
          {s.scaleEnabled && (
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="text-[12px] text-slate-500">Live wazan {st.scale.ready && (st.scale.stable ? '· ruka hua' : '· hil raha')}</div>
              <div className="text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                {st.scale.weightKg === null ? '—' : `${st.scale.weightKg.toFixed(3)} kg`}
              </div>
              <div className="mt-1 font-mono text-[11.5px] text-slate-400">{st.scale.error ?? (st.scale.raw ? `tarazu ne bheja: ${st.scale.raw}` : 'Tarazu se abhi kuch nahi aaya — speed (baud) badal kar dekhein')}</div>
            </div>
          )}
        </div>
      </Card>

      {/* ─────────────── CUSTOMER DISPLAY ─────────────── */}
      <Card title={<span className="flex items-center gap-2"><Monitor className="h-4 w-4" /> Customer display</span>}
        description="Customer ki taraf wali screen par live bill aur 'Wapsi' ki raqam — bharosa barhta hai, jhagra kam.">
        <div className="space-y-2 text-[13px] text-slate-700 dark:text-slate-200">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Doosra monitor / purana LCD computer se HDMI par jorein.</li>
            <li>Neeche button dabayein — nayi window khulegi. Usay doosri screen par le jayein aur double-click (full screen).</li>
            <li>POS me cheez daalte hi wahan nazar aayegi; bill par "Shukriya" aur wapsi.</li>
          </ol>
          <Btn icon={<Monitor className="h-4 w-4" />} onClick={() => { if (!openCustomerDisplay()) toast.error('Popup block hai — browser me popups allow karein'); }}>
            Customer display kholein
          </Btn>
        </div>
      </Card>

      <Card title="Barcode scanner">
        <p className="text-[13px] text-slate-700 dark:text-slate-200">
          USB / wireless scanner khud chalta hai — kuch set nahi karna. POS par kahin bhi scan karein, cheez bill me aa jati hai.
        </p>
      </Card>
    </Page>
  );
}

function TransportBtn({ t, cur, on, icon, title, sub, disabled }: {
  t: Transport; cur: Transport; on: (t: Transport) => void; icon: React.ReactNode; title: string; sub: string; disabled?: boolean;
}) {
  return (
    <button type="button" disabled={disabled} onClick={() => on(t)}
      className={cn('rounded-xl border-2 p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40',
        cur === t ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700')}>
      <div className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-900 dark:text-white">{icon} {title}</div>
      <div className="mt-0.5 text-[12px] text-slate-500">{disabled ? 'Is browser me nahi' : sub}</div>
    </button>
  );
}
