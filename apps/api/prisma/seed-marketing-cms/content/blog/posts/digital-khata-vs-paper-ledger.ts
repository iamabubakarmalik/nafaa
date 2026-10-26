/**
 * Digital khata vs paper register: what each does well, where paper loses
 * money, and how to move old balances across in one sitting.
 */
import { SHOT, diagram, prose, shot, steps } from '../../main-pages/_build';
import { FAKE_AUTHOR, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const spec: PostSpec = {
  slug: 'digital-khata-vs-paper-ledger',
  title: 'Digital Khata vs Paper Register: What Changes for Your Shop',
  summary:
    'Why paper khata registers lose money and time, what a digital khata does differently, and how to move your old balances into Nafaa in one sitting.',
  category: 'guides',
  cover: PHOTO.digitalKhataVsPaperLedger,
  tags: ['INDUSTRY:kiryana', 'GLOSSARY_TERM:khata', 'GLOSSARY_TERM:udhaar'],
  related: ['PRODUCT:khata', 'PRODUCT:whatsapp-sms', 'COMPARE:nafaa-vs-paper-register', 'BLOG_POST:how-to-reduce-udhaar', 'GUIDE:managing-udhaar-and-khata', 'BEST_OF:khata-apps-compared', 'ALTERNATIVE:paper-khata-register'],
  blocks: [
    prose(`Almost every shop in Pakistan runs some udhaar. The regular customer who pays at the end of the month, the family that buys on credit until the salary comes, the contractor who settles after the job: credit is how neighbourhood trade works. The question is not whether to give udhaar but how to keep track of it, and for most shops the answer is still a paper register under the counter.

A paper khata works until the day it does not. Pages tear, ink fades, a register gets wet in the rain or lost in a move, and finding one customer's balance means flipping through months of entries. Most of all, a paper register cannot remind anyone: the shopkeeper has to remember who owes what and then make an awkward phone call.

## What paper does well

It is fair to start with what the register gets right, because it explains why so many shops keep it.

- **It costs almost nothing.** A register and a pen, and you are running.
- **Nobody needs training.** Anyone who can write can add an entry.
- **It works in load-shedding.** No battery, no internet, no charger.
- **Customers trust it.** Many customers like to see their entry written in front of them.

If you have twenty credit customers and you run the counter yourself every day, a careful paper register can be enough. The trouble starts when the list grows, when someone else also sits at the counter, or when old balances start to slip.

## Where a paper register loses money

- **Forgotten entries.** On a busy evening an udhaar sale goes unwritten, or gets written later from memory with the wrong amount.
- **Disputes.** "I paid you two thousand last week" is hard to answer when the payment was written on a page nobody can find.
- **No ageing.** A register shows what is owed, not how long it has been owed. A balance that is four months old looks the same as one from yesterday, so the old ones keep growing.
- **One copy.** If the register is lost, so is the record. There is no backup.
- **One person.** Only whoever has the register in hand can see or update it. A second counter or a second shop needs a second register, and the two never agree.
- **Reminders depend on you.** Collecting money needs a call or a visit, and most shopkeepers put it off because it feels uncomfortable.`),
    shot({
      heading: 'One screen for everything customers owe',
      body: 'The khata shows the total to collect, how old each balance is and who to call first. Payments and reminders are one tap away on each row.',
      id: SHOT.khata,
      url: 'app.nafaa.pk/khata',
      layout: 'full',
      callouts: [
        { x: 25, y: 19, label: 'Total udhaar to collect' },
        { x: 48, y: 30, label: 'Udhaar by age' },
        { x: 87, y: 55, label: 'Record a payment' },
        { x: 94, y: 55, label: 'WhatsApp reminder and statement' },
      ],
    }),
    prose(`## What a digital khata does differently

In Nafaa the khata sits next to the counter, so an udhaar sale goes onto the customer's account the moment the bill is made. Each customer has one running balance with every sale on credit and every payment against it.

- **Old balances come with you.** When you switch, you enter each customer's balance from the old register once, and the khata carries it forward.
- **Payments in parts.** A customer can pay some today and the rest later; the balance updates on its own.
- **Udhaar by age.** The khata groups balances by how old they are, so you can see which ones have crossed thirty days and sort the list with the oldest first.
- **A credit limit per customer.** You can set how much udhaar a customer may carry, so the counter knows when to stop.
- **Reminders on WhatsApp.** From the khata you send a customer a WhatsApp message with their balance in one tap. Reminders go one by one from your own WhatsApp, and you choose the tone: polite, firm or final.
- **One balance across counters.** Every counter and staff member sees the same balance, so it is the same wherever the customer buys.
- **The bill behind every entry.** When a customer questions a balance, you can open the exact bills and payments that make it up.`),
    diagram(
      'An udhaar sale lands in the khata, a reminder goes out on WhatsApp, and the payment brings the balance down.',
      { kind: 'khata-cycle', animate: true },
      'How the udhaar cycle works',
    ),
    prose(`## A side-by-side look

| | Paper register | Digital khata |
|---|---|---|
| Starting cost | A register and a pen | Monthly plan after a free trial |
| Finding one balance | Flip pages | Search by name or phone |
| How old is the udhaar | Not shown | Grouped by age |
| Reminders | Phone call or visit | WhatsApp message in one tap |
| Two counters or two shops | Two registers | One shared balance |
| If it is lost | Gone | Stored in your account |
| Works without power | Yes | Phone battery or UPS needed |

The last row matters in Pakistan. Nafaa runs in the browser on a phone, tablet or computer, so a charged phone keeps the khata going during load-shedding.`),
    steps(
      'How to switch in one sitting',
      [
        ['Sign up and open the khata', 'Create your Nafaa account and open Khata from the menu. The free trial is enough to move everything across.'],
        ['Add your regular customers', 'Enter name and WhatsApp number for each customer in the register. Start with the ones who buy every week.'],
        ['Enter each opening balance', 'Copy the current balance from the paper register as an opening balance. You do not need the full history.'],
        ['Bill new udhaar at the counter', 'From the next sale on, choose the customer and put the unpaid amount on their khata.'],
        ['Keep the register for a few weeks', 'Use it as a backup while you check that the balances match, then retire it.'],
      ],
      'Most shops can move a register of a few dozen customers in an evening.',
      true,
    ),
    tip('Before you start, ask your two or three largest udhaar customers to confirm their balance. Starting the digital khata from an agreed number avoids arguments later.', 'Agree the opening balance first'),
    prose(`## Talking to customers about the change

Some customers worry that a phone app means something has changed in how you deal with them. A short explanation helps: the balance is the same, the account is the same, and now they can get their statement on WhatsApp instead of asking. Many customers prefer it, because they can see every bill and payment instead of trusting a page they cannot read upside down across the counter.

When you send the first reminder, keep it polite and specific: the amount, the date of the last payment, and a thank-you. Save the firmer wording for balances that have been sitting for a long time.

## When paper is still fine

If you have a handful of credit customers, run the counter alone and never need to check a balance from home, a paper register may still serve you. Once udhaar becomes a real share of your sales, a second person bills, or you want to know which balances are getting old, a digital khata pays for itself in the money it helps you collect.`),
  ],
  outline: ['What paper does well', 'Where paper loses money', 'What a digital khata does differently', 'Side-by-side table', 'How to switch in one sitting', 'Talking to customers'],
  dropped: [
    '"Real data from 8,000+ shops" and the "2026 survey of 3,200 shopkeepers" with its percentages (invented).',
    '"Recovers 3-5x more", "23% to 71%" and "PKR 47,000/month" recovery figures.',
    'Automatic rule-based reminders ("if udhar > PKR 5,000 and > 15 days"): the app sends reminders one by one.',
    'Photo evidence on udhaar entries (not found in the khata).',
    '"Free trial (30 days)" (the trial length comes from the Plan table).',
    '"8,200 kiryana shops switched in 2026".',
    FAKE_AUTHOR,
  ],
  evidence: [
    'apps/web/src/modules/customers/directory/KhataBookPage.tsx',
    'apps/web/src/modules/customers/directory/messages.ts',
    'apps/web/src/modules/customers/customers/pages/CustomerFormPage.tsx',
    'apps/web/src/modules/pos/components/PaymentMethodPicker.tsx',
  ],
};

export default spec;
