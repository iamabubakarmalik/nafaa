/**
 * Glossary terms imported from apps/marketing glossary.ts (20 terms).
 * Kept 18 with rewritten one-sentence definitions and new Roman Urdu
 * definitions (the source had Nastaliq Urdu). Dropped: AEO and GEO (marketing
 * jargon, not shop vocabulary). Tax terms carry a general meaning only; W11
 * adds an official source before they are published (ARCH 12 fact-check rule).
 */

import { richText, withIds, writerNotes } from '../../lib/blocks';
import type { EntryRef, SeedEntry } from '../../lib/types';

const CHECKED_ON = '2026-10-20';
const ORIGIN = 'apps/marketing/src/lib/data/glossary.ts';

interface TermSpec {
  slug: string;
  term: string;
  definition: string;
  definitionRomanUrdu: string;
  example?: string;
  alsoKnownAs?: string[];
  related?: EntryRef[];
  /** Needs an official source before publishing. */
  taxOrLegal?: boolean;
  dropped?: string[];
}

const TERMS: TermSpec[] = [
  { slug: 'pos', term: 'POS (Point of Sale)', definition: 'The point of sale is where a sale is completed: items are scanned or picked, payment is taken and a receipt is given.', definitionRomanUrdu: 'POS woh jagah ya system hai jahan sale mukammal hoti hai: cheezein scan hoti hain, payment li jati hai aur raseed di jati hai.', example: 'A kiryana store scans a packet of biscuits, takes payment and prints the bill.', alsoKnownAs: ['point of sale', 'billing system', 'counter software'], dropped: ['"Modern POS systems like Nafaa" sales line.'] },
  { slug: 'khata', term: 'Khata', definition: 'A khata is a ledger, traditionally a paper register, that records what each customer owes a shop on credit and what they have paid back.', definitionRomanUrdu: 'Khata woh register hai jis me dukandar likhta hai ke kis gahak ne kitna udhaar liya aur kitna wapas kiya.', example: 'A shopkeeper writes the amount against a regular customer who will pay at the end of the month.', alsoKnownAs: ['ledger', 'udhaar register', 'digital khata'], related: ['GLOSSARY_TERM:udhaar'] },
  { slug: 'udhaar', term: 'Udhaar', definition: 'Udhaar is credit given to a customer: goods are taken now and paid for later.', definitionRomanUrdu: 'Udhaar ka matlab hai saman abhi le lena aur paise baad me dena.', alsoKnownAs: ['udhar', 'credit sale', 'buy now pay later'], related: ['GLOSSARY_TERM:khata'] },
  { slug: 'fbr-pos', term: 'FBR POS Integration', definition: "FBR POS integration is the live link between a retailer's point of sale and the Federal Board of Revenue, so that each sale invoice is reported to FBR and carries an FBR invoice number and QR code.", definitionRomanUrdu: 'FBR POS integration ka matlab hai dukaan ka POS FBR se juda ho, taake har bill FBR ko jaye aur us par FBR invoice number aur QR code ho.', alsoKnownAs: ['FBR POS', 'FBR integration', 'POS integration'], related: ['GLOSSARY_TERM:tier-1-retailer'], taxOrLegal: true, dropped: ['"Mandatory" and "instantly" wording until the rule is cited.'] },
  { slug: 'tier-1-retailer', term: 'Tier-1 Retailer', definition: 'Tier-1 retailer is the sales tax category for larger retailers, such as chain-store outlets and shops in air-conditioned malls, that must integrate their POS with FBR.', definitionRomanUrdu: 'Tier-1 retailer badi dukaanon ki sales tax category hai, jaise chain stores aur AC malls ki dukaanein, jin ke liye POS ko FBR se jodna zaroori hai.', alsoKnownAs: ['tier 1', 'tier-I retailer'], related: ['GLOSSARY_TERM:fbr-pos'], taxOrLegal: true, dropped: ['"High-turnover businesses" (not one of the cited criteria).'] },
  { slug: 'ntn', term: 'NTN (National Tax Number)', definition: "The National Tax Number is a taxpayer's identification number with FBR, obtained through FBR's IRIS portal.", definitionRomanUrdu: 'NTN FBR ke saath taxpayer ki pehchan ka number hai, jo IRIS portal se milta hai.', alsoKnownAs: ['national tax number', 'tax number'], taxOrLegal: true, dropped: ['"Required for opening business bank accounts" (not checked).'] },
  { slug: 'strn', term: 'STRN (Sales Tax Registration Number)', definition: 'The Sales Tax Registration Number identifies a business registered with FBR for sales tax.', definitionRomanUrdu: 'STRN us business ka number hai jo FBR ke paas sales tax ke liye registered ho.', alsoKnownAs: ['sales tax registration number', 'sales tax number'], taxOrLegal: true },
  { slug: 'raast', term: 'Raast', definition: "Raast is the State Bank of Pakistan's instant payment system for real-time transfers between bank and wallet accounts, using a Raast ID such as a mobile number.", definitionRomanUrdu: 'Raast State Bank ka instant payment system hai jis se bank aur wallet accounts me foran paise jaate hain, mobile number jaisi Raast ID se.', alsoKnownAs: ['Raast ID', 'SBP Raast'], dropped: ['"Free" (fees depend on the transfer type; not cited).'] },
  { slug: 'imei', term: 'IMEI', definition: 'An IMEI is the 15-digit number that identifies a mobile phone handset.', definitionRomanUrdu: 'IMEI 15 hindson ka number hai jo har mobile phone ki alag pehchan hai.', example: 'A mobile shop records the IMEI of each phone it buys and sells.', alsoKnownAs: ['IMEI number'], related: ['INDUSTRY:mobile-shop', 'GLOSSARY_TERM:pta-approved'] },
  { slug: 'pta-approved', term: 'PTA Approved', definition: 'A PTA-approved phone is a handset registered with the Pakistan Telecommunication Authority, so it keeps working on Pakistani mobile networks.', definitionRomanUrdu: 'PTA approved phone woh hai jo PTA ke paas registered ho, is liye Pakistan ke mobile networks par chalta rehta hai.', alsoKnownAs: ['PTA registered', 'PTA approved phone'], related: ['INDUSTRY:mobile-shop', 'GLOSSARY_TERM:imei'], taxOrLegal: true },
  { slug: 'sku', term: 'SKU (Stock Keeping Unit)', definition: 'An SKU is a code for one exact product variant in stock, so each size, colour or pack size is counted separately.', definitionRomanUrdu: 'SKU har product ki har qism ka alag code hai, taake har size, rang ya pack alag gina jaye.', example: 'A kurta in medium green and the same kurta in large green are two SKUs.', alsoKnownAs: ['stock keeping unit', 'item code'] },
  { slug: 'fifo', term: 'FIFO (First In, First Out)', definition: 'FIFO is the stock rule that the oldest stock is sold first.', definitionRomanUrdu: 'FIFO ka matlab hai jo maal pehle aaya woh pehle bike.', example: 'Pharmacies and bakeries use FIFO so that older stock is sold before it expires.', alsoKnownAs: ['first in first out'], related: ['GLOSSARY_TERM:batch-tracking'] },
  { slug: 'batch-tracking', term: 'Batch Tracking', definition: 'Batch tracking records each purchase lot separately with its own expiry date.', definitionRomanUrdu: 'Batch tracking me har khareed ka lot apni expiry date ke saath alag rakha jata hai.', example: 'A pharmacy holds two batches of the same syrup that expire in different months.', alsoKnownAs: ['lot tracking', 'batch and expiry'], related: ['INDUSTRY:pharmacy', 'GLOSSARY_TERM:fifo'] },
  { slug: 'kot', term: 'KOT (Kitchen Order Ticket)', definition: 'A KOT is the ticket, printed or on a screen, that tells the kitchen what to cook for an order.', definitionRomanUrdu: 'KOT woh parchi ya screen hai jo kitchen ko batati hai ke order me kya pakana hai.', example: 'A restaurant sends tandoor items to the tandoor station and drinks to the bar.', alsoKnownAs: ['kitchen order ticket', 'kitchen ticket'], related: ['INDUSTRY:restaurant'] },
  { slug: 'cod', term: 'COD (Cash on Delivery)', definition: 'Cash on delivery means the customer pays when the order is delivered, not when it is placed.', definitionRomanUrdu: 'COD ka matlab hai gahak order milne par paise deta hai, order dete waqt nahi.', alsoKnownAs: ['cash on delivery'], dropped: ['"The dominant e-commerce payment method in Pakistan" (no source).', 'Named couriers.'] },
  { slug: 'gmv', term: 'GMV (Gross Merchandise Value)', definition: 'GMV is the total value of goods sold through a platform before fees, returns and discounts are taken off.', definitionRomanUrdu: 'GMV platform par bikne wale saman ki kul qeemat hai, fees aur returns katne se pehle.', alsoKnownAs: ['gross merchandise value'] },
  { slug: 'layaway', term: 'Layaway', definition: 'Layaway is reserving an item and paying for it in parts; the customer takes it home once it is fully paid.', definitionRomanUrdu: 'Layaway me gahak cheez rakhwa leta hai aur qiston me paise deta hai; poore paise dene par le jata hai.', example: 'A bridal dress is held while the customer pays over three months.', alsoKnownAs: ['qist plan', 'reservation'], related: ['INDUSTRY:garments'] },
  { slug: 'drap', term: 'DRAP', definition: 'DRAP, the Drug Regulatory Authority of Pakistan, is the federal body that regulates medicines in Pakistan.', definitionRomanUrdu: 'DRAP (Drug Regulatory Authority of Pakistan) woh federal idara hai jo Pakistan me dawaiyon ko regulate karta hai.', alsoKnownAs: ['Drug Regulatory Authority of Pakistan'], related: ['INDUSTRY:pharmacy'], taxOrLegal: true, dropped: ['"Licenses pharmacies" (drug sale licences are issued by the provinces; not cited).'] },
  { slug: 'escrow', term: 'Escrow', definition: 'Escrow is when a neutral party holds a payment until both buyer and seller have done their part.', definitionRomanUrdu: 'Escrow me ek beech ka fareeq paise tab tak rakhta hai jab tak khareedar aur bechne wala dono apna kaam poora na kar dein.', alsoKnownAs: ['escrow payment'], dropped: ['"Nafaa Bazaar uses escrow" (owner decision O14: marketplace status not confirmed).'] },
];

