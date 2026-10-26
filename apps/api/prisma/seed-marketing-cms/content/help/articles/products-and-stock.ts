/** Help articles: products-and-stock (/help/products-and-stock/...). */
import { helpShot, note, tip, warn, type HelpArticle } from '../_help';

const INV = 'apps/web/src/modules/inventory';

const articles: HelpArticle[] = [
  {
    slug: 'add-a-product',
    title: 'How to add a product in Nafaa',
    summary:
      'Add a new item to your shop in three short steps: name and category, cost and selling price, and the stock you have today. The product then shows on the POS counter, in search, on barcode labels and in every stock and profit report.',
    seoDescription: 'Add a product in Nafaa in three steps: name and category, cost and selling price, then opening stock. It appears on the POS counter at once.',
    focusKeyword: 'add product in nafaa',
    intro: [
      'Every bill, stock count and profit figure in Nafaa starts with a product. A product has a name, a selling price, a cost and a stock quantity, plus optional details such as category, brand, barcode, packs and photos.',
      '',
      'Open **Products** in the sidebar (the page header reads **Maal**) and press **Naya** (new), or press the **N** key on that page. The editor has three steps on the left: **Pehchaan** (identity), **Qeemat** (price) and **Stock**. You can save from any step with **Ctrl + S**.',
      '',
      'If you have a long list in Excel, adding products one by one is slow. Use [bulk import](/help/products-and-stock/bulk-import-products) instead.',
    ].join('\n'),
    steps: {
      heading: 'Add a product',
      items: [
        ['Open the editor', 'Go to **Products** and press **Naya**. The page title shows **Naya product** with your business type.'],
        ['Write the name', 'Type the name the way customers ask for it, for example "Surf Excel 1kg". This name is used in POS search, on the bill and on labels.'],
        ['Pick a category and unit', 'Tap a category chip or type a new one. Under **Kis hisaab se bikti hai** (how it sells), choose **Adad (pcs)**, **Kilo**, **Litre** and so on. Stock and price are counted in this unit.'],
        ['Add a barcode or SKU', 'Scan the barcode printed on the item with **Scan**, or type it. Leave **SKU (apna code)** empty or press **Auto** to make one.'],
        ['Set the price', 'Press **Aage** (next). Enter **Cost** (what one unit costs you) and **Bechne ki qeemat** (selling price). Nafaa shows the profit per unit and the margin as you type.'],
        ['Enter opening stock', 'On the **Stock** step, write how many you have on the shelf under **Shuru ka stock**, and set **Kam stock ki had** (low stock level) if you want an alert.'],
        ['Save', 'Press **Bana dein** (create) or **Ctrl + S**. The product is ready to sell on the [POS counter](/help/pos-counter/make-a-bill).'],
      ],
    },
    more: [
      helpShot('add-a-product', 'Step 1, Pehchaan: name, category, brand, SKU and barcode. The card on the right previews the product as you fill it.', {
        callouts: [
          { x: 26, y: 28, label: 'Three steps' },
          { x: 56, y: 32, label: 'Name customers use' },
          { x: 49, y: 47, label: 'Category' },
          { x: 64, y: 79, label: 'Barcode or Scan' },
          { x: 94, y: 93, label: 'Aage: next step' },
        ],
      }),
      helpShot('add-a-product-2', 'Step 2, Qeemat: cost and selling price, with the profit per unit worked out for you.', {
        callouts: [
          { x: 41, y: 32, label: 'Cost' },
          { x: 52, y: 32, label: 'Selling price' },
          { x: 72.5, y: 31, label: 'Profit and margin' },
        ],
      }),
      tip('Opening stock is entered only once. After saving, stock changes through a [purchase](/help/products-and-stock/purchase-orders-and-grn) or a [stock adjustment](/help/products-and-stock/stock-adjustment), so every change has a record.'),
    ],
    faqs: [
      ['Can I add a product without a barcode?', 'Yes. Only the name, unit and selling price are needed. You can find the product at the counter by name, and print a barcode label for it later from **Barcode labels**.'],
      ['What if I leave the cost empty?', 'The product still sells, but profit reports cannot show a correct profit for it. Add the cost when you know it, or record a purchase, which sets the average cost.'],
      ['Can I hide a product without deleting it?', 'Yes. Turn off **Chalu** (active) on the first step. The product stops showing on the POS but its sales history stays.'],
    ],
    terms: ['sku', 'barcode', 'opening-stock', 'unit-of-measure', 'markup'],
    related: ['PRODUCT:inventory', 'PAGE:units-and-packs', 'PAGE:bulk-import-products', 'PAGE:barcodes-and-labels', 'PAGE:make-a-bill', 'TOOL:profit-margin-calculator'],
    evidence: [
      `${INV}/products/list/ProductsPage.tsx`,
      `${INV}/products/editor/ProductEditorPage.tsx`,
      `${INV}/products/editor/coreSteps.tsx`,
      `${INV}/products/editor/fields.tsx`,
      'apps/web/src/app/App.tsx',
    ],
  },
  {
    slug: 'units-and-packs',
    title: 'How to sell in units and packs',
    summary:
      'Sell the same item loose and by the pack: dozen, box, carton or bori. Each pack gets its own rate and barcode, stock is always counted in the base unit, and scanning a carton barcode at the counter puts the carton on the bill.',
    seoDescription: 'Set up packs in Nafaa: sell loose and by dozen, box or carton with its own rate and barcode, while stock stays in one base unit.',
    focusKeyword: 'pos units and packs',
    intro: [
      'Many shops sell one item in more than one way. A soap sells as a single piece and as a carton of 120; a drink sells as a bottle and as a box of 24. In Nafaa the product keeps one base unit (for example pcs), and each pack is a named multiple of it with its own price.',
      '',
      'Stock is always counted in the base unit. When you sell one carton of 24, stock goes down by 24 pieces. When you buy 4 cartons, stock goes up by the right number of pieces.',
      '',
      'You can add packs in two places: inside the product editor on the **Qeemat** step, or on the **Multi-units** page (Inventory → **Multi-units**), which is faster for many products.',
    ].join('\n'),
    steps: {
      heading: 'Add a pack to a product',
      items: [
        ['Open Multi-units', 'In the sidebar under Inventory, open **Multi-units**. Every product is listed with one-tap buttons such as **+ Dozen** and **+ Box**.'],
        ['Add the pack', 'Tap a preset, or press **+ Pack** to write your own. Enter the **Naam** (for example Carton) and how many base units it holds.'],
        ['Set rate and cost', 'Enter the pack’s **Bechne ki qeemat** (selling price) and cost. If the rate is left empty, Nafaa uses the loose rate times the quantity. A warning shows if the pack sells below cost.'],
        ['Add the pack barcode', 'Scan the barcode printed on the carton or box into **Barcode**, or let Nafaa make one with **Barcode banayein**. Scanning it at the counter adds the pack, not a single piece.'],
        ['Choose the default', 'Turn on **POS par pehle ye** if this pack should open first when the product is picked at the counter, for example cartons in a wholesale shop.'],
        ['Save', 'Press **Pack jorein** (add pack). It is available on the POS and in purchases right away.'],
      ],
    },
    more: [
      helpShot('units-and-packs', 'Multi-units lists every product with one-tap pack buttons and counts products without packs or barcodes.', {
        callouts: [
          { x: 81, y: 55.5, label: 'One-tap presets' },
          { x: 94, y: 55.5, label: 'Your own pack' },
          { x: 20, y: 55.5, label: 'Tick to bulk add' },
          { x: 88, y: 12, label: 'Same pack for many' },
        ],
      }),
      helpShot('units-and-packs-2', 'Packs can also be added in the product editor. Each pack shows its price per piece and quick discount buttons.', {
        callouts: [
          { x: 50, y: 45, label: 'Pack presets' },
          { x: 55, y: 64, label: 'Pieces, rate, cost' },
          { x: 69, y: 64, label: 'Pack barcode' },
          { x: 39.5, y: 67.6, label: 'Price per piece' },
        ],
      }),
      tip('To give the same pack to many products at once, tick them on **Multi-units** and press **Kai products me pack** (pack for many products), or press **B**. Example: every cold drink gets "Carton = 24".'),
      note('A saved pack is never deleted from old bills. To stop selling it, switch it to **Band** (off); it then disappears from the POS and purchases but history stays correct.'),
    ],
    faqs: [
      ['Does selling a pack change stock correctly?', 'Yes. Stock is kept in the base unit, so one carton of 24 reduces stock by 24 pieces.'],
      ['Can I buy in cartons and sell loose?', 'Yes. Choose the carton unit on the purchase line. Stock goes up in pieces and the cost per piece is worked out from the carton price.'],
    ],
    terms: ['unit-of-measure', 'loose-sale', 'wholesale-price', 'barcode'],
    related: ['PRODUCT:inventory', 'PAGE:add-a-product', 'PAGE:barcodes-and-labels', 'PAGE:purchase-orders-and-grn', 'SOLUTION:wholesale-distribution'],
    evidence: [
      `${INV}/product-units/pages/ProductUnitsPage.tsx`,
      `${INV}/product-units/components/UnitEditor.tsx`,
      `${INV}/product-units/components/BulkAddModal.tsx`,
      `${INV}/products/editor/coreSteps.tsx`,
      'apps/web/src/modules/purchasing/purchases/editor/PurchaseEditorPage.tsx',
    ],
  },
  {
    slug: 'bulk-import-products',
    title: 'How to import products from Excel',
    summary:
      'Bring your whole product list into Nafaa from an Excel or CSV file, or paste cells straight from Excel or Google Sheets. Columns are matched for you, every line is checked in a grid before anything is saved, and existing products can get new stock or prices.',
    seoDescription: 'Import products into Nafaa from Excel or CSV, or paste cells from a sheet. Columns are matched, lines are checked in a grid, then imported.',
    focusKeyword: 'import products from excel',
    intro: [
      'If your products are already in a spreadsheet, the old billing software or a supplier’s price list, you do not need to type them again. **Excel se import** reads .xlsx, .xls and .csv files, or cells you copy from Excel or Google Sheets.',
      '',
      'Open **Products** and press **Excel import**. The import runs in four steps shown at the top: **File**, **Columns**, **Sheet (check)** and **Import**. Nothing is saved until the last step.',
    ].join('\n'),
    steps: {
      heading: 'Import a product list',
      items: [
        ['Pick the mode', 'Keep **Products + stock** to add products and stock. Choose **Price update** if you only want to change prices of products you already have.'],
        ['Give Nafaa your list', 'Press **File chunein** (choose file), or press **Cells paste karein** and paste cells copied from Excel, including the header row. No list yet? Download the **Template** or the filled **Sample file**.'],
        ['Check the columns', 'On **Columns**, each column of your file is matched to a field such as Name, Price, Cost Price or Stock. Headers in English, Roman Urdu and Urdu are recognised. Only the name column is required.'],
        ['Choose the branch and existing products', 'Pick which branch the stock goes into. For products that already exist (same name, SKU or barcode), choose **Stock me jama karein** (add to stock), **Stock file wala kar dein** (set stock to the file) or **Stock na chheren** (leave stock).'],
        ['Fix lines in the grid', 'On **Sheet (check)** every line is checked. Red cells show what to fix; you can edit cells, find and replace, and paste more rows.'],
        ['Import', 'Press **Import karein**. Lines go in batches with a progress bar. The result shows how many were created, updated, skipped or failed.'],
      ],
    },
    more: [
      helpShot('bulk-import-products', 'The File step: upload a file, paste cells or start on an empty sheet. Past imports are listed below with their results.', {
        callouts: [
          { x: 32.5, y: 19, label: 'Four steps' },
          { x: 34, y: 24, label: 'Price update mode' },
          { x: 45, y: 49.5, label: 'Upload a file' },
          { x: 56, y: 49.5, label: 'Paste from Excel' },
          { x: 52.5, y: 54, label: 'Template for your trade' },
        ],
      }),
      helpShot('bulk-import-products-2', 'Paste cells copied from Excel or Google Sheets with the header row. Tabs or commas both work.', {
        callouts: [
          { x: 50, y: 48, label: 'Header row first' },
          { x: 62.5, y: 70, label: 'Aage: match columns' },
        ],
      }),
      tip('Numbers with commas, a rupee sign or a unit (such as "1,200" or "12.5 kg") are cleaned for you. For packs, add **Pack Name** and **Pack Qty** columns (for example Carton, 24) and write stock in loose units.'),
      note('Failed lines are kept with the import. Open **Import history** and press **Theek karein** (fix) to correct them and import again, or download them as Excel.'),
    ],
    faqs: [
      ['How many products can I import at once?', 'The upload area accepts files of up to 10,000 lines.'],
      ['Will importing twice create duplicates?', 'No. A line whose name, SKU or barcode matches an existing product updates that product instead, following the choice you made for existing products.'],
      ['Can I type products in a sheet instead of uploading?', 'Yes. Press **Bulk banayein** on the Products page, or **Khaali sheet me likhein** on the import page. Type row by row and press **Sab save karein**.'],
    ],
    terms: ['sku', 'opening-stock', 'barcode'],
    related: ['PRODUCT:inventory', 'TEMPLATE:product-import-template', 'PAGE:bulk-edit-products', 'PAGE:add-a-product', 'PAGE:units-and-packs'],
    evidence: [
      `${INV}/products/pages/ProductBulkImportPage.tsx`,
      `${INV}/products/import/ImportOptions.tsx`,
      `${INV}/products/import/MappingPanel.tsx`,
      `${INV}/products/import/grid/SheetGrid.tsx`,
      `${INV}/products/list/ProductsPage.tsx`,
    ],
  },
  {
    slug: 'bulk-edit-products',
    title: 'How to edit many products at once',
    summary:
      'Change names, categories, prices, costs, barcodes, low stock levels and stock for many products in one spreadsheet. Only changed cells are saved, you see every change before saving, and stock changes are recorded as adjustments.',
    seoDescription: 'Bulk edit products in Nafaa in a spreadsheet: prices, costs, categories, barcodes and stock. See every change before saving.',
    focusKeyword: 'bulk edit products',
    intro: [
      'When the supplier raises rates or you reorganise categories, changing products one at a time takes hours. **Bulk edit** shows your products in a spreadsheet grid where you can type over cells, paste from Excel, or change a whole column at once.',
      '',
      'Open **Products** and press the bulk edit button (the list icon next to **Bulk banayein**), or press **Bulk edit** on the Excel import page. You need permission to edit products; changing stock also needs the stock adjustment permission.',
    ].join('\n'),
    steps: {
      heading: 'Edit products in the grid',
      items: [
        ['Filter the list', 'Choose a **Category**, an earlier **Import**, or tick **Sirf low stock** (low stock only). Use **Dhoondein** to search by name, SKU or barcode.'],
        ['Pick the stock branch', 'If you will change stock, choose the branch under **Stock kis branch ka**. The stock column shows that branch’s quantity.'],
        ['Change cells', 'Click a cell and type, or paste a block copied from Excel with **Ctrl + V**. Changed cells turn yellow; cells with a problem turn red with the reason below.'],
        ['Change a column at once', 'Use **Column ek saath** to apply one change to a whole column, or **Dhoondein / badlein** to find and replace text.'],
        ['Undo if needed', '**Ctrl + Z** undoes the last change. **Sab wapas** clears every change you have not saved.'],
        ['Review and save', 'Press **Dekh kar save karein**. Nafaa lists each change as old value and new value. Confirm to save.'],
      ],
    },
    more: [
      helpShot('bulk-edit-products', 'Bulk edit: filters on top, counts of changed lines and errors, and the product grid.', {
        callouts: [
          { x: 26, y: 23.5, label: 'Branch for stock' },
          { x: 67, y: 23.5, label: 'Low stock only' },
          { x: 36, y: 42.5, label: 'Change a whole column' },
          { x: 39, y: 51, label: 'Type over a cell' },
          { x: 90, y: 93, label: 'Review, then save' },
        ],
      }),
      note('Stock is never overwritten directly. A changed stock cell becomes a stock count line, and Nafaa posts the difference as a stock adjustment marked "Bulk edit". You can see it later under **Adjustments**.'),
      warn('Phones tracked by IMEI, services and products with variants keep their stock cell locked. Change their stock from the IMEI stock page or on each variant line.'),
    ],
    faqs: [
      ['Can I change prices only, from a file?', 'Yes. On the import page choose **Price update**, download your current **Price list**, change the Price or Cost Price column and upload it back.'],
      ['Who can change stock in bulk edit?', 'Only users whose role allows stock adjustments. For others the stock column is closed.'],
    ],
    terms: ['stock-adjustment', 'sku', 'reorder-level'],
    related: ['PRODUCT:inventory', 'PAGE:bulk-import-products', 'PAGE:stock-adjustment', 'PAGE:add-staff-and-roles'],
    evidence: [
      `${INV}/products/pages/ProductBulkEditPage.tsx`,
      `${INV}/products/import/grid/SheetGrid.tsx`,
      `${INV}/products/list/ProductsPage.tsx`,
    ],
  },
  {
    slug: 'barcodes-and-labels',
    title: 'How to print barcode labels',
    summary:
      'Give products a barcode and print price stickers on a thermal label roll or an A4 sticker sheet. Add items by search, scan or whole category, design the label once for the shop, test print one label, then print the full list.',
    seoDescription: 'Print barcode and price labels in Nafaa on a thermal roll or A4 sticker sheet. Create EAN-13 barcodes for items that have none.',
    focusKeyword: 'print barcode labels',
    intro: [
      'Barcodes make billing faster and stop wrong prices at the counter. Packaged goods usually already have a barcode printed on them; loose items, your own products and repacked goods need a label.',
      '',
      'Open **Barcode labels** in the sidebar under Inventory. You can also press **Label** (or **L**) on a product’s page to send it to the label list.',
    ].join('\n'),
    steps: {
      heading: 'Print labels',
      items: [
        ['Add items to the list', 'Search by name, SKU or barcode, or scan the item with a scanner gun. To label a whole delivery, choose a category in **Poori category ek saath dalain**.'],
        ['Set how many labels', 'Change the count on each line, or use **Sab ko** to set ×1, ×2, ×5, ×10 or **Stock jitne** (one per item in stock) for all lines.'],
        ['Give missing barcodes', 'If some items have no barcode, press **Barcode banayen**. Each gets a new EAN-13 code that any scanner can read, and it is saved on the product.'],
        ['Choose the paper', 'Under **Label ka design**, pick **Thermal roll** with your roll size (such as 50×30) or **A4 sheet**, or set **Apna naap** (your own size).'],
        ['Choose what prints', 'Turn on the shop name, product name, price, barcode digits, unit, variant or expiry. The design is saved for the whole shop.'],
        ['Test, then print', 'Press **Test print** to print one label and check the size. Then press **Print** with the label count.'],
      ],
    },
    more: [
      helpShot('barcodes-and-labels', 'Barcode labels: the list on the left, label design below and a live preview on the right.', {
        callouts: [
          { x: 42.5, y: 33.7, label: 'Search or scan' },
          { x: 44, y: 41, label: 'Whole category' },
          { x: 58, y: 54.5, label: 'Label count' },
          { x: 85, y: 43, label: 'Live preview' },
          { x: 91, y: 61.5, label: 'Print' },
          { x: 44, y: 76, label: 'Roll or A4' },
        ],
      }),
      warn('In the print dialog set Scale to 100% (or "Actual size"), Margins to None and turn off headers and footers. Otherwise labels shift on the roll.'),
      tip('On a half-used A4 sticker sheet, set **Shuru kahan se** (start from) to the number of the next empty label.'),
    ],
    faqs: [
      ['Which barcode type should I use?', 'Keep **Code 128**: every scanner reads it and it works with any code. If you choose EAN-13, only valid 13-digit codes print as EAN-13 and the rest fall back to Code 128.'],
      ['Can I print the carton price on a carton label?', 'Yes. Add the pack unit to the list. If the pack has no price of its own, the label shows the piece price times the pack count.'],
    ],
    terms: ['barcode', 'ean-13', 'upc', 'sku', 'thermal-printer'],
    related: ['PRODUCT:inventory', 'TOOL:barcode-generator', 'PAGE:add-a-product', 'PAGE:units-and-packs', 'PAGE:receipts-and-printers'],
    evidence: [
      `${INV}/barcodes/pages/BarcodeLabelsPage.tsx`,
      `${INV}/barcodes/components/LabelQueue.tsx`,
      `${INV}/barcodes/components/LabelDesigner.tsx`,
      `${INV}/products/detail/ProductDetailPage.tsx`,
    ],
  },
  {
    slug: 'low-stock-alerts',
    title: 'How to set low stock alerts and reorder',
    summary:
      'Set a low stock level on each product and see what is out, low, running out soon or near expiry in every branch. Nafaa works out how many days the stock will last and turns the list into purchase orders or a WhatsApp message to the supplier.',
    seoDescription: 'Set low stock levels in Nafaa, see what is out or running low, and turn the reorder list into purchase orders or a WhatsApp to suppliers.',
    focusKeyword: 'low stock alert',
    intro: [
      'Running out of a fast-selling item costs sales you never see. Nafaa watches stock against a level you set and against how fast each item sells.',
      '',
      'Each product has a **Kam stock ki had** (low stock level), set on the Stock step of the product editor. New products start with the shop default from **Settings → Stock rules**. Setting it to 0 turns the alert off for that product.',
      '',
      'The **Low stock** page (sidebar, under Inventory) groups items as **Khatam** (out), **Kam** (low), **Jaldi khatam hoga** (will run out soon) and **Expiry qareeb** (expiry near).',
    ].join('\n'),
    steps: {
      heading: 'Set alerts and reorder',
      items: [
        ['Set the shop default', 'Open **Settings → Stock rules** and enter **Kam stock ki had**. New products start with this level.'],
        ['Set levels for key items', 'Open a product, go to the **Stock** step and change **Kam stock ki had**. You can also change the level from a line on the Low stock page.'],
        ['Open Low stock', 'The cards at the top show how many items are out, low, running out soon or near expiry. Tap a card to filter the list.'],
        ['Read each line', 'Each line shows stock, daily sales, how many days it will last, how much to order under **Kya karna hai**, and the last supplier.'],
        ['Make orders', 'Tick lines and press **Order banayein**. Nafaa makes one purchase order per supplier, with the rate from the last purchase. Or send the list to the supplier on WhatsApp.'],
        ['Hide what you will not reorder', 'Use **Chhupayein** (hide) for items you are not restocking. They move to the hidden list and can be shown again.'],
      ],
    },
    more: [
      helpShot('low-stock-alerts', 'Low stock and reorder: status cards, filters and the reorder suggestion on each line.', {
        callouts: [
          { x: 26, y: 30, label: 'Out of stock' },
          { x: 42, y: 30, label: 'Below the level' },
          { x: 69, y: 60, label: 'How much to order' },
          { x: 91, y: 60, label: 'Order this item' },
          { x: 93.5, y: 60, label: 'WhatsApp supplier' },
          { x: 92, y: 12, label: 'Orders for all' },
        ],
      }),
      tip('The settings button in the page header opens **Hisaab ki settings**: how many days of sales to average, and how many days of stock an order should cover. Use a shorter period for seasonal goods.'),
      note('You can also get low stock alerts by email. Turn them on in **Settings → Notifications**.'),
    ],
    faqs: [
      ['How does Nafaa decide how much to order?', 'It averages daily sales over the chosen period (30 days by default) and suggests enough to last the number of days set in **Order kitne din ka**.'],
      ['Does each branch get its own list?', 'Yes. With all branches selected, each branch has its own line, and the order is made for that branch.'],
    ],
    terms: ['reorder-level', 'dead-stock', 'inventory-turnover', 'purchase-order'],
    related: ['PRODUCT:inventory', 'TOOL:reorder-level-calculator', 'PAGE:purchase-orders-and-grn', 'PAGE:add-a-product', 'GUIDE:inventory-management-small-business'],
    evidence: [
      `${INV}/low-stock/pages/LowStockPage.tsx`,
      `${INV}/low-stock/components/SettingsModal.tsx`,
      `${INV}/low-stock/components/meta.ts`,
      'apps/web/src/modules/organization/settings/sections/InventorySection.tsx',
      `${INV}/products/editor/coreSteps.tsx`,
      'apps/web/src/app/shell/navigation/nav-config.ts',
    ],
  },
  {
    slug: 'stock-adjustment',
    title: 'How to adjust stock and record damage',
    summary:
      'Correct stock by hand when it does not match the shelf: add stock, remove it, or record damaged and lost goods with a reason. Use a stock count to enter what you actually counted and let Nafaa post the difference.',
    seoDescription: 'Adjust stock in Nafaa: add or remove stock, record damaged and lost goods with a reason, or count the shelf and post the difference.',
    focusKeyword: 'stock adjustment',
    intro: [
      'Stock in Nafaa changes by itself with every sale, return and purchase. An adjustment is for everything else: breakage, expiry, theft, items taken for the shop’s own use, or a count that does not match the system.',
      '',
      'Open **Adjustments** in the sidebar under Inventory (the page header reads **Stock adjustments**). Every adjustment keeps who made it, when, the reason and the value in rupees, so you can see later where stock went.',
    ].join('\n'),
    steps: {
      heading: 'Make an adjustment',
      items: [
        ['Start a new adjustment', 'Press **Naya adjustment** or the **N** key.'],
        ['Add products', 'Type a name and press Enter, or scan barcodes. You can add several products to one adjustment.'],
        ['Choose what happened', 'For each line choose **Barhayein** (increase), **Kam karein** (decrease), **Kharab** (damaged) or **Gum** (lost), and enter the quantity.'],
        ['Write the reason', '**Wajah** (reason) is required. Tap a quick reason such as "Ginti me kam nikla" or type your own. Add a **Note** if useful.'],
        ['Save', 'Press **Save karein**, or **Ctrl + Enter**. Stock changes at once and the line appears in the record.'],
      ],
    },
    more: [
      helpShot('stock-adjustment', 'The adjustments record with value in rupees by type. Lines saved together are shown together.', {
        callouts: [
          { x: 91.5, y: 12, label: 'New adjustment' },
          { x: 80, y: 12, label: 'Count the shelf' },
          { x: 58, y: 30, label: 'Value by type' },
          { x: 56, y: 60, label: 'Each change, with reason' },
        ],
      }),
      helpShot('stock-adjustment-2', 'Naya adjustment: add products, choose increase, decrease, damaged or lost, and give a reason.', {
        callouts: [
          { x: 47, y: 26.5, label: 'Search or scan' },
          { x: 36, y: 54, label: 'Reason is required' },
          { x: 36, y: 69, label: 'Quick reasons' },
          { x: 73, y: 81.7, label: 'Save' },
        ],
      }),
      note('Every stock change, whether from a sale, purchase, transfer or adjustment, is listed on **Stock movements** (sidebar, under Inventory). Use it when you need to trace how a product reached its current quantity.'),
      tip('For a monthly or rack-by-rack count, press **Stock ginti** (stock count). Pick a category, write what is on the shelf next to the system figure, and Nafaa shows the difference before you press **Haan, stock theek karein**.'),
    ],
    faqs: [
      ['Can stock go below zero?', 'Only if **Stock khatam hone par bhi bechein** is turned on in **Settings → Stock rules**. Otherwise Nafaa stops an adjustment that would take stock below zero.'],
      ['Where do damaged goods show in reports?', 'Damaged and lost lines are recorded as a loss with their cost value. The **Analytics** tab on Adjustments shows where stock went.'],
    ],
    terms: ['stock-adjustment', 'stock-take', 'shrinkage', 'wastage'],
    related: ['PRODUCT:inventory', 'TEMPLATE:stock-take-sheet', 'PAGE:low-stock-alerts', 'PAGE:bulk-edit-products', 'PAGE:stock-transfers'],
    evidence: [
      `${INV}/stock-adjustments/pages/StockAdjustmentsPage.tsx`,
      `${INV}/stock-adjustments/components/AdjustmentForm.tsx`,
      `${INV}/stock-adjustments/components/StockCountPanel.tsx`,
      `${INV}/stock-adjustments/components/meta.ts`,
      'apps/web/src/modules/organization/settings/sections/InventorySection.tsx',
    ],
  },
  {
    slug: 'stock-transfers',
    title: 'How to transfer stock between branches',
    summary:
      'Send stock from one branch to another and receive it at the other end. Stock leaves the sending branch when you send, joins the receiving branch when it is received, and short deliveries are recorded with a note.',
    seoDescription: 'Transfer stock between branches in Nafaa: send from one branch, receive at the other, and record short deliveries with a note.',
    focusKeyword: 'stock transfer between branches',
    intro: [
      'With more than one branch or a godown, stock often moves between locations. A transfer keeps both branches correct: the sender’s stock goes down when the goods leave, and the receiver’s stock goes up only when someone there confirms what arrived.',
      '',
      'Open **Transfers** in the sidebar under Inventory (the page header reads **Stock transfer**). Transfers are valued at cost; they are not sales. Staff tied to one branch only see transfers that touch their branch.',
    ].join('\n'),
    steps: {
      heading: 'Send and receive stock',
      items: [
        ['Start a transfer', 'Press **Maal bhejein** (send goods).'],
        ['Choose the branches', 'Under **Kahan se** pick the sending branch, and under **Kahan** the receiving branch. They must be different.'],
        ['Add items', 'Search or scan items. Pick the unit (pcs, carton or box) and quantity. Each line shows stock now and after sending, and you cannot send more than you have.'],
        ['Add a reason and note', 'Tap a reason under **Kis liye bhej rahe hain**, and add a note such as who is carrying the goods. The note prints on the slip.'],
        ['Confirm', 'Press **Aage**, check the summary, and press **Haan, bhej dein**. Print the slip with **Print slip** if the goods travel with a rider.'],
        ['Receive at the other branch', 'At the receiving branch, open the transfer under **Aane wala** (incoming) and press **Receive karein**. Choose **Sab poora aaya** if everything arrived, or enter what actually came.'],
      ],
    },
    more: [
      helpShot('stock-transfers', 'Maal bhejein: sending and receiving branch, items with stock before and after, and the reason.', {
        callouts: [
          { x: 22.7, y: 19, label: 'From' },
          { x: 56, y: 19, label: 'To' },
          { x: 36, y: 27.5, label: 'Search or scan' },
          { x: 51, y: 41.5, label: 'Stock now and after' },
          { x: 79, y: 37, label: 'Reason' },
          { x: 88, y: 92.6, label: 'Next' },
        ],
      }),
      note('If less arrives than was sent, the shortage shows under **Kam aaya** (short) with its value. The receiving note is added to the transfer.'),
      tip('Phones with IMEI, serial-numbered electronics and carpet rolls can be transferred too. Scan the IMEI or serial and the exact unit moves.'),
    ],
    faqs: [
      ['When does stock change?', 'The sending branch loses the stock as soon as you send. The receiving branch gains it when the transfer is received.'],
      ['Can I cancel a transfer?', 'Yes, while it is still on the way. Open it, press **Cancel**, write a reason and confirm with **Cancel karein**. The stock goes back to the sending branch. A transfer that has been received cannot be cancelled.'],
    ],
    terms: ['stock-transfer', 'multi-branch', 'delivery-challan', 'imei'],
    related: ['PRODUCT:multi-shop', 'PRODUCT:inventory', 'PAGE:multi-branch-setup', 'PAGE:stock-adjustment', 'SOLUTION:retail-chains'],
    evidence: [
      `${INV}/transfers/pages/TransfersPage.tsx`,
      `${INV}/transfers/components/TransferForm.tsx`,
      `${INV}/transfers/components/TransferDetail.tsx`,
      `${INV}/transfers/components/ReceiveModal.tsx`,
    ],
  },
  {
    slug: 'purchase-orders-and-grn',
    title: 'How to make purchase orders and receive goods',
    summary:
      'Order stock from a supplier, send the order on WhatsApp, and receive the goods when they arrive, in full or in part. Received goods go into stock at the right cost, the supplier’s balance updates, and a goods received note can be printed.',
    seoDescription: 'Make purchase orders in Nafaa, send them on WhatsApp, receive goods in full or part, and print a goods received note.',
    focusKeyword: 'purchase order and grn',
    intro: [
      'Nafaa records buying from suppliers in two ways. A **purchase** is for goods that have already arrived: stock goes up at once. An **order** is for goods you are asking for: nothing enters stock until you receive it.',
      '',
      'Open **Purchases** in the sidebar under Purchasing. Press **Nayi purchase** for goods in hand, or **Order** for a purchase order. Suppliers are kept under **Suppliers**.',
    ].join('\n'),
    steps: {
      heading: 'Order and receive',
      items: [
        ['Start an order', 'On **Purchases**, press **Order**. The page shows **Naya order** with **Order dena hai** (place an order) selected.'],
        ['Add items', 'Search or scan items. For each line choose the unit you buy in (pcs, carton, box, or your own such as bori = 50 kg), the quantity and the price per unit.'],
        ['Choose the supplier', 'Pick the supplier, add their bill number if you have one, and set **Maal kab tak aayega** (expected date) so the order reminds you.'],
        ['Save and send', 'Press **Order save karein** or **Ctrl + S**. On the order page, press **Order bhejein** to send it to the supplier on WhatsApp.'],
        ['Receive the goods', 'When the delivery comes, open the order and press **Maal aaya** (goods arrived). Choose **Poora aaya** if everything came, or enter what arrived; the rest stays open.'],
        ['Put it in stock', 'Press **Stock me daalein**. Stock goes up, the average cost updates and the supplier’s balance (**Supplier ka khata**) shows what you owe.'],
        ['Print the GRN', 'Press **Print / invoice** and choose **Maal receiving** to print a goods received note with signature lines.'],
      ],
    },
    more: [
      helpShot('purchase-orders-and-grn', 'Naya order: items with the unit you buy in, supplier details, expected date and the order total.', {
        callouts: [
          { x: 90, y: 27, label: 'Order, not purchase' },
          { x: 40, y: 27, label: 'Search or scan' },
          { x: 41, y: 40.5, label: 'Unit and quantity' },
          { x: 54, y: 40.5, label: 'Price per unit' },
          { x: 87, y: 36, label: 'Supplier' },
          { x: 87, y: 55, label: 'Expected date' },
        ],
      }),
      helpShot('purchase-orders-and-grn-2', 'Print / invoice offers the purchase bill, the order for the supplier, and a goods received note.', {
        callouts: [
          { x: 37.5, y: 21, label: 'Goods received note' },
          { x: 66, y: 20.4, label: 'Preview' },
          { x: 52, y: 53, label: 'Signature lines' },
          { x: 74, y: 90, label: 'Print' },
        ],
      }),
      tip('Freight, loading and supplier discount entered on the bill are spread into the cost of each item, so profit stays correct.'),
      note('To send goods back, open the purchase and press **Maal wapas karein**. Stock goes down and the supplier balance drops by the same amount.'),
    ],
    faqs: [
      ['Can I make orders from the low stock list?', 'Yes. On **Low stock**, tick lines and press **Order banayein**. Nafaa makes one order per supplier.'],
      ['How do I record a payment to the supplier?', 'Open the supplier from the purchase (**Khata aur payment**) and record the payment there. The supplier ledger shows every bill and payment.'],
    ],
    terms: ['purchase-order', 'grn', 'landed-cost', 'purchase-return', 'accounts-payable'],
    related: ['PRODUCT:purchasing', 'TEMPLATE:purchase-order-template', 'PAGE:low-stock-alerts', 'PAGE:units-and-packs', 'PAGE:stock-adjustment'],
    evidence: [
      'apps/web/src/modules/purchasing/purchases/pages/PurchasesListPage.tsx',
      'apps/web/src/modules/purchasing/purchases/editor/PurchaseEditorPage.tsx',
      'apps/web/src/modules/purchasing/purchases/pages/PurchaseDetailPage.tsx',
      'apps/web/src/modules/purchasing/purchases/components/PurchasePrintModal.tsx',
      `${INV}/low-stock/pages/LowStockPage.tsx`,
    ],
  },
];

export default articles;
