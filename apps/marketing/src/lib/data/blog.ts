export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  categoryEmoji: string;
  tags: string[];
  author: string;
  authorRole: string;
  publishedAt: string;
  readTime: number;
  featured?: boolean;
  content: string;
}

export const blogCategories = [
  { slug: 'business-guides', name: 'Business Guides', emoji: '💡' },
  { slug: 'tutorials', name: 'Tutorials', emoji: '🎓' },
  { slug: 'success-stories', name: 'Success Stories', emoji: '🏆' },
  { slug: 'product-news', name: 'Product News', emoji: '🚀' },
  { slug: 'industry-insights', name: 'Industry Insights', emoji: '📊' },
  { slug: 'compliance', name: 'Compliance & Tax', emoji: '⚖️' },
];

export const blogPosts: BlogPost[] = [
  {
    slug: 'how-to-start-business-in-pakistan-2026',
    title: 'How to Start a Business in Pakistan in 2026 — The Complete Guide',
    excerpt: 'From registration to your first sale: NTN, bank account, POS setup, FBR compliance, and going online. Everything a new Pakistani entrepreneur needs.',
    category: 'business-guides', categoryEmoji: '💡',
    tags: ['start business pakistan', 'entrepreneurship', 'NTN registration', 'FBR'],
    author: 'Abubakar Malik', authorRole: 'Founder, Nafaa',
    publishedAt: '2026-07-20', readTime: 14, featured: true,
    content: `Starting a business in Pakistan in 2026 is easier than ever — if you follow the right sequence. This guide walks you through every step.

## Step 1: Choose your business structure

Most small Pakistani businesses start as sole proprietorships. Register with FBR to get your NTN (National Tax Number) — it is free and takes two days online through the IRIS portal.

## Step 2: Open a business bank account

Every major Pakistani bank now supports Raast for instant free transfers. Open an account at HBL, Meezan, MCB, or any bank convenient to you. You will need your CNIC, NTN, and business address proof.

## Step 3: Set up your operations system

This is where most new businesses fail — they start selling with a notebook and lose track within weeks. Set up a proper POS from day one:

- **Inventory:** Add every product with cost and sale price
- **Digital khata:** Track udhaar customers digitally, never on paper
- **Receipts:** Professional WhatsApp receipts build instant trust

Nafaa's free Starter plan covers all of this with no credit card required.

## Step 4: FBR compliance

If you are a Tier 1 retailer, FBR POS integration is mandatory. Even if not required yet, integrating early saves painful retroactive work later. Nafaa is a certified FBR POS integration partner — setup takes twelve minutes.

## Step 5: Accept every payment method

Pakistani customers in 2026 pay with cash, JazzCash, Easypaisa, Raast, and cards. Accepting all of them from day one means you never lose a sale. Raast is completely free — zero transaction fees.

## Step 6: Go online

Once your shop runs smoothly, expand online. List on Daraz, connect Foodpanda if you serve food, and publish your inventory on Nafaa Bazaar — Pakistan's marketplace with bargaining, group buys, and live shopping built in.

## The real cost of starting

| Item | Cost |
|---|---|
| NTN registration | Free |
| Business bank account | Free |
| Nafaa Starter plan | Free |
| Barcode scanner (optional) | Rs 3,500 |
| Thermal printer (optional) | Rs 8,000 |

Total to start professionally: **under Rs 12,000** — less than most people spend on shop decoration.

## Common mistakes to avoid

1. Starting with paper khata — you will lose records and money
2. Ignoring FBR until a notice arrives
3. Accepting only cash — you lose 40% of potential customers
4. Waiting to go online "until the shop is established"

Start digital from day one. Your future self will thank you.`,
  },
  {
    slug: 'digital-khata-complete-guide',
    title: 'Digital Khata — The Complete Guide to Replacing Your Paper Register',
    excerpt: 'Why 95% of udhaar gets recovered with digital khata vs 60% on paper. Setup, WhatsApp reminders, credit limits, and PDF statements explained.',
    category: 'tutorials', categoryEmoji: '🎓',
    tags: ['digital khata', 'udhaar app', 'khata book', 'whatsapp reminders'],
    author: 'Fatima Khan', authorRole: 'Content Lead, Nafaa',
    publishedAt: '2026-07-12', readTime: 9,
    content: `Every Pakistani shopkeeper knows the lal khata book. And every shopkeeper has lost money because of it. Here is how digital khata fixes everything.

## The problem with paper khata

- Pages tear, ink fades, books get lost
- Customers genuinely forget amounts — or claim to
- You spend an hour nightly reconciling
- Asking for payment feels awkward, so you delay, and the udhaar grows

## How digital khata works in Nafaa

1. Customer buys on credit — the sale records against their profile instantly
2. Their balance updates in real time
3. On the due date, an automatic WhatsApp reminder goes out with the exact amount and a one-tap payment link
4. When they pay via JazzCash, Easypaisa, or Raast, their khata updates automatically

## Why WhatsApp reminders recover 95%

A paper reminder gets lost. A phone call feels aggressive. A polite WhatsApp message with the exact amount and an instant payment option? That gets paid.

Nafaa's reminder sequence is gentle: day 3, day 7, day 15, day 30. Culturally appropriate, professional, and effective. Customers actually thank shopkeepers for the convenience.

## Credit limits that protect you

Set a maximum udhaar per customer. When a cashier tries to exceed it, the system warns and requires owner approval. Your generosity has boundaries now.

## PDF statements for wholesale accounts

Send professional monthly statements with one tap — perfect for wholesale customers and businesses that need records for their own accounts.

## Getting started takes 10 minutes

Add your customers with their phone numbers, import outstanding balances if you have them, and you are live. The next udhaar customer gets tracked automatically.`,
  },
  {
    slug: 'fbr-pos-integration-guide-pakistan',
    title: 'FBR POS Integration — What Every Pakistani Retailer Must Know in 2026',
    excerpt: 'Tier 1 retailer rules, real-time invoice submission, QR codes, penalties for non-compliance, and how to get integrated in under 15 minutes.',
    category: 'compliance', categoryEmoji: '⚖️',
    tags: ['FBR POS', 'tier 1 retailer', 'sales tax pakistan', 'IRIS'],
    author: 'Nafaa Compliance Team', authorRole: 'Compliance',
    publishedAt: '2026-06-28', readTime: 11, featured: true,
    content: `FBR POS integration is no longer optional for Tier 1 retailers in Pakistan. Here is everything you need to know to stay compliant — and avoid penalties.

## Who must integrate?

Tier 1 retailers include businesses operating from air-conditioned premises, chains with multiple branches, and retailers above specified turnover thresholds. If FBR has classified you as Tier 1, real-time POS integration is legally mandatory.

## What the law requires

- Every sale submitted to FBR in real time
- QR code printed on every receipt so customers can verify
- Records maintained for 72 months
- Sandbox testing before going live

## How Nafaa handles it automatically

1. You enter your POS ID, NTN, and API token once
2. Every sale flows to FBR within seconds
3. QR codes print automatically on every receipt
4. If FBR servers are down, submissions queue and retry — zero data loss
5. Six years of records stored, audit-ready at any time

## The penalty for non-compliance

FBR penalties for Tier 1 retailers without integration include fines starting at Rs 500,000 and potential sealing of premises. Integration takes twelve minutes in Nafaa. There is no rational reason to delay.

## Sandbox first, always

Test in FBR's sandbox environment with dummy transactions before going live. Nafaa supports one-toggle switching between sandbox and production.`,
  },
  {
    slug: 'sell-online-pakistan-marketplace-guide',
    title: 'How to Sell Online in Pakistan — Daraz, Shopify, or Nafaa Bazaar?',
    excerpt: 'An honest comparison of every online selling channel for Pakistani businesses in 2026 — fees, features, and which one fits your shop.',
    category: 'business-guides', categoryEmoji: '💡',
    tags: ['sell online pakistan', 'daraz seller', 'nafaa bazaar', 'ecommerce'],
    author: 'Abubakar Malik', authorRole: 'Founder, Nafaa',
    publishedAt: '2026-06-15', readTime: 10,
    content: `Every Pakistani shopkeeper eventually asks: where should I sell online? Here is an honest breakdown.

## Option 1: Daraz

Pakistan's largest marketplace. Massive reach, but commissions run 5-15% plus payment fees, competition is brutal on price, and you have zero customer relationship.

**Best for:** Commodity products where price wins.

## Option 2: Shopify or WooCommerce

Your own store, full control, but you must drive your own traffic — which means marketing budget most small shops don't have.

**Best for:** Brands with existing audiences.

## Option 3: Social media (Instagram, TikTok, WhatsApp)

Free to start, great for fashion and food, but no real inventory, payment, or order system. Chaos at scale.

**Best for:** Testing demand before investing.

## Option 4: Nafaa Bazaar

Pakistan's first smart marketplace with features nobody else has:

- **Bargaining** — the way Pakistanis actually shop
- **Group buys** — neighbors pool orders for wholesale prices
- **Live shopping** — stream and sell in real time
- **Auctions** — let the market price rare items
- **Escrow protection** — fraud is structurally impossible
- **One-tap sync** — if you use Nafaa POS, your inventory goes live instantly

**Best for:** Pakistani businesses that want online reach with local shopping culture preserved.

## The smartest strategy: everywhere, from one inventory

Don't choose one. With Nafaa, your inventory syncs to Daraz, your own website, and Nafaa Bazaar simultaneously. Every order lands in one dashboard. Sell everywhere, manage once.`,
  },
  {
    slug: 'kiryana-store-profit-guide',
    title: '7 Ways Kiryana Stores in Pakistan Are Doubling Profits in 2026',
    excerpt: 'Real tactics from high-performing kiryana stores: multi-unit pricing, digital khata recovery, dead stock elimination, and more.',
    category: 'industry-insights', categoryEmoji: '📊',
    tags: ['kiryana store', 'profit', 'retail tips pakistan'],
    author: 'Imran Hussain', authorRole: 'Kiryana Owner, Multan',
    publishedAt: '2026-06-01', readTime: 8,
    content: `I run a kiryana store in Multan. Two years ago I was working 16 hours daily for Rs 30,000 monthly profit. Today I work 8 hours for Rs 80,000. Here is exactly what changed.

## 1. Digital khata recovered money I had written off

My paper register had roughly Rs 80,000 in udhaar I had mentally accepted as lost. Digital khata with WhatsApp reminders recovered 95% of it within two months. That alone paid for years of software.

## 2. Multi-unit pricing stopped revenue leakage

I was selling sugar by kilo but customers asked for 250 grams. Mental math errors were costing me daily. Now the system prices every unit automatically — piece, gram, kilo, packet, carton.

## 3. Low-stock alerts ended "woh khatam ho gaya"

Nothing kills a kiryana sale like "out of stock." Automatic alerts before items run out means my shelves are never empty of the forty items that drive 80% of my revenue.

## 4. Daily profit visibility changed my decisions

I used to guess which items made money. Turns out two of my "best sellers" had negative margins after accounting for waste. I restocked smarter and margins jumped 18%.

## 5. WhatsApp receipts brought customers back

Customers photograph paper receipts never. They keep WhatsApp receipts forever. When they need something, my last receipt with my shop name is right there in their chat.

## 6. Expiry tracking eliminated waste

Dairy and bread expiry losses dropped from Rs 6,000 monthly to under Rs 800. The system warns me three days before expiry so I discount and sell instead of throwing away.

## 7. Selling online added a second revenue stream

My Nafaa inventory went live on Nafaa Bazaar in one tap. Online orders now add Rs 15,000-20,000 monthly with zero extra staff.

None of this required hiring anyone. It required stopping doing manually what software does better.`,
  },
  {
    slug: 'restaurant-foodpanda-integration-profits',
    title: 'How Restaurants Are Adding Rs 100K+ Monthly with Foodpanda Integration',
    excerpt: 'Foodpanda orders flowing directly into your kitchen display, auto-pause on stock-out, and commission tracking — the complete playbook.',
    category: 'tutorials', categoryEmoji: '🎓',
    tags: ['foodpanda integration', 'restaurant POS', 'delivery'],
    author: 'Hassan Sheikh', authorRole: 'Restaurant Owner, Lahore',
    publishedAt: '2026-05-18', readTime: 7,
    content: `My restaurant in Lahore does Rs 120,000 monthly on Foodpanda — with zero extra staff. Here is the exact setup.

## The problem before integration

Foodpanda orders came on a separate tablet. Someone had to watch it, shout orders to the kitchen, and manually mark statuses. During rush, orders got missed. Missed orders mean penalties and bad ratings.

## The setup that changed everything

1. Connected Foodpanda to Nafaa (5 minutes)
2. Menu synced automatically — prices and items always match
3. Orders print directly to the kitchen (KOT)
4. Marking ready in Nafaa updates Foodpanda instantly

## The hidden wins nobody talks about

**Auto-pause on stock-out:** When chicken runs out in Nafaa, chicken items hide on Foodpanda automatically. No more cancelled orders, no rating damage.

**True profit per order:** After Foodpanda's commission, some items lose money. Nafaa shows profit per item per channel. I re-priced three items and recovered Rs 18,000 monthly.

**Unified reports:** Dine-in + takeaway + Foodpanda in one dashboard. I finally know my real numbers.

## Rating improvement side-effect

Faster kitchen flow means faster delivery means better ratings means better Foodpanda placement means more orders. Our rating went from 4.1 to 4.7 in three months.`,
  },
  {
    slug: 'pharmacy-drap-compliance-guide',
    title: 'Pharmacy Software in Pakistan — DRAP Compliance, Batch Tracking & Salt Search Explained',
    excerpt: 'What DRAP requires from pharmacies, how batch and expiry tracking eliminates losses, and why salt-based search matters more than you think.',
    category: 'compliance', categoryEmoji: '⚖️',
    tags: ['pharmacy software', 'DRAP', 'batch tracking', 'expiry'],
    author: 'Nafaa Compliance Team', authorRole: 'Compliance',
    publishedAt: '2026-04-25', readTime: 9,
    content: `Running a pharmacy in Pakistan means DRAP compliance, expiry risk, and customers asking for salts you must identify instantly. Here is how modern pharmacies handle all three.

## DRAP requirements you cannot ignore

- Purchase and sales records for every medicine
- Batch-wise tracking with expiry dates
- Controlled substance registers for scheduled medicines
- Prescription records for prescription-only medicines
- Inspection-ready at any time

Paper registers technically comply — until an inspector asks for a specific batch from eight months ago and you spend three hours searching.

## Batch and expiry tracking that pays for itself

Every purchase in Nafaa creates a batch record with expiry date. FIFO logic ensures oldest stock sells first. Automatic alerts at 90, 60, and 30 days before expiry let you return to distributors or discount-sell instead of writing off.

Pharmacies report expiry losses dropping to near zero — typically saving Rs 15,000-40,000 monthly.

## Salt search: the feature customers notice

Customer asks for "Panadol" — out of stock. Salt search shows every medicine with paracetamol instantly: Calpol, Panodol, Febrol. You make the sale instead of losing it, and the customer learns you actually know medicines.

## Prescription scanning for legal safety

Scan and attach prescriptions to sales of prescription-only medicines. If DRAP ever questions a sale, the prescription is one tap away.`,
  },
  {
    slug: 'nafaa-bazaar-launch-announcement',
    title: 'Introducing Nafaa Bazaar — Pakistan\'s First Smart Marketplace',
    excerpt: 'Bargaining, group buys, live shopping, and auctions — built for how Pakistan actually shops. Sellers go live in one tap from Nafaa POS.',
    category: 'product-news', categoryEmoji: '🚀',
    tags: ['nafaa bazaar', 'marketplace', 'launch', 'live shopping'],
    author: 'Nafaa Team', authorRole: 'Product',
    publishedAt: '2026-07-01', readTime: 6, featured: true,
    content: `Today we launch Nafaa Bazaar — not another Daraz clone, but a marketplace designed around how Pakistanis actually shop.

## Why existing marketplaces feel foreign

Fixed prices with no bargaining. Zero relationship between buyer and seller. A shopping experience designed in California, translated into Urdu.

## What makes Bazaar different

**Bargaining, digitized.** Buyers make offers. Sellers counter. Deals close in chat. The soul of every Pakistani bazaar, preserved online.

**Group buys.** Fifty neighbors buying rice together pay wholesale. Pakistan's collective buying culture, finally online.

**Live shopping.** Sellers stream, show products, answer questions, close sales in real time. Pakistan's first live commerce platform.

**Auctions.** Rare carpets, vintage jewelry, collectibles — transparent real-time bidding.

**Escrow protection.** Money held until the buyer confirms delivery. Fraud is structurally impossible.

## For Nafaa POS sellers: one tap

Your entire inventory — photos, prices, stock levels — goes live on Bazaar with a single tap. Orders flow back into your POS alongside walk-in sales. One inventory, two channels, zero extra work.

Visit [bazaar.nafaa.pk](https://bazaar.nafaa.pk) — as a buyer or a seller, welcome home.`,
  },
];

export const getPost = (slug: string) => blogPosts.find((p) => p.slug === slug);
export const featuredPosts = blogPosts.filter((p) => p.featured);
export const postsByCategory = (cat: string) => blogPosts.filter((p) => p.category === cat);
