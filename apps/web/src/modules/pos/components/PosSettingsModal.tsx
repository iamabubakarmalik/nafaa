/**
 * Counter settings for this user and computer: own layout and density,
 * auto-print, receipt width, auto-close. Shop-wide defaults live in
 * Settings → Counter & POS (link shown to staff allowed to change settings).
 */

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Modal, Segmented, Switch } from '@/design-system/components';
import type { PrinterWidth } from '../hooks/usePosPreferences';
import type { PosDensity, PosLayout } from '../lib/posCounterConfig';
import { PosLayoutPicker } from './PosLayoutPreview';
import { t } from '@core/i18n';

export function PosSettingsModal({
  autoPrint, setAutoPrint, autoClose, setAutoClose, printerWidth, setPrinterWidth, onClose,
  layout, setLayout, shopLayout, density, setDensity, shopDensity, canEditShop,
}: {
  autoPrint: boolean; setAutoPrint: (v: boolean) => void;
  autoClose: boolean; setAutoClose: (v: boolean) => void;
  printerWidth: PrinterWidth; setPrinterWidth: (v: PrinterWidth) => void;
  onClose: () => void;
  /** This user's own layout; null follows the shop default. */
  layout?: PosLayout | null; setLayout?: (v: PosLayout | null) => void; shopLayout?: PosLayout;
  density?: PosDensity | null; setDensity?: (v: PosDensity | null) => void; shopDensity?: PosDensity;
  canEditShop?: boolean;
}) {
  return (
    <Modal open onClose={onClose} size="lg" title={t('POS settings')} description={t('Sirf aap ke liye, is computer par')}>
      <div className="divide-y divide-slate-100">
        {setLayout && (
          <div className="pb-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-medium text-slate-800">{t('Mera layout')}</div>
                <div className="text-xs text-slate-500">{t('Chuna hua dobara dabayein to dukaan wala layout')}</div>
              </div>
            </div>
            <PosLayoutPicker value={layout ?? null} onChange={setLayout} allowDefault defaultLayout={shopLayout} />
          </div>
        )}
        {setDensity && (
          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <div className="text-sm font-medium text-slate-800">{t('Bill ki lines')}</div>
              <div className="text-xs text-slate-500">{t('Patli lines me zyada cheezein nazar aati hain')}</div>
            </div>
            <Segmented label={t('Density')} value={density ?? 'shop'} onChange={(v) => setDensity(v === 'shop' ? null : (v as PosDensity))}
              items={[{ value: 'shop', label: t('Dukaan ({{value}})', { value: shopDensity === 'comfortable' ? t('khuli') : t('patli') }) }, { value: 'compact', label: t('Patli') }, { value: 'comfortable', label: t('Khuli') }]} />
          </div>
        )}
        <div className="py-3">
          <Switch label={t('Bill khud print ho')} description={t('Sale hote hi bill printer par chala jaye')} checked={autoPrint} onChange={(e) => setAutoPrint(e.target.checked)} />
        </div>
        <div className="flex items-center justify-between gap-4 py-3">
          <div>
            <div className="text-sm font-medium text-slate-800">{t('Receipt printer')}</div>
            <div className="text-xs text-slate-500">{t('Kaghaz ki chaurai')}</div>
          </div>
          <Segmented label={t('Printer width')} value={printerWidth} onChange={setPrinterWidth} items={[{ value: '80', label: t('80mm') }, { value: '58', label: t('58mm') }]} />
        </div>
        <div className="py-3">
          <Switch label={t('Success screen khud band ho')} description={t('3 second baad agli sale ke liye tayyar')} checked={autoClose} onChange={(e) => setAutoClose(e.target.checked)} />
        </div>
        <div className="space-y-1.5 pt-3 text-[0.8125rem]">
          {canEditShop && (
            <Link to="/settings/counter" onClick={onClose} className="flex items-center justify-between rounded-lg px-2 py-1.5 font-medium text-slate-700 hover:bg-slate-50">
              {t('Poori dukaan ke liye layout aur counter ke hisse')}{' '} <ArrowRight className="h-4 w-4 text-slate-400 rtl-flip" />
            </Link>
          )}
          <Link to="/settings/hardware" onClick={onClose} className="flex items-center justify-between rounded-lg px-2 py-1.5 font-medium text-slate-700 hover:bg-slate-50">
            {t('Printer jorein (USB, Bluetooth), drawer, tarazu')}{' '} <ArrowRight className="h-4 w-4 text-slate-400 rtl-flip" />
          </Link>
          <Link to="/settings/printing" onClick={onClose} className="flex items-center justify-between rounded-lg px-2 py-1.5 font-medium text-slate-700 hover:bg-slate-50">
            {t('Reports ka print, PDF, header aur footer')}{' '} <ArrowRight className="h-4 w-4 text-slate-400 rtl-flip" />
          </Link>
        </div>
      </div>
    </Modal>
  );
}
