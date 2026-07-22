import { useState, useMemo } from 'react';
import {
  HelpCircle, MessageCircle, Mail, Phone, Globe, BookOpen,
  ChevronRight, ChevronDown, Send, ExternalLink, Headphones,
  ShoppingCart, Package, Users, Wallet, BarChart3, Star, FileText, Sparkles,
  Search, Zap, Shield, Clock, CheckCircle2, ArrowRight, Video, Lightbulb,
  TrendingUp, Award, Heart, Rocket,
} from 'lucide-react';

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  icon: any;
  color: string;
  bg: string;
}

const SUPPORT_PHONE = '03241772933';
const SUPPORT_PHONE_INTL = '+923241772933';
const SUPPORT_EMAIL = 'support@nafaa.pk';
const SUPPORT_WEBSITE = 'https://nafaa.pk';
const WHATSAPP_NUMBER = '923241772933';

const categories = [
  { id: 'all', label: 'All', icon: Sparkles, color: '#2563eb' },
  { id: 'sales', label: 'Sales & POS', icon: ShoppingCart, color: '#16a34a' },
  { id: 'inventory', label: 'Inventory', icon: Package, color: '#f59e0b' },
  { id: 'customers', label: 'Customers', icon: Users, color: '#8b5cf6' },
  { id: 'finance', label: 'Finance', icon: Wallet, color: '#dc2626' },
  { id: 'reports', label: 'Reports', icon: BarChart3, color: '#2563eb' },
  { id: 'account', label: 'Account', icon: Shield, color: '#7c3aed' },
];

const faqs: FAQ[] = [
  {
    id: '1',
    category: 'sales',
    question: 'POS pe sale kaise karein?',
    answer:
      'POS page pe jaayen → Products select karein → Checkout press karein → Customer select karein → Payment method choose karein → Complete Sale dabayen. Sale automatic save ho jaayegi.',
    icon: ShoppingCart,
    color: '#16a34a',
    bg: '#dcfce7',
  },
  {
    id: '2',
    category: 'finance',
    question: 'Udhaar (Khata) kaise track karein?',
    answer:
      'Sale ke time customer select karein aur "Full Udhaar" ya "Partial" mode choose karein. Khata page pe har customer ka pura ledger dekh sakte hain. Payment receive karne ke liye customer ke khata mein "Payment" button dabayen.',
    icon: BookOpen,
    color: '#dc2626',
    bg: '#fee2e2',
  },
  {
    id: '3',
    category: 'inventory',
    question: 'Product kaise add karein?',
    answer:
      'Products page → "New Product" button dabayen → Multi-step form fill karein: Basic Info → Pricing → Stock → Tags → Create karein. Baad mein images aur variants edit screen se add kar sakte hain.',
    icon: Package,
    color: '#2563eb',
    bg: '#dbeafe',
  },
  {
    id: '4',
    category: 'customers',
    question: 'Customer kaise add karein?',
    answer:
      'Customers page → "+ New" → Name (required), phone, email fill karein → Credit limit set karein agar udhaar dena hai → Save. Customer fauran POS aur Khata mein available ho jaayega.',
    icon: Users,
    color: '#8b5cf6',
    bg: '#ede9fe',
  },
  {
    id: '5',
    category: 'finance',
    question: 'Cash Register kya hai?',
    answer:
      'Cash Register se aap din ke shuru aur akhir mein drawer cash count track karte hain. Subah Open karte waqt opening balance enter karein, raat ko close karte waqt actual cash count karein — system difference automatic calculate karega.',
    icon: Wallet,
    color: '#16a34a',
    bg: '#dcfce7',
  },
  {
    id: '6',
    category: 'reports',
    question: 'Reports kahaan se dekhein?',
    answer:
      'Sidebar mein Reports section. Yahan sales trend, top products, profit margins, payment method breakdown sab milega. Profit by Product report alag se hai jo har product ka margin show karta hai.',
    icon: BarChart3,
    color: '#2563eb',
    bg: '#dbeafe',
  },
  {
    id: '7',
    category: 'inventory',
    question: 'Stock kaise update karein?',
    answer:
      'Stock 3 tareeqon se update hota hai: (1) Purchase record karne par automatic increase, (2) Sale par automatic decrease, (3) Stock Adjustments mein manual Add/Remove/Damage/Loss record kar sakte hain. Sab changes Stock Movements mein log hota hai.',
    icon: Package,
    color: '#f59e0b',
    bg: '#fef3c7',
  },
  {
    id: '8',
    category: 'account',
    question: 'Team member kaise add karein?',
    answer:
      'Sirf Owner team manage kar sakta hai. Team page mein "+ Add Member" → Name, email, password set karein → Role choose karein (Manager / Cashier / Staff) → Save. Member fauran login kar sakega.',
    icon: Users,
    color: '#7c3aed',
    bg: '#ede9fe',
  },
  {
    id: '9',
    category: 'account',
    question: 'Backup kaise lein?',
    answer:
      'Backup page pe "Download Full Backup" press karein. Pura tenant data JSON file mein download ho jaayega. Cloud storage ya email pe save karna recommended hai.',
    icon: FileText,
    color: '#2563eb',
    bg: '#dbeafe',
  },
  {
    id: '10',
    category: 'account',
    question: 'Plan upgrade kaise karein?',
    answer:
      'Plans page pe apni zaroorat ke mutabiq plan choose karein → "Upgrade" dabayen → Payment complete karein. Plan Usage page pe dekha jaa sakta hai abhi kitna use ho raha hai aur limit kya hai.',
    icon: Star,
    color: '#f59e0b',
    bg: '#fef3c7',
  },
  {
    id: '11',
    category: 'sales',
    question: 'Return kaise process karein?',
    answer:
      'Returns page → "+ New Return" → Original sale find karein ya manual entry karein → Items select karein jo return karne hain → Refund method choose karein (Cash / Khata adjust) → Submit karein. Stock automatic wapas add ho jaayega.',
    icon: ShoppingCart,
    color: '#16a34a',
    bg: '#dcfce7',
  },
  {
    id: '12',
    category: 'sales',
    question: 'Discount kaise apply karein?',
    answer:
      'POS pe item ke saamne discount icon dabayen ya total pe global discount lagayen (% ya fixed amount). Pre-defined discounts Discounts page se manage kar sakte hain.',
    icon: Star,
    color: '#f59e0b',
    bg: '#fef3c7',
  },
];

