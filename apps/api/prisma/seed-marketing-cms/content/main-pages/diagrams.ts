/**
 * Code-drawn diagrams for the main pages, keyed by entry ("TYPE:slug").
 * page() in _build.ts weaves them into the page body between the other
 * sections, so every product, solution, service and hub page shows how the
 * work actually moves through Nafaa next to its real screenshots.
 *
 * Kinds: the generic `flow` and `hub` (laid out by the site, with moving
 * packets when `animate` is on) and the bespoke kinds in
 * apps/site/src/components/diagrams/bespoke. Every step shown here exists in
 * the app (see the evidence lists on the pages). Tax steps only appear on the
 * tax pages (FBR product page, FBR setup service).
 */

import type { DraftBlock, IconName } from '../../../../src/admin-marketing/cms/contract/cms-contract';

type Block = Omit<DraftBlock, 'id'>;
type Node = [id: string, label: string, icon: IconName, note?: string];
type Edge = [from: string, to: string, label?: string];

/** A flow diagram; without edges the nodes are chained in order. */
function flow(nodes: Node[], edges?: Edge[]) {
  const chain: Edge[] = nodes.slice(1).map((n, i) => [nodes[i]![0], n[0]]);
  return {
    kind: 'flow',
    nodes: nodes.map(([id, label, icon, note]) => ({ id, label, icon, ...(note ? { note } : {}) })),
    edges: (edges ?? chain).map(([from, to, label]) => ({ from, to, ...(label ? { label } : {}) })),
    animate: true,
  };
}

function hub(center: [string, IconName], spokes: [string, IconName, string?][]) {
  return {
    kind: 'hub',
    center: { label: center[0], icon: center[1] },
    spokes: spokes.map(([label, icon, href]) => ({ label, icon, ...(href ? { href } : {}) })),
    animate: true,
  };
}

function bespoke(kind: string, labels?: Record<string, string>) {
  return { kind, animate: true, ...(labels ? { labels } : {}) };
}

function block(heading: string, caption: string, spec: Record<string, unknown>, theme?: 'muted'): Block {
  return { type: 'diagram', heading, caption, diagram: spec, ...(theme ? { theme } : {}) } as Block;
}

// ─── Shared diagrams ───

const SALE_FLOW = block(
  'From one sale to every report',
  'A sale at the counter takes payment, moves stock and the khata, and lands in the reports without anyone typing it twice.',
  flow([
    ['bill', 'Scan and bill', 'scan-barcode', 'Barcode, quick key or search'],
    ['pay', 'Take payment', 'wallet', 'Cash, card, wallet or khata'],
    ['stock', 'Stock and khata update', 'boxes', 'In the unit you sold'],
    ['reports', 'Reports and profit', 'chart-column', 'Live on the dashboard'],
  ]),
);

const OFFLINE = block('Billing never stops', 'When the internet drops, bills are saved on the device and sent on their own when it returns.', bespoke('offline-sync'), 'muted');

const STORE_SYNC = block('One stock for the shop, the website and the marketplace', 'Orders from every channel come into Nafaa; stock changes flow back out to each channel.', bespoke('store-sync'), 'muted');

const MULTI_BRANCH = block('Every branch, one dashboard', 'Each branch bills and stocks on its own; head office sees all of them live and moves stock between them.', bespoke('multi-branch'), 'muted');

const KHATA_CYCLE = block('How udhaar comes back', 'Credit sales land on the customer\'s khata, reminders go out on WhatsApp and payments close the loop.', bespoke('khata-cycle'), 'muted');

const API_WEBHOOKS = block('Connect your own systems', 'Your systems call the Nafaa API; Nafaa sends signed webhooks when sales, stock or orders change.', bespoke('api-webhooks'), 'muted');

