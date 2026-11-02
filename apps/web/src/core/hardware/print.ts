import { toast } from 'sonner';
import { getElectron } from '@core/lib/desktop/electron';
import { usePrinterStore } from '@core/lib/desktop/printerStore';
import type { PrinterWidth, ReceiptPayload } from '@modules/pos/lib/thermalReceipt';
import { drawerKickBytes } from './escpos';
import { printerReady, sendToPrinter } from './devices';
import { receiptBytes } from './receiptBytes';
import { useHardwareSettings } from './settings';
import { t } from '@core/i18n';

/* ═════════════════════════════════════════════════════════════
   PRINT ROUTER — bill kahan jaye:
     1. "Desktop app printer" chuna + desktop me LAN printer → desktop app
     2. "Direct print" on + printer jura hai       → seedha printer
     3. warna                                      → purana browser print
   Direct me koi ghalti ho to bill kho na jaye: browser print par
   wapas aa jate hain aur dukaan-daar ko bata dete hain.
   ═════════════════════════════════════════════════════════════ */

const isCash = (p: ReceiptPayload) => /cash|naqd/i.test(p.paymentLabel) && p.paid > 0;

function desktopPrinter() {
  if (useHardwareSettings.getState().printMode !== 'desktop') return null;
  const el = getElectron();
  const { enabled, config } = usePrinterStore.getState();
  return el && enabled && config.connectionType !== 'system' ? { el, config } : null;
}

/**
 * `true` = bill hum ne sambhal liya (direct / desktop). `false` = bulane
 * wala purana browser print chalaye. Synchronous rakha hai taake
 * browser print wala popup user ke click ke andar hi khule.
 */
export function tryDirectPrint(p: ReceiptPayload, width: PrinterWidth, fallback: () => boolean): boolean {
  const s = useHardwareSettings.getState();
  const drawer = s.drawerOnCash && isCash(p);

  const desk = desktopPrinter();
  if (desk?.el.printerRaw) {
    void desk.el.printerRaw(desk.config, receiptBytes(p, width, { barcode: s.printBarcode, drawer })).then((r) => {
      if (!r.success) { toast.error(t('Printer: {{value}} — browser se print kar rahe hain', { value: r.message ?? 'print nahi hua' })); fallback(); }
    }).catch((e: Error) => { toast.error(t('Printer: {{message}}', { message: e.message })); fallback(); });
    return true;
  }
  if (desk) {
    void desk.el.printerReceipt(desk.config, {
      shopName: p.shopName, shopAddress: p.shopAddress, shopPhone: p.shopPhone,
      invoiceNumber: p.saleNumber, date: p.date.toLocaleString('en-PK'),
      cashier: p.cashierName, customer: p.customerName ? { name: p.customerName } : undefined,
      items: p.lines.map((l) => ({ name: l.name, quantity: l.qty, unit: l.unit, price: l.price, total: l.total })),
      subtotal: p.subtotal, discount: p.discount, total: p.total, paid: p.paid,
      change: p.paid > p.total ? p.paid - p.total : undefined, paymentMethod: p.paymentLabel, footerText: p.footerNote,
    }).then((r) => {
      if (!r.success) { toast.error(t('Printer: {{value}} — browser se print kar rahe hain', { value: r.message ?? 'print nahi hua' })); fallback(); }
      else if (drawer) void openCashDrawer({ silent: true });
    }).catch((e: Error) => { toast.error(t('Printer: {{message}}', { message: e.message })); fallback(); });
    return true;
  }

  if (s.printMode !== 'direct' || !printerReady()) return false;
  sendToPrinter(receiptBytes(p, width, { barcode: s.printBarcode, drawer })).catch((e: Error) => {
    toast.error(t('Direct print nahi hua ({{message}}) — browser print khul raha hai', { message: e.message }));
    if (!fallback()) toast.error(t('Popup block hai — Settings → Hardware se printer dobara jorein'));
  });
  return true;
}

/** Cash drawer kholo — desktop app ya direct printer se (drawer printer ke RJ11 me) */
export async function openCashDrawer(o: { silent?: boolean } = {}): Promise<boolean> {
  const desk = desktopPrinter();
  try {
    if (desk) {
      const fn = (desk.el as unknown as { cashDrawerOpen?: (c: unknown) => Promise<{ success: boolean; message?: string }> }).cashDrawerOpen;
      if (!fn) throw new Error(t('Desktop app purani hai — update karein'));
      const r = await fn(desk.config);
      if (!r.success) throw new Error(r.message ?? t('drawer nahi khula'));
    } else if (useHardwareSettings.getState().printMode === 'direct' && printerReady()) {
      await sendToPrinter(drawerKickBytes());
    } else {
      if (!o.silent) toast.info(t('Drawer ke liye pehle Settings → Hardware me printer "Direct" jorein'));
      return false;
    }
    if (!o.silent) toast.success(t('Drawer khul gaya'));
    return true;
  } catch (e) {
    if (!o.silent) toast.error(t('Drawer: {{message}}', { message: (e as Error).message }));
    return false;
  }
}

/** Drawer ka button dikhana hai ya nahi */
export const drawerAvailable = () =>
  !!desktopPrinter() || (useHardwareSettings.getState().printMode === 'direct' && printerReady());
