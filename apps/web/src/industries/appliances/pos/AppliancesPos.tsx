/**
 * Appliance counter: the shared POS with the appliance config, plus the
 * after-sale step (installation, delivery, qist plan) for bills the server
 * saved.
 */

import { useEffect, useState } from 'react';
import { PosScreen, type PosSavedSale } from '@modules/pos/engine';
import { AfterSale } from './AfterSale';
import { useApplianceProfiles } from '../components/profiles';
import { appliancesPos, applianceSaleListener, counter, type PickedUnit } from './config';

interface Pending { sale: PosSavedSale; lines: typeof counter.lines; units: PickedUnit[] }

export default function AppliancesPos() {
  const profiles = useApplianceProfiles();
  const [pending, setPending] = useState<Pending | null>(null);
  useEffect(() => {
    const listener = (sale: PosSavedSale, units: PickedUnit[]) => {
      const lines = counter.lines;
      // Offered for bills with an appliance on them, or a named customer on udhaar.
      if (lines.some((l) => profiles.has(l.productId)) || (Number(sale.creditAmount) > 0 && !!sale.customer)) setPending({ sale, lines, units });
    };
    applianceSaleListener.current = listener;
    return () => { if (applianceSaleListener.current === listener) applianceSaleListener.current = null; };
  }, [profiles]);

  return (
    <>
      <PosScreen config={appliancesPos} />
      {pending && <AfterSale sale={pending.sale} lines={pending.lines} units={pending.units} profiles={profiles} onClose={() => setPending(null)} />}
    </>
  );
}
