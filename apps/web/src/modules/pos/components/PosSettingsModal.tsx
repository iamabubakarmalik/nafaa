/** Counter settings for this computer: auto-print, receipt width, auto-close. */

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Modal, Segmented, Switch } from '@/design-system/components';
import type { PrinterWidth } from '../hooks/usePosPreferences';

export function PosSettingsModal({ autoPrint, setAutoPrint, autoClose, setAutoClose, printerWidth, setPrinterWidth, onClose }: {
  autoPrint: boolean; setAutoPrint: (v: boolean) => void;
  autoClose: boolean; setAutoClose: (v: boolean) => void;
  printerWidth: PrinterWidth; setPrinterWidth: (v: PrinterWidth) => void;
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} size="sm" title="POS settings" description="Sirf is computer ke liye">
      <div className="divide-y divide-slate-100">
        <div className="pb-3">
          <Switch label="Bill khud print ho" description="Sale hote hi bill printer par chala jaye" checked={autoPrint} onChange={(e) => setAutoPrint(e.target.checked)} />
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <div>
            <div className="text-sm font-medium text-slate-800">Receipt printer</div>
            <div className="text-xs text-slate-500">Kaghaz ki chaurai</div>
          </div>
          <Segmented label="Printer width" value={printerWidth} onChange={setPrinterWidth} items={[{ value: '80', label: '80mm' }, { value: '58', label: '58mm' }]} />
        </div>
        <div className="py-3">
          <Switch label="Success screen khud band ho" description="3 second baad agli sale ke liye tayyar" checked={autoClose} onChange={(e) => setAutoClose(e.target.checked)} />
        </div>
        <div className="space-y-1.5 pt-3 text-[0.8125rem]">
          <Link to="/settings/hardware" onClick={onClose} className="flex items-center justify-between rounded-lg px-2 py-1.5 font-medium text-slate-700 hover:bg-slate-50">
            Printer jorein (USB, Bluetooth), drawer, tarazu <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>
          <Link to="/settings/printing" onClick={onClose} className="flex items-center justify-between rounded-lg px-2 py-1.5 font-medium text-slate-700 hover:bg-slate-50">
            Reports ka print, PDF, header aur footer <ArrowRight className="h-4 w-4 text-slate-400" />
          </Link>
        </div>
      </div>
    </Modal>
  );
}
