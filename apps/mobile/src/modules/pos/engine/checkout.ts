/**
 * Sends the bill: the shop's counter rules (the owner's or a manager's PIN
 * where they ask for it), then the sale through the offline outbox, an
 * advance kept in khata, the receipt document, and a clean counter for the
 * next customer. Works the same with or without internet; a PIN needs it.
 */

import { create } from 'zustand';
import {
  advanceOf, cartToSaleItems, counterCheck, deliveryAmount, deliveryRiderAmount, priceCutOf, salePayment,
  type BillTotals, type CheckoutResult, type CounterPin, type PosCartLine, type ServiceChargeItem,
} from '@nafaa/core/pos';
import { apiErrorMessage } from '@/core/api/errors';
import { haptic } from '@/core/device/haptics';
import { formatMoney, formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { isOnline } from '@/core/net';
import { enqueueKhataPayment, enqueueSale, OfflineRuleError, type SaleInput } from '@/core/offline';
import { paymentLabel, paymentParts, printReceipt, rw, type ReceiptDoc, type ReceiptLang } from '@/core/receipt';
import { askManagerPin, type PinKind } from '@/core/security/ManagerPin';
import { alert, toast } from '@/design';
import { useBill } from './bill';
import type { Counter } from './counter';
import type { PosIndustryConfig } from './industry';
import { bumpRecent, openSheet, type PosApi } from './usePos';
import { usePosPrefs } from './prefs';

export interface DoneSale {
  saleId: string;
  opId: string;
  total: number;
  paid: number;
  change: number;
  credit: number;
  /** Extra kept in the customer's khata as an advance. */
  deposited: number;
  /** Receipt built from the bill; its number follows the server once synced. */
  doc: ReceiptDoc;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  /** The bill's lines, to sell the same again. */
  lines: PosCartLine[];
  at: number;
}

export const useLastSale = create<{ sale: DoneSale | null }>(() => ({ sale: null }));

export function pinReasonText(pin: CounterPin): string {
  if (pin.kind === 'credit') return t('Khata over the credit limit ({{limit}})', { limit: formatMoney(pin.limit) });
  if (pin.reason === 'over_limit') return t('Discount over {{max}}%', { max: pin.maxPercent });
  return t('Discount');
}

interface Ctx {
  api: PosApi;
  counter: Counter;
  config: PosIndustryConfig;
  shopId: string | null;
  totals: BillTotals & { allCharges: ServiceChargeItem[] };
  lang: ReceiptLang;
  cashierName?: string;
}

/** Checks that run when checkout opens; a message stops it. */
export function checkoutBlock(ctx: Pick<Ctx, 'api' | 'counter' | 'config' | 'shopId'>, mode: 'full' | 'partial' | 'credit'): string | null {
  const bill = useBill.getState();
  if (!bill.lines.length) return t('The bill is empty');
  if (!ctx.shopId) return t('Choose a shop first');
  if (ctx.counter.rules.requireCustomer && !bill.customer) return t('Choose a customer for every bill (shop setting)');
  if (mode !== 'full' && !ctx.counter.rules.allowCredit) return t('Khata is turned off in this shop');
  if (mode === 'credit' && !bill.customer) return t('Choose a customer for khata');
  return ctx.config.beforeCheckout?.(ctx.api) ?? null;
}

/** The receipt of the bill on the counter (before it is cleared). */
function receiptFromBill(ctx: Ctx, saleNumber: string, d: CheckoutResult, paidAmount: number): ReceiptDoc {
  const bill = useBill.getState();
  const { totals, lang } = ctx;
  const credit = Math.max(totals.total - paidAmount, 0);
  const others = totals.allCharges.filter((c) => !c.passThrough && c.type !== 'DELIVERY');
  const split = paymentParts(lang, d.payments, Math.max(d.paidAmount - totals.total, 0));
  return {
    saleNumber,
    date: new Date(),
    customerName: bill.customer?.name,
    customerPhone: bill.customer?.phone ?? undefined,
    receivedByName: bill.receiverName.trim() || undefined,
    receivedByPhone: bill.receiverPhone.trim() || undefined,
    cashierName: ctx.cashierName,
    previousDue: Math.max(Number(bill.customer?.balance) || 0, 0),
    lines: bill.lines.map((l) => ({
      name: l.variantName ? `${l.name} (${l.variantName})` : l.name,
      qty: l.quantity, unit: l.unitName, price: l.unitPrice, total: l.lineTotal,
      discount: l.priceEdited && l.basePrice > l.unitPrice ? Number(((l.basePrice - l.unitPrice) * l.quantity).toFixed(2)) : undefined,
      note: [l.customNote ?? '', l.serialNumber ? `S/N ${l.serialNumber}` : '', l.imei ? `IMEI ${l.imei}` : '', l.batchNumber ? `Batch ${l.batchNumber}` : ''].filter(Boolean).join(' · ') || undefined,
    })),
    subtotal: totals.subtotal,
    discount: Number((totals.discount + totals.codeDiscount + totals.loyaltyDiscount).toFixed(2)),
    deliveryCharge: deliveryAmount(bill.delivery) || undefined,
    riderDelivery: deliveryRiderAmount(bill.delivery) || undefined,
    deliveryAddress: bill.delivery.on ? bill.delivery.address || undefined : undefined,
    extraRows: [
      ...others.map((c) => ({ label: c.label, value: `+${formatPKR(c.amount)}` })),
      ...(bill.promo ? [{ label: rw(lang, 'code', { code: bill.promo.code }), value: `−${formatPKR(totals.codeDiscount)}` }] : []),
      ...(totals.pointsUsed ? [{ label: rw(lang, 'pointsUsed', { points: totals.pointsUsed }), value: `−${formatPKR(totals.loyaltyDiscount)}` }] : []),
    ],
    total: totals.total,
    paid: d.paidAmount,
    paymentLabel: split.label ?? paymentLabel(lang, d.paymentMethod, credit),
    payments: split.lines,
  };
}

const pinKindOf = (e: OfflineRuleError): PinKind => (/khata|credit/i.test(e.message) ? 'credit' : 'discount');

/** Sends the bill. Returns the finished sale, or null when it was stopped (the reason is shown). */
export async function completeSale(ctx: Ctx, d: CheckoutResult): Promise<DoneSale | null> {
  const bill = useBill.getState();
  const block = checkoutBlock(ctx, d.isCredit ? 'partial' : 'full');
  if (block) { haptic('error'); toast.error(block); return null; }
  const { totals, counter } = ctx;
  const customer = bill.customer;
  const pay = salePayment(d, totals.total);
  const credit = Math.max(totals.total - pay.paidAmount, 0);
  if (credit > 0.005 && !customer) { toast.error(t('Choose a customer to put the rest on khata.')); return null; }

  // The shop's rules first (the server checks them again).
  const check = counterCheck(counter.rules, { manualDiscount: totals.discount, priceCut: priceCutOf(bill.lines), subtotal: totals.subtotal, credit, customer });
  if (check.stop) {
    haptic('error');
    if (check.stop.code === 'discount_off') toast.error(t('Discounts are turned off in this shop (Settings).'));
    else if (check.stop.code === 'discount_limit') toast.error(t('Discount cannot be over {{max}}% (Settings)', { max: check.stop.maxPercent }));
    else toast.error(t('{{name}} has a credit limit of {{limit}}', { name: customer?.name ?? '', limit: formatMoney(check.stop.limit) }));
    return null;
  }
  let managerPin: string | undefined;
  if (check.pin) {
    if (!isOnline()) {
      await alert({ title: t('Internet needed'), message: t('{{what}} needs the owner\'s or manager\'s PIN, which needs internet.', { what: pinReasonText(check.pin) }) });
      return null;
    }
    const pin = await askManagerPin(pinReasonText(check.pin), check.pin.kind);
    if (!pin) return null;
    managerPin = pin;
  }

  const input: SaleInput = {
    shopId: ctx.shopId!,
    customerId: customer?.id ?? null,
    soldById: bill.soldById ?? undefined,
    paymentMethod: pay.paymentMethod,
    paidAmount: pay.paidAmount,
    payments: pay.payments?.map((p) => ({ ...p, method: p.method })) as SaleInput['payments'],
    discount: totals.discount,
    discountCode: bill.promo?.code,
    codeDiscount: totals.codeDiscount || undefined,
    loyaltyPointsToUse: totals.pointsUsed || undefined,
    loyaltyDiscount: totals.loyaltyDiscount || undefined,
    serviceCharges: totals.allCharges.length ? totals.allCharges : undefined,
    receivedByName: bill.receiverName.trim() || undefined,
    receivedByPhone: bill.receiverPhone.trim() || undefined,
    note: bill.note.trim() || undefined,
    items: cartToSaleItems(bill.lines),
    managerPin,
  };

  let res: Awaited<ReturnType<typeof enqueueSale>>;
  try {
    res = await enqueueSale(input);
  } catch (e) {
    if (!(e instanceof OfflineRuleError)) { haptic('error'); toast.error(apiErrorMessage(e)); return null; }
    if (e.code === 'online_needed') {
      await alert({ title: t('Internet needed'), message: e.message });
      return null;
    }
    if (e.code !== 'pin_needed') { haptic('error'); toast.error(e.message); return null; }
    const pin = await askManagerPin(e.message, pinKindOf(e));
    if (!pin) return null;
    try {
      res = await enqueueSale({ ...input, managerPin: pin });
    } catch (e2) {
      haptic('error');
      toast.error(e2 instanceof Error ? e2.message : apiErrorMessage(e2));
      return null;
    }
  }

  // Money over the bill kept as an advance in khata (a khata payment, not change).
  const advance = advanceOf(d, totals.total, !!customer);
  let deposited = 0;
  if (advance > 0 && customer) {
    try {
      await enqueueKhataPayment({
        customerId: customer.id, amount: advance, paymentMethod: d.paymentMethod, reference: res.sale.saleNumber, shopId: ctx.shopId,
        // Saved on the khata as written, the same in every language (web rule).
        note: `Bill ${res.sale.saleNumber} par zyada diya — advance`,
      });
      deposited = advance;
    } catch {
      toast.error(t('The advance was not saved to khata. Give it back or add it from Khata.'));
    }
  }

  const doc = receiptFromBill(ctx, res.sale.saleNumber, d, pay.paidAmount);
  const done: DoneSale = {
    saleId: res.saleId, opId: res.opId, total: totals.total, paid: pay.paidAmount,
    change: deposited ? 0 : Math.max(d.paidAmount - totals.total, 0), credit, deposited, doc,
    customerId: customer?.id ?? null, customerName: customer?.name ?? null, customerPhone: customer?.phone ?? null, lines: bill.lines, at: Date.now(),
  };
  bumpRecent(bill.lines.map((l) => l.productId).filter((x): x is string => !!x));
  ctx.config.afterSale?.({ id: res.saleId, saleNumber: res.sale.saleNumber, productIds: bill.lines.map((l) => l.productId).filter((x): x is string => !!x) });
  bill.clear(counter.parts.priceTiers ? counter.parts.defaultPriceTier : 'RETAIL');
  useLastSale.setState({ sale: done });
  haptic('success');
  openSheet('done');
  if (usePosPrefs.getState().autoPrint) printReceipt(doc, { lang: ctx.lang }).catch(() => toast.error(t('Could not print. Check the printer and try again.')));
  return done;
}
