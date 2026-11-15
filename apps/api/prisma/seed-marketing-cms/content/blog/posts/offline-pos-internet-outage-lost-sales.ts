/**
 * Buyer guide: how internet outages lose sales with an online-only system and
 * what an offline-capable POS must do. Complements the load-shedding post.
 */
import { SHOT, prose, shot, steps } from '../../main-pages/_build';
import { mdTable, sourcesBlock, srcChecked, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [
  srcChecked('Point of sale', 'https://en.wikipedia.org/wiki/Point_of_sale', 'Wikipedia', '2026-11-15'),
  srcChecked('Pakistan Telecommunication Authority', 'https://www.pta.gov.pk/', 'PTA', '2026-11-15'),
];

const spec: PostSpec = {
  slug: 'offline-pos-internet-outage-lost-sales',
  title: 'Offline POS: How Internet Cuts Lose Sales, and the Fix',
  summary:
    'An online-only system stops billing when the internet drops, so customers walk away and paper slips pile up. A POS with real offline mode keeps billing from a copy on the device and syncs later. This guide shows how to work out what an outage costs you, what to test before buying and how offline billing works.',
  category: 'guides',
  cover: PHOTO.offlinePosInternetOutageLostSales,
  tags: ['PRODUCT:offline-pos', 'GLOSSARY_TERM:offline-pos', 'GLOSSARY_TERM:cloud-pos'],
  related: [
    'BLOG_POST:load-shedding-proof-billing',
    'BLOG_POST:pos-hardware-kit-guide',
    'ALTERNATIVE:desktop-pos-alternative',
    'BEST_OF:pos-software-pakistan',
    'PRODUCT:pos',
    'PAGE:offline-billing-software',
  ],
  isNew: true,
  seoTitle: 'Offline POS in Pakistan: Stop Losing Sales to Outages',
  seoDescription:
    'How internet cuts lose sales for shops with online-only system, how to estimate the loss and what to test in an offline POS before you buy.',
  focusKeyword: 'offline pos pakistan',
  sources: SOURCES,
  blocks: [
    prose(`A shop owner in Pakistan does not need a report to know the internet is unreliable. A tower loses power, a line is cut during roadwork, a provider has a bad evening. Usually it is a few minutes. Sometimes it is an afternoon. If your POS needs the internet to make a bill, those minutes happen at the counter with customers standing there.

This post is for owners comparing POS products who want to understand what "offline" really means, because the word is used loosely. It covers how to count what an outage costs, what a proper offline POS does, a test to run before you buy and the limits that no software can remove. For the power side of the problem, our guide on [load-shedding-proof billing](/blog/load-shedding-proof-billing) covers UPS, inverters and backup connections; this post is about the software.

## What happens at the counter when the POS needs the internet

With an online-only system, the screen is a window into a program running somewhere else. When the connection drops, three things go wrong in a predictable order.

1. **The screen freezes or shows an error.** The cashier waits, tries again and apologises.
2. **The queue decides.** Customers with a few items leave. Customers with a full basket wait, then pay by cash and take a handwritten slip.
3. **The paper slips never come back.** After the connection returns, someone has to enter them, and some never are. The day's cash does not match the day's sales and nobody can say why.

Two losses come out of this: the sales that walked away, and the accuracy of everything after. The second is the more expensive one because it makes your reports untrustworthy, and a report you cannot trust is a report you stop reading.

## How to estimate what an outage costs you

Do not guess, and do not copy a number from the internet. Work it from your own shop with a simple sum.

1. Write down your bills in an ordinary busy hour. You can read it from yesterday's report.
2. Estimate how many of those customers would leave if you could not bill for 15 minutes. Be honest; for a pharmacy with regulars, it may be few, for a bakery in the evening rush it may be many.
3. Multiply by your average bill value.
4. Add the time spent re-entering paper slips, and the mismatch you chase at night.
5. Multiply by how often it happens in a month.

The result is rarely small, and it is your own number. It is the number to hold against the difference between a plan with offline mode and one without.

## What "offline POS" should mean

[Offline POS](/glossary/offline-pos) is not a single feature. It is a group of behaviours, and a product can have some and not others. A real offline POS should do all of these.

- **Keep a copy of your data on the device:** products, prices, customers, settings and staff logins.
- **Let a cashier sign in with no internet,** on a device that has signed in before.
- **Bill fully offline:** search, barcode scan, discount, held bills, receipt printing.
- **Record udhaar and payments offline,** not only cash sales.
- **Number bills so two counters never clash,** even if both are offline at once.
- **Queue every change and send it when the connection returns,** without the cashier doing anything.
- **Show what is waiting,** and explain any item that could not be saved, instead of silently dropping it.

If a vendor says "offline mode" and only means that the app does not crash, you do not have offline billing. You have an app that fails more gracefully.`),
    mdTable(
      'Offline test: what to try before you buy',
      'Do this during a trial. Turn off Wi-Fi on the counter device after you have signed in once.',
      [
        { key: 'expect', label: 'What should happen' },
      ],
      [
        ['Open the counter', 'You can still sign in and see products and prices'],
        ['Scan a barcode and make a bill', 'It works at the usual speed'],
        ['Print the receipt', 'It prints with a proper bill number'],
        ['Put a bill on a customer khata', 'The balance updates on the device'],
        ['Receive a khata payment', 'It is recorded and queued'],
        ['Turn the internet back on', 'Everything syncs without a button, and a status shows it is done'],
        ['Check the other device', 'The same bills appear there after the sync'],
      ],
    ),
    shot({
      heading: 'The counter says whether it is online',
      body: 'The top bar shows whether the counter is online and how many items are waiting to sync. The cashier does not have to guess, and the owner can see that nothing is stuck.',
      id: SHOT.pos,
      url: 'app.nafaa.pk/pos',
      layout: 'full',
      callouts: [
        { x: 30, y: 12, label: 'Online or offline badge' },
        { x: 82, y: 3, label: 'Sync status' },
      ],
      caption: 'Counter screen from a demo grocery store.',
    }),
    prose(`## The limits nobody likes to mention

An honest offline POS has limits, and you should know them before you rely on one.

- **Stock across counters is not live offline.** If two counters are offline and both sell the last packet, the system finds out when they sync. A good product tells you which sale could not be saved and why, and does not delete it.
- **Online orders and payments need the internet.** A wallet payment or an online store order cannot be confirmed while you are offline.
- **First sign-in needs a connection.** A new device must connect once before it can work offline.
- **Messages wait.** WhatsApp and SMS reminders go out after the connection returns.
- **Old devices fill up.** A device that has been offline for days can hold a long queue; sync it as soon as you can.

These are not reasons to avoid offline mode. They are reasons to ask the vendor what happens in each case, and to check the answer in a trial.

## Desktop software versus cloud with offline mode

Owners who have been burned by internet problems sometimes go back to old desktop billing software that runs only on one computer. That does solve the outage. It brings other costs: the data lives on one machine, so a failed disk or a stolen computer can take the shop's history with it; you cannot see the shop from home; a second counter or branch needs a complicated setup; and updates are manual.

A [cloud POS](/glossary/cloud-pos) with proper offline mode aims at both: the counter runs from the device, and the owner sees everything from anywhere once it syncs. Our [desktop POS alternative](/alternatives/desktop-pos-alternative) page compares the two honestly.

## A routine that makes offline mode safe

1. **Sign in once on every counter device while online,** every day you can.
2. **Look at the sync status at closing.** Zero waiting is the goal.
3. **Read failed items the same day.** Fix the cause and send them again.
4. **Close the day as usual.** Counting cash after sync keeps the totals honest. See the [daily cash closing routine](/blog/daily-cash-closing-routine).
5. **Keep a second connection** such as a phone hotspot from a different network. The [PTA](https://www.pta.gov.pk/) is the regulator, but your best backup is practical: a data SIM that you have tested this month.
6. **Keep a paper slip book** for a total failure only.

## How Nafaa handles it

Nafaa keeps products, prices, customers and settings on the device. New bills, khata payments, new customers and expenses wait in an offline queue and sync by themselves when the connection returns. A device that has signed in once can open the counter without internet, and each device numbers its offline bills with its own code, so two counters never clash. The top bar shows whether you are online and how many items are waiting, and the Sync Center lists each change, retries failed items rather than deleting them and shows the reason when stock blocked a sale. See [offline POS](/product/offline-pos), the help article on [offline billing](/help/pos-counter/offline-billing) and the [offline billing software](/offline-billing-software) page.`),
    steps(
      'If the internet drops at the counter',
      [
        ['Keep billing', 'Do not stop. The counter keeps working from the copy on the device.'],
        ['Check the badge', 'The top bar shows offline and the number of bills waiting.'],
        ['Use a backup connection if you have one', 'A phone hotspot lets the queue send sooner.'],
        ['Let it sync', 'When the connection returns, waiting items send by themselves.'],
        ['Read anything that failed', 'Fix the reason, usually stock, and send it again.'],
      ],
      'The short version for your cashier.',
      true,
    ),
    tip('Test offline mode on the same device and the same day you start billing for real. Turn off Wi-Fi, bill three items, turn it on, and watch the sync. Ten minutes now saves an awkward afternoon later.', 'Ten-minute test'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['What happens at the counter', 'Estimating the cost', 'What offline should mean', 'Offline test', 'Limits', 'Desktop vs cloud', 'Routine', 'How Nafaa handles it'],
  dropped: [],
  evidence: [
    'apps/web/src/core/lib/offline/syncEngine.ts',
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/core/lib/offline/offlineKhata.ts',
    'apps/web/src/core/lib/offline/offlineAuth.ts',
    'apps/web/src/core/lib/offline/offlineDevice.ts',
    'apps/web/src/core/lib/offline/ui/SyncCenterPage.tsx',
    'apps/web/src/app/shell/topbar/SyncStatusIndicator.tsx',
  ],
  factNote: 'Offline behaviour checked against the code (see evidence); limits listed are those of the offline design. PTA homepage and Wikipedia opened 2026-11-15. No outage statistics are claimed.',
};

export default spec;
