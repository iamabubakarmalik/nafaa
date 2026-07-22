import { Smartphone, Sparkles, Palette, HardDrive } from 'lucide-react';
import type { IndustrySectionProps } from '@/features/industries/_shared/types/section.types';

export function MobileVariantsBanner({ variants }: IndustrySectionProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 border-2 border-blue-200 p-5 mb-4">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shrink-0">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <div className="text-[10px] uppercase tracking-wider text-blue-700 font-bold">
              Mobile Variants
            </div>
            {variants.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-extrabold">
                {variants.length} variants
              </span>
            )}
          </div>
          <h3 className="font-extrabold text-blue-900 text-lg">Storage × Color Matrix</h3>
          <p className="text-xs text-blue-800 mt-1.5">
            Mobile phones ke liye recommended structure: <strong>Storage capacity</strong> aur <strong>Color</strong> ka combination.
            Har variant ka apna price, IMEI stock, aur warranty hota hai.
          </p>

          {/* Examples */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white border border-blue-200 p-2 text-xs">
              <div className="flex items-center gap-1 text-blue-700 font-bold mb-1">
                <HardDrive className="h-3 w-3" />
                Storage Examples
              </div>
              <div className="text-slate-700 font-mono text-[10px]">
                64GB, 128GB, 256GB, 512GB, 1TB
              </div>
            </div>
            <div className="rounded-lg bg-white border border-blue-200 p-2 text-xs">
              <div className="flex items-center gap-1 text-violet-700 font-bold mb-1">
                <Palette className="h-3 w-3" />
                Color Examples
              </div>
              <div className="text-slate-700 font-mono text-[10px]">
                Black, White, Blue, Gold, Green
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-2 flex items-start gap-1.5">
            <Sparkles className="h-3 w-3 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-[10px] text-emerald-900">
              <strong>Tip:</strong> Variant Builder use karke 128GB + Black, 128GB + White, 256GB + Black, etc. ek saath generate kar saktay hain.
              IMEIs har variant ke neeche separately add hoti hain.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
