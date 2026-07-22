import { create } from 'zustand';

/**
 * Global-ish state for Carpet POS extensions.
 * Kept in Zustand so header buttons and search results can trigger
 * the cut-piece picker without prop drilling through PosPage.
 */
interface CarpetPosState {
  cutPiecesPickerOpen: boolean;
  openCutPiecesPicker: () => void;
  closeCutPiecesPicker: () => void;
}

export const useCarpetPosState = create<CarpetPosState>((set) => ({
  cutPiecesPickerOpen: false,
  openCutPiecesPicker: () => set({ cutPiecesPickerOpen: true }),
  closeCutPiecesPicker: () => set({ cutPiecesPickerOpen: false }),
}));
