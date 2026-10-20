/** Piece picker for bookings: the counter's cut window (CutModal) on the pieces tab. */

import type { Product } from '@modules/inventory/products/api/products.api';
import type { ProductVariant } from '@modules/inventory/products/api/product-variants.api';
import type { CarpetCutPiece } from '../../api/carpet-cut-pieces.api';
import { CutModal } from '../../pos/CutModal';

export function CarpetCutPiecePicker({ product, variant, onSelect, onClose }: {
  product: Product; variant?: ProductVariant; onSelect: (piece: CarpetCutPiece) => void; onClose: () => void;
}) {
  return <CutModal product={product} variantId={variant?.id} mode="piece" onClose={onClose} onPiece={(p) => onSelect(p.piece)} />;
}
