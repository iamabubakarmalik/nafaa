/** Help articles: by-business-type (/help/by-business-type/...). */
import { helpShot, note, tip, warn, type HelpArticle } from '../_help';

const articles: HelpArticle[] = [
  {
    slug: 'restaurant-kot-and-tables',
    title: 'Restaurant: KOT, tables and the kitchen screen',
    summary:
      'Take a dine-in order from the table floor, send it to the kitchen as a KOT, follow it on the kitchen screen, add more items later, print the bill at the table and close it with payment. Takeaway and delivery orders use the same order screen.',
    seoDescription: 'How to take a table order in Nafaa, send a KOT to the kitchen, track it on the kitchen screen, add items, print the bill and take payment.',
    focusKeyword: 'restaurant kot software',
    intro: [
      'A restaurant in Nafaa works from two screens. **Tables** (the floor plan) shows every table with its status and running bill, and **Kitchen (KOT)** shows the kitchen order tickets the cooks work from. Both are in the sidebar of a restaurant account; you can also type their names in **Search menu**.',
      '',
      'Table colours tell the floor staff what to do: green is **Khaali** (free), red is **Bhari** (occupied, with the running bill and how long the guests have been seated), a purple edge is **Bill print** (bill given, waiting for payment), blue is **Safai** (needs cleaning) and yellow is **Reserved**. The floor refreshes every 15 seconds.',
      '',
      'Before the first order, add your tables with **Floor setup** → **Nayi table** (number, section such as Hall or Rooftop, and seats), and your dishes under **Menu**.',
    ].join('\n'),
    steps: {
      heading: 'Take a table order and send the KOT',
      items: [
        ['Open the table', 'On **Tables**, click a green table and choose **Order lein** (take order). The order screen opens with that table selected; set the number of guests with **+** and **−**.'],
        ['Add dishes', 'Tap dishes from the menu grid, or type a name or code in **Dish ka naam ya code…** and press Enter. Dishes with options ask for size and add-ons. Use **Note** on a line for the kitchen, for example "kam mirch".'],
        ['Send it to the kitchen', 'Press **Kitchen bhejein** (send to kitchen) or **F9**. Leave **Kitchen ticket (KOT) print karein** ticked to print the ticket on the kitchen printer as well. The table turns red with the running bill.'],
        ['Cook from the kitchen screen', 'On **Kitchen (KOT)** the ticket appears under **Naye** (new). Cooks press **Shuru** to start, **Tayyar** when the plate is ready and **De diya** once it has gone out. A ticket turns yellow after 10 minutes and red after 20.'],
        ['Add more items later', 'Click the red table and choose **Aur item**. Only the new items go to the kitchen, as a new KOT; the bill keeps all of them.'],
        ['Print the bill', 'Click the table and choose **Bill print**. The guests get the bill and the table shows **Bill print** until they pay.'],
        ['Take payment and free the table', 'Open the order and press **Payment**. Once paid, the table moves to **Safai**; after cleaning, choose **Saaf ho gayi — khaali** to make it free again.'],
      ],
    },
    more: [
      helpShot('restaurant-kot-and-tables', 'The Tables floor in a demo restaurant: free, occupied and reserved tables with running bills.', {
        callouts: [
          { x: 30, y: 39, label: 'Tables by section' },
          { x: 38, y: 53, label: 'Bhari: running bill and time' },
          { x: 20.5, y: 58, label: 'Khaali: click → Order lein' },
          { x: 64.5, y: 94, label: 'Reserved with guest and time' },
          { x: 79, y: 12, label: 'Takeaway (N) and Kitchen' },
        ],
      }),
      helpShot('restaurant-kot-and-tables-2', 'The order screen: dine-in, takeaway, delivery or counter; dishes on the left and the order with Kitchen bhejein (F9) on the right.', {
        callouts: [
          { x: 59, y: 12, label: 'Dine-in, Takeaway, Delivery, Counter' },
          { x: 81, y: 12, label: 'Table and guests' },
          { x: 85, y: 26, label: 'Order lines with Note' },
          { x: 80, y: 91.5, label: 'Kitchen bhejein (F9)' },
          { x: 92.5, y: 91.5, label: 'Payment (F12)' },
        ],
      }),
      tip('For a takeaway, press **Takeaway** (or **N**) on the Tables screen. Write the customer’s name for the token; when the food is ready the kitchen screen lists it under **Counter par bulayein** (call to the counter).', 'Takeaway and delivery'),
      note('To split a table’s bill, open the order and use **Bill alag karein**: pick the items that go on a separate bill. Each bill is then paid on its own. See also [split payment](/help/pos-counter/split-payment).', 'Separate bills for one table'),
    ],
    faqs: [
      ['Can the kitchen use a screen instead of printed KOTs?', 'Yes. **Kitchen (KOT)** is a kitchen screen with three lanes: **Naye**, **Ban rahe** (cooking) and **Tayyar**. It beeps when a new ticket arrives (**Awaaz on/off**, key **M**). Tickets can be printed from the same screen, and if you use kitchen stations each station can filter its own tickets with keys 1 to 9.'],
      ['How do I add a service charge on dine-in bills?', 'Set the shop’s service charge in **Settings → Counter rules**. On a dine-in order you can change it for that order only under **Charges, discount aur note**.'],
      ['What happens if a dish is cancelled after the KOT went out?', 'The kitchen screen shows a red **CANCEL** ticket so the cooks stop making it. It clears itself after 30 minutes.'],
    ],
    terms: ['kot', 'kitchen-display-system', 'split-bill', 'service-charge', 'table-turnover'],
    related: ['INDUSTRY:restaurant', 'SOLUTION:restaurants', 'PRODUCT:pos', 'PAGE:split-payment', 'PAGE:receipts-and-printers', 'PAGE:make-a-bill'],
    evidence: [
      'apps/web/src/industries/restaurant/RestaurantPack.tsx',
      'apps/web/src/industries/restaurant/pages/TablesLayoutPage.tsx',
      'apps/web/src/industries/restaurant/components/OrderComposer.tsx',
      'apps/web/src/industries/restaurant/pages/KotDisplayPage.tsx',
      'apps/web/src/industries/restaurant/pages/OrderDetailPage.tsx',
      'apps/web/src/industries/restaurant/lib/orderMeta.ts',
    ],
  },
  {
    slug: 'pharmacy-batch-and-expiry',
    title: 'Pharmacy: batches and expiry dates',
    summary:
      'Record each medicine batch with its expiry when stock comes in, let the counter sell the earliest valid expiry first, and use the Expiry screen to find batches that are expired or close to it, then return them to the distributor or write them off.',
    seoDescription: 'How to track medicine batches and expiry dates in Nafaa: enter batches on purchases, sell the nearest expiry first, and act on expiring stock.',
    focusKeyword: 'pharmacy expiry tracking software',
    intro: [
      'In a pharmacy account every medicine’s stock is kept by batch, with the batch number and expiry date printed on the strip or box. Nafaa uses those batches in three places: when stock comes in, at the counter, and on the **Expiry** screen.',
      '',
      'Batch and expiry tracking is on by default for pharmacies. You can see or change it in **Settings → Business type** (**Batch & Expiry Tracking**).',
    ].join('\n'),
    steps: {
      heading: 'Track batches from purchase to shelf',
      items: [
        ['Add the medicine', 'Create it with **Naya product · Pharmacy**: name, form (**Shakal**), company, pack and the salt in the **Formula** step. Opening stock that is already on the shelf goes in the **Stock** step under **Batch aur expiry** → **Batch jorein** (batch number, date made, expiry, quantity and cost).'],
        ['Enter new stock with its batch', 'When a distributor’s bill arrives, record it in **Purchases**. On each line open **Bechne ka rate, batch, expiry** and fill **Batch #** and the expiry. Each batch is then kept separately. See [purchase orders and GRN](/help/products-and-stock/purchase-orders-and-grn).'],
        ['Sell at the counter', 'Bill as usual. The counter takes the batch with the earliest valid expiry, and the batch and expiry are written on the bill line.'],
        ['Check the Expiry screen', 'Open **Expiry** from the sidebar. The tabs **Expire ho chuki** (expired), **30 din**, **90 din**, **6 mahine** and **Sab batch** list batches that still have stock, with the batch number, expiry, stock and its cost and sale value.'],
        ['Act on a batch', 'Press **Kya karein** (what to do) on a batch. Choose **Distributor ko wapas** to return it against the purchase it came on, which lowers both the stock and what you owe the distributor, or **Kharab / zaya** to write it off as damaged. If the batch came in as opening stock with no purchase bill, Nafaa says so and suggests writing it off unless the distributor agrees to take it back.'],
      ],
    },
    more: [
      helpShot('pharmacy-batch-and-expiry', 'The Expiry screen in a demo pharmacy: batches due in the next 90 days with batch number, expiry, stock and value.', {
        callouts: [
          { x: 39, y: 48, label: 'Expired, 30, 90 days, 6 months' },
          { x: 55, y: 59, label: 'Batch number' },
          { x: 62, y: 60, label: 'Expiry and days left' },
          { x: 94, y: 59, label: 'Kya karein: return or write off' },
        ],
      }),
      warn('Expired medicine must not be sold. The counter already skips it, but remove expired stock from the shelf and return it or write it off from the **Expire ho chuki** tab.', 'Expired stock'),
      tip('Most distributors take back stock only some time before expiry, so check the **90 din** tab every week. **Print** and **CSV** on the Expiry screen give you a list to hand to the distributor’s rep.', 'Weekly check'),
    ],
    faqs: [
      ['Does Nafaa sell the oldest batch first?', 'It sells the batch with the earliest valid expiry first (the FEFO rule), which is usually the oldest stock. Expired batches are skipped.'],
      ['Where do I see expiring stock without opening the Expiry screen?', 'The pharmacy dashboard has an **Expiry qareeb** (expiry near) tile and a link to **Expiry** with the count of expired batches. The Expiry screen is the full list with values.'],
    ],
    terms: ['batch-tracking', 'expiry-management', 'fefo', 'purchase-return'],
    related: ['INDUSTRY:pharmacy', 'PRODUCT:inventory', 'PAGE:purchase-orders-and-grn', 'PAGE:stock-adjustment', 'PAGE:low-stock-alerts'],
    evidence: [
      'apps/web/src/industries/pharmacy/PharmacyPack.tsx',
      'apps/web/src/industries/pharmacy/pages/ExpiringPage.tsx',
      'apps/web/src/industries/pharmacy/components/ExpiryActionModal.tsx',
      'apps/web/src/industries/pharmacy/pos/config.ts',
      'apps/web/src/industries/pharmacy/dashboard/widgets.tsx',
      'apps/web/src/modules/inventory/products/editor/coreSteps.tsx',
      'apps/web/src/modules/purchasing/purchases/editor/PurchaseEditorPage.tsx',
    ],
  },
  {
    slug: 'mobile-imei-tracking',
    title: 'Mobile shop: track every phone by IMEI',
    summary:
      'Add a phone model once, then put each handset into stock by its IMEI with cost, warranty and PTA status. Sell by scanning the IMEI at the counter, and use IMEI check to see when and to whom a phone was sold.',
    seoDescription: 'How to add phones by IMEI in Nafaa, record PTA status and warranty, sell by scanning the IMEI and check any IMEI’s history at the counter.',
    focusKeyword: 'imei tracking software',
    intro: [
      'A mobile shop account keeps new phones by IMEI, not just by count. The model (for example a 4GB/64GB phone in black) is the product; each handset in the box is a separate IMEI with its own cost, warranty and PTA status. Accessories such as chargers and covers are ordinary products sold by count.',
      '',
      'The main screen is **IMEI stock** in the sidebar. It shows how many phones are on the shelf, phones older than 60 days, non-PTA phones on the shelf and what sold this month.',
    ].join('\n'),
    steps: {
      heading: 'Add phones by IMEI and sell them',
      items: [
        ['Create the model', 'Add the product with **Naya product · Mobile** and choose **Phone / tablet** (**Har piece ka IMEI**). Set the model number, the shop warranty and the price. Variants such as storage and colour are added in the **Stock** step.'],
        ['Add the handsets', 'On **IMEI stock** press **IMEI daalein** (or **N**). Pick the model and variant, enter the cost of one phone, the warranty in months and the PTA status: **PTA Approved**, **Non-PTA**, **Patched**, **PTA baqi** (pending) or **Exempt**.'],
        ['Scan or paste the IMEIs', 'Scan each box with **Lagataar scan** on, or paste one line per phone as "IMEI 1, IMEI 2". Nafaa accepts 15-digit IMEIs, skips duplicates and flags a wrong check digit. Press **phone save karein**.'],
        ['Sell by IMEI', 'At the counter, scan the IMEI and that exact phone goes on the bill. Tapping the model instead lists its phones in stock at this branch to choose from.'],
        ['Check an IMEI later', 'When a customer comes back for warranty, or someone offers a phone for sale, press **IMEI check** (or **C**) and enter the number. You see when it was sold, to whom, the warranty left and its history.'],
      ],
    },
    more: [
      helpShot('mobile-imei-tracking', 'IMEI stock in a demo mobile shop: phones on the shelf with IMEI 1 and 2, PTA status, cost and price.', {
        callouts: [
          { x: 92.5, y: 12, label: 'IMEI daalein (N)' },
          { x: 82, y: 12, label: 'IMEI check (C)' },
          { x: 58, y: 30, label: 'Non-PTA phones on the shelf' },
          { x: 30, y: 68, label: 'IMEI 1 / IMEI 2' },
          { x: 51, y: 65, label: 'PTA status' },
          { x: 95.5, y: 70, label: 'Check: sale and warranty' },
        ],
      }),
      helpShot('mobile-imei-tracking-2', 'Naye phone — IMEI daalein: model, cost, warranty and PTA status, then scan or paste the IMEIs.'),
      note('**Non-PTA** phones are counted separately on IMEI stock with the reminder to tell the customer. The PTA status is a record for your shop; Nafaa does not check it with PTA.', 'PTA status'),
    ],
    faqs: [
      ['Can I sell a phone without scanning the IMEI?', 'Yes. Tap the model on the counter and pick the handset from the list of phones in stock. The bill still records which IMEI was sold.'],
      ['Do used phones and repairs use the same screen?', 'No. Used phones have their own **Used phones** screen and repairs are under **Repairs**. Used phones taken in as an exchange can pay part of a bill at checkout.'],
      ['Does IMEI tracking work offline?', 'Accessories sell offline like any product. Phones need the internet at the moment of sale, because the IMEI is checked on the server.'],
    ],
    terms: ['imei', 'pta-approved', 'serial-number', 'warranty', 'trade-in'],
    related: ['INDUSTRY:mobile-shop', 'PRODUCT:inventory', 'PRODUCT:pos', 'PAGE:add-a-product', 'PAGE:make-a-bill', 'PAGE:barcodes-and-labels'],
    evidence: [
      'apps/web/src/industries/mobile/MobilePack.tsx',
      'apps/web/src/industries/mobile/pages/GlobalImeiInventoryPage.tsx',
      'apps/web/src/industries/mobile/pages/MobileProductWizardPage.tsx',
      'apps/web/src/industries/mobile/components/imei/AddImeisModal.tsx',
      'apps/web/src/industries/mobile/components/imei/ImeiLookupModal.tsx',
      'apps/web/src/industries/mobile/components/meta.ts',
      'apps/web/src/industries/mobile/pos/config.ts',
    ],
  },
  {
    slug: 'garments-size-and-colour',
    title: 'Garments: sizes and colours as variants',
    summary:
      'Create one garment product and let Nafaa make a variant for every size and colour, each with its own stock and barcode. Sell the exact size by scanning its barcode, and see which sizes are running out on the Size reorder tab.',
    seoDescription: 'How to add sizes and colours for a garment in Nafaa, give each variant its own barcode and stock, sell by size and reorder the sizes that run out.',
    focusKeyword: 'clothing store size colour inventory',
    intro: [
      'In a garments account a design is one product, and each size and colour of it is a variant. A kurta in sizes S, M, L and colours black and white becomes six variants, each with its own stock count and barcode. Reports and reorder lists then work per size, so you can see that medium sold out while large is still on the shelf.',
      '',
      'Products are added with **Naya product · Garments** from **Products** (or **Naya** on the **Maal** screen).',
    ].join('\n'),
    steps: {
      heading: 'Add a garment with sizes and colours',
      items: [
        ['Describe the item', 'In **Pehchaan**, write the name, choose **Ready-made**, **Silai bhi hoti hai** or **Unstitched kapra**, who it is for (**Gents**, **Ladies**, **Bachay** and so on), the garment type and season. Add the article code under **Design / article code** if the brand has one.'],
        ['Set the price', 'In **Qeemat**, enter the sale price and cost. Every variant uses this price unless you give it its own rate later.'],
        ['Pick sizes and colours', 'In the **Stock** step, find **Size × rang**. Choose a size set (**S-M-L**, **Number**, **Desi**, **Bachay** or **Free size**) and tap the sizes, then tap the colours. Type your own size and press Enter if it is not listed.'],
        ['Make the variants', 'Enter the opening stock per variant under **Har variant ka stock**, keep **Har variant ka barcode khud banayein** ticked and press **variant banayein**. The table below lets you change the rate, stock and barcode of each one.'],
        ['Print labels and sell', 'Print size labels from **Barcode labels**. At the counter, scanning a label puts that exact size and colour on the bill. Tapping the product opens a size picker.'],
      ],
    },
    more: [
      helpShot('garments-size-and-colour', 'The Size × rang grid on a new garment: sizes and colours chosen, ready to make one variant per pair.', {
        callouts: [
          { x: 37, y: 50, label: 'Size set' },
          { x: 46, y: 55, label: 'Sizes' },
          { x: 50, y: 62, label: 'Colours' },
          { x: 53, y: 76, label: 'One barcode per variant' },
          { x: 70, y: 75, label: '12 variant banayein' },
        ],
      }),
      tip('On the **Maal** (products) screen, the **Size reorder** tab lists sizes and colours running low in this branch with a suggested quantity, so you reorder medium in navy instead of the whole design.', 'Reorder by size'),
      note('Pieces a customer has put on hold (**Hold**) or is paying for in instalments (**Qist plan**) are kept aside: the counter sells only the stock that is not held, per size.', 'Held pieces'),
    ],
    faqs: [
      ['Can I add a new size to an existing product?', 'Yes. Edit the product, go to the **Stock** step and use **Size × rang** again. Sizes and colours that already exist are skipped, so only the new pairs are added.'],
      ['How do I sell unstitched fabric by the meter?', 'Choose **Unstitched kapra** when you add it and sell it by meter or by suit. The counter takes the quantity in that unit.'],
    ],
    terms: ['product-variant', 'sku', 'barcode', 'layaway', 'reorder-level'],
    related: ['INDUSTRY:garments', 'PRODUCT:inventory', 'PAGE:barcodes-and-labels', 'PAGE:add-a-product', 'PAGE:low-stock-alerts'],
    evidence: [
      'apps/web/src/industries/garments/GarmentsPack.tsx',
      'apps/web/src/industries/garments/pages/GarmentProductWizardPage.tsx',
      'apps/web/src/industries/garments/pages/GarmentProductsPage.tsx',
      'apps/web/src/industries/garments/pos/config.ts',
    ],
  },
  {
    slug: 'bakery-orders',
    title: 'Bakery: take cake and custom orders',
    summary:
      'Book a cake order with size, flavour, design, message and pickup or delivery time, take an advance, move it through baking and decorating, and hand it over with the balance billed. Orders for weddings and events go under Bare orders.',
    seoDescription: 'How to take a cake order in Nafaa: size, flavour, design, message, delivery time and advance, then baking, handover and the final bill.',
    focusKeyword: 'bakery order management software',
    intro: [
      'Cake and custom orders are booked today and handed over later, often with an advance. In a bakery account they live under **Cake Orders** in the sidebar. The list shows orders due today, late orders, orders in progress and the balance still to collect. Large orders for weddings and events have their own list under **Bare orders**.',
    ].join('\n'),
    steps: {
      heading: 'Book a cake order',
      items: [
        ['Start the order', 'Press **Naya order** on **Cake Orders** (or **N**). Find a returning customer by name or phone, or type a new name and phone. The phone is used for the WhatsApp confirmation.'],
        ['Describe the cake', 'Under **Cake**, pick the **Size** (half pound to 5 pound, kilo or **Custom**), **Shakal**, **Cream** and flavour. Add the text under **Cake par kya likhna hai**, design notes and photos, and any diet notes such as egg-free or sugar-free.'],
        ['Link stock (optional)', 'Search **Maal se jorein** to link the order to a product, for example "Chocolate cake 2 pound". Stock then goes down when the order is billed.'],
        ['Set when and how', 'Under **Kab aur kaise**, choose **Dukaan se lenge** (pickup), **Ghar pahunchana** (home delivery), **Hall / venue** or **Courier**, and the date and time the customer will collect it.'],
        ['Price and advance', 'Under **Qeemat aur advance**, enter **Cake ki qeemat**, design and photo charges, tax, discount, and the advance taken now with how it was paid. Press **Order banayein** (**Ctrl + Enter**). The order goes into that day’s baking plan.'],
        ['Follow it to handover', 'On the list, each order has its next step: **Banana shuru** (start), then decorating and **Tayyar hai** (ready). Record extra money with **Paisa mila**. At handover press **De diya — bill**: the balance is billed and the order closes.'],
      ],
    },
    more: [
      helpShot('bakery-orders', 'Naya cake order: customer, cake size and design on the left; pickup or delivery time and price with advance on the right.', {
        callouts: [
          { x: 42, y: 30, label: 'Returning or new customer' },
          { x: 40, y: 76, label: 'Size, shape, cream, flavour' },
          { x: 82, y: 33, label: 'Pickup, delivery, venue, courier' },
          { x: 82, y: 73, label: 'Price and advance' },
          { x: 92, y: 93, label: 'Order banayein' },
        ],
      }),
      helpShot('bakery-orders-2', 'Cake Orders: due today, late, in progress and balance to collect, with the next step on each order.', {
        callouts: [
          { x: 42, y: 30, label: 'Late orders' },
          { x: 89, y: 30, label: 'Balance to collect' },
          { x: 26, y: 70, label: 'Next step for the order' },
          { x: 41.5, y: 70, label: 'WhatsApp the customer' },
        ],
      }),
      tip('Use **Kal subah 11**, **Kal shaam 7** and the other quick times under the date field for the usual pickup slots.', 'Quick times'),
    ],
    faqs: [
      ['Where does the advance go?', 'It is saved on the order and shown as **Ab tak mila** (received so far). The list shows the balance still due, and **De diya — bill** charges only that balance.'],
      ['Can I print a slip for the kitchen?', 'Yes. After saving you can print a **Kitchen parchi** for the bakers and a **Customer parchi** for the customer.'],
    ],
    terms: ['work-order', 'receipt'],
    related: ['INDUSTRY:bakery', 'PRODUCT:pos', 'PAGE:whatsapp-reminders', 'PAGE:receive-a-payment', 'PAGE:make-a-bill'],
    evidence: [
      'apps/web/src/industries/bakery/BakeryPack.tsx',
      'apps/web/src/industries/bakery/pages/CakeCustomizerPage.tsx',
      'apps/web/src/industries/bakery/pages/CakeOrdersPage.tsx',
      'apps/web/src/industries/bakery/components/meta.ts',
    ],
  },
  {
    slug: 'salon-bookings',
    title: 'Salon: book appointments and walk-ins',
    summary:
      'Book a client for a service with a stylist at a set time, take an advance, see each stylist’s day on the calendar, check clients in when they arrive and turn the finished appointment into a bill at the salon counter, with the stylist’s commission worked out.',
    seoDescription: 'How to book salon appointments in Nafaa: services, stylist, time and advance, walk-ins, the stylist calendar, check-in and billing at the counter.',
    focusKeyword: 'salon booking software',
    intro: [
      'A salon account has an **Appointments** screen for the day’s bookings and walk-in queue, and a **Calendar** with one column per stylist. Both are in the sidebar. An appointment moves from **Booked** to **Aa gaye** (arrived), **Chair par** (in the chair) and **Ho gaya** (done), and then becomes a bill at the **Salon counter**.',
    ].join('\n'),
    steps: {
      heading: 'Book an appointment and bill it',
      items: [
        ['Start a booking', 'On **Appointments** press **Booking** (or **N**). Choose **Booking (baad ka waqt)** for a later time, or **Walk-in (abhi aaye)** for a client who is already here (**W** from the list).'],
        ['Pick the client', 'Search by name or phone under **Customer dhoondein**, or type a new name and phone. Choosing a saved client keeps their history and khata together.'],
        ['Add services and stylist', 'Under **Services aur stylist**, choose the service and the stylist, or leave the stylist for later. Leave **Rate** empty to use the list rate. **Aur service** adds another service.'],
        ['Set the time', 'Pick the **Date** and **Waqt**. Nafaa lists the stylist’s other bookings that day under **Is din stylist ki bookings**, so you can avoid a clash.'],
        ['Take an advance (optional)', 'Enter **Advance amount**. It is credited to the client’s khata and taken off the bill automatically. Press **Booking pakki karein**.'],
        ['Check in and bill', 'When the client arrives, open the appointment and press **Customer aa gaye**, then **Chair par — kaam shuru**. When the work is done, press **Kaam ho gaya — bill banayein**: the salon counter opens with the services, and the stylist’s commission is worked out on the bill.'],
      ],
    },
    more: [
      helpShot('salon-bookings', 'Nayi booking: client, services and stylist, date and time, and an optional advance.', {
        callouts: [
          { x: 30, y: 33, label: 'Booking or walk-in' },
          { x: 41, y: 40, label: 'Find or add the client' },
          { x: 40, y: 72, label: 'Service and stylist' },
          { x: 82, y: 35, label: 'Date and time' },
          { x: 72, y: 42, label: 'Stylist’s other bookings that day' },
          { x: 85, y: 70, label: 'Booking pakki karein' },
        ],
      }),
      tip('The **Calendar** shows each stylist’s day in a column. Click an empty slot to start a booking for that stylist and time, and use the arrows to move between days.', 'Book from the calendar'),
      note('A client who does not come can be marked **Nahi aaye (no-show)** once they are late. Use **Waqt badlein** to move a booking, and the **WhatsApp** button on the appointment to message the client. See [WhatsApp reminders](/help/khata-and-customers/whatsapp-reminders).', 'Late, moved or missed bookings'),
    ],
    faqs: [
      ['Can a booking have more than one service and stylist?', 'Yes. Add each service with **Aur service** and choose a stylist for each line. **Kitne log** records a group, such as a bridal party.'],
      ['Where do I see stylist commission?', 'Under **Stylist aur commission**, which shows each stylist’s commission from billed services and lets you record a payout.'],
    ],
    terms: ['khata', 'udhaar'],
    related: ['INDUSTRY:salon', 'PRODUCT:pos', 'PRODUCT:staff', 'PAGE:make-a-bill', 'PAGE:whatsapp-reminders', 'PAGE:add-a-customer'],
    evidence: [
      'apps/web/src/industries/salon/SalonPack.tsx',
      'apps/web/src/industries/salon/pages/NewAppointmentPage.tsx',
      'apps/web/src/industries/salon/pages/AppointmentsPage.tsx',
      'apps/web/src/industries/salon/pages/AppointmentDetailPage.tsx',
      'apps/web/src/industries/salon/pages/CalendarViewPage.tsx',
      'apps/web/src/industries/salon/components/appointments.tsx',
      'apps/web/src/industries/salon/lib/meta.ts',
    ],
  },
];

export default articles;
