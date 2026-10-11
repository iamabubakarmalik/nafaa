/**
 * Settings → Printing: how documents print and save on this computer —
 * default format, colour or black & white, what the header shows, footer
 * line, thermal text size — with a live preview and test prints. Printer
 * connection itself lives on Settings → POS hardware.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Download, FileText, Palette, Printer, Receipt, Store, Unplug } from 'lucide-react';
import { Badge, Button, Card, Input, PageHeader, Segmented, Switch } from '@/design-system/components';
import { useAppearance } from '@/design-system';
import { useAuthStore } from '@core/stores/auth.store';
import { useDeviceStatus } from '@core/hardware/devices';
import { useHardwareSettings } from '@core/hardware/settings';
import { cn } from '@core/lib/cn';
import { renderHtml } from './render';
import { printDoc, renderContext } from './printDoc';
import { usePrintSettings } from './settings';
import { useBusinessHeader } from './useBusinessHeader';
import type { PrintDoc, PrintFormat } from './types';

const SAMPLE: PrintDoc = {
  title: 'Test print',
  subtitle: 'Ye dekhne ke liye ke print kaisa nikalta hai',
  meta: [['Tareekh', new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date())], ['Bill', '3']],
  sections: [
    { kind: 'rows', title: 'Galla', rows: [
      { label: 'Opening balance', value: 'Rs 5,000' },
      { label: '+ Cash bikri', value: 'Rs 9,760' },
      { label: '- Kharcha', value: 'Rs 2,300' },
      { label: 'Closing balance', value: 'Rs 12,460', strong: true },
    ] },
    { kind: 'table', title: 'Kya bika',
      columns: [{ label: 'Item' }, { label: 'Qty', align: 'right' }, { label: 'Raqam', align: 'right' }],
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

function Row({ title, help, children }: { title: string; help?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <div className="text-[0.875rem] font-medium text-slate-900">{title}</div>
        {help && <div className="text-[0.75rem] text-slate-500">{help}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function PrintSettingsPage() {
  const s = usePrintSettings();
  const hw = useHardwareSettings();
  const printer = useDeviceStatus((x) => x.printer);
  const biz = useBusinessHeader();
  const { accentHex } = useAppearance();
  const userName = useAuthStore((x) => x.user?.fullName);
  const [preview, setPreview] = useState<'a4' | '80' | '58'>(s.format === 'pdf' ? 'a4' : s.format);

  const ctx = renderContext(biz, accentHex, userName);
  const html = useMemo(() => renderHtml(SAMPLE, preview, ctx),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preview, s.colorMode, s.showLogo, s.showAddress, s.showPhone, s.footerNote, s.thermalText, s.showStamp, biz.name, biz.address, biz.phone, biz.logoUrl, accentHex]);
  const test = (f: PrintFormat) => printDoc(SAMPLE, f, ctx);

  const direct = hw.printMode === 'direct';
  const connected = direct && printer.ready;

  return (
    <div className="mx-auto w-full max-w-6xl pb-12">
      <PageHeader back={{ to: '/settings', label: 'Settings' }} title="Printing"
        description="Har report, list aur hisaab kaise print ho ya PDF bane — is computer ke liye." />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Card title="Print button ka default" description="Ek click par isi tarah print hoga. Arrow se har dafa badal bhi sakte hain.">
            <div className="grid gap-2 sm:grid-cols-2">
              {FORMATS.map((f) => {
                const on = s.format === f.id;
                return (
                  <button key={f.id} type="button" onClick={() => { s.set({ format: f.id }); if (f.id !== 'pdf') setPreview(f.id); }}
                    className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition',
                      on ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300')}>
                    <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', on ? 'bg-brand-600 text-brand-fg' : 'bg-slate-100 text-slate-600')}><f.icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.875rem] font-medium text-slate-900">{f.label}</span>
                      <span className="block text-[0.75rem] text-slate-500">{f.hint}</span>
                    </span>
                    {on && <CheckCircle2 className="h-4 w-4 text-brand-600" />}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title={<span className="flex items-center gap-2"><Palette className="h-4 w-4" /> Rang</span>}
            description="A4 aur PDF ke liye. Thermal printer hamesha black & white chhapta hai.">
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                { id: 'color', label: 'Colour', hint: 'Headings aur table aap ke brand rang me', swatch: accentHex },
                { id: 'mono', label: 'Black & white', hint: 'Laser / photocopy ke liye saaf, ink bachta hai', swatch: '#0f172a' },
              ] as const).map((m) => {
                const on = s.colorMode === m.id;
                return (
                  <button key={m.id} type="button" onClick={() => s.set({ colorMode: m.id })}
                    className={cn('flex items-center gap-3 rounded-xl border p-3 text-left transition',
                      on ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300')}>
                    <span className="h-9 w-9 shrink-0 rounded-lg ring-1 ring-inset ring-black/10" style={{ background: m.id === 'color' ? `linear-gradient(135deg, ${m.swatch}, ${m.swatch}99)` : 'linear-gradient(135deg,#0f172a,#94a3b8)' }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.875rem] font-medium text-slate-900">{m.label}</span>
                      <span className="block text-[0.75rem] text-slate-500">{m.hint}</span>
                    </span>
                    {on && <CheckCircle2 className="h-4 w-4 text-brand-600" />}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title={<span className="flex items-center gap-2"><Store className="h-4 w-4" /> Header aur footer</span>}
            description={<>Dukaan ka naam, address, phone aur logo <Link to="/settings" className="font-semibold text-brand-700 hover:underline">General settings</Link> se aate hain.</>}>
            <div className="divide-y divide-slate-100">
              <Row title="Logo" help={biz.logoUrl ? 'Logo laga hua hai' : 'Abhi logo set nahi'}><Switch size="sm" checked={s.showLogo} onChange={(e) => s.set({ showLogo: e.target.checked })} aria-label="Logo" /></Row>
              <Row title="Address" help={biz.address ?? 'Address set nahi'}><Switch size="sm" checked={s.showAddress} onChange={(e) => s.set({ showAddress: e.target.checked })} aria-label="Address" /></Row>
              <Row title="Phone" help={biz.phone ?? 'Phone set nahi'}><Switch size="sm" checked={s.showPhone} onChange={(e) => s.set({ showPhone: e.target.checked })} aria-label="Phone" /></Row>
              <Row title="Kab aur kis ne print kiya" help="Neeche chhota sa likha aata hai"><Switch size="sm" checked={s.showStamp} onChange={(e) => s.set({ showStamp: e.target.checked })} aria-label="Stamp" /></Row>
              <div className="pt-3">
                <Input label="Footer line" placeholder="e.g. Shukriya! Dobara tashreef layein" maxLength={120}
                  value={s.footerNote} onChange={(e) => s.set({ footerNote: e.target.value })} hint="Har print ke neeche — khali chhor dein to kuch nahi aayega" />
              </div>
            </div>
          </Card>

          <Card title={<span className="flex items-center gap-2"><Receipt className="h-4 w-4" /> Thermal printer</span>}>
            <div className="divide-y divide-slate-100">
              <Row title="Text ka size" help="Chhota printer ho ya nazar kamzor, to bara rakhein">
                <Segmented label="Thermal text" value={s.thermalText} onChange={(v) => s.set({ thermalText: v })}
                  items={[{ value: 'sm', label: 'Chhota' }, { value: 'md', label: 'Normal' }, { value: 'lg', label: 'Bara' }]} />
              </Row>
              <Row title="Printer connection" help={direct ? (connected ? `Direct: ${printer.label}` : 'Direct mode on hai magar printer jura nahi') : 'Browser print — har dafa print window khulti hai'}>
                <div className="flex items-center gap-2">
                  {connected ? <Badge variant="success" size="sm" dot>Jura hua</Badge> : <Badge variant={direct ? 'warning' : 'default'} size="sm">{direct ? <><Unplug className="mr-1 h-3 w-3" />Nahi jura</> : 'Browser'}</Badge>}
                  <Link to="/settings/hardware" className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">
                    Hardware <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Row>
            </div>
            {!direct && (
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-600">
                Print window ke baghair seedha chhapne ke liye Hardware me printer “Direct” par USB, Serial ya Bluetooth se jor dein. POS ke bill aur ye reports dono usi printer par jayenge.
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <Card title="Preview" actions={
            <Segmented label="Preview" value={preview} onChange={setPreview}
              items={[{ value: 'a4', label: 'A4' }, { value: '80', label: '80' }, { value: '58', label: '58' }]} />
          } flush>
            <div className="flex justify-center bg-slate-100 p-3">
              <iframe title="Print preview" srcDoc={html} sandbox=""
                className={cn('rounded bg-white shadow-sm', preview === 'a4' ? 'h-[460px] w-full' : preview === '80' ? 'h-[460px] w-[290px]' : 'h-[460px] w-[210px]')} />
            </div>
          </Card>
          <Card title="Test karein" description="Dekh lein printer par kaisa nikalta hai">
            <div className="grid grid-cols-2 gap-2">
              {FORMATS.map((f) => (
                <Button key={f.id} variant="secondary" size="sm" leftIcon={<f.icon className="h-4 w-4" />} onClick={() => void test(f.id)}>{f.label}</Button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
