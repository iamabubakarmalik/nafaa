import type { CarpetReturnOptions } from '@/features/industries/carpet/components/CarpetReturnOptionsDialog';
import { parseCarpetNoteClient } from '@/features/industries/carpet/components/CarpetReturnOptionsDialog';

export interface ReturnLine {
  saleItemId: string;
  productId: string;
  productName: string;
  variantName?: string;
  variantImage?: string;
  variantColorHex?: string;
  unit: string;
  price: number;
  maxQty: number;
  quantity: number;
  /** Original note from sale item (carries roll/piece info) */
  note?: string | null;
  /** True if product unit is sqft/sqm/sqyd */
  isCarpet: boolean;
  /** Carpet-specific options selected via dialog */
  carpetOptions?: CarpetReturnOptions;
  /** Pre-parsed carpet info from note (for dialog reopening) */
  carpetInfo?: ReturnType<typeof parseCarpetNoteClient>;
}

export const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const formatQty = (qty: number) => qty.toFixed(qty % 1 === 0 ? 0 : 2);