const ECOMMERCE_FLOW = block(
  'From the click to the doorstep',
  'Website, Shopify, Daraz and Nafaa Bazaar orders arrive in one list, are packed from the shop\'s own stock and handed to the courier.',
  flow([
    ['orders', 'Online orders', 'shopping-bag', 'Website, Shopify, Daraz, Bazaar'],
    ['nafaa', 'Into Nafaa', 'layers', 'Next to the counter sales'],
    ['pack', 'Pack from stock', 'package-check', 'The same shelf as the shop'],
    ['courier', 'Book courier', 'truck', 'Label and tracking'],
    ['done', 'Delivered and paid', 'circle-check', 'COD settled, stock synced'],
  ]),
);

const RESTAURANT_FLOW = block(
  'From the table to the bill',
  'An order taken at the table becomes a kitchen ticket for the right station, comes back ready and closes as one bill.',
  flow([
    ['table', 'Table order', 'utensils-crossed', 'Waiter or counter'],
    ['kot', 'KOT', 'receipt-text', 'Sent to each station'],
    ['kitchen', 'Kitchen', 'chef-hat', 'New, cooking, ready'],
    ['serve', 'Served', 'bell-ring', 'Running bill updates'],
    ['bill', 'Bill and pay', 'wallet', 'Split or one bill'],
  ]),
);

const MANUFACTURING_FLOW = block(
  'Raw material to sale',
  'Raw material comes in on a purchase bill, production turns it into finished stock and the sale shows the real profit.',
  flow([
    ['raw', 'Raw material', 'package', 'Bought on purchase bills'],
    ['recipe', 'Recipe and cost', 'calculator', 'Cost per finished item'],
    ['produce', 'Production', 'factory', 'Daily production plan'],
    ['stock', 'Finished stock', 'boxes', 'By godown or branch'],
    ['sale', 'Sale', 'scan-barcode', 'Counter, trade or online'],
  ]),
);

const WHOLESALE_FLOW = block(
  'Trade order to recovery',
  'Trade orders are entered, dispatched from the godown, invoiced to the shopkeeper\'s khata and recovered on the next visit.',
  flow([
    ['book', 'Trade order', 'clipboard-list', 'At the counter or by phone'],
    ['godown', 'Godown', 'warehouse', 'Picked from stock'],
    ['dispatch', 'Dispatch', 'truck', 'With an A4 invoice'],
    ['khata', 'Trade khata', 'notebook-pen', 'Balance per shopkeeper'],
    ['recover', 'Recovery', 'hand-coins', 'Payment clears the balance'],
  ]),
);

const PURCHASE_FLOW = block(
  'From supplier to shelf',
  'A purchase bill brings stock in at its real cost and puts what you owe on the supplier\'s account.',
  flow(
    [
      ['supplier', 'Supplier', 'handshake', 'Contact and balance'],
      ['bill', 'Purchase bill', 'file-text', 'Items, units and cost'],
      ['stock', 'Stock in', 'boxes', 'At the new cost'],
      ['payable', 'Supplier balance', 'notebook-pen', 'What you owe'],
      ['pay', 'Payment', 'banknote', 'Clears the balance'],
    ],
    [
      ['supplier', 'bill'],
      ['bill', 'stock'],
      ['bill', 'payable'],
      ['payable', 'pay'],
    ],
  ),
);

const TRANSFER_FLOW = block(
  'Move stock where it sells',
  'A transfer leaves one branch and is received at the other, so both stock counts stay right and nothing goes missing on the way.',
  flow([
    ['request', 'Branch asks', 'clipboard-list', 'Low on stock'],
    ['send', 'Transfer out', 'arrow-left-right', 'From the branch that has it'],
    ['road', 'On the way', 'truck', 'Tracked as in transit'],
    ['receive', 'Received', 'package-check', 'Checked at the other end'],
    ['both', 'Both stocks right', 'circle-check', 'Visible at head office'],
  ]),
);

