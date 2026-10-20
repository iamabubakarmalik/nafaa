/**
 * Roll cut picker for bookings: the counter's cut window (CutModal) on the
 * roll tab, answering in the shape bookings already read.
 */

import type { Product } from '@modules/inventory/products/api/products.api';
import type { ProductVariant } from '@modules/inventory/products/api/product-variants.api';
import type { CarpetRoll } from '../../api/carpet-rolls.api';
import { CutModal } from '../../pos/CutModal';
import { r2, realFt } from '../../lib/meta';

export interface RollPick {
  roll: CarpetRoll;
  customerWidthFt: number;
  customerWidthInch: number;
  lengthFt: number;
  lengthInch: number;
  lengthReal: number;
  widthReal: number;
  cutSqft: number;
  pricePerSqft: number;
  totalPrice: number;
  createLeftover: boolean;
  /** Quantity in the product's unit (sqft, sq meter, sq gaz, running ft / m) and the rate for one unit. */
  qty: number;
  rate: number;
  /** The bill line note the server reads to cut the roll. */
  note: string;
}

export function CarpetRollPicker({ product, variant, preSelectedRoll, onConfirm, onClose }: {
  product: Product; variant?: ProductVariant; preSelectedRoll?: CarpetRoll; onConfirm: (data: RollPick) => void; onClose: () => void;
}) {
  return (
    <CutModal product={product} variantId={variant?.id} mode="roll" preSelectedRollId={preSelectedRoll?.id} onClose={onClose}
      onRoll={(c) => onConfirm({
        roll: c.roll, customerWidthFt: c.widthFt, customerWidthInch: c.widthInch, lengthFt: c.lengthFt, lengthInch: c.lengthInch,
        lengthReal: realFt(c.lengthFt, c.lengthInch), widthReal: realFt(c.widthFt, c.widthInch), cutSqft: c.sqft,
        pricePerSqft: c.sqft > 0 ? r2((c.qty * c.rate) / c.sqft) : c.rate, totalPrice: r2(c.qty * c.rate), createLeftover: c.keepLeftover, qty: c.qty, rate: c.rate, note: c.note,
      })} />
  );
}
