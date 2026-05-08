import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CTA } from '@/components/home/CTA';
import { buildMetadata } from '@/lib/seo';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173';

const data: Record<
  string,
  {
    emoji: string;
    title: string;
    headline: string;
    description: string;
    pains: string[];
    features: string[];
    quote: { text: string; author: string; role: string };
  }
> = {
  bakery: {
    emoji: '🍞',
    title: 'Bakery & Sweets',
    headline: 'Software Built for Pakistani Bakeries',
    description:
      'From daily fresh production to custom cake orders, Nafaa helps bakeries run smoothly. Track expiry, manage advance orders, and never lose a sale.',
    pains: [
      'Daily production tracking nahi tha — kya bana, kya bika sab manual',
      'Custom cake orders aksar bhool jate the',
      'Expired items waste hoti rehti thi',
      'Khata book pe udhaar likhna mushkil tha',
    ],
    features: [
      'Daily production sheet — ek click pe sab record',
      'Custom cake orders with delivery date alerts',
      'Expiry date tracking — auto warnings 24h pehle',
      'Recipe management with cost calculations',
      'Walk-in vs delivery order separation',
      'WhatsApp order receipts to customers',
    ],
    quote: {
      text: 'Pehle hum sab kuch register par likhte the. Ab Nafaa pe sab kuch hai. Cake orders kabhi miss nahi hote, expiry alerts time pe milte hain. Ye hamari bakery ka future hai!',
      author: 'Ahmad Ali',
      role: 'Owner, Ahmad Bakery, Lahore',
    },
  },
  kiryana: {
    emoji: '🛒',
    title: 'Kiryana Store',
    headline: "Pakistan's Most Trusted Kiryana Store Software",
    description:
      'Built for the corner store reality — fast checkout, digital khata, low-stock alerts. Replace your paper register today.',
    pains: [
      'Paper khata kho jata tha ya phat jata tha',
      'Stock track karna namumkin — kya khatam hua kya nahi',
      'Daily sale ka hisaab raat ko dimag par boojh',
      'Customer purana udhaar yaad nahi rakhte',
    ],
    features: [
      'Lightning-fast POS with barcode scan',
      'Digital khata with WhatsApp reminders',
      'Auto low-stock alerts before items run out',
      'Daily sales summary on phone every evening',
      'Customer purchase history at fingertips',
      'Works on cheap Android phones too',
    ],
    quote: {
      text: 'Mera khata book digital ho gaya. Customers ko WhatsApp pe reminder chala jata hai, wapsi zaroor hoti hai. Daily ki sale phone par dekh leta hoon. Bohot accha hai!',
      author: 'Imran Hussain',
      role: 'Owner, Imran Kiryana Store, Multan',
    },
  },
  'mobile-shop': {
    emoji: '📱',
    title: 'Mobile Shop',
    headline: 'IMEI Tracking & Mobile Shop Management',
    description:
      'Sell phones, accessories, and repairs all from one platform. Track every IMEI, manage customer warranties, and grow your shop.',
    pains: [
      'IMEI numbers ka koi proper record nahi tha',
      'Repair history customers ko explain karna mushkil',
      'Accessories ka stock track karna namumkin',
      'Multi-branch ka hisaab nahi rehta tha',
    ],
    features: [
      'IMEI/serial number tracking for every device',
      'Repair management with status updates',
      'Customer warranty tracking',
      'Accessories inventory with size variants',
      'Multi-branch stock transfer',
      'SMS notifications when repair ready',
    ],
    quote: {
      text: 'Ab mein 3 branches ek hi dashboard se manage karta hoon. IMEI tracking, repair history, accessories — sab perfect. Time bohot bachta hai.',
      author: 'Muhammad Bilal',
      role: 'Owner, Bilal Mobile Centre, Islamabad',
    },
  },
  pharmacy: {
    emoji: '💊',
    title: 'Pharmacy',
    headline: 'Smart Pharmacy Management for Pakistan',
    description:
      'Batch tracking, expiry alerts, prescription scanning — all the tools modern pharmacies need to serve customers better and reduce waste.',
    pains: [
      'Expired medicines ka loss hota tha',
      'Batch numbers track karna mushkil',
      'Prescriptions ki copies kho jati thin',
      'Stock count manually krna boring',
    ],
    features: [
      'Batch & expiry date tracking',
      'Auto-alerts 30/60/90 days before expiry',
      'Prescription scan and store',
      'Salt-based search for alternatives',
      'Manufacturer & supplier tracking',
      'Quick checkout with insurance support',
    ],
    quote: {
      text: 'Expiry tracking aur batch management bohot accha hai. Ab koi medicine waste nahi hoti. Customer ko receipt SMS bhi chala jata hai. Recommend!',
      author: 'Fatima Khan',
      role: 'Manager, ZK Pharmacy, Karachi',
    },
  },
  restaurant: {
    emoji: '🍕',
    title: 'Restaurant & Cafe',
    headline: 'Restaurant POS for Modern Cafes',
    description:
      'Manage table orders, kitchen display, recipes, and delivery from one beautiful interface. Built for the Pakistani food scene.',
    pains: [
      'Table orders aur kitchen ke beech communication gap',
      'Recipe costs calculate karna mushkil',
      'Delivery orders ka hisaab alag',
      'Daily food waste track nahi hota',
    ],
    features: [
      'Table layout management',
      'Kitchen display system (KDS)',
      'Recipe management with cost tracking',
      'Delivery order integration',
      'Wastage tracking & reports',
      'Split bills & multiple payments',
    ],
    quote: {
      text: 'Kitchen display system se orders kabhi miss nahi hote. Recipe cost tracking se profit margins clear hain. Bohot zabardast tool hai!',
      author: 'Hassan Sheikh',
      role: 'Owner, Karahi House, Lahore',
    },
  },
  garments: {
    emoji: '👕',
    title: 'Garments & Fashion',
    headline: 'Fashion Retail Made Simple',
    description:
      'Manage size & color variants, seasonal collections, and fashion-forward inventory with ease.',
    pains: [
      'Size aur color variants ka system chahiye tha',
      'Season ke khatam hone par discounts manual',
      'Customer measurements yaad nahi rehte',
      'Returns/exchanges complicated',
    ],
    features: [
      'Size & color variant matrix',
      'Seasonal collection management',
      'Customer measurement profiles',
      'Easy returns & exchanges',
      'Brand-wise reports',
      'Photo catalog with WhatsApp share',
    ],
    quote: {
      text: 'Size aur color variants ka system zabardast hai. Stock ki tension khatam, customer hisaab bhi clear, sab kuch organized hai!',
      author: 'Sara Ahmed',
      role: 'Owner, Sara Garments, Faisalabad',
    },
  },
  meat: {
    emoji: '🥩',
    title: 'Meat & Poultry',
    headline: 'Weight-Based Sales for Meat Shops',
    description:
      'Direct integration with weighing scales, proper KG/gram pricing, and customer-specific cuts tracking.',
    pains: [
      'Weight aur price calculate karna time consuming',
      'Customer specific cuts yaad rakhna mushkil',
      'Daily fresh inventory rotation',
    ],
    features: [
      'Scale integration (USB & Bluetooth)',
      'Weight-based dynamic pricing',
      'Customer cut preferences saved',
      'Daily fresh stock management',
      'Halal certification tracking',
    ],
    quote: {
      text: 'Scale se direct connect ho jata hai. Weight aur price automatic calculate. Customer ki saari pasand bhi save rehti hai.',
      author: 'Tariq Butt',
      role: 'Owner, Butt Meat Shop, Rawalpindi',
    },
  },
  vegetables: {
    emoji: '🥬',
    title: 'Vegetables & Fruits',
    headline: 'Fresh Produce Management',
    description:
      'Daily price updates, weight-based selling, and supplier (mandi) management for fresh produce sellers.',
    pains: [
      'Mandi se daily price changes track karna',
      'Wastage aur freshness manage karna',
      'Supplier ka hisaab alag rakhna',
    ],
    features: [
      'Daily price update from mandi',
      'Weight-based pricing with scales',
      'Supplier (arhati) management',
      'Wastage & loss tracking',
      'Freshness rotation alerts',
    ],
    quote: {
      text: 'Mandi se rate update karta hoon, customer ko sahi rate milta hai. Wastage bhi kam ho gayi, profit barh gaya.',
      author: 'Akram Bhai',
      role: 'Owner, Akram Sabzi Mandi, Sialkot',
    },
  },
  cosmetics: {
    emoji: '💄',
    title: 'Cosmetics & Beauty',
    headline: 'Beauty Retail Software',
    description:
      'Brand catalogs, customer loyalty, makeup variants, and personalized recommendations.',
    pains: ['Brand catalogs manage karna', 'Customer skin types yaad rakhna', 'Loyalty rewards calculate karna'],
    features: ['Brand-wise organization', 'Skin type & customer profiles', 'Loyalty points program', 'Sample tracking', 'Beauty consultant performance'],
    quote: {
      text: 'Loyalty points ka system hai jis se customers wapas aate hain. Discount codes bhi share karti hoon. Sales 40% barh gayi!',
      author: 'Ayesha Tariq',
      role: 'Owner, Ayesha Cosmetics, Rawalpindi',
    },
  },
  electronics: {
    emoji: '🔌',
    title: 'Electronics',
    headline: 'Electronics Shop Management',
    description: 'Serial number tracking, warranty management, and technical specs for electronics retailers.',
    pains: ['Serial numbers track karna', 'Warranty claims handle karna', 'Technical specs explain karna'],
    features: ['Serial/IMEI tracking', 'Warranty claim management', 'Technical specifications database', 'Spare parts inventory', 'Service center tracking'],
    quote: {
      text: 'Warranty tracking se ab claims process karna asaan hai. Customer ko bhi instant info mil jati hai.',
      author: 'Wasim Akhtar',
      role: 'Owner, Akhtar Electronics, Karachi',
    },
  },
  hardware: {
    emoji: '🔧',
    title: 'Hardware Store',
    headline: 'Hardware Store Management',
    description: 'Bulk sales, contractor accounts, and project-based pricing for hardware businesses.',
    pains: ['Bulk orders manage karna', 'Contractor credit terms', 'Project-wise tracking'],
    features: ['Bulk order management', 'Contractor account ledgers', 'Project-based pricing', 'Bulk discount automation', 'Site delivery tracking'],
    quote: {
      text: 'Contractor accounts aur project tracking se business bohot organized ho gaya. Bulk orders ka hisaab clear.',
      author: 'Khalid Mahmood',
      role: 'Owner, Mahmood Hardware, Lahore',
    },
  },
  'auto-parts': {
    emoji: '🔩',
    title: 'Auto Parts',
    headline: 'Auto Parts Inventory',
    description: 'Vehicle compatibility, part numbers, and technical catalogs for auto parts shops.',
    pains: ['Vehicle compatibility check karna', 'Part numbers yaad rakhna', 'Technical catalog manage karna'],
    features: ['Vehicle compatibility database', 'Part number search', 'Technical specs catalog', 'OEM vs aftermarket tracking', 'Mechanic accounts'],
    quote: {
      text: 'Vehicle compatibility check ek click pe ho jata hai. Ab koi galat part nahi bechte, customers khush hain.',
      author: 'Adnan Sheikh',
      role: 'Owner, Sheikh Auto Parts, Multan',
    },
  },
};

