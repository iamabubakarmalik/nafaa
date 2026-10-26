/**
 * Bill panel block: retail or contractor (wholesale) rate for the items
 * added next, and the "make a challan" offer after a bill is saved.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { HardHat, Store } from 'lucide-react';
import { Segmented } from '@/design-system/components';
import { usePriceTierSettings } from '@modules/pos/lib/usePriceTierSettings';
import { setRateMode, saleListener, useRateMode, type RateMode } from './rateMode';

export function CounterRate() {
  const mode = useRateMode();
  const navigate = useNavigate();
  // With shop-wide price tiers on, the bill's tier bar replaces this switch.
  const tiersOn = usePriceTierSettings().on;

  useEffect(() => {
    saleListener.current = (sale) => {
      setRateMode('retail');
      toast.success(`Bill ${sale.saleNumber} ban gaya`, {
        description: 'Site par bhejna hai? Challan banayein — baqi maal baad me alag challan par bhi ja sakta hai.',
        duration: 8000,
        action: { label: 'Challan banayein', onClick: () => navigate(`/hardware/deliveries/new?sale=${sale.id}`) },
      });
    };
    return () => { saleListener.current = null; };
  }, [navigate]);

  if (tiersOn) return null;
  return (
    <div className="space-y-1.5">
      <Segmented<RateMode> label="Rate" value={mode} onChange={setRateMode} className="w-full [&>button]:flex-1"
        items={[
          { value: 'retail', label: <span className="inline-flex items-center gap-1.5"><Store className="h-3.5 w-3.5" />Retail rate</span> },
          { value: 'wholesale', label: <span className="inline-flex items-center gap-1.5"><HardHat className="h-3.5 w-3.5" />Thekedar rate</span> },
        ]} />
      {mode === 'wholesale' && (
        <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[0.75rem] text-amber-900 ring-1 ring-amber-200">
          Bill ki lines par wholesale rate lag gaya (jahan rate likha hai). Bill ke baad wapas retail.
        </p>
      )}
    </div>
  );
}
