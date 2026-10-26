/** Help articles: khata-and-customers (/help/khata-and-customers/...). */
import { helpPath, helpShot, note, tip, warn, type HelpArticle } from '../_help';

const CUSTOMERS = 'apps/web/src/modules/customers/directory/CustomersPage.tsx';
const CUSTOMER_FORM = 'apps/web/src/modules/customers/customers/pages/CustomerFormPage.tsx';
const QUICK_ADD = 'apps/web/src/modules/customers/directory/components/QuickAddModal.tsx';
const PROFILE = 'apps/web/src/modules/customers/directory/CustomerProfilePage.tsx';
const KHATA = 'apps/web/src/modules/customers/directory/KhataBookPage.tsx';
const KHATA_ACTION = 'apps/web/src/modules/customers/directory/components/KhataActionModal.tsx';
const KHATA_TOOLS = 'apps/web/src/modules/customers/directory/components/KhataTools.tsx';
const MESSAGES = 'apps/web/src/modules/customers/directory/messages.ts';
const POS_PICKER = 'apps/web/src/modules/pos/components/PosCustomerPicker.tsx';
const POS_ADD = 'apps/web/src/modules/pos/components/PosCustomerAddModal.tsx';
const POS_CHECKOUT = 'apps/web/src/modules/pos/components/PosCheckoutModal.tsx';
const POS_CART = 'apps/web/src/modules/pos/components/PosCartPanel.tsx';
const POS_ENGINE = 'apps/web/src/modules/pos/engine/usePosEngine.ts';
const POS_SHORTCUTS = 'apps/web/src/modules/pos/components/PosShortcutsOverlay.tsx';
const CREDIT_SETTINGS = 'apps/web/src/modules/organization/settings/sections/CustomerSection.tsx';
const MANAGER_PIN = 'apps/web/src/core/security/ManagerPin.tsx';

