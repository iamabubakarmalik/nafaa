import { Scissors } from 'lucide-react';
import { useCarpetPosState } from '../../hooks/useCarpetPosState';

/**
 * Cut Pieces quick-access button rendered in the POS header
 * (right side, next to Held Carts). Only visible when a carpet
 * business is active — the pack decides when to mount it.
 */
export function CarpetPosHeaderActions() {
  const openCutPieces = useCarpetPosState((s) => s.openCutPiecesPicker);

  return (
    <button
      onClick={openCutPieces}
      className="h-9 px-3 rounded-xl bg-violet-500/30 hover:bg-violet-500/50 text-white text-xs font-extrabold inline-flex items-center gap-1.5 border border-violet-300/40 shadow-md"
      title="Sell a leftover cut piece"
    >
      <Scissors className="h-3.5 w-3.5" />
      Cut Pieces
    </button>
  );
}
