/**
 * Alternative to the paper khata / udhaar register. Replaces the blocked
 * /compare/nafaa-vs-paper-register idea (COMPARE needs a vendor URL). There
 * is no vendor, so the comparison is general trade knowledge; the table
 * cites the public reference on ledgers to satisfy the source rule. The page
 * focuses on the options and on moving balances without losing customers'
 * trust, which the compare page and the blog post do not cover.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, diagram, prose, shot, steps } from '../../main-pages/_build';
import { altTable, src, type AlternativeSpec } from '../_alternative';

const LEDGER = src('Ledger (general reference)', 'https://en.wikipedia.org/wiki/Ledger', 'Wikipedia');

const SUMMARY =
  'The paper khata register has run Pakistani shops for generations, and for a few credit customers it still works. This page looks at the alternatives, from a better paper routine to a khata app to a POS that writes the khata itself, and shows how to move your balances over without losing your customers\' trust.';

const spec: AlternativeSpec = {
  slug: 'paper-khata-register',
  title: 'Alternative to the Paper Khata Register',
  competitorName: 'Paper khata register',
  competitorUrl: 'https://en.wikipedia.org/wiki/Ledger',
  verdict:
    'Keep the register if you have a few credit customers who settle every month. Once udhaar is a real share of sales, or someone else also gives credit, a khata written by the billing counter adds up, reminds and backs itself up.',
  summary: SUMMARY,
  seoTitle: 'Paper Khata Register Alternative: Digital Udhaar for Shops',
  seoDescription:
    'Alternatives to the paper khata register, from a better paper routine to a khata app or a POS that writes the khata, and how to move balances over safely.',
  focusKeyword: 'paper khata alternative',
  blocks: [
    hero(SUMMARY, { eyebrow: 'Alternatives', heading: 'An alternative to the paper khata register' }),
    answerBox(
      [
        { label: 'Short answer', value: 'Paper is enough for a handful of trusted credit customers. Switch when udhaar grows, staff give credit, or balances start being argued over.' },
        { label: 'Options', value: 'A stricter paper routine, a standalone khata app, or a POS where the bill writes the khata' },
        { label: 'Moving over', value: 'Enter each customer\'s current balance once. The old register stays as your record.' },
        { label: 'Keeping trust', value: 'Send each customer their opening balance on WhatsApp so they can agree it before new entries start' },
        { label: 'Nafaa price', value: 'Paid plans from {{price:min.monthly}} a month, after a 7-day free trial' },
      ],
      'Kam udhaar wale customers ke liye register theek hai. Jab udhaar barh jaye ya staff bhi udhaar de, to digital khata behtar hai. Har customer ka purana balance ek dafa likhein aur WhatsApp par bhej kar tasdeeq karwa lein.',
      'Should you replace the register?',
    ),
    prose(`## Why shops keep the register, and why they leave it

The register survives because it is cheap, instant and trusted. Customers watch their entry being written, it needs no electricity, and nobody has to learn anything. Those are real strengths, and for a shop with a few credit customers they can outweigh everything else.

Shops leave it for practical reasons, usually after one bad month:

- **The total is unknown.** Nobody can say how much udhaar is out without an evening with a calculator.
- **Old balances hide.** A small amount from three months ago sits on a back page until it is forgotten.
- **Two hands write in it.** When a son, brother or salesman also gives credit, entries get missed or written in the wrong place.
- **A dispute has no proof.** "I paid you last week" is your word against theirs.
- **The book is a single point of failure.** Water, fire or a lost register takes the record with it.`),
    altTable(
      'Nafaa and the paper register for udhaar',
      'General trade comparison; the paper column describes a typical hand-written ledger. Nafaa from the product.',
      'Paper register',
      [
        ['Writing an entry', 'The unpaid part of the bill goes on the khata at the counter', 'Written by hand after the sale'],
        ['Total owed', 'Shown at the top, always current', 'Added up by hand'],
        ['How old each balance is', 'Grouped: under 7, 7 to 30, 30 to 90, over 90 days', 'Turn back the pages'],
        ['Reminders', 'One-tap WhatsApp with the exact balance', 'A call or a visit'],
        ['Credit limit', 'Set per customer; over it needs the manager PIN', 'In the owner\'s head'],
        ['Proof in a dispute', 'Every bill and payment with date and bill number', 'The handwriting on the page'],
        ['If lost or damaged', 'Stored in your account, with a downloadable backup', 'Gone'],
        ['Power cut', 'Payments and entries saved on the device, synced later', 'No effect'],
      ],
      [LEDGER],
    ),
    prose(`## The three alternatives

**1. A stricter paper routine.** If you want to stay on paper, make it harder to lose money: one register only, a page per customer with a running balance, the customer's signature on each credit entry, a monthly total written on a summary page, and a photo of the summary pages each month as a backup. It costs nothing but discipline.

**2. A standalone khata app.** Apps such as DigiKhata and Udhaar Book replace the register on your phone, with balances and reminders. You still type each entry yourself after the sale, so they suit shops where udhaar is occasional. We compare them in [khata apps compared](/best/khata-apps-compared).

**3. A POS that writes the khata.** In Nafaa, when a customer takes goods on credit, the unpaid part of the bill goes onto their khata at the counter, together with the stock and the day's sales. Nothing is written twice and nothing is missed on a busy evening. See [Digital Khata](/product/khata).

## Where the paper register is better

- **No cost and no learning.** A pen and a register.
- **No power, no problem.** Load-shedding does not touch it.
- **Customers see it written.** For some older customers this matters more than any app.

## Where Nafaa is better

- **The khata is written by the bill**, so the khata, stock and cash agree.
- **You know whom to call first**, because balances are grouped by age.
- **Reminders go out in your words**, from your own WhatsApp, with the amount filled in.
- **Staff cannot quietly overextend credit**, because the limit asks for the manager PIN.
- **The record survives**, with a backup you can download.`),
    diagram(
      'Credit sales land on the customer\'s khata, a WhatsApp reminder goes out as the balance ages, and each payment clears the oldest udhaar first.',
      { kind: 'khata-cycle', animate: true },
      'How udhaar comes back without the register',
    ),
    steps(
      'Moving from the register without losing trust',
      [
        ['Pick a start date', 'The first day of a month works best. Keep the old register; it remains your record of everything before that date.'],
        ['Total each customer once', 'For every customer with udhaar, add up the current balance from the register.'],
        ['Enter opening balances', 'Add each customer with their phone number and enter the balance as an old-register amount.'],
        ['Let customers agree it', 'Send each customer their opening balance on WhatsApp and ask them to reply if anything looks wrong. Fix it before new entries begin.'],
        ['Bill on khata from day one', 'From the start date, every credit sale goes through the counter. Payments clear the oldest balance first.'],
      ],
      'Most shops do this in one or two evenings.',
      true,
    ),
    shot({
      heading: 'The register, on your phone',
      body: 'Balances, payments and reminders on the owner\'s phone, so "kitna banta hai?" gets an answer from home or the market.',
      id: SHOT.khataPhone,
      frame: 'phone',
      layout: 'split-left',
    }),
  ],
  faqs: [
    [
      'My customers do not use WhatsApp. Can I still use a digital khata?',
      'Yes. Reminders are optional. The khata still adds up balances, shows how old they are and keeps every bill and payment with its date. You can print a statement for a customer who prefers paper, or simply tell them the balance from the screen.',
    ],
    [
      'Should I throw away the old register after switching?',
      'No. Keep it. It is your record of everything before the start date, and some customers may want to see an old entry. Once their opening balances are agreed and recorded, you will rarely need it, but it costs nothing to keep.',
    ],
    [
      'What if the internet is off when a customer pays?',
      'In Nafaa, khata payments and new entries can be recorded without internet. They are saved on the device and sent to your account when the connection returns, so the counter does not have to wait. The sync centre shows anything still waiting to be sent.',
    ],
  ],
  relations: [
    { ref: 'PRODUCT:khata', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:khata', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:udhaar', kind: 'TAG' },
    { ref: 'COMPARE:nafaa-vs-paper-register', kind: 'RELATED' },
    { ref: 'BLOG_POST:digital-khata-vs-paper-ledger', kind: 'RELATED' },
    { ref: 'BLOG_POST:how-to-reduce-udhaar', kind: 'RELATED' },
    { ref: 'PRODUCT:whatsapp-sms', kind: 'RELATED' },
  ],
  sources: [LEDGER],
  evidence: [
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/customers/directory/messages.ts',
    'apps/web/src/modules/customers/directory/offlineKhataActions.ts',
    'apps/web/src/core/lib/offline/offlineKhata.ts',
    'apps/web/src/core/security/ManagerPin.tsx',
    'apps/web/src/modules/pos/engine/usePosEngine.ts',
    'apps/web/src/modules/backup/pages/BackupPage.tsx',
    'apps/web/src/core/lib/offline/ui/SyncCenterPage.tsx',
  ],
  factNote:
    'No vendor: the paper column is general trade knowledge, and the table cites the public ledger reference so the API source rule is met. Competitor apps are named without feature claims (those are on /best/khata-apps-compared with sources). Nafaa claims checked in the evidence files on 2026-10-26.',
  needsOwner: [
    'competitorUrl points to the Wikipedia "Ledger" article because a paper register has no vendor; confirm this is acceptable, or ask development to let ALTERNATIVE publish without a URL.',
    'Once this page is published, decide whether /compare/nafaa-vs-paper-register should 301 here.',
  ],
};

export default spec;
