import { Star } from 'lucide-react';

/**
 * Hotel Guest Extension for the core Customer form.
 *
 * Injected into the customer form when the active industry is Hotel.
 * Purpose: capture hotel-specific attributes on the customer (VIP tier,
 * loyalty number, ID document, allergies, preferences).
 *
 * This is a placeholder — real fields land in a follow-up batch.
 */
export function HotelGuestExtension(_props: {
  customer?: any;
  onChange?: (patch: any) => void;
}) {
  return (
    <section className="rounded-2xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Star className="h-4 w-4 text-amber-500 fill-amber-400" />
        <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-100">
          Hotel Guest Info
        </h3>
      </div>
      <p className="text-xs font-semibold text-amber-800/70 dark:text-amber-200/70">
        VIP tier, loyalty number, ID docs, allergies & preferences will appear
        here for hotel customers.
      </p>
    </section>
  );
}
