/**
 * Pharmacy counter (web pharmacy/pos/config.ts) on the shared POS. A register
 * medicine (narcotic, controlled) asks for the doctor and patient once per
 * bill and writes them on the line for the narcotic register; an out-of-stock
 * brand offers same-formula substitutes; a prescription medicine reminds the
 * pharmacist. Batch and expiry come from the server, which sells the batch
 * that expires first. Medicine facts are kept on the phone, so this works
 * offline.
 */

import { needsRegister, parseRxNote, rxNote, saltKey, substitutesFor, type SubstituteLike } from '@nafaa/core/industries/pharmacy';
import { msg, t } from '@/core/i18n';
import { offline } from '@/core/offline';
import { toast } from '@/design';
import { useBill } from '@/modules/pos/engine/bill';
import { generalPos, registerPosIndustry, type PosIndustryConfig } from '@/modules/pos/engine/industry';
import { useMemo } from 'react';
import { allFacts, factsOf, refreshFacts, useMedicineFacts } from './facts';
import { PharmacyOverlay, askRx, askSubstitute, type SubOption } from './components/PosSheets';

const allowOnce = new Set<string>();

const joinNote = (...parts: Array<string | undefined>) => parts.filter(Boolean).join(' · ') || undefined;

export const pharmacyPos: PosIndustryConfig = {
  ...generalPos,
  id: 'pharmacy',
  searchHint: msg('Dawai ka naam, formula (salt) ya barcode…'),
  Overlay: PharmacyOverlay,
  /** The formula (salt) under each medicine name. */
  useShelf: () => {
    const facts = useMedicineFacts();
    return useMemo(() => ({ subline: (p: { id: string }) => facts.get(p.id)?.generic || null }), [facts]);
  },
  beforeAdd: (productId, opts, api) => {
    if (allowOnce.delete(productId)) return 'continue';
    refreshFacts();
    const facts = factsOf(productId);
    const register = needsRegister(facts);
    const knownRx = register ? useBill.getState().lines.map((l) => parseRxNote(l.customNote)).find(Boolean) : null;
    const rxNeeded = register && !parseRxNote(opts.note);
    void (async () => {
      const product = await offline.products.get(productId, api.shopId).catch(() => null);
      const go = async (next = opts) => { allowOnce.add(productId); const ok = await api.addProduct(productId, next); if (!ok) allowOnce.delete(productId); };
      if (!product) { await go(); return; }

      // Out of stock: the same formula on the shelf first.
      if (!opts.oversell && !product.hasVariants && !opts.variant && product.stock != null && product.stock <= 0) {
        const key = saltKey(facts?.saltIds ?? []);
        const mine: SubstituteLike = { id: productId, price: product.price, stock: 0, salts: facts?.saltIds.length ? key : undefined };
        const cands = mine.salts ? allFacts().filter((m) => m.productId !== productId && m.saltIds.length && saltKey(m.saltIds) === key) : [];
        const loaded = (await Promise.all(cands.map((m) => offline.products.get(m.productId, api.shopId).catch(() => null)))).filter(Boolean);
        const shelf = loaded.filter((p) => p!.isActive).map((p) => ({ id: p!.id, price: p!.price, stock: Number(p!.stock ?? 0), salts: key, name: p!.name, unit: p!.unit }));
        const options: SubOption[] = substitutesFor(mine, shelf).map((o) => {
          const m = factsOf(o.id);
          return { id: o.id, name: o.name, price: o.price, stock: o.stock, unit: o.unit, line: [m?.manufacturer, m?.dosageForm, `${Number(o.stock.toFixed(2))} ${o.unit} ${t('shelf par')}`].filter(Boolean).join(' · ') };
        });
        askSubstitute({
          productId, name: product.name, price: product.price, generic: facts?.generic ?? '', options,
          onPick: (o) => { allowOnce.add(o.id); void api.addProduct(o.id, { ...opts, note: joinNote(opts.note, `${product.name} ${t('ki jagah')}`) }).then((ok) => { if (!ok) allowOnce.delete(o.id); }); },
          onSellAnyway: api.counter.rules.negativeStock ? () => void go({ ...opts, oversell: true }) : undefined,
        });
        return;
      }

      // Register medicine: doctor and patient on the line, once per bill.
      if (rxNeeded) {
        if (knownRx) {
          const note = rxNote(knownRx);
          await go({ ...opts, note: joinNote(opts.note, note) });
          return;
        }
        askRx({ productId, name: product.name, opts, onDone: (note) => void go({ ...opts, note: joinNote(opts.note, note) }) });
        return;
      }

      if (facts?.requiresPrescription && !register && !useBill.getState().lines.some((l) => l.productId === productId)) {
        toast.info(t('{{name}} nuskhe wali dawai hai — nuskha dekh lein', { name: product.name }));
      }
      await go();
    })();
    return 'handled';
  },
};

registerPosIndustry(pharmacyPos);