const PAYMENTS_HUB = block(
  'Every way Pakistan pays, in one bill',
  'One bill can be split across any of these, and each part lands in the right place: the drawer, the wallet total or the khata.',
  hub(['One bill', 'receipt'], [
    ['Cash', 'banknote'],
    ['Card', 'credit-card'],
    ['JazzCash', 'smartphone'],
    ['Easypaisa', 'wallet'],
    ['Bank transfer', 'landmark'],
    ['Khata', 'notebook-pen', '/product/khata'],
  ]),
);

const QUOTE_FLOW = block(
  'Quote, build, launch',
  'Every project starts with a short form and ends with software your team uses every day.',
  flow([
    ['quote', 'Quote lein', 'message-square', 'A rough idea is enough'],
    ['scope', 'Written scope', 'file-text', 'Screens, data, stages'],
    ['price', 'Fixed price', 'handshake', 'In PKR or USD'],
    ['build', 'Build in stages', 'code-xml', 'Working software each stage'],
    ['launch', 'Launch and support', 'rocket', 'Training included'],
  ]),
  'muted',
);

// ─── Per page ───

export const PAGE_DIAGRAMS: Record<string, Block[]> = {
  // Products
  'PRODUCT:pos': [
    SALE_FLOW,
    block(
      'A whole sale from the keyboard',
      'Fast hands never touch the mouse: the search box takes quantities and phone numbers, and the F keys open each step of the bill.',
      flow([
        ['find', 'Type or scan', 'scan-barcode', '3*rice adds three'],
        ['customer', 'F2 customer', 'user-check', 'Or type the phone number'],
        ['lines', 'F3 bill lines', 'list', 'Qty, rate, note, delete'],
        ['pay', 'F8 payment', 'wallet', 'Keys 1 to 6 pick the method'],
        ['done', 'F12 cash and print', 'printer', 'Bill saved, receipt out'],
      ]),
      'muted',
    ),
    OFFLINE,
  ],
  'PRODUCT:inventory': [
    PURCHASE_FLOW,
    block(
      'From an Excel sheet to live stock',
      'Columns are matched for you, every line is checked before anything is saved, and failed lines come back to fix and import again.',
      flow([
        ['file', 'File or paste', 'file-spreadsheet', 'Excel, CSV or copied cells'],
        ['columns', 'Columns matched', 'table', 'English, Roman Urdu or Urdu headers'],
        ['sheet', 'Checked in a sheet', 'list-checks', 'Errors shown in their cells'],
        ['import', 'Import', 'upload', 'In chunks, with pause and resume'],
        ['stock', 'Live stock', 'boxes', 'Counter, reports and channels'],
      ]),
    ),
    STORE_SYNC,
  ],
  'PRODUCT:khata': [
    KHATA_CYCLE,
    block(
      'From udhaar to paid',
      'A credit sale goes on the khata, the reminder goes out on WhatsApp and the payment, in cash or wallet, clears it.',
      flow([
        ['sale', 'Credit sale', 'scan-barcode', 'At the counter'],
        ['balance', 'Khata balance', 'notebook-pen', 'Per customer, with limit'],
        ['remind', 'WhatsApp reminder', 'message-circle', 'With the amount due'],
        ['pay', 'Payment', 'hand-coins', 'Cash, JazzCash, Easypaisa'],
        ['statement', 'Statement', 'file-text', 'Shared on WhatsApp'],
      ]),
    ),
  ],
  'PRODUCT:fbr': [
    block('How a tax invoice is made', 'The sale is reported in the background; the fiscal number and QR code print on the receipt.', bespoke('fbr-invoice'), 'muted'),
    block(
      'If the tax server is slow',
      'Invoices that cannot be sent wait in a queue and go out on their own, so the counter never waits.',
      flow([
        ['sale', 'Sale', 'scan-barcode'],
        ['queue', 'Invoice queued', 'clock', 'When the server is slow'],
        ['retry', 'Sent again', 'refresh-cw', 'Automatically'],
        ['number', 'Fiscal number', 'receipt-text', 'Saved on the bill'],
      ]),
    ),
  ],
  'PRODUCT:online-store': [STORE_SYNC, ECOMMERCE_FLOW],
  'PRODUCT:multi-shop': [MULTI_BRANCH, TRANSFER_FLOW],
  'PRODUCT:reports': [
    block(
      'Every report from the same data',
      'Reports read the same sales, stock and khata the counter writes, so they always agree with each other.',
      hub(['Your sales data', 'database'], [
        ['Today\'s sale', 'gauge'],
        ['Profit by product', 'chart-bar'],
        ['Profit and loss', 'chart-line'],
        ['Stock value', 'boxes'],
        ['Staff sales', 'users'],
        ['Customers', 'contact'],
        ['Day book', 'book-open'],
      ]),
      'muted',
    ),
    SALE_FLOW,
  ],
  'PRODUCT:payments': [
    PAYMENTS_HUB,
    block(
      'Paid before it ships',
      'For online and phone orders, send a payment link and dispatch once the money is in.',
      flow([
        ['order', 'Order', 'shopping-bag'],
        ['link', 'Payment link', 'link', 'JazzCash or Easypaisa'],
        ['paid', 'Customer pays', 'smartphone'],
        ['marked', 'Marked paid', 'circle-check', 'On the order'],
        ['ship', 'Dispatch', 'truck'],
      ]),
    ),
    block(
      'A galla that balances every night',
      'Each shift opens with a float, records every rupee taken out or put in, and closes with a note-by-note count against what Nafaa expects.',
      flow([
        ['open', 'Open the shift', 'banknote', 'Opening float'],
        ['sell', 'Cash sales', 'scan-barcode', 'Counted automatically'],
        ['inout', 'Cash in and out', 'arrow-left-right', 'Expenses, change, safe'],
        ['count', 'Close with a count', 'calculator', 'Note by note'],
        ['report', 'Short or over', 'file-text', 'On the X/Z report'],
      ]),
      'muted',
    ),
  ],
  'PRODUCT:offline-pos': [
    OFFLINE,
    block(
      'What happens when the internet drops',
      'Nothing at the counter changes; the sync happens in the background when the connection is back.',
      flow([
        ['drop', 'Internet drops', 'wifi-off'],
        ['save', 'Bills saved on device', 'smartphone', 'Receipts still print'],
        ['back', 'Connection returns', 'wifi'],
        ['sync', 'Sync', 'refresh-cw', 'In the background'],
        ['reports', 'Reports up to date', 'chart-column'],
      ]),
    ),
  ],
  'PRODUCT:purchasing': [
    PURCHASE_FLOW,
    block(
      'From the low-stock list to the shelf',
      'The reorder list groups what is running out by supplier and branch; each card becomes a purchase order, and stock moves only when the goods are received.',
      flow([
        ['low', 'Running low', 'triangle-alert', 'Days of stock left'],
        ['reorder', 'Reorder list', 'clipboard-list', 'One card per supplier'],
        ['order', 'Purchase order', 'send', 'Or a WhatsApp message'],
        ['receive', 'Received', 'package-check', 'All or part'],
        ['shelf', 'Stock and cost', 'boxes', 'Average cost updated'],
      ]),
      'muted',
    ),
  ],
  'PRODUCT:staff': [
    block(
      'Everything about your team in one place',
      'Roles decide what each person sees; attendance, commission and payroll sit next to the sales they make.',
      hub(['Your team', 'users'], [
        ['Roles and permissions', 'user-cog'],
        ['Manager PIN', 'key-round'],
        ['Activity log', 'activity'],
        ['Attendance', 'calendar-check'],
        ['Commission', 'percent'],
        ['Payroll', 'banknote'],
      ]),
      'muted',
    ),
    block(
      'Trust the counter when you are away',
      'Sensitive actions need the manager PIN and every one of them is logged with a name and a time.',
      flow([
        ['login', 'Staff sign in', 'user-check', 'Their own login'],
        ['role', 'Role decides screens', 'user-cog'],
        ['pin', 'Manager PIN', 'key-round', 'Refunds, big discounts'],
        ['log', 'Activity log', 'activity', 'Name and time'],
        ['owner', 'Owner reviews', 'eye', 'From anywhere'],
      ]),
    ),
  ],
  'PRODUCT:whatsapp-sms': [
    block(
      'Receipts and reminders on WhatsApp',
      'Bills go to the customer\'s WhatsApp at checkout, and khata reminders go out with the amount due.',
      flow(
        [
          ['bill', 'Bill at counter', 'receipt'],
          ['receipt', 'WhatsApp receipt', 'message-circle', 'Instead of paper'],
          ['due', 'Khata due', 'notebook-pen'],
          ['remind', 'Reminder', 'bell-ring', 'With the amount'],
          ['paid', 'Payment', 'hand-coins'],
        ],
        [
          ['bill', 'receipt'],
          ['bill', 'due'],
          ['due', 'remind'],
          ['remind', 'paid'],
        ],
      ),
    ),
    KHATA_CYCLE,
  ],
  'PRODUCT:loyalty': [
    block(
      'Bring customers back',
      'Every sale to a known customer earns points, member levels show who your regulars are, and points come off a later bill at the counter.',
      flow([
        ['sale', 'Sale', 'scan-barcode', 'Customer picked on the bill'],
        ['points', 'Points earned', 'star', 'At your rate per rupee'],
        ['tier', 'Member level', 'award', 'Starter up to Diamond'],
        ['back', 'Next visit', 'repeat', 'Or a WhatsApp nudge'],
        ['redeem', 'Redeem at counter', 'gift', 'Within your limits'],
      ]),
    ),
    block(
      'Every way to give a customer something back',
      'Points, discount codes, deals and messages all run from the same customer record, so the counter applies them and the reports count them.',
      hub(['Your customer', 'users'], [
        ['Loyalty points', 'star'],
        ['Member levels', 'award'],
        ['Discount codes', 'ticket'],
        ['Combos and deals', 'gift'],
        ['Birthday wishes', 'message-circle'],
        ['Points expiry', 'calendar-clock'],
      ]),
      'muted',
    ),
  ],

  // Solutions
  'SOLUTION:single-shop': [SALE_FLOW, OFFLINE],
  'SOLUTION:retail-chains': [
    TRANSFER_FLOW,
    block(
      'How every branch closes its day',
      'Each branch counts its own drawer and closes its own day book; head office reads them side by side the same evening.',
      flow([
        ['open', 'Open shift', 'banknote', 'Float counted per branch'],
        ['sell', 'Sell all day', 'scan-barcode', 'Bills, returns, khata'],
        ['count', 'Close with a count', 'calculator', 'Short or over recorded'],
        ['daybook', 'Branch day book', 'book-open', 'Thermal Z or A4'],
        ['hq', 'Head office', 'building-2', 'All branches compared'],
      ]),
      'muted',
    ),
  ],
  'SOLUTION:ecommerce': [
    ECOMMERCE_FLOW,
    block(
      'Where the COD money is',
      'Every COD parcel is followed from booking until the courier pays in, and returned parcels are kept apart so the numbers stay honest.',
      flow(
        [
          ['book', 'Courier booked', 'truck'],
          ['road', 'On the road', 'map-pin'],
          ['collected', 'Collected by courier', 'hand-coins', 'Not yet paid to you'],
          ['settled', 'Settled', 'banknote', 'Marked from the settlement sheet'],
          ['rto', 'Returned (RTO)', 'rotate-ccw', 'Counted per courier'],
        ],
        [
          ['book', 'road'],
          ['road', 'collected', 'Delivered'],
          ['collected', 'settled'],
          ['road', 'rto', 'Refused'],
        ],
      ),
      'muted',
    ),
  ],
  'SOLUTION:restaurants': [
    RESTAURANT_FLOW,
    block(
      'Every order source, one kitchen',
      'Dine-in, takeaway, your own delivery and Foodpanda orders all reach the same kitchen screen.',
      hub(['Kitchen', 'chef-hat'], [
        ['Dine-in', 'utensils-crossed'],
        ['Takeaway', 'shopping-bag'],
        ['Delivery riders', 'bike'],
        ['Foodpanda', 'smartphone'],
        ['Counter', 'scan-barcode'],
      ]),
      'muted',
    ),
  ],
  'SOLUTION:wholesale-distribution': [WHOLESALE_FLOW],
  'SOLUTION:manufacturing': [
    MANUFACTURING_FLOW,
    block(
      'Know the real cost of every item',
      'When a raw material price changes, the recipe cost and the profit on each item change with it.',
      flow([
        ['price', 'Ingredient price', 'tag', 'From the last purchase'],
        ['recipe', 'Recipe cost', 'calculator'],
        ['selling', 'Selling price', 'badge-percent'],
        ['profit', 'Profit per item', 'trending-up'],
      ]),
      'muted',
    ),
  ],
  'SOLUTION:enterprise': [MULTI_BRANCH, API_WEBHOOKS],

  // Services
  'SERVICE:custom-software': [QUOTE_FLOW],
  'SERVICE:websites': [
    block(
      'How we build your website',
      'From your content to a fast, findable site, in stages you can see.',
      flow([
        ['content', 'Pages and content', 'file-text'],
        ['design', 'Design', 'palette'],
        ['build', 'Build', 'code-xml', 'Next.js'],
        ['seo', 'Speed and SEO', 'gauge'],
        ['launch', 'Launch', 'rocket'],
      ]),
    ),
  ],
  'SERVICE:online-store-setup': [
    block(
      'Your store, live and connected',
      'We set up the store and connect it to Nafaa, so online orders use the same stock as the shop.',
      flow([
        ['import', 'Products in', 'upload', 'From Nafaa or Excel'],
        ['design', 'Store design', 'palette'],
        ['pay', 'Payments and couriers', 'truck'],
        ['orders', 'Orders into Nafaa', 'layers'],
        ['launch', 'Launch', 'rocket'],
      ]),
    ),
    STORE_SYNC,
  ],
  'SERVICE:mobile-apps': [
    block(
      'From idea to the app stores',
      'One codebase for Android and iOS, built in stages and published with you.',
      flow([
        ['idea', 'Idea', 'lightbulb'],
        ['screens', 'Screens', 'smartphone', 'Designed with you'],
        ['build', 'Build', 'code-xml', 'Android and iOS'],
        ['store', 'Store release', 'upload'],
        ['update', 'Updates', 'refresh-cw'],
      ]),
    ),
  ],
  'SERVICE:data-migration': [
    block(
      'Moving your data in',
      'Your old system or Excel sheets are cleaned, matched and imported, then balances are checked with you before go-live.',
      flow([
        ['old', 'Old system or Excel', 'file-spreadsheet'],
        ['clean', 'Clean and match', 'list-checks'],
        ['import', 'Import', 'upload'],
        ['check', 'Check balances', 'clipboard-check', 'Stock and khata'],
        ['live', 'Go live', 'rocket'],
      ]),
    ),
  ],
  'SERVICE:fbr-integration-setup': [block('How a tax invoice is made', 'The sale is reported in the background; the fiscal number and QR code print on the receipt.', bespoke('fbr-invoice'), 'muted')],
  'SERVICE:hardware': [
    block(
      'A complete counter',
      'Nafaa works with the hardware you can buy at any market; none of it is required to start.',
      hub(['Your counter', 'monitor'], [
        ['Barcode scanner', 'scan-line'],
        ['Receipt printer', 'printer'],
        ['Cash drawer', 'banknote'],
        ['Barcode labels', 'barcode'],
        ['Weighing scale', 'gauge'],
        ['Customer display', 'monitor'],
        ['Tablet or phone', 'tablet'],
      ]),
      'muted',
    ),
  ],
  'SERVICE:training': [
    block(
      'Training that sticks',
      'Each person learns the screens of their own job, then we follow up on WhatsApp.',
      flow([
        ['owner', 'Owner setup', 'user-cog'],
        ['cashier', 'Cashiers', 'scan-barcode'],
        ['stock', 'Stock team', 'boxes'],
        ['reports', 'Reports for owner', 'chart-column'],
        ['follow', 'Follow-up', 'message-circle'],
      ]),
    ),
  ],

  // Pages
  'PAGE:pricing': [
    block(
      'How the 7 din Free Trial works',
      'Start free, set up your shop, then choose a plan. You can move to a bigger plan whenever you grow.',
      { kind: 'timeline', animate: true, items: [
        { date: 'Day 1', label: 'Start free', note: 'No card needed' },
        { date: 'Days 1 to 7', label: 'Set up and sell', note: 'Products, staff, first bills' },
        { date: 'Day 7', label: 'Pick a plan', note: 'Monthly, quarterly or yearly' },
        { date: 'Later', label: 'Grow', note: 'Bigger plan when you add shops' },
      ] },
      'muted',
    ),
    block(
      'Choose with your own numbers',
      'Bill for real during the trial, then read your usage against each plan limit before you choose.',
      flow([
        ['products', 'Add your products', 'boxes'],
        ['team', 'Add your team', 'users'],
        ['bill', 'Bill for a few days', 'receipt'],
        ['usage', 'Check usage', 'gauge', 'Products, users, shops, sales'],
        ['plan', 'Pick the plan that fits', 'circle-check'],
      ]),
    ),
  ],
  'PAGE:marketplace': [
    STORE_SYNC,
    block(
      'How a marketplace order flows',
      'Buyers find your shop on Nafaa Bazaar; the order lands in the same app as your counter sales.',
      flow([
        ['list', 'List products', 'tags', 'From your stock'],
        ['browse', 'Buyers browse', 'search'],
        ['order', 'Order in Nafaa', 'bell-ring'],
        ['deliver', 'Pack and deliver', 'truck'],
        ['stock', 'Stock updated', 'boxes'],
      ]),
    ),
  ],

  // Hubs
  'PAGE:product': [SALE_FLOW, OFFLINE],
  'PAGE:solutions': [
    MULTI_BRANCH,
    block(
      'Grow without changing systems',
      'Start with one counter and add branches, online selling and connections on the same account.',
      flow([
        ['shop', 'One shop', 'store'],
        ['branches', 'More branches', 'building-2'],
        ['online', 'Online store', 'globe'],
        ['bazaar', 'Nafaa Bazaar', 'shopping-basket'],
        ['api', 'Your systems', 'webhook', 'API and webhooks'],
      ]),
    ),
  ],
  'PAGE:services': [QUOTE_FLOW],
  'PAGE:industries': [
    block(
      'Your trade, switched on',
      'Pick your trade at signup and the screens it needs turn on over the same counter, stock and khata.',
      flow([
        ['signup', 'Sign up', 'user-plus'],
        ['trade', 'Pick your trade', 'store'],
        ['screens', 'Trade screens on', 'layout-grid', 'Batches, IMEI, tables'],
        ['core', 'Same core', 'layers', 'POS, stock, khata'],
        ['sell', 'Start selling', 'rocket'],
      ]),
    ),
    SALE_FLOW,
  ],
  'PAGE:integrations': [
    STORE_SYNC,
    block(
      'Courier booking from the order',
      'Connect your courier once; after that every order can be booked, labelled and tracked from Nafaa.',
      flow([
        ['order', 'Order', 'shopping-bag'],
        ['book', 'Book courier', 'truck', 'PostEx, TCS, Leopards…'],
        ['label', 'Print label', 'printer'],
        ['track', 'Tracking', 'map-pin'],
        ['cod', 'COD settled', 'banknote'],
      ]),
    ),
  ],
};
