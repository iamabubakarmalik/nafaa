/** Help articles: grow (/help/grow/...). */
import { helpShot, note, tip, warn, type HelpArticle } from '../_help';

const articles: HelpArticle[] = [
  {
    slug: 'multi-branch-setup',
    title: 'How to add a branch, warehouse or godown',
    summary:
      'Add a second shop, a warehouse or a godown to the same Nafaa account, give it a manager login, and switch between branches from the top bar. Every branch keeps its own stock, cash drawer and sales, and reports can combine all of them.',
    seoDescription: 'Add a branch, warehouse or godown in Nafaa, give it a manager login, move stock to it and switch branches or view all shops together.',
    focusKeyword: 'add branch pos',
    intro: [
      'A branch in Nafaa is any place that holds stock. A **Dukaan** (shop) has the POS counter, customers and a cash drawer. A **Warehouse** or **Godown** only stores stock and sends it on. Each branch has its own stock and sales, and the owner can look at one branch or all of them together.',
      '',
      'Branches live in **Settings → Business info → Branches**. How many you can add depends on your plan; the plan usage page lists **Branches** next to products and users.',
    ].join('\n'),
    steps: {
      heading: 'Add a branch',
      items: [
        ['Open Branches', 'Go to **Settings → Business info → Branches** and click **Nayi branch** (new branch), or press **N** on that page.'],
        ['Choose the type', 'Under **Branch ki type** pick **Dukaan**, **Warehouse** or **Godown**. The type decides what runs there: only a Dukaan has the POS and the drawer.'],
        ['Name it', 'Enter **Branch ka naam**, for example "Ali Store - Saddar". Add the phone and **Pata** (address) if you want them on that branch\'s bills.'],
        ['Add a manager (optional)', 'Switch on **Is branch ka manager banayein** and fill in the manager\'s name, login email and password. The manager will only see this branch.'],
        ['Create the branch', 'Click **Branch banayein** (or **Branch aur login banayein** when you added a manager). A new branch starts with empty stock.'],
        ['Send stock to it', 'Move stock from an existing branch with **Inventory → Transfers**. See [stock transfers](/help/products-and-stock/stock-transfers).'],
      ],
    },
    more: [
      helpShot('multi-branch-setup', 'Settings → Business info → Branches: every branch as a card with today\'s sale, cash in the drawer, stock value and staff on duty.', {
        callouts: [
          { x: 92, y: 20, label: 'Add a new branch' },
          { x: 29, y: 65, label: 'Main branch' },
          { x: 75, y: 20, label: 'Compare branches' },
        ],
      }),
      helpShot('multi-branch-setup-2', 'The new branch form: type, name, address, and an optional manager login for that branch.', {
        callouts: [
          { x: 28, y: 40, label: 'Shop, warehouse or godown' },
          { x: 42, y: 59, label: 'Branch name' },
          { x: 95, y: 53, label: 'Manager login' },
        ],
      }),
      note('Use the branch selector in the top bar to switch. The owner can also pick **All Shops**: reports and lists then combine every branch, while selling and the cash register still need one branch.', 'Switching branches'),
      tip('Only one branch can be the **Main branch**. New staff and "all branches" work go there first.'),
    ],
    faqs: [
      ['Can a cashier see sales from other branches?', 'No, if their login is locked to one branch. A login with one branch only sees and sells in that branch.'],
      ['How do I compare branches?', 'Click **Analytics** on the Branches page to open **Branch analytics**, which shows sales, returns, expenses and bills per branch for the period you pick.'],
    ],
    terms: ['multi-branch', 'stock-transfer'],
    related: ['PRODUCT:multi-shop', 'PAGE:stock-transfers', 'PAGE:add-staff-and-roles', 'PAGE:daily-sales-report', 'SOLUTION:retail-chains'],
    evidence: [
      'apps/web/src/modules/organization/shops/pages/ShopsPage.tsx',
      'apps/web/src/modules/organization/shops/pages/ShopFormPage.tsx',
      'apps/web/src/modules/organization/shops/components/meta.ts',
      'apps/web/src/modules/organization/shops/pages/ShopsOverviewPage.tsx',
      'apps/web/src/app/shell/topbar/ShopSelector.tsx',
      'apps/web/src/modules/billing/billing/components/helpers.ts',
    ],
  },
  {
    slug: 'online-store-setup',
    title: 'How to connect your online store to Nafaa',
    summary:
      'Connect a WooCommerce, Shopify or Daraz store, or your own website, as a sales channel. Its orders arrive in Online orders, accepting one makes the bill and cuts stock, and stock goes back to the store from the branch you pick.',
    seoDescription: 'Connect WooCommerce, Shopify, Daraz or your own website to Nafaa. Online orders arrive in one list, become bills on accept and share one stock.',
    focusKeyword: 'connect online store pos',
    intro: [
      'A sales channel is any place you sell online. Once a channel is connected, its orders land in **Online orders** inside Nafaa, with a bell and a count in the sidebar. Accepting an order creates the bill and receipt and reduces stock, so the counter and the website sell from the same stock.',
      '',
      'Channels are managed in **Settings → Integrations → Sales channels**. You need the owner login or the settings permission.',
    ].join('\n'),
    steps: {
      heading: 'Connect a sales channel',
      items: [
        ['Open Sales channels', 'Go to **Settings → Integrations → Sales channels** and click **Channel jorein** (connect a channel).'],
        ['Pick the platform', 'Under **Kahan bechte hain?** choose **WordPress / WooCommerce**, **Shopify**, **Apni website / Instagram** or **Daraz**.'],
        ['Pick how to connect', 'Under **Kaise jorna hai?** choose **Automatic** (marked Recommended where available) to approve access in a popup, or **Manual** to get a key and secret for your developer.'],
        ['Enter the store details', 'Type the **Website ka address** (or the Shopify store name), an optional **Naam** shown in the sidebar, and **Stock kis branch se**: the branch whose stock the website shows.'],
        ['Approve the connection', 'Click the connect button and approve in the popup. Nafaa asks for orders, products and stock only, never passwords or payment details.'],
        ['Link products and test', 'After connecting, click **Products jorein** to match each website product and variant to a Nafaa product, then send a **Test order** to check the flow.'],
        ['Accept orders', 'Open **Online orders**. Click **Accept** on a new order to create the bill and cut stock, then move it through packing, ready and delivery.'],
      ],
    },
    more: [
      helpShot('online-store-setup', 'Sales channel jorein: pick the platform, the way to connect, and the branch whose stock goes online.', {
        callouts: [
          { x: 26, y: 35, label: '1. Where you sell' },
          { x: 33, y: 53, label: '2. Automatic or manual' },
          { x: 48, y: 74, label: '3. Website address' },
          { x: 62, y: 82, label: 'Branch whose stock goes online' },
          { x: 25, y: 91, label: 'Connect and approve' },
          { x: 85, y: 28, label: 'What happens after' },
        ],
      }),
      note('With Automatic, stock is sent to the store every 15 minutes and straight away when you accept or cancel an order. Order status goes back to the store as well.', 'Stock and status sync'),
      warn('An order item that is not linked to a Nafaa product has to be matched once before it can be accepted. Linking all products first avoids this at busy times.'),
    ],
    faqs: [
      ['Do I need a developer?', 'Not for WooCommerce or Shopify with **Automatic**: you approve access in a popup. **Manual** and a fully custom website give your developer a key, a secret and sample code.'],
      ['Can website orders take stock from a different branch than the counter?', 'Yes. Pick the branch in **Stock kis branch se** when you connect the channel.'],
      ['What happens to cash-on-delivery money?', 'COD orders are tracked in **Online store → COD & courier**, where you can see what the courier still owes.'],
    ],
    terms: ['cod', 'payment-gateway', 'rto'],
    related: ['PRODUCT:online-store', 'PAGE:multi-branch-setup', 'PAGE:add-a-product', 'PAGE:make-a-bill', 'GUIDE:start-selling-online-pakistan'],
    evidence: [
      'apps/web/src/integrations/online-orders/pages/ChannelsListPage.tsx',
      'apps/web/src/integrations/online-orders/pages/ConnectChannelPage.tsx',
      'apps/web/src/integrations/online-orders/pages/OnlineOrdersPage.tsx',
      'apps/web/src/integrations/online-orders/components/OrderDetailPanel.tsx',
      'apps/web/src/app/shell/navigation/nav-config.ts',
    ],
  },
  {
    slug: 'loyalty-points',
    title: 'How to set up loyalty points',
    summary:
      'Turn on loyalty points so named customers earn points on every bill, set how many points a rupee earns and what a point is worth, let customers spend points at the counter, and add or remove points by hand with a reason.',
    seoDescription: 'Set up loyalty points in Nafaa: earning rate, point value, minimum and maximum use, expiry, spending points at the counter and manual changes.',
    focusKeyword: 'loyalty points pos',
    intro: [
      'Loyalty points reward regular customers. When a bill has a customer on it, that customer earns points. On a later bill the points can be spent as a Discount. The rules are the same in every branch.',
      '',
      'Loyalty is off until you turn it on. The settings are in **Settings → Stock & customers → Credit & loyalty**, and the members list is on **Customers → Loyalty**.',
    ].join('\n'),
    steps: {
      heading: 'Turn on loyalty and use it',
      items: [
        ['Turn it on', 'Open **Settings → Stock & customers → Credit & loyalty** and switch on **Loyalty points**. You can also click **Chalu karein** on the Loyalty page.'],
        ['Set how points are earned', 'In **Har rupay par points** set the rate. The hint gives the example: 0.01 means 1 point for every 100 rupees spent.'],
        ['Set what a point is worth', 'In **1 point ki qeemat** set how many rupees of Discount one point gives on a bill.'],
        ['Set the limits', 'Use **Kam se kam points** for the fewest points that can be used on one bill, and **Bill ka zyada se zyada hissa** for the largest share of a bill that points can pay.'],
        ['Choose an expiry', 'In **Points kab khatam hon** enter the number of days after which earned points expire, or 0 to keep them forever.'],
        ['Earn at the counter', 'Add the customer to the bill (**F2** opens the customer picker). Points are added when the bill is completed.'],
        ['Spend at the counter', 'Press **F4** to open **Discount**. The customer\'s points appear with a slider; move it or click **Sab** to use the most allowed on this bill.'],
      ],
    },
    more: [
      helpShot('loyalty-points', 'Settings → Credit & loyalty: the udhaar switch and credit limit, and the Loyalty points switch that turns earning on.', {
        callouts: [
          { x: 95, y: 61, label: 'Turn loyalty on' },
          { x: 30, y: 39, label: 'Default credit limit' },
          { x: 53, y: 79, label: 'Loyalty members list' },
        ],
      }),
      tip('To give points as a gift or correct a mistake, open **Customers → Loyalty**, find the member and click **Points**. Choose **Tohfa / jorein** (add) or **Kaatein** (remove) and write the **Wajah** (reason). It shows in the customer\'s history.'),
    ],
    faqs: [
      ['Do walk-in customers earn points?', 'No. Points go to a named customer on the bill, so add the customer before completing the sale.'],
      ['Can I see how much the points are worth in total?', 'Yes. The Loyalty page shows **Points ki kul qeemat**, the total Discount that outstanding points could still give, and how many were used in the period.'],
    ],
    terms: ['loyalty-points', 'discount'],
    related: ['PRODUCT:loyalty', 'PAGE:discounts-at-the-counter', 'PAGE:add-a-customer', 'PAGE:make-a-bill', 'PAGE:whatsapp-reminders'],
    evidence: [
      'apps/web/src/modules/organization/settings/sections/CustomerSection.tsx',
      'apps/web/src/modules/customers/loyalty/pages/LoyaltyPage.tsx',
      'apps/web/src/modules/pos/components/PosPerks.tsx',
      'apps/web/src/modules/pos/engine/PosScreen.tsx',
      'apps/web/src/modules/pos/components/PosShortcutsOverlay.tsx',
    ],
  },
  {
    slug: 'ai-assistant',
    title: 'How to bill by voice and read AI insights',
    summary:
      'Speak the bill at the counter in Urdu or Roman Urdu and Nafaa adds the items, quantities and Discount for you. For online selling, the AI insights page lists products that will run out soon, price suggestions and products to recommend to customers.',
    seoDescription: 'Bill by voice at the Nafaa POS counter in Urdu or Roman Urdu, and read AI insights: demand forecast, price suggestions and customer picks.',
    focusKeyword: 'voice billing pos',
    intro: [
      'Two parts of Nafaa listen and suggest for you. At the counter, **Awaaz se bill** (bill by voice) turns spoken phrases like "2 kilo cheeni" into bill lines. In the marketplace workspace, **AI insights** reads your online sales and suggests what to reorder and how to price.',
      '',
      'Voice billing uses the browser\'s speech recognition, so it needs Google Chrome or Microsoft Edge and permission to use the microphone.',
    ].join('\n'),
    steps: {
      heading: 'Make a bill by voice',
      items: [
        ['Open the counter', 'Go to **POS counter** in the sidebar.'],
        ['Start the microphone', 'Click the mic icon in the green bar at the top of the counter. The **Awaaz se bill** panel opens and starts listening. Allow the microphone if the browser asks.'],
        ['Pick the language', 'Under **Zabaan** choose **اردو / Urdu** or **English / Roman**. Nafaa remembers your choice on this device.'],
        ['Speak the items', 'Say one item at a time or join several with "aur", for example "2 kilo cheeni", "sau ka doodh" or "ek dozen anday aur ek bread". Each line you say appears in the panel and is added to the bill.'],
        ['Add a Discount or finish', 'Say "5 percent discount" for a Discount, or "nagad" to go to checkout with cash. Say "udhaar" for a credit sale.'],
        ['Close the panel', 'Click **Ho gaya** and check the bill before you complete it.'],
      ],
    },
    more: [
      helpShot('ai-assistant', 'The POS counter. The mic icon in the green bar opens Awaaz se bill; spoken items land in the bill on the right.', {
        callouts: [
          { x: 60, y: 12, label: 'Bill by voice' },
          { x: 41, y: 19, label: 'Or scan and search as usual' },
          { x: 85, y: 15, label: 'Customer for udhaar (F2)' },
        ],
      }),
      note('Switch the workspace to **Nafaa Marketplace** from the **Workspace** menu at the top left, then open **Overview → AI insights**. The tabs are **AI Insights**, **Demand Forecast** (products that will run out soon), **Price Optimization** and **For Customers**. The insights need some order history before they appear.', 'Where to find AI insights'),
      tip('If a spoken item does not match, the panel shows it in red. Say the product name the way it is written in Nafaa, or add it by scan or search.'),
    ],
    faqs: [
      ['Which browsers support voice billing?', 'Google Chrome and Microsoft Edge. In other browsers the panel says the voice feature is not available.'],
      ['Does voice billing work in Urdu script?', 'Yes. It understands Urdu numbers and units such as "ڈیڑھ کلو" as well as Roman Urdu like "dedh kilo".'],
    ],
    terms: ['pos', 'reorder-level'],
    related: ['PRODUCT:ai-assistant', 'PAGE:make-a-bill', 'PAGE:low-stock-alerts', 'PAGE:pos-keyboard-shortcuts', 'PRODUCT:pos'],
    evidence: [
      'apps/web/src/core/components/voice/VoiceSaleButton.tsx',
      'apps/web/src/modules/pos/engine/PosScreen.tsx',
      'apps/web/src/marketplace/ai-recommendations/AiRecommendationsPage.tsx',
      'apps/web/src/app/shell/navigation/nav-config.ts',
      'apps/web/src/core/stores/workspace.store.ts',
    ],
    needsOwner: [
      'The plain-words business assistant described on /product/ai-assistant has no screen in apps/web/src yet (modules/ai-assistant is an empty stub). This article covers what exists: voice billing and the marketplace AI insights page. Rewrite the steps when the assistant ships.',
      'AI insights read marketplace orders only (apps/api/src/marketplace/publishing/ai.service.ts) and the marketplace is being rebuilt; recheck the tab names after the rebuild.',
    ],
  },
];

export default articles;
