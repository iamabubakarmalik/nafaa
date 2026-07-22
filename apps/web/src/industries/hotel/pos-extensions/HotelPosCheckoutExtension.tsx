import { Bed } from 'lucide-react';

/**
 * Hotel POS Checkout Extension.
 *
 * Rendered in the core POS checkout panel when the active industry is Hotel.
 * Purpose: let cashier attach a walk-in sale to an existing hotel booking,
 * so the charge posts to the room folio instead of settling immediately.
 *
 * Wire this to real state (POS cart / booking picker) in a later batch —
 * for now it's a visible placeholder so the extension point is proven.
 */
export function HotelPosCheckoutExtension(_props: {
  cart?: any;
  onChange?: (patch: any) => void;
}) {
  return (
    <div className="rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20 p-3">
      <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
        <Bed className="h-4 w-4" />
        <span className="text-xs font-extrabold uppercase tracking-wider">
          Hotel Mode
        </span>
      </div>
      <p className="mt-1 text-xs font-semibold text-indigo-900/70 dark:text-indigo-200/70">
        Charge to a room booking instead of settling now — coming soon.
      </p>
    </div>
  );
}
