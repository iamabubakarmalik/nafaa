import { AlertTriangle } from 'lucide-react';

export function CarpetVariantsBanner() {
  return (
    <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-4 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
      <div className="text-sm">
        <div className="font-extrabold text-amber-900">Carpet Variants — Important</div>
        <div className="text-amber-800 mt-1 space-y-1">
          <div>
            • Variants sirf <strong>color/design</strong> ke liye banaayein (Cream, Red, Caramel…)
          </div>
          <div>
            • Variant ka <strong>stock field manually edit na karein</strong> — actual stock rolls
            se aata hai
          </div>
          <div>• Har variant ke liye Inventory tab se rolls add karein</div>
        </div>
      </div>
    </div>
  );
}