export async function generateStaticParams() {
  return Object.keys(data).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = data[slug];
  if (!item) return buildMetadata({ title: 'Industry Not Found' });
  return buildMetadata({
    title: `${item.title} POS Software in Pakistan`,
    description: item.description,
    path: `/industries/${slug}`,
    keywords: [item.title.toLowerCase() + ' software pakistan', item.title.toLowerCase() + ' pos pakistan'],
  });
}

export default async function IndustryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = data[slug];
  if (!item) notFound();

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
          <Container className="relative">
            <Link href="/industries" className="text-sm text-slate-500 hover:text-brand-600 inline-flex items-center gap-1 mb-6">
              ← Back to Industries
            </Link>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="text-7xl mb-5">{item.emoji}</div>
                <Badge variant="brand">{item.title}</Badge>
                <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-balance leading-tight">
                  <span className="gradient-text">{item.headline}</span>
                </h1>
                <p className="mt-5 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">{item.description}</p>
                <div className="mt-7 flex gap-3">
                  <Button size="lg" href={`${APP_URL}/register`}>
                    Start Free Trial <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="secondary" href="/contact">
                    Talk to Sales
                  </Button>
                </div>
              </div>

              {/* Pains */}
              <div className="rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-7">
                <div className="text-2xl font-extrabold text-rose-700 dark:text-rose-400">😣 Common Problems</div>
                <ul className="mt-5 space-y-3">
                  {item.pains.map((p, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300">
                      <span className="text-rose-500 mt-0.5">✗</span>
                      <span className="text-sm leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Container>
        </section>

        {/* Solutions */}
        <section className="py-16 bg-slate-50 dark:bg-slate-950/50">
          <Container>
            <div className="text-center mb-12">
              <Badge variant="brand">✨ Our Solution</Badge>
              <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold">How Nafaa Solves These Problems</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {item.features.map((f, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6"
                >
                  <div className="h-10 w-10 rounded-xl bg-brand-100 dark:bg-brand-950 flex items-center justify-center">
                    <Check className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <p className="mt-4 text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{f}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Quote */}
        <section className="py-16">
          <Container>
            <div className="max-w-3xl mx-auto rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-700 p-10 lg:p-14 text-white text-center">
              <div className="text-5xl mb-4">"</div>
              <p className="text-xl lg:text-2xl font-medium leading-relaxed">{item.quote.text}</p>
              <div className="mt-7 pt-7 border-t border-white/30">
                <div className="font-bold text-lg">{item.quote.author}</div>
                <div className="text-white/80 text-sm">{item.quote.role}</div>
              </div>
            </div>
          </Container>
        </section>

        <CTA />
      </main>
      <Footer />
    </>
  );
}