export default function HelpPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
      const matchesSearch =
        !search ||
        faq.question.toLowerCase().includes(search.toLowerCase()) ||
        faq.answer.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory]);

  return (
    <div className="space-y-6 pb-10">
      {/* Premium Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-indigo-800 text-white p-8 shadow-2xl">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" />

        <div className="relative flex items-center justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1.5 text-xs font-bold border border-white/20">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <Headphones className="h-3.5 w-3.5" />
              24/7 Support Available
            </div>
            <h2 className="mt-4 text-4xl font-extrabold tracking-tight">
              Help & Support Center
            </h2>
            <p className="mt-2 text-base text-white/80 max-w-xl">
              Hum hain aap ke saath. Urdu, English aur Roman Urdu mein madad — fast, friendly, free.
            </p>

            {/* Search */}
            <div className="mt-5 relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/60" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search FAQs... e.g., 'sale', 'udhaar', 'stock'"
                className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 focus:bg-white/15 transition"
              />
            </div>
          </div>

          <div className="hidden md:flex h-24 w-24 rounded-3xl bg-white/15 backdrop-blur border border-white/20 items-center justify-center shadow-xl">
            <HelpCircle className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Stats */}
        <div className="relative mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Zap, label: '< 5 min', sub: 'Avg reply' },
            { icon: Heart, label: '4.9★', sub: 'Rating' },
            { icon: Users, label: '5,000+', sub: 'Happy users' },
            { icon: Award, label: '100%', sub: 'Free support' },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 p-3">
              <s.icon className="h-4 w-4 text-white/80 mb-1" />
              <div className="text-lg font-extrabold">{s.label}</div>
              <div className="text-[10px] text-white/70 font-medium">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Contact - Premium Cards */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%2C%20I%20need%20help%20with%20Nafaa`}
          target="_blank"
          rel="noopener noreferrer"
          className="relative overflow-hidden rounded-2xl p-5 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all group"
          style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}
        >
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10 group-hover:scale-150 transition-transform duration-500" />
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-white/25 backdrop-blur flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-6 transition">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div className="text-white font-extrabold text-lg">WhatsApp</div>
            <div className="text-white/90 text-xs mt-0.5 font-medium">Fastest reply • 24/7</div>
            <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-white">
              Chat now <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </a>

        <a
          href={`tel:${SUPPORT_PHONE_INTL}`}
          className="relative overflow-hidden rounded-2xl p-5 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all group bg-gradient-to-br from-emerald-500 to-emerald-700"
        >
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10 group-hover:scale-150 transition-transform duration-500" />
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-white/25 backdrop-blur flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-6 transition">
              <Phone className="h-6 w-6 text-white" />
            </div>
            <div className="text-white font-extrabold text-lg">Call Us</div>
            <div className="text-white/90 text-xs mt-0.5 font-medium">9 AM - 9 PM PKT</div>
            <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-white">
              {SUPPORT_PHONE} <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </a>

        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=Nafaa Support`}
          className="relative overflow-hidden rounded-2xl p-5 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all group bg-gradient-to-br from-violet-500 to-purple-700"
        >
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10 group-hover:scale-150 transition-transform duration-500" />
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-white/25 backdrop-blur flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-6 transition">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <div className="text-white font-extrabold text-lg">Email</div>
            <div className="text-white/90 text-xs mt-0.5 font-medium">24h response time</div>
            <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-white">
              Send email <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </a>

        <a
          href={SUPPORT_WEBSITE}
          target="_blank"
          rel="noopener noreferrer"
          className="relative overflow-hidden rounded-2xl p-5 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all group bg-gradient-to-br from-cyan-500 to-blue-700"
        >
          <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10 group-hover:scale-150 transition-transform duration-500" />
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-white/25 backdrop-blur flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-6 transition">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div className="text-white font-extrabold text-lg">Website</div>
            <div className="text-white/90 text-xs mt-0.5 font-medium">Docs & guides</div>
            <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-white">
              nafaa.pk <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </a>
      </section>

      {/* Quick Tips Banner */}
      <section className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-5">
          <div className="h-10 w-10 rounded-2xl bg-blue-600 flex items-center justify-center mb-3">
            <Video className="h-5 w-5 text-white" />
          </div>
          <h4 className="font-extrabold text-slate-900 text-sm">Video Tutorials</h4>
          <p className="text-xs text-slate-600 mt-1 leading-5">
            Step-by-step videos har feature ke liye. YouTube channel pe milengi.
          </p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-5">
          <div className="h-10 w-10 rounded-2xl bg-emerald-600 flex items-center justify-center mb-3">
            <Lightbulb className="h-5 w-5 text-white" />
          </div>
          <h4 className="font-extrabold text-slate-900 text-sm">Pro Tips</h4>
          <p className="text-xs text-slate-600 mt-1 leading-5">
            Shortcuts, hidden features aur best practices.
          </p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5">
          <div className="h-10 w-10 rounded-2xl bg-amber-600 flex items-center justify-center mb-3">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <h4 className="font-extrabold text-slate-900 text-sm">Getting Started</h4>
          <p className="text-xs text-slate-600 mt-1 leading-5">
            Naye user ke liye complete onboarding guide.
          </p>
        </div>
      </section>

      {/* Contact Details Card */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Send className="h-4 w-4 text-emerald-600" />
          Contact Details
        </h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <a
            href={`tel:${SUPPORT_PHONE_INTL}`}
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-emerald-50 hover:border-emerald-300 transition group"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition">
              <Phone className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Phone</div>
              <div className="text-sm font-bold text-slate-900 truncate">{SUPPORT_PHONE}</div>
            </div>
            <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-emerald-600" />
          </a>

          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-violet-50 hover:border-violet-300 transition group"
          >
            <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center group-hover:scale-110 transition">
              <Mail className="h-5 w-5 text-violet-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Email</div>
              <div className="text-sm font-bold text-slate-900 truncate">{SUPPORT_EMAIL}</div>
            </div>
            <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-violet-600" />
          </a>

          <a
            href={SUPPORT_WEBSITE}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-cyan-50 hover:border-cyan-300 transition group"
          >
            <div className="h-10 w-10 rounded-xl bg-cyan-100 flex items-center justify-center group-hover:scale-110 transition">
              <Globe className="h-5 w-5 text-cyan-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Website</div>
              <div className="text-sm font-bold text-slate-900 truncate">nafaa.pk</div>
            </div>
            <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-cyan-600" />
          </a>
        </div>
      </section>

      {/* FAQs with Category Filter */}
      <section>
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-blue-100 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h3>
              <p className="text-xs text-slate-500">
                {filteredFaqs.length} of {faqs.length} questions
              </p>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 h-9 rounded-full text-xs font-bold whitespace-nowrap transition border-2 ${
                  isActive
                    ? 'text-white border-transparent shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
                style={isActive ? { backgroundColor: cat.color } : {}}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* FAQ List */}
        <div className="space-y-2">
          {filteredFaqs.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 p-10 text-center">
              <Search className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No FAQs found</p>
              <p className="text-xs text-slate-500 mt-1">
                Try different keywords or contact support directly.
              </p>
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const Icon = faq.icon;
              const isOpen = expanded === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl bg-white border shadow-sm overflow-hidden hover:shadow-md transition-all ${
                    isOpen ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'
                  }`}
                >
                  <button
                    onClick={() => setExpanded(isOpen ? null : faq.id)}
                    className="w-full px-5 py-4 flex items-center gap-3 hover:bg-slate-50 transition text-left"
                  >
                    <div
                      className="h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: faq.bg }}
                    >
                      <Icon className="h-5 w-5" style={{ color: faq.color }} />
                    </div>
                    <span className="flex-1 text-sm font-bold text-slate-900">
                      {faq.question}
                    </span>
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center transition ${
                        isOpen ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/50">
                      <div className="ml-13 pl-0 sm:pl-1">
                        <p className="text-sm text-slate-700 leading-7">{faq.answer}</p>
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Was this helpful?
                          <button className="text-emerald-700 font-bold hover:underline ml-1">Yes</button>
                          <span>•</span>
                          <button className="text-rose-700 font-bold hover:underline">No</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Still Need Help - Premium CTA */}
      <section>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-2 border-amber-300 p-6 shadow-sm">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-amber-200/40 blur-2xl" />
          <div className="relative flex items-start gap-4 flex-wrap sm:flex-nowrap">
            <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg">
              <MessageCircle className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-extrabold text-amber-950">Aur madad chahiye?</h4>
              <p className="text-sm text-amber-900 mt-1 leading-6">
                Hamari support team Urdu, English aur Roman Urdu mein available hai. Fastest reply ke liye WhatsApp use karein — 5 minute mein jawab milega.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%2C%20I%20need%20help`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-white font-bold text-xs shadow-md hover:shadow-lg hover:scale-105 transition"
                  style={{ backgroundColor: '#25D366' }}
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat on WhatsApp
                </a>
                <a
                  href={`tel:${SUPPORT_PHONE_INTL}`}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-md hover:shadow-lg hover:scale-105 transition border border-slate-200"
                >
                  <Phone className="h-4 w-4 text-emerald-600" />
                  Call {SUPPORT_PHONE}
                </a>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-md hover:shadow-lg hover:scale-105 transition border border-slate-200"
                >
                  <Mail className="h-4 w-4 text-violet-600" />
                  Email Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Status */}
      <section className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span className="text-xs font-bold text-slate-700">All Systems Operational</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> Avg reply: 5 min
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> 99.9% uptime
          </span>
        </div>
      </section>
    </div>
  );
}
