import { Layers, Scissors, Search } from 'lucide-react';

/**
 * Small hint panel shown under the POS search bar for carpet businesses.
 * Reminds cashier they can search for:
 *   • Product names
 *   • Roll numbers (R-001, SF-CR-2026-01)
 *   • Cut piece codes (CP-2026-01)
 *   • Design codes
 *
 * The actual matching is done by usePosFastSearch — this component is
 * just the visible hint.
 */
export function CarpetPosSearchExtension() {
  return (
    <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 px-3 py-2 flex items-center gap-2 text-[11px] font-bold text-emerald-800">
      <Search className="h-3 w-3 shrink-0" />
      <span>Try:</span>
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/60 border border-emerald-200">
        <Layers className="h-2.5 w-2.5" /> Roll #
      </span>
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/60 border border-emerald-200">
        <Scissors className="h-2.5 w-2.5" /> Cut piece code
      </span>
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/60 border border-emerald-200">
        Design code
      </span>
    </div>
  );
}