const articles: HelpArticle[] = [
  {
    slug: 'add-a-customer',
    title: 'How to add a customer',
    summary:
      'Add a customer in Nafaa from the Customers page or straight from the POS counter. Only the name is required; a phone number lets you send bills and udhaar reminders on WhatsApp. This article covers the quick add, the full form and the counter shortcut.',
    seoDescription: 'Add a customer in Nafaa from the Customers page or the POS counter: name, phone, address, credit limit and CNIC, with duplicate phone checks.',
    focusKeyword: 'add customer nafaa',
    intro: [
      'Every udhaar sale, loyalty point and WhatsApp bill in Nafaa belongs to a customer record. You can create one in three places: the quick **Naya** (new) button on the Customers page, the full customer form, or the POS counter while you are making a bill.',
      '',
      'Only the name is required. Add the phone number whenever you can: Nafaa uses it to send the bill and udhaar reminders on WhatsApp, and to warn you when the same person is being added twice.',
    ].join('\n'),
    steps: {
      heading: 'Add a customer from the Customers page',
      items: [
        ['Open Customers', 'In the sidebar, open **Customers → Customers**. The page lists every customer with what they bought and what they owe.'],
        ['Quick add or full form', 'Click **Naya** for a short form with **Naam**, **Phone** and a **VIP customer** switch, then **Jor dein** (add). For all the details, click the person icon next to it to open the **Naya customer** page.'],
        ['Fill in the name and phone', 'On the full form, **Poora naam** (full name) is the only required field. Type the WhatsApp number in **Phone**. If the number already belongs to someone, the form shows that customer so you can open their khata instead of making a copy.'],
        ['Add the optional details', 'Fill what you need: **Email** for A4 bills, **Jins** (gender) so messages say bhai or baji correctly, the address under **Pata**, **CNIC** and **NTN** under **Pehchan**, a birthday for greetings, and an internal **Note**.'],
        ['Set the udhaar limit', 'Under **Udhaar**, type a limit in **Udhaar ki limit (Rs)** or leave it empty to use the shop’s default. See [credit limits](' + helpPath('khata-and-customers', 'credit-limit') + ').'],
        ['Save', 'Click **Customer jorein** or press **Ctrl + S**. Use **Save + naya** (**Ctrl + Shift + S**) when you are entering several customers in a row.'],
      ],
    },
    more: [
      helpShot('add-a-customer', 'The full customer form. Only the name is required; the phone number is used for WhatsApp bills and reminders.', {
        callouts: [
          { x: 41.6, y: 30.4, label: 'Poora naam (required)' },
          { x: 30.3, y: 40.8, label: 'WhatsApp number' },
          { x: 95, y: 36.5, label: 'Chalu customer switch' },
          { x: 91.6, y: 93.1, label: 'Customer jorein (Ctrl + S)' },
        ],
      }),
      helpShot('add-a-customer-2', 'Quick add from the Customers page: name, phone and VIP. The rest can be filled in later.', {
        callouts: [
          { x: 91.2, y: 12.2, label: 'Naya (quick add)' },
          { x: 50, y: 46.2, label: 'Naam' },
          { x: 50, y: 54, label: 'Phone' },
          { x: 59.8, y: 64.6, label: 'Jor dein' },
        ],
      }),
      tip(
        'At the counter, press **F2**, type the name or phone, and if nobody matches press **Enter** on the **naya customer** button. The person icon in the bill panel opens the same short form (**Naam**, **Phone**, **Add karein**). Fill in the rest later from the Customers page.',
        'Adding a customer while billing',
      ),
      note(
        'Turning off **Chalu customer** hides the customer from the POS but keeps their bills and khata. Deleting a customer who has sales or khata entries only closes the record; the old bills and khata stay as they were.',
        'Closing a customer',
      ),
    ],
    faqs: [
      ['Is a phone number required to add a customer?', 'No. Only the name is required. Without a phone number you cannot send the bill or an udhaar reminder on WhatsApp, and Nafaa cannot warn you about duplicates by number.'],
      ['What happens if I add the same customer twice?', 'When you type a phone number that already exists, the form shows the existing customer with a link to open them, so their khata stays in one place.'],
      ['Can I delete a customer who owes money?', 'A customer with sales or khata entries is not erased. Deleting closes the record, and the old bills and khata remain available.'],
    ],
    terms: ['khata', 'udhaar'],
    related: ['PRODUCT:khata', 'PAGE:udhaar-sale', 'PAGE:opening-balance', 'PAGE:credit-limit', 'PAGE:loyalty-points'],
    evidence: [CUSTOMERS, CUSTOMER_FORM, QUICK_ADD, PROFILE, POS_PICKER, POS_ADD, 'apps/web/src/app/App.tsx'],
  },
  {
    slug: 'opening-balance',
    title: 'How to add an opening balance (old khata)',
    summary:
      'Move udhaar from your paper register into Nafaa with Purana khata. The old amount is added to the customer’s khata without a bill, shows up in the total you are owed, and is collected like any other udhaar.',
    seoDescription: 'Carry over udhaar from your paper khata register into Nafaa: use Purana khata to add each customer’s old balance without a bill, with a note.',
    focusKeyword: 'opening balance khata',
    intro: [
      'Most shops start on Nafaa with an old udhaar register. You do not have to re-enter past bills. Enter what each customer owes today as an opening balance with **Purana khata** (old khata). Nafaa adds it to the customer’s khata, so it counts toward the total you are owed and can be collected with a normal payment.',
      '',
      'An opening balance is added to whatever the customer already owes in Nafaa. It never replaces or deletes existing entries.',
    ].join('\n'),
    steps: {
      heading: 'Add an old balance from the paper register',
      items: [
        ['Open the Khata page', 'In the sidebar, open **Customers → Khata (credit)**.'],
        ['Click Purana khata', 'Click **Purana khata** at the top. A list opens titled **Kis ka purana khata?** (whose old khata?).'],
        ['Pick the customer', 'Type the name or phone and pick the customer. If they are not in Nafaa yet, click **Naya customer banayein** (create new customer), add the name and phone, and the form opens for them.'],
        ['Enter the amount', 'Type the amount from your register, or tap one of the quick amounts. The box at the bottom shows **Abhi** (now) and **Is ke baad** (after) so you can check the new balance.'],
        ['Add a note', 'Write where the figure came from, for example the register page number. The note stays with the khata entry.'],
        ['Save', 'Click **Jor dein** (add). The customer now appears under **Udhaar wale** with the new balance.'],
      ],
    },
    more: [
      helpShot('opening-balance', 'Purana khata adds an old register balance to the customer’s khata and shows the balance before and after.', {
        callouts: [
          { x: 86.9, y: 12.3, label: 'Purana khata' },
          { x: 50, y: 43, label: 'Amount from the register' },
          { x: 50, y: 53.4, label: 'Note' },
          { x: 50, y: 60, label: 'Balance now and after' },
          { x: 59.8, y: 67.8, label: 'Jor dein' },
        ],
      }),
      tip(
        'You can also open a customer’s profile and click **Kaapi ka purana khata jorein** (add the old register balance) under their balance.',
        'From the customer profile',
      ),
      tip(
        'Enter the balances on a quiet day, one register page at a time, and tick each name on paper as you go. Our free [khata register template](/templates/khata-udhaar-register) has the same columns if you want a clean copy first.',
      ),
    ],
    faqs: [
      ['Does Purana khata create a sale?', 'No. It adds an amount to the customer’s khata without a bill, so it does not change your sales or profit reports.'],
      ['What if the customer already has udhaar in Nafaa?', 'The old balance is added to it. Nothing that is already in the khata is removed.'],
      ['Who can add an opening balance?', 'The **Purana khata** button is shown to staff who are allowed to manage the khata.'],
    ],
    terms: ['khata', 'udhaar', 'accounts-receivable'],
    related: ['PRODUCT:khata', 'PAGE:add-a-customer', 'PAGE:receive-a-payment', 'TEMPLATE:khata-udhaar-register', 'GUIDE:managing-udhaar-and-khata'],
    evidence: [KHATA, KHATA_ACTION, KHATA_TOOLS, PROFILE],
  },
  {
    slug: 'udhaar-sale',
    title: 'How to sell on udhaar (credit)',
    summary:
      'Make a credit sale at the Nafaa POS counter: pick the customer, then put the whole bill or the unpaid part in their khata. The customer’s old balance shows on the bill, and the credit limit is checked before the bill is saved.',
    seoDescription: 'Sell on udhaar at the Nafaa POS: choose the customer with F2, take part payment or put the full bill on credit, and keep the khata updated automatically.',
    focusKeyword: 'udhaar sale pos',
    intro: [
      'An udhaar sale is a normal bill where some or all of the money is added to the customer’s khata. Nafaa needs to know who the customer is, so a walk-in bill can never go on credit.',
      '',
      'Before you start, check that credit selling is on in **Settings → Credit & loyalty**: the **Udhaar par bechna** switch must show **Chalu** (on). When it is off, every bill must be paid in full.',
    ].join('\n'),
    steps: {
      heading: 'Put a bill on udhaar at the counter',
      items: [
        ['Add the items', 'Open **POS counter** and add the items as usual by scanning, searching or tapping.'],
        ['Choose the customer', 'Press **F2** (or click **Walk-in customer**) and type the name or phone. Each customer in the list shows their current udhaar. After you pick one, the bill panel shows **Pichhla udhaar** (previous udhaar) if they already owe money.'],
        ['Open checkout', 'Press **Ctrl + Enter** or click **Checkout** to see all payment options.'],
        ['Full bill on credit', 'Choose **Udhaar** (into the khata) and confirm with **Udhaar mein daalein**. In checkout, **F6** selects full udhaar. From the bill panel, **F8** then **5** does the same without opening checkout.'],
        ['Part payment', 'Choose **Kuch paisa** (part payment) and type what the customer paid. The button shows how much was received and how much goes to udhaar. Confirm it.'],
        ['Note who took the goods', 'If someone else is collecting the goods, such as a driver or a family member, write their name in the receiver field so the khata shows who took them.'],
      ],
    },
    more: [
      helpShot('udhaar-sale', 'Checkout with Udhaar selected: the customer’s previous udhaar is shown next to their name.', {
        callouts: [
          { x: 81, y: 15.4, label: 'Customer (F2)' },
          { x: 36.3, y: 31.3, label: 'Previous udhaar' },
          { x: 45.4, y: 42.2, label: 'Udhaar mode' },
          { x: 44.4, y: 63, label: 'Amount to khata' },
          { x: 50, y: 71.4, label: 'Udhaar mein daalein' },
        ],
      }),
      warn(
        'If the bill would take the customer over their credit limit, Nafaa asks for the owner’s or a manager’s PIN (**Malik ya manager ka PIN**). If no PIN is set up, the bill is stopped with a message. See [credit limits](' + helpPath('khata-and-customers', 'credit-limit') + ').',
        'Credit limit',
      ),
      tip(
        'To record udhaar without a bill, for example cash lent to a regular customer, use **Udhaar** on the Khata page or the **+** button on the customer’s row (**Udhaar chadhayein**).',
        'Udhaar without a bill',
      ),
    ],
    faqs: [
      ['Why is the Udhaar button greyed out?', 'Either no customer is selected on the bill (press **F2** to pick one) or credit selling is switched off in **Settings → Credit & loyalty**.'],
      ['Can a customer pay part now and the rest later?', 'Yes. Choose **Kuch paisa**, type what they paid, and the rest goes to their khata. Record later payments from the Khata page.'],
      ['What if the customer pays more than the bill?', 'When a customer is selected and gives more than the total, checkout offers to keep the change in their khata as an advance instead of handing it back.'],
    ],
    terms: ['udhaar', 'khata', 'pos'],
    related: ['PRODUCT:khata', 'PRODUCT:pos', 'PAGE:make-a-bill', 'PAGE:receive-a-payment', 'PAGE:credit-limit'],
    evidence: [POS_PICKER, POS_CART, POS_CHECKOUT, POS_ENGINE, POS_SHORTCUTS, CREDIT_SETTINGS, MANAGER_PIN, KHATA],
  },
  {
    slug: 'receive-a-payment',
    title: 'How to receive a khata payment',
    summary:
      'Record money a customer pays against their udhaar. Pick the customer on the Khata page, enter the amount and how it was paid, and Nafaa lowers the balance, counts cash in the drawer and settles the oldest udhaar first.',
    seoDescription: 'Record a khata payment in Nafaa: enter the amount, choose cash, JazzCash, Easypaisa, card or bank, and the customer’s udhaar balance updates.',
    focusKeyword: 'receive khata payment',
    intro: [
      'When a customer pays back udhaar, record it as a payment in their khata. You do not need to make a bill. Nafaa lowers the balance, shows the payment on the customer’s statement and counts it in the day’s money.',
      '',
      'Payments settle the oldest udhaar first. That is why the khata age (how many days the oldest amount has been due) drops as soon as an old amount is paid off.',
    ].join('\n'),
    steps: {
      heading: 'Record a payment from the Khata page',
      items: [
        ['Open the Khata page', 'In the sidebar, open **Customers → Khata (credit)**. The **Udhaar wale** list shows everyone who owes money, largest balance first.'],
        ['Click Payment', 'Find the customer by name or phone and click the green **Payment** button on their row. The form opens with the full balance already filled in.'],
        ['Enter the amount', 'Keep the full amount, tap a quick amount, or type what the customer actually paid. Nafaa will not accept more than the balance.'],
        ['Choose how it was paid', 'Under **Kaise mile** (how received), pick **Cash**, **JazzCash**, **Easypaisa**, **Card** or **Bank**. Only cash is counted in the galla; other methods go to their own account.'],
        ['Add a note', 'For wallet or bank payments, write the transaction ID in the note.'],
        ['Save', 'Check **Abhi** and **Is ke baad** (balance now and after), then click **Receive karein**.'],
      ],
    },
    more: [
      helpShot('receive-a-payment', 'The payment form: amount, how the money came in, and the balance before and after.', {
        callouts: [
          { x: 50, y: 38.4, label: 'Amount (full balance filled in)' },
          { x: 50, y: 51, label: 'Kaise mile' },
          { x: 50, y: 62.4, label: 'Balance now and after' },
          { x: 58.4, y: 70.5, label: 'Receive karein' },
        ],
      }),
      tip(
        'On a customer’s profile, the **Payment** button under their balance opens the same form, and **Statement** prints their full khata for them.',
        'From the customer profile',
      ),
      note(
        'Cash payments appear in **Cash register** as **Khata receiving** in the expected galla amount, so your cash closing matches. See [cash closing](' + helpPath('reports-and-cash', 'cash-closing') + ').',
      ),
    ],
    faqs: [
      ['Can I record a payment larger than the udhaar?', 'No. The payment form stops at the current balance. To keep extra money as an advance, take it at the counter: when the customer is on the bill, checkout can keep the change in their khata.'],
      ['Does a JazzCash or bank payment go into the cash drawer?', 'No. Only **Cash** is counted in the galla. Other methods are recorded under their own payment method.'],
    ],
    terms: ['khata', 'udhaar', 'accounts-receivable', 'cash-drawer'],
    related: ['PRODUCT:khata', 'PRODUCT:payments', 'PAGE:whatsapp-reminders', 'PAGE:udhaar-sale', 'PAGE:cash-closing', 'TOOL:khata-ageing-calculator'],
    evidence: [KHATA, KHATA_ACTION, PROFILE, 'apps/web/src/modules/pos/lib/posCart.ts', 'apps/web/src/modules/finance/cash-register/pages/CashRegisterPage.tsx'],
  },
  {
    slug: 'whatsapp-reminders',
    title: 'How to send udhaar reminders on WhatsApp',
    summary:
      'Remind customers about their udhaar on WhatsApp from the Khata page. Nafaa writes the message with the name, amount and days due, picks a polite, firm or final tone by age, and opens WhatsApp so you only press Send.',
    seoDescription: 'Send udhaar reminders on WhatsApp from Nafaa: the message is written with the amount and days due, one customer at a time, with no API fees.',
    focusKeyword: 'udhaar reminder whatsapp',
    intro: [
      'Nafaa prepares udhaar reminders for you but does not send them on its own. When you send one, WhatsApp opens on your phone or computer with the message already written, and you press **Send**. There is no API to connect and no fee.',
      '',
      'Reminders need the customer’s phone number. Customers without a number are skipped.',
    ].join('\n'),
    steps: {
      heading: 'Send reminders to everyone who owes',
      items: [
        ['Open the Khata page', 'In the sidebar, open **Customers → Khata (credit)**. Use the filters first if you only want some customers, for example the 30–90 day box.'],
        ['Start Yaad-dihani', 'Click **Yaad-dihani** (reminders) at the top, or press **N**. Nafaa goes through the list one customer at a time, showing the name, the amount and how many days it has been due.'],
        ['Check the tone', 'Nafaa picks **Narm** (polite) for recent udhaar, **Sakht** (firm) after 7 days and **Aakhri** (final) after 30 days. Click another tone to change it.'],
        ['Pick the greeting', 'Choose how to address the customer: **Khud** (automatic), **Bhai**, **Baji**, **Uncle**, **Aunty**, **Sahib** or **Kuch nahi** (none). You can also edit the text directly.'],
        ['Send or skip', 'Click **WhatsApp par bhejein** to open WhatsApp with the message, then press Send there. Click **Chhor dein** (skip) to move to the next customer.'],
      ],
    },
    more: [
      helpShot('whatsapp-reminders', 'Yaad-dihani goes through each customer who owes money, with the tone chosen by how old the udhaar is.', {
        callouts: [
          { x: 50, y: 37, label: 'Tone' },
          { x: 43, y: 42.3, label: 'Greeting' },
          { x: 50, y: 56.5, label: 'Message (editable)' },
          { x: 51.3, y: 73.5, label: 'Chhor dein' },
          { x: 62.9, y: 73.5, label: 'WhatsApp par bhejein' },
        ],
      }),
      tip(
        'For a single customer, click the WhatsApp icon on their row in the Khata list, or **Yaad dilayein** (remind) on their card on the Customers page.',
        'One customer at a time',
      ),
      tip(
        'Click the settings icon on the Khata page to open **Yaad-dihani ke messages** and write each tone in your own words. **{name}**, **{sal}**, **{amount}**, **{days}** and **{shop}** are filled in for each customer. **Pehle jaisa** restores the original text. The wording is saved on the device you edit it on.',
        'Change the message wording',
      ),
    ],
    faqs: [
      ['Does Nafaa send reminders automatically?', 'No. Nafaa writes the message and opens WhatsApp; the message goes only when you press Send.'],
      ['Do I need the WhatsApp Business API?', 'No. Reminders open the normal WhatsApp or WhatsApp Business app on your phone or computer.'],
      ['Why is a customer missing from the reminder list?', 'The list includes only customers who owe money and have a phone number. Add the number on their profile and start again.'],
    ],
    terms: ['udhaar', 'khata'],
    related: ['PRODUCT:whatsapp-sms', 'PRODUCT:khata', 'PAGE:receive-a-payment', 'PAGE:credit-limit', 'GUIDE:managing-udhaar-and-khata'],
    evidence: [KHATA, KHATA_TOOLS, MESSAGES, 'apps/web/src/modules/customers/directory/components/CustomerCard.tsx', 'apps/web/src/modules/organization/settings/sections/WhatsappSection.tsx'],
    needsOwner: [
      'Settings → WhatsApp messages also has an "Udhaar ki yaad dihani" template, but the Khata reminders use their own Narm/Sakht/Aakhri wording (KhataTools, stored in the browser). The article describes the Khata wording only; confirm whether the two should be merged.',
    ],
  },
  {
    slug: 'credit-limit',
    title: 'How to set a credit limit',
    summary:
      'Set how much udhaar a customer can take. Nafaa has a default limit for new customers and a limit on each customer, checks it at the counter before a credit bill is saved, and lists everyone who has gone over it.',
    seoDescription: 'Set credit limits in Nafaa: a default udhaar limit for new customers, a limit per customer, a PIN check at the counter and a list of who is over.',
    focusKeyword: 'credit limit udhaar',
    intro: [
      'A credit limit stops a customer’s udhaar from growing past an amount you choose. Nafaa checks it at the counter: if a bill would take the customer over the limit, the cashier needs the owner’s or a manager’s PIN to continue.',
      '',
      'There are two settings. The shop default applies to customers when they are created. Each customer’s own limit can then be raised, lowered or removed.',
    ].join('\n'),
    steps: {
      heading: 'Set the default and per-customer limits',
      items: [
        ['Open the credit settings', 'Go to **Settings → Stock & customers → Credit & loyalty**. Under **Udhaar**, make sure **Udhaar par bechna** is on.'],
        ['Set the default for new customers', 'Type an amount in **Naye customer ki credit limit**. **0** means no limit. The change saves by itself.'],
        ['Open a customer', 'To change one customer, open **Customers → Customers**, find them and click the pencil icon (**Badlein**).'],
        ['Set their limit', 'Under **Udhaar**, type the amount in **Udhaar ki limit (Rs)**, tap one of the quick amounts, or click **Koi had nahi** (no limit). On a new customer, leaving it empty uses the shop default.'],
        ['Save', 'Click **Save karein** or press **Ctrl + S**.'],
      ],
    },
    more: [
      helpShot('credit-limit', 'Settings → Credit & loyalty: credit selling on, and the default limit for new customers.', {
        callouts: [
          { x: 94.6, y: 29, label: 'Udhaar par bechna' },
          { x: 29.8, y: 39.5, label: 'Default limit (0 = none)' },
        ],
      }),
      helpShot('credit-limit-2', 'The Udhaar card on the customer form: a limit for this customer, quick amounts and Koi had nahi.', {
        callouts: [
          { x: 41.6, y: 74.6, label: 'Udhaar ki limit (Rs)' },
          { x: 37, y: 81.2, label: 'Quick amounts' },
          { x: 52, y: 81.2, label: 'Koi had nahi' },
        ],
      }),
      note(
        'At the counter, a credit bill over the limit asks for **Malik ya manager ka PIN**. If no PIN is set in **Settings → Users → Security & PIN**, the bill is stopped with a message naming the customer’s limit.',
        'What happens at the counter',
      ),
      tip(
        'On the Khata page, the **Had se zyada** (over the limit) filter lists every customer above their limit, and their rows carry a **Had paar** badge. A customer’s profile shows how much of the limit is used.',
        'Find customers over the limit',
      ),
    ],
    faqs: [
      ['Does changing the default limit change existing customers?', 'No. The default is applied when a customer is created. Change existing customers one by one on their form.'],
      ['Can a cashier go over the limit?', 'Only with the owner’s or a manager’s PIN. Without a PIN set up, the bill cannot go over the limit.'],
      ['What does a limit of 0 mean?', 'No limit. The customer can take any amount of udhaar.'],
    ],
    terms: ['udhaar', 'khata', 'accounts-receivable'],
    related: ['PRODUCT:khata', 'PAGE:udhaar-sale', 'PAGE:add-a-customer', 'PAGE:whatsapp-reminders', 'GUIDE:managing-udhaar-and-khata'],
    evidence: [CREDIT_SETTINGS, CUSTOMER_FORM, POS_ENGINE, MANAGER_PIN, KHATA, PROFILE],
  },
];

export default articles;
