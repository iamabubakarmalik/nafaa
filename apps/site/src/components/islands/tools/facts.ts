/**
 * Rates, rules and unit factors used by the calculator islands.
 *
 * Every value that is not plain arithmetic carries its official source and
 * the date it was checked, and the tools show both under the result. Nothing
 * here is a Nafaa claim. Values that change through Finance Acts or SROs must
 * be re-checked before a TOOL entry is published (see the S5 report: these
 * belong in TOOL entry data once the contract allows it).
 *
 * Plain data, no imports: safe in client bundles.
 */

export interface FactSource {
  title: string;
  publisher: string;
  url: string;
  checkedAt: string;
}

const FBR_POS_BOOKLET: FactSource = {
  title: 'POS Booklet: provisions of the Sales Tax Act 1990, Sales Tax Rules 2006 and Income Tax Ordinance 2001',
  publisher: 'Federal Board of Revenue',
  url: 'https://download1.fbr.gov.pk/Docs/202551615541769POSBooklet.pdf',
  checkedAt: '2026-10-20',
};

const FBR_CIRCULAR_1_2023: FactSource = {
  title: 'Circular No. 1 of 2023 (Sales Tax and Federal Excise), standard rate raised from 17% to 18%',
  publisher: 'Federal Board of Revenue',
  url: 'https://download1.fbr.gov.pk/Docs/20232281524459451Circular01-2023SalesTaxFederalExcise.pdf',
  checkedAt: '2026-10-20',
};

/** Sales tax on goods (federal). Services are taxed by the provinces at their own rates. */
export const GST = {
  /** Standard rate under section 3(1) of the Sales Tax Act, 1990 (per cent). */
  standardRate: 18,
  source: FBR_CIRCULAR_1_2023,
  /** Quick picks offered next to the custom rate field. Only the standard rate is preset. */
  presets: [18] as const,
} as const;

/**
 * Tier-1 retailer categories, section 2(43A) of the Sales Tax Act, 1990, as
 * printed in FBR's POS booklet. Clause (e) is shown as deleted there, so it
 * is not asked. Clause (h) (classes the Board prescribes) cannot be checked
 * by a questionnaire and is mentioned in the result instead.
 */
export const TIER1 = {
  source: FBR_POS_BOOKLET,
  /** Clause (c): cumulative electricity bill in the preceding 12 consecutive months, in rupees. */
  electricityBillThreshold: 1_200_000,
  criteria: [
    { clause: 'a', question: 'Is your shop a unit of a national or international chain of stores?' },
    { clause: 'b', question: 'Is your shop in an air-conditioned shopping mall, plaza or centre (not a kiosk)?' },
    { clause: 'c', question: 'Was your total electricity bill for the last 12 months more than Rs 1,200,000?' },
    {
      clause: 'd',
      question: 'Do you import consumer goods in bulk and sell them both wholesale to retailers and retail to the public?',
    },
    {
      clause: 'f',
      question: 'Do you accept debit or credit card payments through a card machine (POS) from a bank or an SBP-authorised payment provider?',
    },
    {
      clause: 'g',
      question:
        'In the last 12 months, did the advance tax your suppliers deducted on their sales to you (sections 236G or 236H of the Income Tax Ordinance) go above the threshold FBR has notified?',
    },
  ],
  /** Section 8B(6): input tax reduced when a Tier-1 retailer is not integrated. */
  inputTaxReductionPercent: 60,
} as const;

/** Income Tax Ordinance 2001, section 64D: tax credit for a POS machine (lesser of cost or this amount per machine). */
export const POS_MACHINE_CREDIT = {
  maxPerMachine: 150_000,
  source: FBR_POS_BOOKLET,
} as const;

/** Gold weights and purity. Unit factors are standard trade definitions. */
export const GOLD = {
  /** 1 tola in grams. */
  gramsPerTola: 11.6638038,
  /** 1 tola = 12 masha, 1 masha = 8 ratti. */
  mashaPerTola: 12,
  rattiPerMasha: 8,
  karats: [24, 22, 21, 18] as const,
} as const;