function term(t: TermSpec, index: number): SeedEntry {
  const key = `GLOSSARY_TERM:${t.slug}`;
  const blocks = [
    richText(`${t.definition}${t.example ? `\n\n**Example:** ${t.example}` : ''}`),
    ...(t.taxOrLegal ? [writerNotes('Tax or legal term: add an official source (fbr.gov.pk, pta.gov.pk, dra.gov.pk, sbp.org.pk) with an access date before publishing. Expand to 120+ words.')] : []),
  ];
  return {
    type: 'GLOSSARY_TERM',
    slug: t.slug,
    title: t.term,
    summary: t.definition,
    data: {
      term: t.term,
      definition: t.definition,
      definitionRomanUrdu: t.definitionRomanUrdu,
      ...(t.example ? { example: t.example } : {}),
      alsoKnownAs: t.alsoKnownAs ?? [],
    },
    blocks: withIds(key, blocks),
    relations: (t.related ?? []).map((ref) => ({ ref, kind: 'RELATED' as const })),
    sortOrder: index + 1,
    origin: `${ORIGIN}#${t.slug}`,
    evidence: [],
    factCheck: {
      checkedOn: CHECKED_ON,
      note: t.taxOrLegal
        ? 'General meaning only; no official source attached yet (must be added before publish).'
        : 'Plain-language definition; no product claims.',
    },
    dropped: ['Urdu Nastaliq definition (replaced by Roman Urdu).', 'Letter and category fields (computed by the site).', ...(t.dropped ?? [])],
    needsOwner: [],
  };
}

export const glossary: SeedEntry[] = TERMS.map(term);
