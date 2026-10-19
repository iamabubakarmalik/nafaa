/**
 * What each industry adds to the shared receipt: restaurant table and kitchen
 * copy, salon stylist, hotel stay, pharmacy dosage and Rx, bakery shelf life,
 * agri farmer and usage, jewelry weight and making, appliance warranty cards
 * and installation slip. Industry APIs are loaded only when needed; a failed
 * lookup leaves the plain bill.
 */

import { formatPKR } from '@core/lib/format';
import type { ReceiptDoc, ReceiptRowDoc, ReceiptSetup } from '@core/receipt/types';
import { PAYMENT_LABELS, saleToReceipt } from './fromSale';

export interface ReceiptAction {
  key: string;
  label: string;
  run: () => void;
}

export interface LoadedReceipt {
  sale: any;
  doc: ReceiptDoc;
  actions: ReceiptAction[];
}

const list = (v: unknown): any[] => (Array.isArray(v) ? v : Array.isArray((v as { items?: unknown[] })?.items) ? (v as { items: any[] }).items : []);
const day = (v: unknown) => (v ? new Date(String(v)).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const safe = async <T,>(p: Promise<T>): Promise<T | null> => { try { return await p; } catch { return null; } };

const MODE: Record<string, string> = { DINE_IN: 'Dine-in', TAKEAWAY: 'Takeaway', DELIVERY: 'Delivery', DRIVE_THRU: 'Drive-thru', ROOM_SERVICE: 'Room service', PICKUP: 'Pickup' };

/** Adds rows under the header and details under matching lines. */
function addInfo(doc: ReceiptDoc, rows: Array<ReceiptRowDoc | null | false | undefined | '' | 0>) {
  doc.infoRows = [...(doc.infoRows ?? []), ...rows.filter(Boolean) as ReceiptRowDoc[]];
}
function addDetails(doc: ReceiptDoc, sale: any, forItem: (it: any) => string[]) {
  doc.lines = doc.lines.map((l, i) => ({ ...l, details: [...(l.details ?? []), ...forItem(sale.items?.[i] ?? {}).filter(Boolean)] }));
}
const note = (doc: ReceiptDoc, text: string) => { doc.footerNote = [doc.footerNote, text].filter(Boolean).join('\n'); };

async function restaurant(sale: any, doc: ReceiptDoc, actions: ReceiptAction[], setup: ReceiptSetup) {
  const { ordersApi } = await import('@industries/restaurant/api/orders.api');
  const order = list(await safe(ordersApi.list({ search: sale.saleNumber }))).find((o) => o.saleId === sale.id);
  if (!order) return;
  addInfo(doc, [
    order.orderNumber && { label: 'Order #', value: order.orderNumber },
    order.table && { label: 'Table', value: `${order.table.tableNumber}${order.table.tableName ? ` (${order.table.tableName})` : ''}`, bold: true },
    order.mode && { label: 'Order', value: MODE[order.mode] ?? order.mode },
    order.numberOfGuests && { label: 'Mehman', value: String(order.numberOfGuests) },
    order.kots?.[0]?.kotNumber && { label: 'KOT', value: order.kots[0].kotNumber },
  ]);
  if (order.deliveryAddress) doc.deliveryAddress = order.deliveryAddress;
  const byProduct = new Map(list(order.items).map((x) => [x.productId, x]));
  addDetails(doc, sale, (it) => {
    const o = byProduct.get(it.productId);
    if (!o) return [];
    const mods = list(o.modifiers).map((m) => m.modifierOption?.name || m.optionName).filter(Boolean);
    return [mods.length ? mods.join(', ') : '', o.spiceLevel && o.spiceLevel !== 'NONE' ? `Teekha: ${o.spiceLevel}` : '', o.specialInstructions ? `📝 ${o.specialInstructions}` : ''];
  });
  if (order.specialRequests) note(doc, `Khaas hidayat: ${order.specialRequests}`);
  actions.push({
    key: 'kitchen', label: 'Kitchen copy',
    run: async () => {
      const { printHtml } = await import('@core/receipt/print');
      const { esc } = await import('@core/receipt/html');
      const items = list(order.items).map((x) => `<div class="i"><b>${esc(x.quantity)} × ${esc(x.product?.name ?? x.name ?? x.itemName ?? 'Item')}</b>
        ${list(x.modifiers).length ? `<div>${esc(list(x.modifiers).map((m) => m.modifierOption?.name || m.optionName).join(', '))}</div>` : ''}
        ${x.specialInstructions ? `<div>⚠ ${esc(x.specialInstructions)}</div>` : ''}</div>`).join('');
      printHtml(`<!doctype html><html><head><meta charset="utf-8"><style>@page{size:80mm auto;margin:0}*{margin:0;padding:0;box-sizing:border-box}
        body{width:80mm;padding:4mm 3mm;font:700 14px Arial;color:#000}.c{text-align:center}.big{font-size:22px;font-weight:900}.i{border-bottom:1.5px dashed #000;padding:5px 0}</style></head>
        <body><div class="c big">KITCHEN</div><div class="c">${esc(setup.shop.name)} · ${esc(order.orderNumber ?? sale.saleNumber)}</div>
        ${order.table ? `<div class="c big">Table ${esc(order.table.tableNumber)}</div>` : ''}<div class="c">${esc(MODE[order.mode] ?? order.mode ?? '')}${order.numberOfGuests ? ` · ${esc(order.numberOfGuests)} mehman` : ''}</div>
        ${items}${order.specialRequests ? `<div style="border:2px solid #000;padding:4px;margin-top:6px">KHAAS: ${esc(order.specialRequests)}</div>` : ''}
        <div class="c" style="margin-top:6px;font-size:11px">${new Date().toLocaleTimeString('en-PK')}</div></body></html>`);
    },
  });
}

async function salon(sale: any, doc: ReceiptDoc) {
  const { appointmentsApi } = await import('@industries/salon/api/appointments.api');
  // The stylist is already in each line's note, so only the appointment number is added.
  const apt = list(await safe(appointmentsApi.list({ saleId: sale.id })))[0];
  if (!apt) return;
  addInfo(doc, [{ label: 'Appointment', value: apt.appointmentNumber }]);
  note(doc, 'Agli dafa ke liye pehle se waqt le lein.');
}

async function hotel(sale: any, doc: ReceiptDoc) {
  const { bookingsApi } = await import('@industries/hotel/api/bookings.api');
  const b = list(await safe(bookingsApi.list())).find((x) => x.saleId === sale.id);
  if (!b) return;
  const rooms = list(b.bookedRooms).map((r) => `${r.roomNumber || 'Room'}${r.roomTypeName ? ` ${r.roomTypeName}` : ''}`).join(', ');
  addInfo(doc, [
    { label: 'Check-in', value: day(b.checkInDate) }, { label: 'Check-out', value: day(b.checkOutDate) },
    b.nights && { label: 'Raatein', value: String(b.nights) }, rooms && { label: 'Kamra', value: rooms },
  ]);
}

async function pharmacy(sale: any, doc: ReceiptDoc) {
  const { medicinesApi } = await import('@industries/pharmacy/api/medicines.api');
  const meds = new Map(list(await safe(medicinesApi.list({}))).map((m) => [m.productId, m]));
  addDetails(doc, sale, (it) => {
    const m = meds.get(it.productId);
    if (!m) return [];
    return [[m.dosageForm, m.packSize].filter(Boolean).join(' · '), m.requiresPrescription ? 'Rx — doctor ki parchi zaroori' : '',
      m.isNarcotic ? 'Narcotic' : '', m.registrationNumber ? `DRAP ${m.registrationNumber}` : '', m.storageInstructions ? `📌 ${m.storageInstructions}` : ''];
  });
  if (sale.items?.some((it: any) => meds.get(it.productId)?.requiresColdChain)) note(doc, '❄️ Kuch dawaiyan fridge me rakhein.');
  note(doc, 'Dawai doctor ke mashware se istemal karein.');
}

async function bakery(sale: any, doc: ReceiptDoc) {
  const { bakeryProductsApi } = await import('@industries/bakery/api/products.api');
  const care = new Map(list(await safe(bakeryProductsApi.list({}))).map((p) => [p.productId, p]));
  const items = (sale.items ?? []).map((i: any) => care.get(i.productId)).filter(Boolean);
  if (items.some((p: any) => p.requiresRefrigeration)) note(doc, '❄️ Fridge me rakhein');
  const hours = items.map((p: any) => (p.shelfLifeHours ? Number(p.shelfLifeHours) : p.shelfLifeDays ? Number(p.shelfLifeDays) * 24 : 0)).filter((h: number) => h > 0);
  if (hours.length) {
    const until = new Date(doc.date.getTime() + Math.min(...hours) * 3_600_000);
    note(doc, Math.min(...hours) < 24
      ? `⏱️ Aaj hi kha lein (${until.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })} tak)`
      : `⏱️ ${until.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} tak kha lein`);
  }
}

async function agri(sale: any, doc: ReceiptDoc) {
  const [{ agriProductsApi }, { farmersApi }] = await Promise.all([import('@industries/agri/api/products.api'), import('@industries/agri/api/farmers.api')]);
  const [profiles, farmer] = await Promise.all([
    safe(agriProductsApi.list({})),
    sale.customerId ? safe(farmersApi.byCustomer(sale.customerId)) : Promise.resolve(null),
  ]);
  const by = new Map(list(profiles).map((p) => [p.productId, p]));
  if (farmer) {
    addInfo(doc, [
      { label: 'Kisan', value: farmer.fullName },
      (farmer.village || farmer.district) && { label: 'Gaon', value: [farmer.village, farmer.district].filter(Boolean).join(', ') },
      farmer.landAreaAcres && { label: 'Zameen', value: `${farmer.landAreaAcres} acre` },
      farmer.farmerNumber && { label: 'Kisan #', value: farmer.farmerNumber },
    ]);
  }
  addDetails(doc, sale, (it) => {
    const p = by.get(it.productId);
    if (!p) return [];
    const pack = Number(p.packSize) > 0 ? `1 ${it.product?.unit ?? 'pack'} = ${p.packSize} ${p.packUnit || 'kg'} · kul ${Number((Number(it.quantity) * Number(p.packSize)).toFixed(2))} ${p.packUnit || 'kg'}` : '';
    return [pack, [p.applicationRate, p.applicationMethod, p.applicationInterval].filter(Boolean).join(' · '), p.isRestricted ? '⚠ Pabandi wali dawai' : ''];
  });
  const items = (sale.items ?? []).map((i: any) => by.get(i.productId)).filter(Boolean);
  const reEntry = Math.max(0, ...items.map((p: any) => Number(p.reEntryPeriod) || 0));
  const preHarvest = Math.max(0, ...items.map((p: any) => Number(p.ppePeriod) || 0));
  if (reEntry || preHarvest) note(doc, `⚠ Spray ke baad ${reEntry ? `${reEntry} din khet me na jayein` : ''}${reEntry && preHarvest ? ', ' : ''}${preHarvest ? `${preHarvest} din fasal na katein` : ''}. Mask aur dastane pehnein.`);
}

function appliances(sale: any, doc: ReceiptDoc, actions: ReceiptAction[], setup: ReceiptSetup) {
  actions.push(
    { key: 'warranty', label: 'Warranty cards', run: () => void import('@industries/appliances/receipt/appliancePrints').then((m) => m.printWarrantyCards(sale, setup)) },
    { key: 'install', label: 'Installation slip', run: () => void import('@industries/appliances/receipt/appliancePrints').then((m) => m.printInstallSlip(sale, setup)) },
  );
  void doc;
}

/** Jewelry bills come from their own model. */
export function jewelryToReceipt(s: any): ReceiptDoc {
  const lines = list(s.items).map((it) => {
    const metal = Number(it.netWeight || 0) * Number(it.ratePerGram || 0);
    const making = Number(it.makingChargeFixed || 0) + Number(it.makingChargePerGram || 0) * Number(it.netWeight || 0) + (Number(it.makingChargePct || 0) / 100) * metal;
    const wastage = (Number(it.wastagePct || 0) / 100) * metal;
    const each = metal + making + wastage + Number(it.polishCharges || 0) + Number(it.hallmarkCharges || 0) + Number(it.stoneValue || 0);
    const qty = Number(it.quantity || 1);
    const purity = String(it.purity ?? '').replace('KARAT_', '').replace('SILVER_', 'S').replace('PLATINUM_', 'Pt-');
    return {
      name: it.productName ?? 'Zevar', qty, unit: 'pc', price: each, total: each * qty,
      details: [
        `${String(it.metalType ?? '').replace('_', ' ')} ${purity}${/^\d+$/.test(purity) ? 'K' : ''} · Net ${Number(it.netWeight || 0).toFixed(3)}g @ ${formatPKR(Number(it.ratePerGram || 0))}/g`,
        [`Gross ${Number(it.grossWeight || 0).toFixed(3)}g`, Number(it.stoneWeight) > 0 && `Pathar ${Number(it.stoneWeight).toFixed(3)}g`,
          making > 0 && `Banwai ${formatPKR(making)}`, Number(it.wastagePct) > 0 && `Wastage ${it.wastagePct}%`].filter(Boolean).join(' · '),
        it.hallmarkNumber ? `Hallmark ${it.hallmarkNumber}` : '',
      ].filter(Boolean),
    };
  });
  const extraRows: ReceiptRowDoc[] = [
    ...(Number(s.gstAmount) > 0 ? [{ label: 'GST', value: `+${formatPKR(Number(s.gstAmount))}` }] : []),
    ...(Number(s.exchangeValue) > 0 ? [{ label: `Purana sona${Number(s.exchangeMetalGrams) > 0 ? ` ${Number(s.exchangeMetalGrams).toFixed(3)}g` : ''}`, value: `−${formatPKR(Number(s.exchangeValue))}` }] : []),
  ];
  return {
    saleNumber: s.invoiceNumber ?? String(s.id).slice(-8).toUpperCase(),
    date: new Date(s.createdAt ?? Date.now()),
    customerName: s.customerName ?? undefined, customerPhone: s.customerPhone ?? undefined,
    infoRows: s.customerCnic ? [{ label: 'CNIC', value: s.customerCnic }] : undefined,
    lines, subtotal: Number(s.subtotal || lines.reduce((a, l) => a + l.total, 0)), discount: Number(s.discount || 0), extraRows,
    total: Number(s.total || 0), paid: Number(s.paidAmount || 0),
    paymentLabel: `Paid (${PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod ?? 'Cash'})`,
    footerNote: 'Return aur badalne par us din ke rate ke mutabiq hisaab hoga.',
  };
}

/** Loads a bill and what its industry adds. */
export async function loadReceipt(id: string, industryId: string | undefined, setup: ReceiptSetup): Promise<LoadedReceipt> {
  if (industryId === 'jewelry') {
    const { jewelrySalesApi } = await import('@industries/jewelry/api/sales.api');
    const js = await safe(jewelrySalesApi.getOne(id));
    if (js) return { sale: js, doc: jewelryToReceipt(js), actions: [] };
  }
  const { offlineSalesApi } = await import('@core/lib/offline/offlineSales');
  const sale: any = await offlineSalesApi.getOne(id);
  const doc = saleToReceipt(sale);
  const actions: ReceiptAction[] = [];
  const add: Record<string, () => unknown> = {
    restaurant: () => restaurant(sale, doc, actions, setup),
    salon: () => salon(sale, doc),
    hotel: () => hotel(sale, doc),
    pharmacy: () => pharmacy(sale, doc),
    bakery: () => bakery(sale, doc),
    agri: () => agri(sale, doc),
    appliances: () => appliances(sale, doc, actions, setup),
  };
  if (industryId && add[industryId] && navigator.onLine) await safe(Promise.resolve(add[industryId]()));
  else if (industryId === 'appliances') appliances(sale, doc, actions, setup);
  return { sale, doc, actions };
}
