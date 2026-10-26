/**
 * Expiry management for pharmacies: receiving with batch and expiry, FEFO
 * on the shelf and at the counter, near-expiry buckets and what to do in
 * each, returns to the distributor, write-offs and storage. Compliance
 * basics are left to the DRAP checklist post and linked.
 */
import { SHOT, diagram, prose, shot, steps } from '../../main-pages/_build';
import { sourcesBlock, src, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [
  src('PMU Provincial DRAP: functions', 'https://mss.pshealthpunjab.gov.pk/PublicHome/PmuProvincialDrap', 'Primary & Secondary Healthcare Department, Punjab'),
  src('TRS 961, Annex 9: Model guidance for the storage and transport of time- and temperature-sensitive pharmaceutical products', 'https://www.who.int/publications/m/item/trs961-annex9-modelguidanceforstoragetransport', 'World Health Organization'),
];

const spec: PostSpec = {
  slug: 'pharmacy-expiry-management',
  title: 'Pharmacy Expiry Management: FEFO, Batches and Returns',
  summary:
    'A pharmacy keeps expiry losses low by recording batch and expiry on every purchase, selling the earliest expiry first, checking stock in 30, 90 and 180-day buckets, and returning or writing off batches before they reach the shelf as expired. This guide gives the routine, the actions for each bucket and the mistakes that cost the most.',
  category: 'industry',
  cover: PHOTO.pharmacyExpiryManagement,
  seoTitle: 'Pharmacy Expiry Management: FEFO and Returns',
  seoDescription: 'Record batch and expiry on purchase, sell first expiry first, check 30/90/180-day buckets, and return or write off near-expiry stock in time.',
  focusKeyword: 'pharmacy expiry management',
  tags: ['INDUSTRY:pharmacy', 'GLOSSARY_TERM:fefo', 'GLOSSARY_TERM:expiry-management', 'GLOSSARY_TERM:batch-tracking'],
  related: ['BLOG_POST:drap-compliance-pharmacy', 'BLOG_POST:how-to-start-a-pharmacy-pakistan', 'PRODUCT:inventory', 'PRODUCT:purchasing', 'GLOSSARY_TERM:purchase-return', 'COMPLIANCE:drap-pharmacy'],
  isNew: true,
  sources: SOURCES,
  blocks: [
    prose(`Expired medicine is a double loss for a pharmacy. The money paid for it is gone, and an expired pack found on the shelf is a problem with patients and inspectors. Yet most expiry losses are predictable months in advance. The batch and the date are printed on every pack; the work is to record them and look at them on a schedule.

This post is about the stock side of expiry. For licensing, registers and what the regulators look for, see our checklist of DRAP rules for pharmacies, listed under related reading below. If you are still setting up, [how to start a pharmacy in Pakistan](/blog/how-to-start-a-pharmacy-pakistan) covers suppliers and systems from day one.

## FEFO, not just FIFO

Most shops are told to sell old stock first, known as [FIFO](/glossary/fifo) (first in, first out). In a pharmacy the rule that matters is [FEFO](/glossary/fefo): first expiry, first out. They are usually the same, but not always. A distributor may deliver a batch this week that expires before the one you received last month. FIFO would sell last month’s stock first and leave the short-dated batch to expire. FEFO looks at the date on the pack, not the date it arrived.

FEFO only works if you know the expiry of each batch you hold, which starts at receiving.`),
    steps(
      'Receive every delivery with batch and expiry',
      [
        ['Match the invoice to the cartons', 'Check product, strength, pack size and quantity line by line before you sign.'],
        ['Record batch and expiry for every line', 'Write the batch number and expiry date from the pack, not just the product name. One product can arrive in two batches.'],
        ['Check the remaining life', 'Look at how long each batch has left. Agree with each distributor, in writing, how much remaining life you expect on delivery and what happens if a batch arrives short-dated.'],
        ['Check cold-chain items first', 'Insulin, vaccines and other fridge items go into the fridge before you finish the paperwork. Note the time.'],
        ['Shelve behind the older batch', 'New stock goes behind or below the batch that expires first, so staff pick the right one without thinking.'],
      ],
      undefined,
      true,
    ),
    prose(`## Look ahead in buckets

A monthly expiry check is good. A check that sorts stock by how soon it expires is better, because each bucket needs a different action. A common set of buckets is 180, 90 and 30 days, plus anything already expired.`),
    diagram(
      'Each batch moves through the buckets as its expiry approaches. The earlier you act, the more choices you have.',
      {
        kind: 'timeline',
        items: [
          { date: '180 days left', label: 'Watch and stop over-ordering', note: 'Do not reorder slow movers that already have stock this far out.' },
          { date: '90 days left', label: 'Push sales and arrange returns', note: 'Move to the front, tell staff, transfer to a branch that sells it, check return terms.' },
          { date: '30 days left', label: 'Return or decide now', note: 'Send back what the distributor will take; most patients will not finish a course before expiry.' },
          { date: 'Expired', label: 'Quarantine and write off', note: 'Off the shelf the same day, into a labelled area, recorded with quantity and value.' },
        ],
      },
      'Near-expiry buckets and actions',
    ),
    prose(`## Put a value on it

A list of batch numbers does not get attention. A rupee figure does. For each bucket, add up the stock at cost.

For example, suppose your 90-day bucket holds 35 batches worth 160,000 rupees at cost, and the 30-day bucket holds 12 batches worth 45,000 rupees. That 45,000 rupees is money you will lose this month unless some of it goes back to distributors. The 160,000 rupees is money you can still save with three months of effort. Look at both numbers every month and watch whether they shrink.

Sort by value as well as by date. A single carton of an expensive injection near expiry matters more than twenty strips of a cheap tablet.

## Returns to the distributor

Returning near-expiry stock is the main way to recover money, and the terms differ by distributor and company. Some take back stock close to expiry for credit, some only for replacement, and some not at all. Know the terms before you order.

- **Return against the original purchase.** Note which purchase and which supplier the batch came on. A return without that link is easy to dispute.
- **Write a return note.** Product, batch, expiry, quantity and the value you expect credited. Get it signed by the person collecting it and keep a copy.
- **Follow up the credit.** A return is not finished until the credit appears in the distributor’s account. Check it against your next invoice.
- **Do not wait until expiry.** Many distributors will not take back stock that has already expired, so return within the window you agreed.

See the glossary on [purchase returns](/glossary/purchase-return) for the accounting side.`),
    shot({
      heading: 'Expiry list by bucket, with value at stake',
      body: 'Batches due in 30 and 90 days, each with batch number, expiry date, stock and value at cost and sale price.',
      id: SHOT.pharmacyExpiry,
      url: 'app.nafaa.pk/pharmacy/expiring',
      layout: 'full',
      caption: 'Sort by value to see which batches to act on first.',
    }),
    prose(`## Expired stock: quarantine and record

When a batch expires, take it off the sales shelf the same day. Keep it in a separate, clearly labelled area away from saleable stock, record the quantity and value, and dispose of it the way your provincial drug control office or distributor requires. In Punjab, for example, the health department’s [provincial DRAP unit](https://mss.pshealthpunjab.gov.pk/PublicHome/PmuProvincialDrap) lists inspections, quality control and recall of sub-standard drugs among its functions, so an expired pack on a shelf is exactly what an inspection will notice.

Record every write-off. If you remove expired packs without reducing stock, your system will keep showing stock you do not have, and the next order will be wrong.

## Storage affects expiry too

The expiry date on a pack assumes it was stored as the label says. Heat, sunlight and damp can spoil medicine before that date, and fridge items lose their protection if the cold chain breaks. Keep shelves away from direct sun and outside walls that heat up, use the air conditioning during hot months if you can, and keep a fridge temperature log for cold-chain items. The World Health Organization publishes [model guidance on storing and transporting time- and temperature-sensitive pharmaceutical products](https://www.who.int/publications/m/item/trs961-annex9-modelguidanceforstoragetransport), which is useful background for larger pharmacies and distributors.

## Loose strips and tablets

When you cut a box and sell by the strip, the remaining strips still belong to one batch. Keep cut boxes together and sell them before opening a new box of the same product. A drawer full of loose strips with no box is where expiry tracking breaks down.

## Order to avoid expiry

The cheapest expiry is the one you never buy. Most expiry losses come from slow movers bought in quantities that take longer to sell than their remaining life. For slow items, buy smaller quantities more often, even at a slightly worse rate. A bonus offer of extra packs is only a saving if you can sell them before they expire.

## Mistakes that cost the most

- Recording products without batch numbers, so FEFO and recalls are guesswork.
- Accepting short-dated deliveries without agreed terms.
- Checking expiry once a year during a stock count.
- Leaving expired stock mixed with saleable stock “until the distributor comes”.
- Missing the return window, then writing off stock that could have gone back.

## How Nafaa helps

In Nafaa, purchases are received with batch number and expiry for each line. At the counter a sale takes the earliest-expiring batch by default, and the cashier can pick a specific batch. The [pharmacy setup](/industries/pharmacy) has an expiry list with expired, 30, 90 and 180-day buckets, each batch’s stock and its value at cost and at sale price, with CSV and print. From that list a batch can be returned to the distributor against the purchase it came on, which reduces stock and the distributor’s balance, or written off when it cannot go back. A temperature log records fridge readings for cold-chain items.`),
    tip('Put a recurring reminder on the first day of each month: open the 90-day bucket, sort by value and decide an action for the top ten batches. It takes half an hour and pays for itself.', 'The first-of-the-month habit'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['FEFO vs FIFO', 'Receiving', 'Buckets', 'Value at stake', 'Returns to distributor', 'Quarantine and write-off', 'Storage', 'Loose strips', 'Ordering', 'Mistakes', 'How Nafaa helps'],
  dropped: [],
  needsOwner: ['A pharmacist to review the receiving and return steps before publishing.'],
  evidence: [
    'apps/web/src/modules/purchasing/purchases/editor/PurchaseEditorPage.tsx',
    'apps/web/src/modules/purchasing/purchases/editor/draft.ts',
    'apps/web/src/modules/pos/hooks/usePosBatches.ts',
    'apps/web/src/modules/pos/api/batches.api.ts',
    'apps/web/src/industries/pharmacy/pages/ExpiringPage.tsx',
    'apps/web/src/industries/pharmacy/api/expiry.api.ts',
    'apps/web/src/industries/pharmacy/components/ExpiryActionModal.tsx',
    'apps/web/src/industries/pharmacy/api/temperature.api.ts',
  ],
  factNote:
    'Punjab PMU Provincial DRAP functions page (inspections, quality control, recall of sub-standard drugs) read on 2026-10-26; WHO TRS 961 Annex 9 page title read on 2026-10-26 and cited by title only. Both links checked to load on 2026-10-26. No distributor return terms, fees or legal limits stated. PKR figures are examples. Product statements checked against the code.',
};

export default spec;
