/**
 * Carpet POS extensions — public surface of everything the Carpet
 * industry pack exposes to the shared POS shell.
 *
 * The underlying component files still live at their historical paths
 * (src/features/pos/components/*) so no imports break. This barrel is
 * how the pack itself accesses them and how future refactors will find
 * the "canonical carpet POS pieces" in one place.
 */

// UI pieces that the POS shell mounts through IndustryPack slots
export { CarpetPosHeaderActions } from './CarpetPosHeaderActions';
export { CarpetPosSearchExtension } from './CarpetPosSearchExtension';
export { carpetProductClickRouter } from './carpetProductClickRouter';

// Modal / picker components — re-exported from their current locations.
// When we move them fully into the pack, only this barrel needs to change,
// PosPage.tsx keeps its imports.
export { CarpetRollPicker } from '@/features/pos/components/CarpetRollPicker';
export { CarpetCutPiecePicker } from '@/features/pos/components/CarpetCutPiecePicker';
export { LengthWidthCalculator } from '@/features/pos/components/LengthWidthCalculator';
