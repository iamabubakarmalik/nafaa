import { Layers, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@core/stores/auth.store';
import { isAllShops } from '@core/lib/shopScope';

/**
 * Shown in place of a counter screen when no single branch is selected.
 *
 * There are two different reasons that happens, and they need different
 * advice: the owner is on the consolidated "All Shops" view (a sale can't be
 * rung up at "everywhere"), or no branch exists / has been chosen yet.
 */
export function PosShopGuard({
  action = 'POS use karne',
}: {
  /** Kis kaam ke liye shop chahiye — "POS use karne", "register kholne", … */
  action?: string;
}) {
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const role = useAuthStore((s) => s.user?.role);
  const onAllShops = isAllShops(currentShopId);
  const isOwner = role === 'OWNER' || role === 'SUPER_ADMIN';

  if (onAllShops) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="max-w-md w-full rounded-3xl bg-gradient-to-br from-violet-50 to-indigo-50 border-2 border-violet-300 p-8 text-center shadow-lg">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-lg">
            <Layers className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-violet-900">
            Abhi "All Shops" View Hai
          </h2>
          <p className="mt-2 text-sm text-violet-800 font-semibold">
            {action} ke liye ek shop chunni paregi — bikri kisi ek counter se hoti
            hai, sab branches se ek saath nahi.
          </p>
          <p className="mt-4 text-xs text-violet-700">
            Upar wale dropdown se apni shop select karein. Reports aur khata ke
            liye "All Shops" wapis chun sakte hain.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md w-full rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 p-8 text-center shadow-lg">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
          <Store className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold text-amber-900">
          Pehle Shop Select Karein
        </h2>
        <p className="mt-2 text-sm text-amber-800 font-semibold">
          {action} ke liye topbar se shop select karein.
        </p>
        {isOwner ? (
          <p className="mt-4 text-xs text-amber-700">
            Agar koi shop nahi hai to{' '}
            <Link to="/shops" className="underline font-bold">
              Shops page
            </Link>{' '}
            se nayi banayein.
          </p>
        ) : (
          <p className="mt-4 text-xs text-amber-700">
            Aapko abhi kisi shop se assign nahi kiya gaya — Owner se kehkar apni
            shop se jurwa lein.
          </p>
        )}
      </div>
    </div>
  );
}
