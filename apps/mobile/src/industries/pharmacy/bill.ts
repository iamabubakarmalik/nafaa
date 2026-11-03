/**
 * Pharmacy rows on the one receipt (web industryReceipt): dosage form and
 * pack, Rx and register marks and DRAP number under each medicine, the
 * doctor and patient written on a register line, and a fridge reminder. All
 * of it reads the medicine facts kept on the phone and the line notes, so it
 * prints offline too (a bill waiting to sync has no line notes yet).
 */

import { parseRxNote } from '@nafaa/core/industries/pharmacy';
import { registerReceiptIndustry } from '@/core/receipt';
import { billOf, word } from '../retail/lib/bill';
import { factsOf } from './facts';

registerReceiptIndustry('pharmacy', (_doc, ctx) => {
  const bill = billOf(ctx);
  if (!bill) return null;
  const w = (en: string, ur: string, roman = en) => word(ctx.lang, en, ur, roman);
  const facts = bill.items.map((it) => (it.productId ? factsOf(it.productId) : undefined));
  const lineDetails = facts.map((f) => {
    if (!f) return undefined;
    const rows = [
      [f.dosageForm, f.packSize].filter(Boolean).join(' · '),
      f.requiresPrescription ? w('Rx: doctor prescription needed', 'Rx: ڈاکٹر کی پرچی ضروری', 'Rx: doctor ki parchi zaroori') : '',
      f.isNarcotic ? w('Narcotic', 'نارکوٹک') : '',
      f.registrationNumber ? `DRAP ${f.registrationNumber}` : '',
      f.storageInstructions ?? '',
    ].filter(Boolean);
    return rows.length ? rows : undefined;
  });
  const rx = bill.items.map((it) => parseRxNote(it.note)).find(Boolean);
  const fridge = facts.some((f) => f?.requiresColdChain);
  return {
    lineDetails,
    infoRows: rx ? [
      { label: w('Doctor', 'ڈاکٹر'), value: `Dr. ${rx.doctorName}${rx.doctorRegNumber ? ` (PMDC ${rx.doctorRegNumber})` : ''}` },
      { label: w('Patient', 'مریض', 'Mareez'), value: rx.patientName },
    ] : undefined,
    footerNote: [
      fridge ? w('Keep some medicines in the fridge.', 'کچھ دوائیں فریج میں رکھیں۔', 'Kuch dawaiyan fridge me rakhein.') : '',
      w('Use medicines on your doctor\'s advice.', 'دوا ڈاکٹر کے مشورے سے استعمال کریں۔', 'Dawai doctor ke mashware se istemal karein.'),
    ].filter(Boolean).join('\n'),
  };
});
