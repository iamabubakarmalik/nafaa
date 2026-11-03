/**
 * Optical counter (web optical/pos/config.ts) on the shared POS: frames,
 * sunglasses, stock lenses, contact lenses and solutions. Contact lenses and
 * solutions sell from the earliest expiry batch (engine). The bill panel shows
 * the customer's prescription and glasses ready for pickup. Glasses made at
 * the lab are booked as orders (Chashma orders), not sold here.
 */

import { useMemo } from 'react';
import { KIND_TYPES } from '@nafaa/core/industries/optical';
import { msg, t } from '@/core/i18n';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';
import { CustomerOptical } from './components/CustomerOptical';
import { useOpticalFacts } from './hooks';
import { typeLabel } from './meta';

export const opticalPos: PosIndustryConfig = {
  ...generalPos,
  id: 'optical',
  searchHint: msg('Brand, model, rang ya barcode…'),
  receiptFooter: 'Chashma ki warranty ke liye ye bill sambhal kar rakhein.',
  CartExtra: CustomerOptical,
  /** "Ray-Ban · RB2140" under each product and a frame-type filter. */
  useShelf: () => {
    const facts = useOpticalFacts();
    return useMemo(() => ({
      filters: [{
        key: 'frame', label: t('Frame'),
        options: [...KIND_TYPES.frame.map((v) => ({ value: v, label: typeLabel(v) })), { value: 'sun', label: t('Sunglasses') }],
        match: (p: { id: string }, v: string) => { const c = facts.get(p.id)?.categoryType; return v === 'sun' ? !!c && KIND_TYPES.sun.includes(c) : c === v; },
      }],
      subline: (p: { id: string }) => { const f = facts.get(p.id); return f ? [f.brand, f.modelNumber].filter(Boolean).join(' · ') || null : null; },
    }), [facts]);
  },
};

registerPosIndustry(opticalPos);
