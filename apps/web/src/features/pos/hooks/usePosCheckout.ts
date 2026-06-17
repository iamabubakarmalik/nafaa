import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { salesApi, type CreateSaleItem, type PaymentMethod } from '@/api/sales.api';
import { carpetRollsApi } from '@/features/industries/carpet/api/carpet-rolls.api';
import { carpetCutPiecesApi } from '@/features/industries/carpet/api/carpet-cut-pieces.api';
import { formatPKR } from '@/lib/format';
import type { CartItem } from '../components/pos-types';

interface CheckoutPayload {
  shopId: string;
  customerId?: string;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  discount: number;
  cart: CartItem[];
}

interface CheckoutResult {
  saleNumber: string;
  total: number;
  credit: number;
}

/**
 * Carpet POS checkout flow:
 * 1. For each carpet roll line — call `rolls/:id/cut` (creates leftover piece if needed)
 * 2. For each cut piece line — call `cut-pieces/:id/mark-sold` (we don't decrement; sale handles it)
 * 3. Create sale with priceOverride + note for full traceability
 *
 * Atomicity strategy:
 * - We collect roll cuts first. If ANY fails, we abort and inform user.
 * - Backend rolls' `cut` endpoint already wraps roll-update + movement + leftover in a Prisma transaction.
 * - If sale creation fails after cuts succeed, we surface a clear error so admin can void manually.
 */
