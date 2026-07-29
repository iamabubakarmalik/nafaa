import { Shield } from 'lucide-react';
import { useFbrForSale } from '../hooks/useFbrForSale';
import { cn } from '@core/lib/cn';

interface Props {
  saleId: string;
  variant?: 'thermal' | 'a4';
  className?: string;
}

/**
 * Receipt/bill pe FBR verified badge + QR code print karta hai.
 * - FBR disabled OR no invoice: kuch nahi
 * - Submitted: FBR logo + invoice number + QR code
 * Print-friendly (black & white safe).
 */
export function FbrReceiptBadge({ saleId, variant = 'thermal', className }: Props) {
  const { data: status } = useFbrForSale(saleId);

  if (!status?.fbrEnabled || !status.invoice) return null;
  const inv = status.invoice;

  const isSubmitted = inv.status === 'ACKNOWLEDGED' || inv.status === 'SUBMITTED';
  if (!isSubmitted) return null;

  const showQr = status.printQrOnReceipt && inv.fbrQrCode;
  const showLogo = status.printFbrLogo;

  if (variant === 'a4') {
    return (
      <div className={cn('mt-4 p-3 border-2 border-black rounded-lg print:border-black', className)}>
        <div className="flex items-center gap-3">
          {showLogo && (
            <div className="h-12 w-12 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
              <Shield className="h-6 w-6" />
            </div>
          )}
          <div className="flex-1">
            <div className="font-black text-sm uppercase tracking-wider">FBR Verified Invoice</div>
            <div className="text-xs font-mono mt-0.5">FBR #: {inv.fbrInvoiceNumber}</div>
            <div className="text-[10px] text-slate-600 mt-0.5">Tax: Rs {inv.taxAmount.toLocaleString()}</div>
          </div>
          {showQr && (
            <div className="h-20 w-20 bg-white p-1 shrink-0">
              <img src={`data:image/png;base64,${inv.fbrQrCode}`} alt="FBR QR" className="w-full h-full" />
            </div>
          )}
        </div>
        <div className="text-[9px] text-slate-500 mt-2 border-t pt-2">
          Federal Board of Revenue · Government of Pakistan · Scan QR to verify
        </div>
      </div>
    );
  }

  // Thermal receipt (58/80mm)
  return (
    <>
      <style>{`
        @media print {
          .fbr-badge-print { page-break-inside: avoid; margin-top: 8px !important; }
          .fbr-badge-print img { min-width: 100px; min-height: 100px; }
          .fbr-badge-print { color: #000 !important; }
          .fbr-badge-print * { color: #000 !important; }
        }
      `}</style>
      <div className={cn('fbr-badge-print mt-2 pt-2 border-t border-dashed border-black text-center font-mono', className)}>
      {showLogo && (
        <div className="flex items-center justify-center gap-1 mb-1">
          <Shield className="h-3 w-3" />
          <span className="text-[10px] font-black uppercase tracking-widest">FBR Verified</span>
        </div>
      )}
      <div className="text-[9px] font-bold">FBR #: {inv.fbrInvoiceNumber}</div>
      <div className="text-[8px]">Tax: Rs {inv.taxAmount.toLocaleString()}</div>
      {showQr && (
        <div className="mt-1 mx-auto w-24 h-24 bg-white p-1">
          <img src={`data:image/png;base64,${inv.fbrQrCode}`} alt="FBR QR" className="w-full h-full" />
        </div>
      )}
        <div className="text-[7px] text-slate-500 mt-1">Scan to verify</div>
      </div>
    </>
  );
}
