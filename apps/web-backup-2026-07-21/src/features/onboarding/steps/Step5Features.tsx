import { useMemo } from 'react';
import { FeatureToggle } from '../components/FeatureToggle';
import { STEP_CONFIG } from '../constants/step-config';

interface Props {
  data: { enabledFeatures: Record<string, boolean> };
  onChange: (data: any) => void;
  options: any;
  businessType: string;
}

const FEATURE_LIBRARY: Record<string, { key: string; label: string; desc: string; emoji: string; recommended?: boolean }> = {
  expiry: { key: 'expiry', label: 'Expiry Tracking', desc: 'Products ki expiry date track karein', emoji: '📅' },
  batches: { key: 'batches', label: 'Batch Numbers', desc: 'Batch/lot tracking for pharma & grocery', emoji: '📦' },
  imei: { key: 'imei', label: 'IMEI/Serial', desc: 'Mobile & electronics ke liye', emoji: '📱' },
  warranty: { key: 'warranty', label: 'Warranty Management', desc: 'Warranty period track karein', emoji: '🛡️' },
  variants: { key: 'variants', label: 'Product Variants', desc: 'Size, color, storage variations', emoji: '🎨' },
  weightBased: { key: 'weightBased', label: 'Weight-based Pricing', desc: 'Per kg / per gram pricing', emoji: '⚖️' },
  emi: { key: 'emi', label: 'EMI / Installments', desc: 'Installment plans for customers', emoji: '💳' },
  membership: { key: 'membership', label: 'Memberships', desc: 'Monthly/yearly plans for customers', emoji: '⭐' },
  appointments: { key: 'appointments', label: 'Appointments', desc: 'Booking system with time slots', emoji: '📆' },
  tables: { key: 'tables', label: 'Table Management', desc: 'Restaurant table + KOT system', emoji: '🪑' },
  delivery: { key: 'delivery', label: 'Home Delivery', desc: 'Rider dispatch & tracking', emoji: '🚴' },
  credit: { key: 'credit', label: 'Udhaar / Khata', desc: 'Customer credit accounts', emoji: '📒' },
  multiUnit: { key: 'multiUnit', label: 'Multi-Unit', desc: 'Piece ↔ Dozen ↔ Carton conversions', emoji: '📊' },
  combo: { key: 'combo', label: 'Combos / Deals', desc: 'Bundle products together', emoji: '🎁' },
  quickKeys: { key: 'quickKeys', label: 'POS Quick Keys', desc: 'F1-F12 shortcut buttons', emoji: '⌨️' },
};

export function Step5Features({ data, onChange, options, businessType }: Props) {
  const cfg = STEP_CONFIG[5];

  // Get template default features
  const templateFeatures = useMemo(() => {
    return options?.businessTemplates?.[businessType]?.features || {};
  }, [options, businessType]);

  // Merged current state (template defaults + user overrides)
  const current = { ...templateFeatures, ...data.enabledFeatures };

  // Only show features that make sense for this industry
  const relevantFeatures = useMemo(() => {
    return Object.keys(FEATURE_LIBRARY).filter((key) => {
      // Show if template has it OR it's a common feature
      return templateFeatures[key] !== undefined;
    }).map((key) => ({
      ...FEATURE_LIBRARY[key],
      recommended: templateFeatures[key] === true,
    }));
  }, [templateFeatures]);

  const handleChange = (key: string, value: boolean) => {
    onChange({
      enabledFeatures: {
        ...current,
        [key]: value,
      },
    });
  };

  if (relevantFeatures.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 font-medium">
        Aap ke business type ke liye default features sab enabled hain. Continue karein!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-cyan-200 p-4">
        <p className="text-sm text-cyan-900 font-medium leading-relaxed">
          ✨ Ye features aap ke business type ke liye smart-defaults kiye gaye hain. Aap kisi bhi feature ko off/on kar sakte hain.
          Baad mein bhi settings se toggle ho sakti hain.
        </p>
      </div>

      <FeatureToggle
        features={current}
        onChange={handleChange}
        items={relevantFeatures}
        color={cfg.textColor}
        borderColor={cfg.borderColor}
      />
    </div>
  );
}
