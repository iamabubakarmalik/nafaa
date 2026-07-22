import { useState } from 'react';
import {
  Printer, Wifi, Usb, TestTube, CheckCircle2, AlertCircle, Save,
} from 'lucide-react';
import { usePrinterStore } from '@/lib/desktop/printerStore';
import { testPrinter } from '@/lib/desktop/printReceipt';
import { useDesktop } from '@/lib/desktop/useDesktop';
import { toast } from 'sonner';

export function PrinterSettings() {
  const { isDesktop } = useDesktop();
  const { config, enabled, setConfig, setEnabled } = usePrinterStore();
  const [testing, setTesting] = useState(false);

  if (!isDesktop) {
    return (
      <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-6 text-center">
        <AlertCircle className="h-10 w-10 text-amber-600 mx-auto mb-2" />
        <h3 className="font-extrabold text-amber-900">
          Thermal Printer Desktop App Mein Available Hai
        </h3>
        <p className="text-sm text-amber-800 mt-1">
          Browser mein system print dialog use hota hai. Direct thermal printing ke liye{' '}
          <a href="https://nafaa.pk/download" className="underline font-bold" target="_blank" rel="noreferrer">
            Nafaa Desktop App download karein
          </a>
          .
        </p>
      </div>
    );
  }

  const handleTest = async () => {
    setTesting(true);
    await testPrinter();
    setTesting(false);
  };

  const handleSave = () => {
    toast.success('Printer settings save ho gayi');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white border border-neutral-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <Printer className="h-6 w-6 text-emerald-700" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-neutral-900">Thermal Printer</h3>
            <p className="text-xs text-neutral-500">
              POS receipt printing setup karein
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-5 w-5 rounded accent-emerald-600"
            />
            <span className="text-sm font-bold">Enable</span>
          </label>
        </div>

        {enabled && (
          <div className="space-y-4 pt-4 border-t border-neutral-100">
            {/* Connection Type */}
            <div>
              <label className="text-sm font-bold text-neutral-700 mb-2 block">
                Connection Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConfig({ ...config, connectionType: 'network' })}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 ${
                    config.connectionType === 'network'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-neutral-200'
                  }`}
                >
                  <Wifi className="h-5 w-5" />
                  <span className="font-bold text-sm">Network (TCP/IP)</span>
                </button>
                <button
                  onClick={() => setConfig({ ...config, connectionType: 'usb' })}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 ${
                    config.connectionType === 'usb'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-neutral-200'
                  }`}
                >
                  <Usb className="h-5 w-5" />
                  <span className="font-bold text-sm">USB</span>
                </button>
              </div>
            </div>

            {/* Network settings */}
            {config.connectionType === 'network' && (
              <>
                <div>
                  <label className="text-sm font-bold text-neutral-700 mb-1.5 block">
                    Printer IP Address
                  </label>
                  <input
                    type="text"
                    value={config.ipAddress || ''}
                    onChange={(e) => setConfig({ ...config, ipAddress: e.target.value })}
                    placeholder="192.168.1.100"
                    className="w-full h-11 px-4 rounded-xl border-2 border-neutral-200 font-mono"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Printer ke menu se IP address dekhein
                  </p>
                </div>
                <div>
                  <label className="text-sm font-bold text-neutral-700 mb-1.5 block">
                    Port (default: 9100)
                  </label>
                  <input
                    type="number"
                    value={config.port || 9100}
                    onChange={(e) => setConfig({ ...config, port: Number(e.target.value) })}
                    className="w-full h-11 px-4 rounded-xl border-2 border-neutral-200 font-mono"
                  />
                </div>
              </>
            )}

            {/* Printer Type */}
            <div>
              <label className="text-sm font-bold text-neutral-700 mb-1.5 block">
                Printer Type / Brand
              </label>
              <select
                value={config.type || 'EPSON'}
                onChange={(e) => setConfig({ ...config, type: e.target.value as any })}
                className="w-full h-11 px-4 rounded-xl border-2 border-neutral-200 font-bold"
              >
                <option value="EPSON">Epson (TM-T20, T82, T88)</option>
                <option value="STAR">Star (TSP143, TSP100, TSP650)</option>
                <option value="TANCA">Tanca</option>
                <option value="DARUMA">Daruma</option>
                <option value="CUSTOM">Generic ESC/POS</option>
              </select>
            </div>

            {/* Paper Width */}
            <div>
              <label className="text-sm font-bold text-neutral-700 mb-1.5 block">
                Paper Width
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConfig({ ...config, width: 48 })}
                  className={`p-3 rounded-xl border-2 ${
                    config.width === 48
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-neutral-200'
                  }`}
                >
                  <div className="font-extrabold">80mm</div>
                  <div className="text-xs text-neutral-500">48 chars</div>
                </button>
                <button
                  onClick={() => setConfig({ ...config, width: 32 })}
                  className={`p-3 rounded-xl border-2 ${
                    config.width === 32
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-neutral-200'
                  }`}
                >
                  <div className="font-extrabold">58mm</div>
                  <div className="text-xs text-neutral-500">32 chars</div>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleTest}
                disabled={testing}
                className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <TestTube className="h-4 w-4" />
                {testing ? 'Testing...' : 'Test Print'}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