export function usePosCheckout(onSuccess?: (result: CheckoutResult) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CheckoutPayload): Promise<CheckoutResult> => {
      const { shopId, customerId, paymentMethod, paidAmount, discount, cart } = payload;

      // ─── Pre-flight validation ─────────────────────────────
      if (cart.length === 0) throw new Error('Cart khaali hai');
      if (!shopId) throw new Error('Shop ID missing');

      // Separate carpet items from normal items
      const rollCutItems = cart.filter((c) => c.rollId);
      const cutPieceItems = cart.filter((c) => c.cutPieceId);

      // ─── PHASE 1: Cut all carpet rolls (sequential, with rollback list) ───
      const successfulCuts: Array<{
        rollId: string;
        rollNumber: string;
        lengthFt: number;
        leftoverPieceId?: string;
      }> = [];

      for (const item of rollCutItems) {
        try {
          const cutResult = await carpetRollsApi.cut(item.rollId!, {
            lengthFt: item.cutLengthFt!,
            customerWidthFt: item.rollCustomerWidthFt,
            createLeftoverPiece: item.createLeftover ?? true,
            note: `POS sale${customerId ? ' (Customer linked)' : ''}`,
          });

          successfulCuts.push({
            rollId: item.rollId!,
            rollNumber: item.rollNumber!,
            lengthFt: item.cutLengthFt!,
            leftoverPieceId: cutResult.leftoverPiece?.id,
          });
        } catch (err: any) {
          // Cut failed — try to revert previous cuts
          const errMsg = err?.response?.data?.message || `${item.rollNumber} se cut nahi ho saka`;

          if (successfulCuts.length > 0) {
            await revertCuts(successfulCuts);
            throw new Error(
              `${errMsg}\n\n${successfulCuts.length} previous cut(s) revert ho gayi hain.`,
            );
          }
          throw new Error(errMsg);
        }
      }

      // ─── PHASE 2: Mark cut pieces as reserved (will be sold via sale) ───
      // We use mark-sold AFTER sale creation. Pre-validate availability here.
      for (const item of cutPieceItems) {
        try {
          const piece = await carpetCutPiecesApi.getOne(item.cutPieceId!);
          if (piece.status !== 'AVAILABLE') {
            if (successfulCuts.length > 0) await revertCuts(successfulCuts);
            throw new Error(`Cut piece ${piece.pieceCode} pehle hi sold ya reserved hai`);
          }
        } catch (err: any) {
          if (successfulCuts.length > 0) await revertCuts(successfulCuts);
          throw new Error(err?.response?.data?.message || err?.message || 'Cut piece check failed');
        }
      }

      // ─── PHASE 3: Build sale items + create sale ───────────
      const saleItems: CreateSaleItem[] = cart.map((item) => {
        const baseUnitPrice =
          item.priceOverride ??
          (item.useWholesale ? item.wholesalePrice ?? item.basePrice : item.basePrice);

        // Build descriptive note for traceability
        let note = item.note;
        if (item.rollId && item.rollNumber) {
          note = `Cut from ${item.rollNumber}: ${item.cutWidthFt}ft × ${item.cutLengthFt}ft = ${item.cutSqft?.toFixed(2)} sqft`;
        } else if (item.cutPieceId && item.cutPieceCode) {
          note = `Cut piece ${item.cutPieceCode}`;
        } else if (item.imeiNumber) {
          note = `IMEI: ${item.imeiNumber}`;
        }

        return {
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          priceOverride: baseUnitPrice,
          lineDiscount: item.lineDiscount || undefined,
          useWholesale: item.useWholesale || undefined,
          note,
        };
      });

      let sale;
      try {
        sale = await salesApi.create({
          shopId,
          customerId: customerId || undefined,
          paymentMethod,
          paidAmount,
          discount,
          items: saleItems,
        });
      } catch (err: any) {
        // Sale failed — try to revert rolls
        if (successfulCuts.length > 0) {
          await revertCuts(successfulCuts);
          throw new Error(
            `Sale create nahi ho saki: ${err?.response?.data?.message || 'unknown error'}\n\n` +
              `${successfulCuts.length} roll cut(s) revert ho gayi hain.`,
          );
        }
        throw err;
      }

      // ─── PHASE 4: Mark cut pieces as sold (best-effort) ────
      // Sale already deducted stock; this just updates piece status.
      for (const item of cutPieceItems) {
        try {
          await carpetCutPiecesApi.markSold(item.cutPieceId!);
        } catch (err) {
          // Non-fatal — sale already saved
          console.warn(`Cut piece ${item.cutPieceCode} mark-sold failed (sale already saved)`, err);
        }
      }

      // ─── Invalidate caches ─────────────────────────────────
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['products-for-pos'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] }),
        queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] }),
        queryClient.invalidateQueries({ queryKey: ['carpet-rolls-pos'] }),
        queryClient.invalidateQueries({ queryKey: ['carpet-rolls-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['carpet-product-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['carpet-cut-pieces'] }),
        queryClient.invalidateQueries({ queryKey: ['carpet-cut-pieces-pos'] }),
      ]);

      return {
        saleNumber: sale.saleNumber,
        total: sale.total,
        credit: sale.creditAmount,
      };
    },
    onSuccess: (result) => {
      const msg = result.credit > 0
        ? `Sale + ${formatPKR(result.credit)} udhaar khata mein add ho gaya`
        : `Sale complete! ${result.saleNumber}`;
      toast.success(msg, { description: `Total: ${formatPKR(result.total)}` });
      onSuccess?.(result);
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Checkout fail ho gaya');
    },
  });
}

/**
 * Revert successful roll cuts when later step fails.
 * Uses the `adjust` endpoint with positive delta to add length back.
 */
async function revertCuts(
  cuts: Array<{ rollId: string; rollNumber: string; lengthFt: number; leftoverPieceId?: string }>,
) {
  for (const c of cuts) {
    try {
      await carpetRollsApi.adjust(c.rollId, {
        lengthDeltaFt: c.lengthFt,
        reason: 'POS checkout failed — auto revert',
        note: 'Cut reverted because sale could not complete',
      });
      // Delete leftover piece if it was created
      if (c.leftoverPieceId) {
        try {
          await carpetCutPiecesApi.remove(c.leftoverPieceId);
        } catch {
          // Ignore — best effort
        }
      }
    } catch (err) {
      console.error(`Failed to revert cut for ${c.rollNumber}`, err);
      toast.error(`${c.rollNumber}: auto-revert fail ho gaya — manually check karein`);
    }
  }
}
