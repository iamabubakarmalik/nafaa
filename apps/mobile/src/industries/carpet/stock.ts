/**
 * Carpet rolls as single units in stock transfers and write-offs (web transfer
 * RollPicker and the adjustment form's roll actions): the whole roll goes to
 * another branch, or the whole roll is written off as damaged or lost. A cut
 * piece cannot be sent: cut the roll first. Length corrections and finishing a
 * roll are on the roll's own screen.
 */

import { Layers } from 'lucide-react-native';
import { apiClient } from '@/core/api/client';
import { msg } from '@/core/i18n';
import { registerDeviceSource } from '@/modules/inventory/industry/devices';
import { carpetRollsApi } from './api';
import { ftIn, refreshCarpet } from './meta';

registerDeviceSource('carpet', {
  kind: 'carpet',
  label: msg('Carpet rolls'),
  icon: Layers,
  transferField: 'carpetRollId',
  load: async (shopId) => {
    const res = await carpetRollsApi.list({ shopId, inStockOnly: true, limit: 200 });
    return res.items.map((r) => ({
      id: r.id, kind: 'carpet', productId: r.productId, name: [r.product?.name, r.variant?.name].filter(Boolean).join(' · ') || r.rollNumber, ref: r.rollNumber,
      sub: `${ftIn(r.widthFt, r.widthInch)} × ${ftIn(r.remainingLengthFt, r.remainingLengthInch)} · ${Math.round(r.remainingSqft * 100) / 100} sqft`, cost: Math.round(r.remainingSqft * Number(r.costPerSqft || 0) * 100) / 100,
    }));
  },
  // A whole-roll write-off posts as an adjustment that takes the roll's sqft out of stock.
  writeOff: async (row, how, reason) => {
    const roll = await carpetRollsApi.getOne(row.id);
    await apiClient.post('/stock-adjustments', {
      productId: roll.productId, shopId: roll.shopId ?? undefined, type: how, quantity: Math.max(roll.remainingSqft, 0.01), carpetRollId: roll.id,
      rollAction: how === 'DAMAGE' ? 'MARK_DAMAGED' : 'MARK_LOST', reason: reason || (how === 'DAMAGE' ? 'Poora roll kharab' : 'Roll gum'),
    });
    refreshCarpet();
  },
});
