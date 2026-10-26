/**
 * A complete POS hardware kit by shop size: the counter device (phone,
 * tablet or PC), scanner types, receipt and label printers, cash drawer,
 * scale, customer display, power backup and internet backup, with a buying
 * order and a test before paying.
 */
import { SHOT, diagram, prose, shot, steps } from '../../main-pages/_build';
import { sourcesBlock, src, tip, type PostSpec } from '../_post';
import { PHOTO } from '../_media';

const SOURCES = [
  src('Uninterruptible power supply', 'https://en.wikipedia.org/wiki/Uninterruptible_power_supply', 'Wikipedia'),
  src('ESC/P (printer control language)', 'https://en.wikipedia.org/wiki/ESC/P', 'Wikipedia'),
];

const spec: PostSpec = {
  slug: 'pos-hardware-kit-guide',
  title: 'POS Hardware Kit: What a Shop Needs at Each Size',
  summary:
    'A small shop can start billing on a phone it already owns, a busy single counter needs a PC or tablet with a scanner, receipt printer, cash drawer and power backup, and a multi-counter store adds label printing, a customer display and a second internet line. This guide lists the kit for each size, the order to buy in, and what to test before you pay.',
  category: 'guides',
  cover: PHOTO.posHardwareKitGuide,
  tags: ['GLOSSARY_TERM:thermal-printer', 'GLOSSARY_TERM:cash-drawer', 'GLOSSARY_TERM:customer-display', 'PRODUCT:pos'],
  related: [
    'BLOG_POST:choosing-a-pos-printer',
    'SERVICE:hardware',
    'PRODUCT:offline-pos',
    'BLOG_POST:barcode-vs-no-barcode-store',
    'BLOG_POST:load-shedding-proof-billing',
  ],
  isNew: true,
  seoTitle: 'POS Hardware Kit for Shops in Pakistan: A Buying Guide',
  seoDescription:
    'What POS hardware a shop needs at each size: phone, tablet or PC, scanner, receipt and label printer, cash drawer, scale, customer display and power backup.',
  focusKeyword: 'pos hardware kit',
  sources: SOURCES,
  blocks: [
    prose(`Shop owners often buy a full POS kit on the first day: a touch-screen PC, scanner, printer, drawer and a second screen, because that is what the vendor shows. Some of it then sits unused, while the one thing the counter really needed, power backup, was never bought.

Hardware should follow the counter, not the catalogue. This guide lists what a shop needs at each size and in what order to buy it. For a deeper look at receipt printers alone (paper width, connection types, kitchen and A4 printing), read [choosing a receipt printer](/blog/choosing-a-pos-printer).

## The counter device

Everything plugs into one device. You have three choices:

- **Android phone.** Enough for a small shop with a few dozen bills a day. You already own it, it has its own battery and mobile data, and receipts can go to the customer on WhatsApp instead of paper. The screen is small for long bills.
- **Tablet.** A good middle step: a bigger screen for a product grid, still battery-powered, easy to mount on a stand. Bluetooth printers pair well with tablets.
- **PC or laptop.** Best for a busy counter: a full keyboard for fast search and shortcuts, USB ports for a scanner, printer and drawer, and room for a second screen. A laptop carries its own battery through short power cuts; a desktop PC needs a UPS.

Whatever you pick, use a supported, updated browser or the vendor's app, and keep the device for the counter only. A counter PC that is also used for videos and downloads is slower and less safe.`),
    diagram(
      'One counter device, with each piece of hardware added only when the counter needs it.',
      {
        kind: 'hub',
        center: { label: 'Counter device', icon: 'monitor' },
        spokes: [
          { label: 'Barcode scanner', icon: 'scan-barcode' },
          { label: 'Receipt printer', icon: 'printer' },
          { label: 'Cash drawer', icon: 'banknote' },
          { label: 'Label printer', icon: 'barcode' },
          { label: 'Weighing scale', icon: 'gauge' },
          { label: 'Customer display', icon: 'monitor' },
          { label: 'Power backup', icon: 'zap' },
          { label: 'Internet backup', icon: 'wifi' },
        ],
        animate: true,
      },
      'The parts of a counter',
    ),
    prose(`## Barcode scanners

Most counter scanners connect by USB and act like a keyboard: they type the code and press Enter, so they need no drivers. The choice is mainly about what they can read:

- **1D (laser or linear) scanners** read the printed barcodes on packs and your own labels. They are the cheapest and suit most shops.
- **2D (imager) scanners** also read QR codes and barcodes on a phone screen. Pick one if customers will show codes on their phones or if your suppliers use QR codes.
- **Wireless or Bluetooth scanners** suit heavy items (cement bags, cartons of oil) that cannot be lifted to the counter, and stock counts on the floor. They need charging.

If you have not decided whether you need barcodes at all, read [barcode or no barcode](/blog/barcode-vs-no-barcode-store) first.

## Receipt printer and cash drawer

Thermal receipt printers come in 58 mm and 80 mm paper widths. Many use the ESC/P family of commands, which is [still widely used in receipt thermal printers](https://en.wikipedia.org/wiki/ESC/P), so most POS software can talk to them. Choose 80 mm with USB for a busy counter, 58 mm Bluetooth for a phone or tablet.

A cash drawer usually plugs into the receipt printer with a small cable and opens when a cash bill prints. Buy a drawer only when cash is handled by staff, not only by the owner; then the drawer, a fixed [opening float](/glossary/opening-float) and a daily count work together.

## Label printer, scale and customer display

These three are for specific shops:

- **Label printer:** for garments, shoes, hardware parts, or anything you price and label yourself. Shops that label only now and then can print on A4 sticker sheets with an ordinary printer instead.
- **Weighing scale:** for kiryana loose goods, meat, sweets, dry fruit and sabzi. A scale that connects to the counter sends the weight into the bill and avoids misreading.
- **Customer display:** a second screen or a monitor turned towards the customer, showing items and the total. It helps trust at busy counters and makes QR payment easier.`),
    prose(`## Kits by shop size

| | Small shop | Busy single counter | Store with 2+ counters |
|---|---|---|---|
| Device | Android phone | PC, laptop or tablet | PC at each counter |
| Scanner | Phone camera or none | USB 1D or 2D | USB 2D, plus one wireless for the floor |
| Receipts | WhatsApp, or a 58 mm Bluetooth printer | 80 mm USB printer | 80 mm USB printer per counter |
| Cash drawer | Not needed | Yes, if staff handle cash | One per counter |
| Labels | None | A4 sheets if needed | Thermal label printer |
| Scale | If you sell loose | If you sell loose | Connected scale at the loose counter |
| Customer display | No | Optional | Yes |
| Power | Phone battery | UPS for PC, printer and router | UPS per counter, plus a backup for the router |
| Internet | Mobile data | Main line plus phone hotspot | Two lines from different providers |

## Power and internet are part of the kit

Load-shedding makes power backup as important as the printer. A UPS keeps equipment running from a battery when mains power fails; small units are meant to run for a short time, typically [5 to 15 minutes](https://en.wikipedia.org/wiki/Uninterruptible_power_supply), which is enough to finish bills and switch to a generator or inverter. For longer cuts, plan the counter on the shop's inverter or solar circuit. Put the router on backup too.

Your POS should also keep billing when the internet drops. Our [load-shedding-proof billing guide](/blog/load-shedding-proof-billing) covers power, internet and offline billing together.`),
    steps(
      'Buy in this order',
      [
        ['Start with the device you have', 'Bill on your phone or existing PC for a week and note what slows the counter down.'],
        ['Add power backup', 'A UPS or inverter connection for the counter device, printer and router.'],
        ['Add a scanner', 'If most of your items are packed goods with barcodes.'],
        ['Add a receipt printer', 'When customers ask for paper bills or WhatsApp receipts are not enough.'],
        ['Add a cash drawer', 'When staff start handling cash.'],
        ['Add the rest when a need shows', 'Label printer, scale, customer display, a second counter.'],
      ],
      undefined,
      true,
    ),
    shot({
      heading: 'The smallest kit: a phone',
      body: 'A small shop can bill from an Android phone: tap items, take payment and share the receipt on WhatsApp.',
      id: SHOT.posPhone,
      frame: 'phone',
      layout: 'split-right',
      caption: 'Counter on an Android phone in a demo grocery store.',
    }),
    prose(`## Test before you pay

At the shop or the vendor, connect each item to the device you will actually use. Scan ten of your own products, including a small or shiny pack. Print a receipt with your longest real bill and check the Urdu or English text is readable. Open the drawer from a test sale. Pull the power plug and check the UPS takes over without a restart. Ask how warranty repairs work and how long they take, because a counter without a printer for a week costs more than the printer.

## How Nafaa helps

Nafaa runs in the browser on a PC, laptop, tablet or Android phone, and there is a Windows desktop app. You do not need special hardware to start: bills can print through the browser or go out on WhatsApp. Settings, POS hardware sets up a receipt printer over USB, serial or Bluetooth, a cash drawer that opens with a cash bill, a barcode scanner that works as a keyboard, a weighing scale that reads the weight into the bill, and a customer display on a second screen, each with a test button. Each counter keeps its own devices. The counter keeps billing offline when the internet drops. If you want advice before buying, the [POS hardware service](/services/hardware) can recommend a kit for your counter, and [offline POS](/product/offline-pos) explains how billing continues without internet.`),
    tip('Write the model numbers and serial numbers of every counter device in one place, with the vendor\'s phone number. When something breaks on a busy day, you will not have time to search for it.', 'Keep a hardware sheet'),
    sourcesBlock(SOURCES, 'Sources'),
  ],
  outline: ['Counter device', 'Scanners', 'Receipt printer and drawer', 'Label printer, scale, display', 'Kits by size', 'Power and internet', 'Buying order', 'Test before paying', 'How Nafaa helps'],
  dropped: [],
  evidence: [
    'apps/web/src/core/hardware/HardwarePage.tsx',
    'apps/web/src/core/hardware/devices.ts',
    'apps/web/src/core/hardware/settings.ts',
    'apps/web/src/core/hardware/customerDisplay.ts',
    'apps/web/src/core/lib/desktop/useCashDrawer.ts',
    'apps/web/src/core/lib/desktop/electron.ts',
    'apps/desktop/package.json',
    'apps/web/src/modules/pos/components/PosSuccessModal.tsx',
    'apps/web/src/modules/pos/components/PosWeighModal.tsx',
    'apps/web/src/core/lib/offline/syncEngine.ts',
  ],
  factNote:
    'UPS run-time range and ESC/P use in receipt printers checked on Wikipedia; links checked to load on 2026-10-26. Product statements checked against the code (see evidence). No hardware prices are given.',
};

export default spec;
