/**
 * Help articles: counter and POS (/help/pos-counter/...).
 * Checked against the shared POS engine (apps/web/src/modules/pos) as of the
 * 26 Oct keyboard-first counter, the counter rules in Settings and the
 * returns, hardware and offline code it calls.
 */
import { helpShot, note, tip, warn, type HelpArticle } from '../_help';

const POS = 'apps/web/src/modules/pos/engine/PosScreen.tsx';
const ENGINE = 'apps/web/src/modules/pos/engine/usePosEngine.ts';
const CART = 'apps/web/src/modules/pos/components/PosCartPanel.tsx';
const CHECKOUT = 'apps/web/src/modules/pos/components/PosCheckoutModal.tsx';
const SHORTCUTS = 'apps/web/src/modules/pos/components/PosShortcutsOverlay.tsx';
const RULES = 'apps/web/src/modules/organization/settings/sections/POSSection.tsx';

const articles: HelpArticle[] = [
  {
    slug: 'make-a-bill',
    title: 'How to make a bill at the POS counter',
    summary:
      'Open the POS counter, add items by barcode, name or tile, set quantities, pick the customer and take payment. Covers the one-key cash bill (F12), the checkout window for other payment methods, and what to do on the success screen.',
    seoDescription: 'Make a bill in Nafaa POS: scan or search items, set quantity, pick the customer, take cash with F12 or open checkout for card, wallet or udhaar.',
    focusKeyword: 'make a bill in nafaa pos',
    intro: [
      'Every sale in Nafaa starts on the **POS counter** (sidebar → Sales → POS counter, or press **G** then **P** from anywhere in the app). The screen has a search box on the left with your products under it, and the **Bill** on the right.',
      '',
      'The search box is always ready for the barcode gun, so on a busy counter you can scan item after item without touching the mouse. You can also type a name, an SKU or the Urdu name of a product, or click its tile.',
    ].join('\n'),
    steps: {
      heading: 'Make a bill',
      items: [
        ['Open the counter', 'Go to **POS counter**. If your account has more than one branch, check that the right shop is selected in the top bar; the bill cannot be completed without one.'],
        ['Add the items', 'Scan the barcode, or type part of the name and press **Enter** to add the first match. Use **↑** and **↓** to pick another result. Clicking a product tile adds it too.'],
        ['Set quantities', 'Type `3*` and press **Enter** to make the last line 3, or type `3*` before a name or barcode to add that item three times. **+** and **−** change the last line by one.'],
        ['Pick the customer (optional)', 'The bill starts as **Walk-in customer**. Press **F2** to search a customer by name or phone, or type a mobile number in the search box and press **Enter**. A customer is needed for udhaar.'],
        ['Take cash in one key', 'For a cash sale of the exact amount, press **F12** or click **Cash · print**. The bill is saved and printed if auto-print is on.'],
        ['Use checkout for anything else', 'Press **Ctrl + Enter** (or the **Checkout** button) to choose **Pura paisa** (paid in full), **Kuch paisa** (part paid, rest udhaar) or **Udhaar**, pick Cash, JazzCash, Easypaisa, Card or Bank, and type what the customer handed over. Nafaa shows the change. Press **Enter** to complete.'],
        ['Finish', 'The **Sale ho gayi** screen shows the total. Press **P** to print again, **W** to send the bill on WhatsApp when the customer has a phone number, or **Enter** for **Nayi sale** (next sale).'],
      ],
    },
    more: [
      helpShot('make-a-bill', 'A bill with three items on the classic layout of the retail demo shop.', {
        callouts: [
          { x: 41.5, y: 19, label: 'Scan or type here' },
          { x: 44, y: 42, label: 'Click a tile to add it' },
          { x: 84.5, y: 24, label: 'Bill lines' },
          { x: 79, y: 15.5, label: 'Customer (F2)' },
          { x: 84.5, y: 88, label: 'Cash · print (F12)' },
          { x: 94.5, y: 93, label: 'Checkout (Ctrl + Enter)' },
        ],
      }),
      helpShot('make-a-bill-2', 'The checkout window: how the customer pays, the method, and the amount handed over.', {
        callouts: [
          { x: 36.5, y: 36, label: 'Full, part or udhaar' },
          { x: 32, y: 48, label: 'Payment method' },
          { x: 64, y: 34.5, label: 'Amount received' },
          { x: 50, y: 77.5, label: 'Complete (Enter)' },
        ],
      }),
      tip('Press **Alt + R** to repeat the last bill for a regular customer, and **Ctrl + P** to print the last bill again. All keys are listed in [POS keyboard shortcuts](/help/pos-counter/pos-keyboard-shortcuts).'),
    ],
    faqs: [
      ['Can I change the rate of one item on the bill?', 'Yes, if your role allows it. Press **F3** to move into the bill lines, select the line and press **R**. A lower rate counts toward the shop’s discount limit set in Counter rules.'],
      ['How do I remove an item from the bill?', 'Press **F3**, select the line with **↑** or **↓** and press **Delete**, or press **−** until the quantity reaches zero.'],
    ],
    terms: ['pos', 'barcode', 'receipt'],
    related: ['PRODUCT:pos', 'PAGE:pos-keyboard-shortcuts', 'PAGE:split-payment', 'PAGE:udhaar-sale', 'PAGE:receipts-and-printers'],
    evidence: [POS, ENGINE, CART, CHECKOUT, 'apps/web/src/modules/pos/components/PosSuccessModal.tsx', 'apps/web/src/modules/pos/lib/posKeys.ts', 'apps/web/src/app/shell/keyboard/useGlobalKeys.ts'],
  },
  {
    slug: 'pos-keyboard-shortcuts',
    title: 'POS keyboard shortcuts',
    summary:
      'Every key on the Nafaa POS counter: search and quantity, the bill lines, customer, discount, hold, payment and checkout. Press ? on the counter to see the same list on screen.',
    seoDescription: 'All Nafaa POS keyboard shortcuts: F2 customer, F4 discount, F6 hold, F8 payment, F12 cash and print, Ctrl+Enter checkout, F3 bill lines and more.',
    focusKeyword: 'pos keyboard shortcuts',
    intro: [
      'The counter is built to run from the keyboard, so a cashier with a barcode gun never has to reach for the mouse. The search box keeps focus; any letter or digit you type, or any barcode you scan, goes there.',
      '',
      'Press **?** on the counter (with the search box empty) to open **Keyboard shortcuts**, or press **F1** for the guide. The tables below match that screen.',
    ].join('\n'),
    steps: {
      heading: 'Learn the keys in five minutes',
      items: [
        ['Open the list', 'On the POS counter press **?**. Keep it open on the first day; it closes with **Esc**.'],
        ['Add items by keyboard', 'Type a name and press **Enter**, or scan. **↑ ↓** walk the results. `3*` then **Enter** sets the last line to 3.'],
        ['Edit the bill', 'Press **F3** to move into the bill lines. **↑ ↓** pick a line, **+ −** change quantity, **Enter** types a quantity, **R** changes the rate, **Delete** removes the line, **Esc** goes back to search.'],
        ['Take payment', 'Press **F12** for cash and print, **F8** then a number for a payment method, or **Ctrl + Enter** for the full checkout.'],
      ],
    },
    more: [
      {
        type: 'richText',
        markdown: [
          '## Search and bill',
          '',
          '| Key | What it does |',
          '| --- | --- |',
          '| Type or scan | Search by name, SKU, barcode or Urdu name |',
          '| ↑ ↓ | Move through the results |',
          '| Enter | Add the selected item |',
          '| `3*` Enter | Set the last or selected line to 3 |',
          '| `3*name` | Add that item 3 times |',
          '| + − | Change the last or selected line by one |',
          '| Esc | Clear the search or close a dialog |',
          '| Alt + 1 to 9 | Add one of the items sold most on this counter |',
          '',
          '## Counter',
          '',
          '| Key | What it does |',
          '| --- | --- |',
          '| F1 | Guide |',
          '| F2 | Find or add a customer |',
          '| F3 | Move into the bill lines and back |',
          '| F4 | Discount |',
          '| F6 | Hold the bill, or resume a held bill |',
          '| F7 | Switch between Products and Combos |',
          '| F8 | Choose the payment method (1 Cash, 2 Card, 3 JazzCash, 4 Easypaisa, 5 Udhaar, 6 Split) |',
          '| F9 | More actions (**Aur kaam**) |',
          '| F10 | Quick keys |',
          '| F12 | Cash and print |',
          '| Ctrl + Enter | Checkout with every option |',
          '| Ctrl + P | Print the last bill again |',
          '| Alt + R | Sell the last bill again |',
          '| Alt + L | Who took the goods (**Lene wala**) |',
          '| Alt + D | Delivery |',
          '',
          '## In the bill lines (after F3)',
          '',
          '| Key | What it does |',
          '| --- | --- |',
          '| ↑ ↓ | Select a line |',
          '| + − | Quantity up or down |',
          '| Enter | Type the quantity (Tab moves to the rate) |',
          '| R | Change the rate |',
          '| N | Note on the line (when line notes are on) |',
          '| Delete | Remove the line |',
          '| Esc | Back to search |',
          '',
          '## In checkout',
          '',
          '| Key | What it does |',
          '| --- | --- |',
          '| Type | Amount the customer handed over |',
          '| F1 F3 F4 F5 F7 | Cash, JazzCash, Easypaisa, Card, Bank |',
          '| F6 | Full udhaar (needs a customer) |',
          '| Alt + S | Split payment |',
          '| Alt + A | Add another method to the split |',
          '| Enter | Complete the bill |',
        ].join('\n'),
      },
      helpShot('pos-keyboard-shortcuts', 'The Keyboard shortcuts list opens with ? on the POS counter.'),
      note('Outside the counter, **Ctrl + K** opens search from the top bar, and **G** followed by a letter jumps to a page: **G P** POS counter, **G S** Sales history, **G I** Products, **G C** Customers, **G R** Reports, **G D** Dashboard, **G E** Expenses.', 'Keys across the app'),
    ],
    faqs: [
      ['Why does a key do nothing?', 'Some keys depend on counter settings: **F4** needs the Discount button switched on and hand discounts allowed in Counter rules, **Alt + 1 to 9** needs "Aksar bikne wali cheezein" on, and **N** needs line notes on.'],
      ['Do the shortcuts work on a laptop without F keys?', 'Most laptops reach F keys with the **Fn** key. Every action is also a button on the screen, and **F9** lists the rest.'],
    ],
    terms: ['pos', 'hold-bill', 'split-payment', 'discount'],
    related: ['PRODUCT:pos', 'PAGE:make-a-bill', 'PAGE:pos-layouts', 'PAGE:hold-and-recall-bills'],
    evidence: [SHORTCUTS, POS, 'apps/web/src/modules/pos/components/PosPayPicker.tsx', CHECKOUT, 'apps/web/src/modules/pos/README.md', 'apps/web/src/app/shell/keyboard/useGlobalKeys.ts'],
    needsOwner: ['The on-screen list says F8 offers methods 1–5; the picker has six (6 = Split). The article follows the picker. Update the overlay text in PosShortcutsOverlay.tsx.'],
  },
  {
    slug: 'pos-layouts',
    title: 'Choose a POS counter layout',
    summary:
      'Pick one of four counter layouts (Classic, Express, Bill bara and Touch) for the whole shop or for one cashier, choose how dense the bill lines are, and switch parts of the counter on or off.',
    seoDescription: 'Change the Nafaa POS layout: Classic, Express, Bill bara or Touch, for the whole shop or one cashier, plus bill line density and counter parts.',
    focusKeyword: 'pos layout',
    intro: [
      'The same counter can look different for different work. A grocery till with a barcode gun wants a big search box and a bill table; a café on a tablet wants big tiles. Nafaa has four layouts on one engine, so prices, stock and keys work the same in each.',
      '',
      '| Layout | Best for |',
      '| --- | --- |',
      '| **Classic** | Products on the left, bill on the right. The default. |',
      '| **Express** | A big search with the bill as a table below. Barcode and keyboard counters. |',
      '| **Bill bara** (big bill) | A large bill on the left and a narrow product list on the right. |',
      '| **Touch** | Big tiles and buttons for tablets. |',
      '',
      'The owner sets the shop default. Each cashier can then pick their own layout on their own computer. Phones always use Classic.',
    ].join('\n'),
    steps: {
      heading: 'Change the layout',
      items: [
        ['For yourself, on this computer', 'On the POS counter click the settings icon in the green bar (**POS settings**). Under **Mera layout** (my layout) pick one. Click the chosen one again to go back to the shop layout.'],
        ['Set line density', 'In the same window, **Bill ki lines** sets **Patli** (compact) or **Khuli** (roomy) lines. Compact shows more items on a small screen.'],
        ['For the whole shop', 'Go to **Settings → Counter & POS → Counter rules**. In the **POS counter** card choose the **Dukaan ka layout** (shop layout). Every counter opens with it until a cashier picks their own.'],
        ['Choose what the counter shows', 'Under **Counter par kya dikhe** switch parts on or off: product pictures, the category strip, quick keys, stock on tiles, the Discount button, line notes, delivery, sounds and auto-print.'],
        ['Set quick discount buttons', '**Jaldi Discount buttons** adds one-click discounts (for example 5% and 10%) to the bill. Cashiers only see buttons within their own limit.'],
      ],
    },
    more: [
      helpShot('pos-layouts', 'POS settings on the counter: each cashier picks a layout and line density for their own computer.', {
        callouts: [
          { x: 33, y: 22, label: 'Mera layout' },
          { x: 62.5, y: 52, label: 'Line density' },
          { x: 68, y: 58.5, label: 'Auto-print and paper width' },
          { x: 40, y: 77.8, label: 'Shop-wide settings' },
        ],
      }),
      helpShot('pos-layouts-2', 'The Express layout: a wide search box with the bill as a table underneath.'),
      tip('Turning off product pictures makes the tiles smaller and the counter faster on older computers.'),
    ],
    faqs: [
      ['Where is a cashier’s own layout saved?', 'In that browser on that computer. A cashier who works on two counters picks the layout on each one.'],
      ['Who can change the shop layout?', 'Staff whose role can edit settings. The link to the shop settings shows in POS settings only for them.'],
    ],
    terms: ['pos'],
    related: ['PRODUCT:pos', 'PAGE:pos-keyboard-shortcuts', 'PAGE:make-a-bill', 'PAGE:devices-and-login'],
    evidence: ['apps/web/src/modules/pos/components/PosSettingsModal.tsx', 'apps/web/src/modules/pos/lib/posCounterConfig.ts', 'apps/web/src/modules/organization/settings/sections/_PosCounter.tsx', 'apps/web/src/modules/pos/components/PosLayoutPreview.tsx', 'apps/web/src/modules/pos/README.md'],
  },
  {
    slug: 'hold-and-recall-bills',
    title: 'Hold a bill and recall it later',
    summary:
      'Put a half-made bill on hold with F6 when a customer steps away, serve the next person, then bring the held bill back with its items and customer. Several bills can wait at once.',
    seoDescription: 'Hold a bill in Nafaa POS with F6, serve the next customer, and resume the held bill with its items and customer. Several bills can wait at once.',
    focusKeyword: 'hold bill pos',
    intro: [
      'A customer remembers one more item and goes back to the shelf, while three people wait behind them. Instead of cancelling the bill, put it on hold, bill the next customer and pick it up again when they return.',
      '',
      'A held bill keeps its lines and the selected customer. The green bar on the counter shows an amber button with the number of bills waiting.',
    ].join('\n'),
    steps: {
      heading: 'Hold and resume a bill',
      items: [
        ['Hold the current bill', 'With items on the bill press **F6**, or click **Hold** at the top of the bill. You will see **Bill hold ho gaya** and the bill clears for the next customer.'],
        ['Serve the next customer', 'Make and complete the next bill as usual.'],
        ['Resume with one bill waiting', 'With an empty bill, press **F6** again. The held bill comes straight back.'],
        ['Pick from several', 'When more than one bill is waiting, **F6** (or the amber button) opens **Hold kiye hue bill** (held bills). Each row shows the first items, how long ago it was held and the total. Press its number (**1** to **9**) or click **Resume**.'],
        ['Swap bills', 'If you resume while another bill is open, the open bill goes on hold in its place, so nothing is lost.'],
        ['Remove a bill you no longer need', 'Click the bin icon on its row to delete it.'],
      ],
    },
    more: [
      helpShot('hold-and-recall-bills', 'Two bills waiting in the held bills list on the POS counter.', {
        callouts: [
          { x: 60, y: 11.6, label: 'Held bills (amber)' },
          { x: 36, y: 50.5, label: 'Press 1 or 2' },
          { x: 59, y: 50.5, label: 'Resume' },
        ],
      }),
      warn('Held bills are kept on the counter screen of that computer only. They are not saved to the server, so finish or remove them before you close the POS page, reload it or log out.', 'Held bills stay on this screen'),
    ],
    faqs: [
      ['Can another counter see my held bill?', 'No. A held bill lives on the counter where it was held.'],
      ['Is stock taken when I hold a bill?', 'No. Stock moves only when the bill is completed.'],
      ['Does the discount stay on a held bill?', 'No. The items and the customer are kept, but a discount is cleared when the bill is held. Apply it again after you resume the bill.'],
    ],
    terms: ['hold-bill', 'pos'],
    related: ['PRODUCT:pos', 'PAGE:make-a-bill', 'PAGE:pos-keyboard-shortcuts'],
    evidence: [ENGINE, POS, 'apps/web/src/modules/pos/components/PosHoldCartsModal.tsx'],
  },
  {
    slug: 'discounts-at-the-counter',
    title: 'Give a discount at the counter',
    summary:
      'Give a bill discount as a percentage or in rupees, round the bill off, apply a discount code or loyalty points, and set the limit a cashier can give without the owner’s PIN.',
    seoDescription: 'Give a discount in Nafaa POS with F4: percent, rupees or round-off, discount codes and points, plus the cashier discount limit and owner PIN.',
    focusKeyword: 'pos discount',
    intro: [
      'Discounts at the counter are usually small and quick: 5% for a regular, a few rupees off to round the bill, or a code from a promotion. Nafaa keeps all of these in one **Discount** window, and the owner decides how far a cashier can go.',
      '',
      'By default a cashier can give up to 50% by hand. Anything above the limit needs the owner’s PIN, if one is set, or is blocked.',
    ].join('\n'),
    steps: {
      heading: 'Give a discount on a bill',
      items: [
        ['Open Discount', 'With items on the bill press **F4** or click **Discount** under the bill. The window shows the bill and the **Naya total** (new total).'],
        ['Choose percent or rupees', 'Pick **Percent %** or **Rupay**, then type the value or click one of the preset buttons such as **10%**. The saving shows as **Customer ki bachat**.'],
        ['Or round the bill off', 'Under **Bill gol karein** click a rounded total (to the nearest 10, 50 or 100) and the difference becomes the discount.'],
        ['Add a code or points (optional)', 'Type a **Discount code** and click **Lagayein** (apply). When the bill has a customer with loyalty points, you can use their points in the same window.'],
        ['Apply', 'Click the green button or press **Enter**. The discount shows on the bill; click the **×** next to it to remove it.'],
        ['Use one-click buttons', 'The **5%** and **10%** buttons next to **Discount** apply that discount at once. The owner sets these buttons in Counter rules.'],
      ],
    },
    more: [
      helpShot('discounts-at-the-counter', 'The Discount window with 10% selected on a retail bill.', {
        callouts: [
          { x: 57, y: 26.5, label: 'New total' },
          { x: 50, y: 38.5, label: 'Percent or rupees' },
          { x: 50, y: 54.5, label: 'Presets' },
          { x: 50, y: 66, label: 'Round off' },
          { x: 47, y: 77, label: 'Discount code' },
        ],
      }),
      {
        type: 'richText',
        markdown: [
          '## Set the cashier’s limit',
          '',
          'Go to **Settings → Counter & POS → Counter rules**. In the **Discount** card:',
          '',
          '- **Haath se Discount** (hand discount) switches manual discounts on or off. When it is off, the Discount button does nothing.',
          '- **Zyada se zyada Discount** (maximum discount) is the percentage a cashier can give. A lowered item rate counts toward the same limit.',
          '- Under **Malik ka PIN kab maangein** (when to ask for the owner’s PIN), **Har Discount par PIN** asks for the PIN on every hand discount, even within the limit.',
          '',
          'The server checks the same rules again when the bill is saved. Discount codes and loyalty points follow their own rules on the Discounts and Loyalty pages.',
        ].join('\n'),
      },
    ],
    faqs: [
      ['What happens when a cashier goes over the limit?', 'If the owner has set a PIN, the counter asks for it before the bill is saved. Without a PIN, the bill cannot go through with that discount.'],
      ['Can staff be allowed to skip the limit?', 'Yes. A role with the permission to give more than the limit ("Had se zyada discount") skips the limit and its PIN.'],
    ],
    terms: ['discount', 'loyalty-points', 'pos'],
    related: ['PRODUCT:pos', 'PAGE:loyalty-points', 'PAGE:make-a-bill', 'PAGE:add-staff-and-roles', 'TOOL:discount-calculator'],
    evidence: ['apps/web/src/modules/pos/components/PosDiscountModal.tsx', 'apps/web/src/modules/pos/components/PosPerks.tsx', ENGINE, CART, RULES, 'apps/api/prisma/schema.prisma'],
  },
  {
    slug: 'split-payment',
    title: 'Take a split payment',
    summary:
      'Take one bill in two or more ways, such as part cash and part card or JazzCash. Open checkout, switch on Split payment, enter each amount, and Nafaa records every method on the bill and gives change only from cash.',
    seoDescription: 'Take a split payment in Nafaa POS: part cash, part card, JazzCash, Easypaisa or bank on one bill, with change from cash only. Keys F8 6 and Alt+S.',
    focusKeyword: 'split payment pos',
    intro: [
      'Customers often pay a large bill partly in cash and the rest by card or a wallet transfer. A split payment records each part against its own method, so the cash drawer, card and wallet totals in your reports each match what really came in.',
      '',
      'A split can have up to five parts. Change can only come from cash: the card, wallet or bank amounts can add up to the bill, but not more.',
    ].join('\n'),
    steps: {
      heading: 'Split a bill between methods',
      items: [
        ['Open split checkout', 'With items on the bill press **F8** then **6** (Split). Or open checkout with **Ctrl + Enter** and click **Split payment** (or press **Alt + S**).'],
        ['Enter the first part', 'The first row is ready. Pick the method from its list and type the amount. If you had already typed an amount before switching to split, it becomes the first part and the rest goes to the second row.'],
        ['Enter the second part', 'Click the next row and set its method and amount. In a split, **F1** Cash, **F3** JazzCash, **F4** Easypaisa, **F5** Card and **F7** Bank change the method of the row you are on.'],
        ['Add more methods if needed', 'Click **Aur tareeqa** (another method) or press **Alt + A**.'],
        ['Check the totals', 'Under the rows Nafaa shows **Mila** (received), **Baqi** (still due) and **Wapas (cash)** (change).'],
        ['Complete', 'Press **Enter**. If something is still due, add another payment, or choose **Kuch paisa** at the top so the rest goes to the customer’s khata.'],
      ],
    },
    more: [
      helpShot('split-payment', 'Checkout with Split payment on: one row per method and the received, due and change totals.', {
        callouts: [
          { x: 45.5, y: 37.5, label: 'Split on (Alt + S)' },
          { x: 64, y: 29.5, label: 'One row per method' },
          { x: 64, y: 38.7, label: 'Aur tareeqa (Alt + A)' },
          { x: 64, y: 49, label: 'Received, due, change' },
        ],
      }),
      note('The receipt lists each part of a split payment, so the customer can see what was paid in cash and what was paid by card or wallet.'),
    ],
    faqs: [
      ['Why can’t I enter more on the card than the bill?', 'Change can only be given in cash. Enter the card, wallet or bank part up to what the customer owes and take the rest in cash.'],
      ['Can part of a split go on udhaar?', 'Yes, for a bill with a customer. Choose **Kuch paisa** (part paid) and whatever is not covered by the rows is added to their khata.'],
    ],
    terms: ['split-payment', 'jazzcash', 'easypaisa', 'cash-drawer'],
    related: ['PRODUCT:payments', 'PRODUCT:pos', 'PAGE:make-a-bill', 'PAGE:udhaar-sale', 'PAGE:cash-closing'],
    evidence: ['apps/web/src/modules/pos/components/PosSplitTender.tsx', CHECKOUT, 'apps/web/src/modules/pos/components/PosPayPicker.tsx', 'apps/web/src/modules/pos/lib/posCart.ts'],
  },
  {
    slug: 'returns-and-refund-pin',
    title: 'Process a return and the refund PIN',
    summary:
      'Take goods back on an earlier bill, choose what goes back on the shelf and what is written off, refund in cash, wallet, bank or card, and understand when the owner’s PIN is asked for. The refund PIN is on by default.',
    seoDescription: 'Process a return in Nafaa: find the bill, pick the items, put stock back or mark it damaged, choose the refund method, and approve with the refund PIN.',
    focusKeyword: 'pos return refund',
    intro: [
      'A return in Nafaa always starts from the original bill. That way the refund uses the price the customer actually paid (after any discount), the stock goes back to the right product, and any udhaar on that bill is cleared first.',
      '',
      'Because returns pay money out of the galla, Nafaa asks for the owner’s PIN before a refund by default. A manager whose role can approve refunds can enter their own approval PIN instead.',
    ].join('\n'),
    steps: {
      heading: 'Return goods on a bill',
      items: [
        ['Find the bill', 'Go to **Returns** (sidebar → Sales) and click **Nayi return** (or press **N**), then type the bill number, customer name or phone, or scan the barcode on the receipt. You can also open the bill in **Sales history** and click **Maal wapas**, or press **R** on the bill’s receipt page.'],
        ['Pick what came back', 'Under **Kya wapas aaya** set the quantity for each item, or take the whole bill back.'],
        ['Shelf or damaged', 'For each item choose **Stock me wapas** (back on the shelf) or **Kharab — stock me nahi** (damaged, not back in stock). Damaged items are recorded as a loss.'],
        ['Choose how the money goes back', 'Under **Paisa kaise wapas** pick Cash, JazzCash, EasyPaisa, Bank or Card. If the bill had udhaar, the refund reduces the khata first and only the rest is paid out.'],
        ['Give a reason', 'Pick a reason under **Wapas kyun aaya**, such as **Cheez kharab nikli** (item was faulty), or type your own. Reasons show in the returns analytics.'],
        ['Confirm and enter the PIN', 'Click **Return karein**. When the refund PIN is on, the **Malik ka PIN** window opens; the return is saved after the PIN is checked.'],
      ],
    },
    more: [
      helpShot('returns-and-refund-pin', 'The return window opened from a bill (press R): items, refund method and reason. Shelf or damaged buttons appear once you set a quantity.', {
        callouts: [
          { x: 50, y: 33.6, label: 'Items and quantity' },
          { x: 66.5, y: 19.5, label: 'Whole bill' },
          { x: 50, y: 58, label: 'Refund method' },
          { x: 47.5, y: 69, label: 'Reason' },
          { x: 65, y: 87.6, label: 'Return karein' },
        ],
      }),
      {
        type: 'richText',
        markdown: [
          '## Turn the refund PIN on or off',
          '',
          'Go to **Settings → Counter & POS → Counter rules**, card **Malik ka PIN kab maangein**:',
          '',
          '- **Return par PIN** asks for the PIN before money is paid back. It is on for new shops.',
          '- **Bill cancel par PIN** asks for it before a completed bill is cancelled (void).',
          '',
          'The owner sets the PIN itself in **Settings → Security & PIN**. Until a PIN is set, these rules cannot ask for one.',
        ].join('\n'),
      },
    ],
    faqs: [
      ['Can I exchange an item instead of refunding?', 'Make the return, then sell the replacement on a new bill. Garments shops can also set how many days an exchange is allowed in Counter rules.'],
      ['Does a return change today’s sales?', 'Yes. The refunded amount is taken off the sales of the day the return is made, and the Returns page shows totals, reasons and which returns were approved with a PIN.'],
    ],
    terms: ['sales-return', 'refund', 'void', 'credit-note'],
    related: ['PRODUCT:pos', 'PAGE:make-a-bill', 'PAGE:receive-a-payment', 'PAGE:add-staff-and-roles'],
    evidence: ['apps/web/src/modules/sales/returns/components/ReturnModal.tsx', 'apps/web/src/modules/sales/returns/components/FindBillModal.tsx', 'apps/web/src/modules/sales/returns/pages/ReturnsPage.tsx', 'apps/web/src/modules/sales/history/components/SaleDrawer.tsx', 'apps/web/src/core/security/ManagerPin.tsx', RULES, 'apps/api/prisma/schema.prisma'],
  },
  {
    slug: 'offline-billing',
    title: 'Keep billing when the internet is down',
    summary:
      'The POS counter keeps making bills without internet. Bills are saved on the device and upload by themselves when the connection is back. Learn what the offline signs mean and where to check bills that are waiting to sync.',
    seoDescription: 'Bill without internet in Nafaa POS: bills save on the device and sync when the connection returns. See pending bills in the Sync center.',
    focusKeyword: 'offline pos billing',
    intro: [
      'Internet drops and load-shedding should not stop the counter. Nafaa keeps a copy of your products and customers on each device. When the connection goes, the counter carries on: bills are saved on that computer, tablet or phone and sent to the server when it comes back.',
    ].join('\n'),
    steps: {
      heading: 'Bill offline',
      items: [
        ['Open the counter while online first', 'Log in and open the POS once with internet on each device. Nafaa saves products, prices and customers on the device and refreshes them in the background.'],
        ['Notice the offline signs', 'When the connection drops, an orange bar says **Aap offline hain — sales queue me save hongi** (you are offline, sales will be saved in a queue), the POS shows **Offline** next to its name, and the top bar sync button shows **Offline**.'],
        ['Keep billing as usual', 'Scan, search and take payment the same way. Each bill made offline is saved on the device with a number starting with `OFFLINE-` and the device code, so two counters never clash.'],
        ['Watch the waiting count', 'The sync button shows how many bills are waiting, for example **Offline · 3**. Click it to see **Sales** and **Other changes** waiting.'],
        ['Let it sync', 'When the internet is back the bills upload by themselves; the button returns to **Synced**. To push them at once, click the sync button and then **Sync now**.'],
        ['Check problems in the Sync center', 'If a bill fails to upload, the button shows **failed**. Click **Open Sync Center** in the sync panel to see the bill and retry.'],
      ],
    },
    more: [
      helpShot('offline-billing', 'The POS counter while offline: the orange bar, the Offline badge and the sync button in the top bar.', {
        callouts: [
          { x: 27, y: 2.5, label: 'Offline bar' },
          { x: 29, y: 16, label: 'Offline badge' },
          { x: 82.5, y: 8.3, label: 'Sync status' },
        ],
      }),
      warn('Bills made offline are stored in that device’s browser until they upload. Do not clear the browser data or uninstall the browser on that device while the sync button shows bills waiting.', 'Before you clear anything'),
      tip('Industry steps that need the server, such as a follow-up offer after a sale, run only for bills the server has saved, not for bills waiting offline.'),
    ],
    faqs: [
      ['Does stock update for offline bills?', 'Yes, when the bills reach the server. Until then other counters will not see that stock change.'],
      ['Can I print a receipt offline?', 'Yes. The receipt is built from the copy of your products on the device, and printing does not need internet.'],
    ],
    terms: ['offline-pos', 'cloud-pos', 'pos'],
    related: ['PRODUCT:offline-pos', 'PRODUCT:pos', 'PAGE:devices-and-login', 'PAGE:receipts-and-printers'],
    evidence: ['apps/web/src/core/lib/offline/offlineSales.ts', 'apps/web/src/core/lib/offline/syncEngine.ts', 'apps/web/src/core/lib/offline/offlineDevice.ts', 'apps/web/src/core/lib/offline/offlinePrewarm.ts', 'apps/web/src/core/lib/offline/ui/OfflineBanner.tsx', 'apps/web/src/app/shell/topbar/SyncStatusIndicator.tsx', ENGINE],
    needsOwner: ['Confirm whether udhaar (credit) bills can be made offline for existing customers before mentioning it; memory notes say a new khata does not work offline.'],
  },
  {
    slug: 'receipts-and-printers',
    title: 'Set up receipts and a receipt printer',
    summary:
      'Connect a thermal receipt printer by USB, serial or Bluetooth, print a test bill, set 80 mm or 58 mm paper, choose what the receipt shows, and open the cash drawer automatically on cash sales.',
    seoDescription: 'Connect a thermal receipt printer to Nafaa POS (USB, serial, Bluetooth), print a test bill, pick 80 or 58 mm paper and design the receipt.',
    focusKeyword: 'receipt printer setup',
    intro: [
      'Nafaa prints receipts in two ways. **Browser print** works with any printer installed in Windows: the bill opens in a small print window. **Direct (tez)** (direct, fast) talks to a thermal printer from the browser, prints in about a second with no pop-up, and can open the cash drawer. Direct printing needs Google Chrome or Microsoft Edge.',
      '',
      'All printer and receipt settings are under **Settings → Counter & POS**.',
    ].join('\n'),
    steps: {
      heading: 'Connect the printer and set the receipt',
      items: [
        ['Open POS hardware', 'Go to **Settings → Counter & POS → POS hardware**. The cards at the top show the state of the printer, cash drawer, barcode scanner, scale and customer screen.'],
        ['Pick the print method', 'In **Receipt printer** choose **Browser print** or **Direct (tez)**. With Browser print, the printer must be in Windows "Printers & scanners".'],
        ['Connect a direct printer', 'For Direct, choose how it is connected (**USB**, **Serial / COM** or **Bluetooth**) and click **Printer jorein** (connect printer). Pick your printer in the browser’s list, then click **Test page**.'],
        ['Print a test bill', 'Choose **80mm** or **58mm** paper and click **Test bill** (or press **T**).'],
        ['Open the drawer on cash sales', 'With Direct printing, turn on **Cash sale par khud khule** in the **Cash drawer** card so the drawer opens when a cash bill prints. **Abhi kholein** opens it now.'],
        ['Design the receipt', 'Go to **Settings → Counter & POS → Receipt**. Choose the paper, style and font size, what prints at the top (logo, address, phone), what the bill shows (customer, cashier, savings, khata balance, bill barcode) and your own footer message and return policy.'],
        ['Set auto-print per counter', 'On the POS counter open **POS settings** and switch **Bill khud print ho** (print automatically) on or off, and pick the paper width for that computer.'],
      ],
    },
    more: [
      helpShot('receipts-and-printers', 'POS hardware settings: print method, test bill, cash drawer, barcode scanner and scale.', {
        callouts: [
          { x: 27, y: 22.4, label: 'Device status' },
          { x: 27, y: 41, label: 'Browser or Direct' },
          { x: 38, y: 56.5, label: 'Test bill (T)' },
          { x: 94.5, y: 51.6, label: 'Drawer on cash sale' },
        ],
      }),
      tip('Turn on **Bill ka barcode** on the receipt. At return time, scanning the barcode opens the original bill straight away.'),
      note('If the bill does not print in Browser print mode, allow pop-ups for Nafaa in the browser. The counter shows a message when a pop-up was blocked.'),
    ],
    faqs: [
      ['Which printers work with Direct printing?', 'Thermal receipt printers that connect by USB, serial (COM) or Bluetooth and accept standard receipt commands, in 80 mm or 58 mm. Small Bluetooth printers are usually 58 mm.'],
      ['Can I print bills on A4?', 'Yes. Pick A4 as the paper in Receipt settings; **Settings → Counter & POS → Printing** controls A4, PDF, colour and the header and footer of printed reports.'],
    ],
    terms: ['thermal-printer', 'receipt', 'cash-drawer', 'customer-display'],
    related: ['PRODUCT:pos', 'PAGE:make-a-bill', 'PAGE:devices-and-login', 'PAGE:set-up-your-shop', 'TOOL:receipt-maker'],
    evidence: ['apps/web/src/core/hardware/HardwarePage.tsx', 'apps/web/src/modules/organization/settings/sections/ReceiptSection.tsx', 'apps/web/src/modules/pos/components/PosSettingsModal.tsx', 'apps/web/src/app/shell/navigation/nav-config.ts', ENGINE],
  },
];

export default articles;
