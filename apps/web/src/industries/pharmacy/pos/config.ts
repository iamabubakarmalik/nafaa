/**
 * Pharmacy counter on the shared POS engine. Medicines carry their schedule
 * (Rx, narcotic, fridge) and generic name, so a search for "paracetamol"
 * finds every brand. A controlled medicine asks for doctor and patient,
 * written on the bill line for the narcotic register; an out-of-stock brand
 * offers substitutes with the same formula. Strips and boxes are product
 * units, and the line's batch and expiry come from the engine (earliest
 * valid expiry first).
 */

import { createElement, useEffect } from 'react';
import { toast } from 'sonner';
import { FileText, Pill, ShieldAlert, Snowflake } from 'lucide-react';
import { useProductCatalog, type PosFilter, type PosIndustryConfig, type PosItem } from '@modules/pos/engine';
import type { MedicineFacts } from '../api/medicines.api';
import { MEDICINE_FACTS_KEY, useMedicineFacts } from '../hooks/useMedicineFacts';
import { REGISTER_CLASSES, parseRxNote, rxNote } from '../lib/meta';
import { RxDetailsModal } from './RxDetailsModal';
import { SubstituteModal } from './SubstituteModal';

/** The counter's current catalog, for the substitute picker (beforeAdd only sees one item). */
const shelf: { items: PosItem[] } = { items: [] };

const needsRegister = (m?: MedicineFacts) => !!m && (m.isNarcotic || REGISTER_CLASSES.includes(m.scheduleClass));

function usePharmacyCatalog() {
  const facts = useMedicineFacts();
  const catalog = useProductCatalog((it): PosItem => {
    const m = facts.get(it.id);
    if (!m) return it;
    const register = needsRegister(m);
    return {
      ...it,
      badges: [
        ...(register ? [{ label: 'Register', tone: 'danger' as const, icon: ShieldAlert }] : m.requiresPrescription ? [{ label: 'Rx', tone: 'warning' as const, icon: FileText }] : []),
        ...(m.requiresColdChain || m.isRefrigerated ? [{ label: 'Fridge', tone: 'info' as const, icon: Snowflake }] : []),
      ],
      subline: [m.generic, m.dosageForm].filter(Boolean).join(' · ') || undefined,
      searchText: [it.searchText, m.generic, m.manufacturer, m.dosageForm].filter(Boolean).join(' '),
      meta: {
        ...it.meta, rx: m.requiresPrescription, register, cold: m.requiresColdChain || m.isRefrigerated,
        generic: m.generic, salts: [...m.saltIds].sort().join('|'), manufacturer: m.manufacturer, dosageForm: m.dosageForm,
      },
    };
  }, [facts]);
  useEffect(() => { shelf.items = catalog.items; }, [catalog.items]);
  return { ...catalog, refreshKeys: [...catalog.refreshKeys, MEDICINE_FACTS_KEY, 'pharmacy-expiry'] };
}

const filters: PosFilter[] = [
  { id: 'otc', label: 'OTC', icon: Pill, match: (i) => !!i.meta?.generic && !i.meta?.rx },
  { id: 'rx', label: 'Rx', icon: FileText, match: (i) => !!i.meta?.rx },
  { id: 'register', label: 'Register wali', icon: ShieldAlert, match: (i) => !!i.meta?.register },
  { id: 'cold', label: 'Fridge', icon: Snowflake, match: (i) => !!i.meta?.cold },
];

export const pharmacyPos: PosIndustryConfig = {
  id: 'pharmacy',
  label: 'Pharmacy',
  useCatalog: usePharmacyCatalog,
  quickKeys: true,
  filters,
  searchHint: 'Dawai ka naam, formula (salt) ya barcode…',
  beforeAdd: (item, opts, api) => {
    const confirmed = opts.confirmed ?? [];

    // Out of stock: same formula on the shelf first.
    if (item.stock <= 0 && !item.hasVariants && !opts.oversell && !opts.variant && !confirmed.includes('no-stock')) {
      api.openPicker(createElement(SubstituteModal, {
        item,
        options: substitutesFor(item, shelf.items),
        onClose: api.closePicker,
        onSellAnyway: () => { api.closePicker(); api.addItem(item, { ...opts, confirmed: [...confirmed, 'no-stock'] }); },
        onPick: (sub) => {
          api.closePicker();
          api.addItem(sub, { ...opts, note: [opts.note, `${item.name} ki jagah`].filter(Boolean).join(' · ') });
        },
      }));
      return 'handled';
    }

    // Controlled medicine: doctor and patient on the line, once per bill.
    if (item.meta?.register && !confirmed.includes('rx') && !parseRxNote(opts.note)) {
      const known = api.cart.map((l) => parseRxNote(l.note)).find(Boolean);
      if (known) {
        api.addItem(item, { ...opts, confirmed: [...confirmed, 'rx'], note: [opts.note, rxNote(known)].filter(Boolean).join(' · ') });
        return 'handled';
      }
      api.openPicker(createElement(RxDetailsModal, {
        medicine: item.name,
        onClose: api.closePicker,
        onConfirm: (d) => {
          api.closePicker();
          api.addItem(item, { ...opts, confirmed: [...confirmed, 'rx'], note: [opts.note, rxNote(d)].filter(Boolean).join(' · ') });
        },
      }));
      return 'handled';
    }

    if (item.meta?.rx && !item.meta?.register && !api.cart.some((l) => l.productId === item.id)) {
      toast.info(`${item.name} nuskhe wali dawai hai — nuskha dekh lein`, { duration: 2500 });
    }
    return 'continue';
  },
  voiceAliases: {
    panadol: 'panadol paracetamol', paracetamol: 'paracetamol panadol', disprin: 'disprin aspirin', brufen: 'brufen ibuprofen',
    augmentin: 'augmentin amoxicillin', flagyl: 'flagyl metronidazole', syrup: 'syrup', drip: 'drip infusion', injection: 'injection',
  },
};

/** Shelf items with exactly the same salts as `item`, cheapest first. */
export function substitutesFor(item: PosItem, all: PosItem[]): PosItem[] {
  const key = item.meta?.salts;
  if (!key) return [];
  return all.filter((o) => o.id !== item.id && o.meta?.salts === key && o.stock > 0).sort((a, b) => a.price - b.price);
}
