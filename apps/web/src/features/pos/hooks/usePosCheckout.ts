import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { type CreateSaleItem, type PaymentMethod, type ServiceChargeItem } from '@/api/sales.api';
import { offlineSalesApi } from '@/lib/offline/offlineSales';
import { carpetRollsApi } from '@/features/industries/carpet/api/carpet-rolls.api';
import { carpetCutPiecesApi } from '@/features/industries/carpet/api/carpet-cut-pieces.api';
import { decrementCachedRoll, markCachedCutPieceSold } from '@/lib/offline/offlineCarpet';
import { formatPKR } from '@/lib/format';
import type { CartItem } from '../components/pos-types';

interface CheckoutPayload {
  shopId: string;
  customerId?: string;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  discount: number;
  cart: CartItem[];
  serviceCharges?: ServiceChargeItem[];
}

type CheckoutResult = {
  saleId: string;
  saleNumber: string;
  total: number;
  paidAmount: number;
  credit: number;
  change: number;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  isOffline: boolean;
};

export function usePosCheckout(onSuccess?: (result: CheckoutResult) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CheckoutPayload): Promise<CheckoutResult> => {
      const { shopId, customerId, paymentMethod, paidAmount, discount, cart, serviceCharges } = payload;

      if (cart.length === 0) throw new Error('Cart khaali hai');
      if (!shopId) throw new Error('Shop ID missing');

      const isOnline = navigator.onLine;
      const rollCutItems = cart.filter((c) => c.rollId);
      const cutPieceItems = cart.filter((c) => c.cutPieceId);

      // ─── ONLINE: Cut rolls via API ────────────────────
      const successfulCuts: Array<{
        rollId: string;
        rollNumber: string;
        lengthFt: number;
        lengthInch?: number;
        leftoverPieceId?: string;
      }> = [];

      if (isOnline && rollCutItems.length > 0) {
        for (const item of rollCutItems) {
          try {
            const cutResult = await carpetRollsApi.cut(item.rollId!, {
              lengthFt: item.cutLengthFt!,
              lengthInch: item.cutLengthInch ?? 0,
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
            const errMsg = err?.response?.data?.message || `${item.rollNumber} se cut nahi ho saka`;
            if (successfulCuts.length > 0) {
              await revertCuts(successfulCuts);
              throw new Error(`${errMsg}\n\n${successfulCuts.length} previous cut(s) revert ho gayi hain.`);
            }
            throw new Error(errMsg);
          }
        }
      }

      // Validate cut pieces (online only)
      if (isOnline && cutPieceItems.length > 0) {
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
      }

      // ─── Build sale items ───────────────────────────────
      const saleItems: CreateSaleItem[] = cart.map((item) => {
        const baseUnitPrice =
          item.priceOverride ??
          (item.useWholesale ? item.wholesalePrice ?? item.basePrice : item.basePrice);

        let note = item.note;
        if (item.rollId && item.rollNumber) {
          const lenInchPart = (item.cutLengthInch ?? 0) > 0 ? ` ${item.cutLengthInch}in` : '';
          note = `Cut from ${item.rollNumber}: ${item.cutWidthFt}ft × ${item.cutLengthFt}ft${lenInchPart} = ${item.cutSqft?.toFixed(2)} sqft`;
          if (!isOnline) note += ' [OFFLINE — sync on reconnect]';
        } else if (item.cutPieceId && item.cutPieceCode) {
          note = `Cut piece ${item.cutPieceCode}`;
          if (!isOnline) note += ' [OFFLINE]';
        } else if (item.imeiNumber) {
          note = `IMEI: ${item.imeiNumber}`;
        }

        return {
          productId: item.productId,
          variantId: item.variantId,
          imeiId: item.imeiId,
          quantity: item.quantity,
          priceOverride: baseUnitPrice,
          lineDiscount: item.lineDiscount || undefined,
          useWholesale: item.useWholesale || undefined,
          note,
          internalNote: item.internalNote?.trim() || undefined,
        };
      });

      // ─── Create sale (offline-aware) ────────────────────
      let saleResult: any;
      try {
        saleResult = await offlineSalesApi.create({
          shopId,
          customerId: customerId || undefined,
          paymentMethod,
          paidAmount,
          discount,
          items: saleItems,
          serviceCharges: serviceCharges && serviceCharges.length > 0 ? serviceCharges : undefined,
        } as any);
      } catch (err: any) {
        if (successfulCuts.length > 0) {
          await revertCuts(successfulCuts);
          throw new Error(
            `Sale create nahi ho saki: ${err?.response?.data?.message || err?.message || 'unknown error'}\n\n${successfulCuts.length} roll cut(s) revert ho gayi hain.`,
          );
        }
        throw err;
      }

      // ─── OFFLINE: Update local cached carpet data ───────
      if (!isOnline) {
        for (const item of rollCutItems) {
          if (item.rollId && item.cutLengthFt) {
            const realLen = item.cutLengthFt + (item.cutLengthInch ?? 0) / 12;
            await decrementCachedRoll(item.rollId, realLen);
          }
        }
        for (const item of cutPieceItems) {
          if (item.cutPieceId) {
            await markCachedCutPieceSold(item.cutPieceId);
          }
        }
      }

      // Mark cut pieces as sold (online only, best-effort)
      if (isOnline) {
        for (const item of cutPieceItems) {
          try {
            await carpetCutPiecesApi.markSold(item.cutPieceId!);
          } catch (err) {
            console.warn(`Cut piece ${item.cutPieceCode} mark-sold failed`, err);
          }
        }
      }

      // ─── Invalidate caches ──────────────────────────────
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['products-for-pos'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-sales'] }),
        queryClient.invalidateQueries({ queryKey: ['carpet-product-summary-pos'] }),
      ]);

      const isOfflineSale = !saleResult.saleNumber;
      const total = saleResult.total ?? 0;
      const paid = saleResult.paidAmount ?? paidAmount;
      const credit = Math.max(total - paid, 0);
      const change = Math.max(paid - total, 0);

      return {
        saleId: saleResult.id,
        saleNumber: saleResult.saleNumber || `OFFLINE-${saleResult.id.slice(-8).toUpperCase()}`,
        total,
        paidAmount: paid,
        credit,
        change: saleResult.changeAmount ?? change,
        customerId: saleResult.customer?.id ?? saleResult.customerId ?? null,
        customerName: saleResult.customer?.name ?? null,
        customerPhone: saleResult.customer?.phone ?? null,
        isOffline: isOfflineSale,
      };
    },
    onSuccess: (result) => {
      const msg = result.isOffline
        ? `📡 Offline sale saved! Internet aane par sync ho ga`
        : result.credit > 0
        ? `Sale + ${formatPKR(result.credit)} udhaar khata mein add ho gaya`
        : `Sale complete! ${result.saleNumber}`;

      toast.success(msg, {
        description: `Total: ${formatPKR(result.total)}`,
        duration: result.isOffline ? 5000 : 3000,
      });
      onSuccess?.(result);
    },
    onError: (err: any) => {
      toast.error(err?.message || err?.response?.data?.message || 'Checkout fail ho gaya');
    },
  });
}

async function revertCuts(
  cuts: Array<{ rollId: string; rollNumber: string; lengthFt: number; lengthInch?: number; leftoverPieceId?: string }>,
) {
  for (const c of cuts) {
    try {
      const realLen = c.lengthFt + (c.lengthInch ?? 0) / 12;
      await carpetRollsApi.adjust(c.rollId, {
        lengthDeltaFt: realLen,
        reason: 'POS checkout failed — auto revert',
        note: 'Cut reverted because sale could not complete',
      });
      if (c.leftoverPieceId) {
        try {
          await carpetCutPiecesApi.remove(c.leftoverPieceId);
        } catch {}
      }
    } catch (err) {
      console.error(`Failed to revert cut for ${c.rollNumber}`, err);
      toast.error(`${c.rollNumber}: auto-revert fail ho gaya — manually check karein`);
    }
  }
}
