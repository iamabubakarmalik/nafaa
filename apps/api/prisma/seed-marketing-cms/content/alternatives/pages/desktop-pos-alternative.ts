/**
 * Alternative to installed desktop POS software. Generic: no single vendor
 * is named, so the "desktop POS" column describes the typical installed
 * setup and tells readers to confirm with their own vendor. Cloud vs
 * on-premises points cite the public Point of sale reference, read on
 * CHECKED_ON. Nafaa's own Windows app is described from apps/desktop.
 */
import { answerBox, hero } from '../../../lib/blocks';
import { SHOT, diagram, prose, shot, steps } from '../../main-pages/_build';
import { altTable, src, type AlternativeSpec } from '../_alternative';

const POS_REF = src('Point of sale: cloud-based POS (general reference)', 'https://en.wikipedia.org/wiki/Point_of_sale', 'Wikipedia');

const SUMMARY =
  'Many Pakistani shops still run POS software installed on one computer at the counter, often bought years ago with a one-time licence. This page explains what changes when you move to a cloud POS, where an installed system is still the better choice, and how Nafaa keeps billing through internet cuts while working from any device.';

const spec: AlternativeSpec = {
  slug: 'desktop-pos-alternative',
  title: 'Alternative to Desktop POS Software',
  competitorName: 'Desktop POS software',
  competitorUrl: 'https://en.wikipedia.org/wiki/Point_of_sale',
  verdict:
    'An installed desktop POS is fine for one counter that never needs to be seen from outside the shop. Once you want sales on your phone, a second branch, or backups you do not have to remember, a cloud POS that still bills offline is the simpler choice.',
  summary: SUMMARY,
  seoTitle: 'Desktop POS Alternative: Cloud POS That Still Works Offline',
  seoDescription:
    'Moving from installed desktop POS to cloud POS in Pakistan: what changes, when an installed system is still better, and how Nafaa bills through internet cuts.',
  focusKeyword: 'desktop pos alternative',
  blocks: [
    hero(SUMMARY, { eyebrow: 'Alternatives', heading: 'An alternative to desktop POS software' }),
    answerBox(
      [
        { label: 'Short answer', value: 'Keep a desktop POS for a single counter that works well. Move when you need sales on your phone, more branches or safer backups.' },
        { label: 'Main difference', value: 'Installed POS keeps data on the shop PC; cloud POS keeps it on the vendor\'s servers and shows it on any device' },
        { label: 'The usual worry', value: 'Internet cuts. Nafaa keeps billing offline and syncs when the connection returns' },
        { label: 'Hardware', value: 'Your existing PC, scanner, receipt printer and cash drawer usually carry over' },
        { label: 'Nafaa price', value: 'Paid plans from {{price:min.monthly}} a month, after a 7-day free trial' },
      ],
      'Ek counter wala purana desktop POS theek chal raha ho to rakhein. Jab mobile par sale dekhni ho, doosri branch kholni ho ya backup ki fikr ho, to cloud POS behtar hai jo internet ke baghair bhi bill banata hai.',
      'Should you replace your desktop POS?',
    ),
    prose(`## What "desktop POS" usually means

By desktop POS we mean billing software installed on a Windows computer at the counter, with its data on that computer or on a small server in the shop. Many were sold with a one-time licence and set up by a local technician. Products differ, so check the points below against your own system and ask your vendor.

The general reference on [point of sale](https://en.wikipedia.org/wiki/Point_of_sale) sums up the difference: in a cloud POS, sales and inventory data "are not stored locally, but in a remote server", cloud systems are "generally subscription-based", and the software is more likely to be updated continually. It also notes the catch: a cloud POS "requires an internet connection". That last point is the one that matters most in Pakistan, and it is where cloud systems differ from each other.

## Signs you have outgrown it

- **You cannot see today's sale without going to the shop.** The data lives on the counter PC.
- **Backups depend on someone remembering.** A USB stick once a month, or nothing at all.
- **The PC is the business.** If its hard disk fails, sales history and stock go with it.
- **A second branch means a second system.** Stock and sales cannot be compared without exporting files.
- **Updates need a visit.** New tax rules or features wait for the technician.
- **The vendor has gone quiet.** Support numbers do not answer and nobody can change the software.`),
    altTable(
      'Nafaa and a typical desktop POS',
      'The desktop column describes a typical installed setup; check yours. Cloud versus installed points from the public point of sale reference, checked 26 October 2026.',
      'Typical desktop POS',
      [
        ['Where data lives', 'Your Nafaa account in the cloud, plus pending sales on the device', 'The counter PC or a shop server'],
        ['Seeing sales away from the shop', 'Any phone or computer with a login', 'Usually not, without remote-access tools'],
        ['Internet cut', 'Billing continues; sales sync when it returns', 'Not affected'],
        ['PC failure', 'Log in on another device and carry on', 'Depends on the last backup'],
        ['Backups', 'Automatic, with a downloadable backup and a daily local copy in the Windows app', 'Manual, if done'],
        ['Second branch', 'Same account, live comparison and stock transfers', 'Often a separate install'],
        ['Updates', 'Automatic in the browser and the Windows app', 'Installed by the vendor or technician'],
        ['Payment model', 'Monthly, quarterly or yearly plan', 'Often a one-time licence, sometimes with yearly support'],
      ],
      [POS_REF],
    ),
    prose(`## Where an installed desktop POS is better

- **No internet at all.** If your area has no reliable connection for days at a time, a system that never needs one is simpler. Nafaa bills offline, but it needs a connection now and then to sync.
- **Already paid for.** A one-time licence that works, with a vendor who still answers, costs nothing extra each month.
- **Special hardware.** Some installed systems drive scales, fuel pumps or other machines that cloud systems do not support. Check before switching.
- **Nobody needs to see it.** If only the person at the counter ever looks at the data, cloud access adds little.

## Where Nafaa is better

- **Your shop on your phone.** Today's sale, profit, cash in the drawer and udhaar from anywhere. See [Reports](/product/reports).
- **Billing through load-shedding and internet cuts.** Sales are saved on the device and synced later, so the counter never stops. See [Offline POS](/product/offline-pos).
- **Backups you do not think about**, plus a daily local copy on the Windows app.
- **Branches in one place.** Each branch bills on its own, while head office sees all of them and moves stock between them. See [Multi-Branch](/product/multi-shop).
- **Any device.** A tablet on a second counter, a phone in the godown, or the Windows app at the main till with cash drawer, label printer and a customer display on a second screen.`),
    diagram(
      'When the internet drops, the counter keeps billing and saves sales on the device; when it returns, they sync to the cloud and other branches see them.',
      { kind: 'offline-sync', animate: true },
      'How a cloud POS keeps billing offline',
    ),
    shot({
      heading: 'The dashboard you could not see from home',
      body: 'Today\'s sale, profit, cash and udhaar on the owner\'s phone, from the same data the counter writes.',
      id: SHOT.dashboardPhone,
      frame: 'phone',
      layout: 'split-right',
    }),
    steps(
      'Switching from a desktop POS',
      [
        ['Export from the old system', 'Most desktop POS software can export products and customers to Excel or CSV. Ask your vendor if the option is hidden.'],
        ['Import into Nafaa', 'Upload the file; each line is checked before saving. Customer balances can be entered as opening balances.'],
        ['Keep your hardware', 'Connect your receipt printer, barcode scanner and cash drawer. The Nafaa Windows app drives them directly.'],
        ['Run both for a few days', 'Bill in Nafaa while the old system stays available for looking things up.'],
        ['Count once and retire the old PC', 'Do one stock count to set opening stock, then keep the old system only as an archive.'],
      ],
      'If your data is hard to get out, our data migration service can help.',
      true,
    ),
  ],
  faqs: [
    [
      'Is my data safe in a cloud POS?',
      'It is usually safer than on a single shop PC, which can fail, be stolen or catch a virus. With Nafaa your data is stored in your account, staff see only what their role allows, and you can download a backup. The Windows app also keeps a daily copy on the computer.',
    ],
    [
      'Can I keep my old computer and printer?',
      'Usually yes. Nafaa runs in a browser on the computer you have, or as a Windows app, and works with common thermal receipt printers, barcode scanners and cash drawers. Check unusual hardware, such as scales or pole displays, with us before you switch.',
    ],
    [
      'What happens to my sales history from the old system?',
      'Products and customer balances move over through Excel or CSV import. Years of old bills usually stay in the old system as an archive, because they are rarely needed day to day. Keep the old software or an export of its reports for reference and tax records.',
    ],
  ],
  relations: [
    { ref: 'PRODUCT:offline-pos', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:cloud-pos', kind: 'TAG' },
    { ref: 'GLOSSARY_TERM:offline-pos', kind: 'TAG' },
    { ref: 'PRODUCT:pos', kind: 'RELATED' },
    { ref: 'PRODUCT:multi-shop', kind: 'RELATED' },
    { ref: 'SERVICE:data-migration', kind: 'RELATED' },
    { ref: 'SERVICE:hardware', kind: 'RELATED' },
    { ref: 'BLOG_POST:choosing-a-pos-printer', kind: 'RELATED' },
  ],
  sources: [POS_REF],
  evidence: [
    'apps/web/src/core/lib/offline/offlineSales.ts',
    'apps/web/src/core/lib/offline/syncEngine.ts',
    'apps/web/src/core/lib/offline/offlineAutoBackup.ts',
    'apps/web/src/modules/backup/pages/BackupPage.tsx',
    'apps/desktop/src/main/updater.ts',
    'apps/desktop/src/main/localBackup.ts',
    'apps/desktop/src/main/customerDisplay.ts',
    'apps/desktop/src/main/cashDrawer.ts',
    'apps/desktop/src/main/labelPrinter.ts',
    'apps/web/src/modules/organization/shops/pages/ShopsOverviewPage.tsx',
    'apps/web/src/modules/inventory/transfers',
    'apps/web/src/modules/inventory/products/pages/ProductBulkImportPage.tsx',
  ],
  factNote:
    'Cloud versus installed POS quotes ("not stored locally, but in a remote server", "generally subscription-based", "requires an internet connection") from the Wikipedia Point of sale article on 2026-10-26. Desktop column is general and tells readers to check their own system. Nafaa Windows app: auto-update (updater.ts), daily local backup with 30-day retention (localBackup.ts), customer display (customerDisplay.ts), cash drawer and label printer.',
  needsOwner: [
    'competitorUrl points to the Wikipedia "Point of sale" article because the page is about a category, not a vendor; confirm this is acceptable.',
  ],
};

export default spec;
