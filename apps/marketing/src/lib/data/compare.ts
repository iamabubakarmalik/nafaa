export interface Comparison {
  slug: string;
  competitor: string;
  titleEn: string;
  verdict: string;
  rows: Array<{ feature: string; nafaa: string; them: string }>;
  winner: string;
}

export const comparisons: Comparison[] = [
  {
    slug: 'nafaa-vs-tally',
    competitor: 'Tally',
    titleEn: 'Nafaa vs Tally — which is right for Pakistani business in 2026?',
    verdict: 'Tally is accounting software from the desktop era. Nafaa is a complete business operating system — POS, inventory, khata, marketplace, and AI — built mobile-first for Pakistan.',
    winner: 'Nafaa for any business that sells; Tally only if you need pure ledger accounting.',
    rows: [
      { feature: 'Point of Sale', nafaa: 'Built-in, under 3 seconds', them: 'Not available' },
      { feature: 'Mobile app', nafaa: 'Full iOS + Android', them: 'Limited viewer only' },
      { feature: 'Offline mode', nafaa: 'Full offline-first', them: 'Desktop only' },
      { feature: 'Urdu support', nafaa: 'Complete bilingual', them: 'English only' },
      { feature: 'JazzCash/Easypaisa/Raast', nafaa: 'All integrated', them: 'None' },
      { feature: 'Digital khata with WhatsApp', nafaa: 'Built-in, automated', them: 'Manual ledger' },
      { feature: 'FBR real-time integration', nafaa: 'Certified partner', them: 'Manual export' },
      { feature: 'Marketplace (Bazaar)', nafaa: 'Built-in', them: 'None' },
      { feature: 'Setup time', nafaa: '5 minutes', them: 'Days + training' },
      { feature: 'Price to start', nafaa: 'Free', them: 'License + setup fees' },
    ],
  },
  {
    slug: 'nafaa-vs-excel',
    competitor: 'Excel',
    titleEn: 'Nafaa vs Excel — when spreadsheets stop working',
    verdict: 'Excel is a calculator, not a business system. Nafaa gives you everything Excel does — plus real-time sync, multi-user access, automatic backup, and reports Excel cannot produce.',
    winner: 'Nafaa the moment more than one person touches your business data.',
    rows: [
      { feature: 'Multi-user access', nafaa: 'Unlimited, role-based', them: 'One file, version chaos' },
      { feature: 'Automatic backup', nafaa: 'Daily, encrypted cloud', them: 'Manual, if remembered' },
      { feature: 'Barcode scanning', nafaa: 'Built-in', them: 'Impossible' },
      { feature: 'Receipts', nafaa: 'Print + WhatsApp', them: 'None' },
      { feature: 'Real-time stock', nafaa: 'Auto-deduct on sale', them: 'Manual formulas' },
      { feature: 'Customer khata', nafaa: 'Auto reminders', them: 'Static cells' },
      { feature: 'Mobile access', nafaa: 'Native apps', them: 'Clunky web viewer' },
      { feature: 'Reports', nafaa: '60+ live reports', them: 'Build yourself' },
      { feature: 'Data loss risk', nafaa: 'Near zero', them: 'One corrupt file away' },
      { feature: 'Import from Excel', nafaa: 'One-click', them: '—' },
    ],
  },
  {
    slug: 'nafaa-vs-quickbooks',
    competitor: 'QuickBooks',
    titleEn: 'Nafaa vs QuickBooks — built for Pakistan vs adapted for it',
    verdict: 'QuickBooks is American accounting software adapted globally. Nafaa is built from day one for Pakistan — JazzCash, khata, FBR, Urdu, and offline mode included natively.',
    winner: 'Nafaa for any business operating in Pakistan.',
    rows: [
      { feature: 'Designed for Pakistan', nafaa: 'From day one', them: 'Adapted afterthought' },
      { feature: 'Urdu interface', nafaa: 'Complete', them: 'None' },
      { feature: 'JazzCash/Easypaisa/Raast', nafaa: 'Native integrations', them: 'Not supported' },
      { feature: 'FBR compliance', nafaa: 'Certified integration', them: 'Manual workaround' },
      { feature: 'Digital khata', nafaa: 'Core feature', them: 'Does not understand udhaar' },
      { feature: 'Offline mode', nafaa: 'Full', them: 'Cloud-only' },
      { feature: 'POS counter', nafaa: 'Built-in', them: 'Third-party add-on' },
      { feature: 'Support language', nafaa: 'Urdu + English, 24/7', them: 'English business hours' },
      { feature: 'Pricing', nafaa: 'PKR, free start', them: 'USD, expensive' },
      { feature: 'Local marketplace', nafaa: 'Nafaa Bazaar built-in', them: 'None' },
    ],
  },
  {
    slug: 'nafaa-vs-paper-register',
    competitor: 'Paper Register',
    titleEn: 'Nafaa vs Paper Register — the honest comparison',
    verdict: 'Paper costs you hours daily, loses your khata, and hides your profit. Nafaa does everything paper does — in seconds, with backup, reminders, and reports.',
    winner: 'Paper for nostalgia; Nafaa for business.',
    rows: [
      { feature: 'Daily time spent', nafaa: '15 minutes', them: '4+ hours' },
      { feature: 'Khata safety', nafaa: 'Encrypted cloud backup', them: 'Tears, fades, gets lost' },
      { feature: 'Udhaar recovery', nafaa: '95% with reminders', them: '~60% from memory' },
      { feature: 'Profit visibility', nafaa: 'Live, per product', them: 'End-of-month guess' },
      { feature: 'Customer reminders', nafaa: 'Automatic WhatsApp', them: 'Awkward phone calls' },
      { feature: 'Search old records', nafaa: 'Instant', them: 'Flip through pages' },
      { feature: 'Multiple staff', nafaa: 'Role-based, tracked', them: 'One book, chaos' },
      { feature: 'Cost per year', nafaa: 'Free to start', them: 'Rs 2,000+ books + lost money' },
      { feature: 'FBR compliance', nafaa: 'Automatic', them: 'Impossible' },
      { feature: 'Works during loadshedding', nafaa: 'Yes, offline-first', them: 'Yes — its only win' },
    ],
  },
];

export const getComparison = (slug: string) => comparisons.find((c) => c.slug === slug);
