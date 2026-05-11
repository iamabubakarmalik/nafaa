import { useState } from 'react';
import {
  HelpCircle, MessageCircle, Mail, Phone, Globe, BookOpen,
  ChevronRight, ChevronDown, Send, ExternalLink, Headphones,
  ShoppingCart, Package, Users, Wallet, BarChart3, Star, FileText, Sparkles,
} from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  icon: any;
  color: string;
  bg: string;
}

const faqs: FAQ[] = [
  {
    id: '1',
    question: 'POS pe sale kaise karein?',
    answer:
      'POS page pe jaayen → Products select karein → Checkout press karein → Customer select karein → Payment method choose karein → Complete Sale dabayen. Sale automatic save ho jaayegi.',
    icon: ShoppingCart,
    color: '#16a34a',
    bg: '#dcfce7',
  },
  {
    id: '2',
    question: 'Udhaar (Khata) kaise track karein?',
    answer:
      'Sale ke time customer select karein aur "Full Udhaar" ya "Partial" mode choose karein. Khata page pe har customer ka pura ledger dekh sakte hain. Payment receive karne ke liye customer ke khata mein "Payment" button dabayen.',
    icon: BookOpen,
    color: '#dc2626',
    bg: '#fee2e2',
  },
  {
    id: '3',
    question: 'Product kaise add karein?',
    answer:
      'Products page → "New Product" button dabayen → Multi-step form fill karein: Basic Info → Pricing → Stock → Tags → Create karein. Baad mein images aur variants edit screen se add kar sakte hain.',
    icon: Package,
    color: '#2563eb',
    bg: '#dbeafe',
  },
  {
    id: '4',
    question: 'Customer kaise add karein?',
    answer:
      'Customers page → "+ New" → Name (required), phone, email fill karein → Credit limit set karein agar udhaar dena hai → Save. Customer fauran POS aur Khata mein available ho jaayega.',
    icon: Users,
    color: '#8b5cf6',
    bg: '#ede9fe',
  },
  {
    id: '5',
    question: 'Cash Register kya hai?',
    answer:
      'Cash Register se aap din ke shuru aur akhir mein drawer cash count track karte hain. Subah Open karte waqt opening balance enter karein, raat ko close karte waqt actual cash count karein — system difference automatic calculate karega.',
    icon: Wallet,
    color: '#16a34a',
    bg: '#dcfce7',
  },
  {
    id: '6',
    question: 'Reports kahaan se dekhein?',
    answer:
      'Sidebar mein Reports section. Yahan sales trend, top products, profit margins, payment method breakdown sab milega. Profit by Product report alag se hai jo har product ka margin show karta hai.',
    icon: BarChart3,
    color: '#2563eb',
    bg: '#dbeafe',
  },
  {
    id: '7',
    question: 'Stock kaise update karein?',
    answer:
      'Stock 3 tareeqon se update hota hai: (1) Purchase record karne par automatic increase, (2) Sale par automatic decrease, (3) Stock Adjustments mein manual Add/Remove/Damage/Loss record kar sakte hain. Sab changes Stock Movements mein log hota hai.',
    icon: Package,
    color: '#f59e0b',
    bg: '#fef3c7',
  },
  {
    id: '8',
    question: 'Team member kaise add karein?',
    answer:
      'Sirf Owner team manage kar sakta hai. Team page mein "+ Add Member" → Name, email, password set karein → Role choose karein (Manager / Cashier / Staff) → Save. Member fauran login kar sakega.',
    icon: Users,
    color: '#7c3aed',
    bg: '#ede9fe',
  },
  {
    id: '9',
    question: 'Backup kaise lein?',
    answer:
      'Backup page pe "Download Full Backup" press karein. Pura tenant data JSON file mein download ho jaayega. Cloud storage ya email pe save karna recommended hai.',
    icon: FileText,
    color: '#2563eb',
    bg: '#dbeafe',
  },
  {
    id: '10',
    question: 'Plan upgrade kaise karein?',
    answer:
      'Plans page pe apni zaroorat ke mutabiq plan choose karein → "Upgrade" dabayen → Payment complete karein. Plan Usage page pe dekha jaa sakta hai abhi kitna use ho raha hai aur limit kya hai.',
    icon: Star,
    color: '#f59e0b',
    bg: '#fef3c7',
  },
];

const SUPPORT_PHONE = '+923001234567';
const SUPPORT_EMAIL = 'support@nafaa.pk';
const SUPPORT_WEBSITE = 'https://nafaa.pk';
const WHATSAPP_NUMBER = '923001234567';

export default function HelpPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-blue-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Headphones className="h-3.5 w-3.5" />
              24/7 Support
            </div>
            <h2 className="mt-3 text-3xl font-bold">Help Center</h2>
            <p className="mt-2 text-sm text-white/80">
              Hum hain aap ke saath. Urdu / English mein madad.
            </p>
          </div>
          <div className="h-16 w-16 rounded-3xl bg-white/20 flex items-center justify-center">
            <HelpCircle className="h-8 w-8 text-white" />
          </div>
        </div>
      </section>

      {/* Quick Contact */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%2C%20I%20need%20help%20with%20Nafaa`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl p-5 shadow-sm hover:shadow-lg transition group"
          style={{ backgroundColor: '#25D366' }}
        >
          <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div className="text-white font-extrabold">WhatsApp</div>
          <div className="text-white/80 text-xs mt-0.5">Fastest reply</div>
        </a>

        <a
          href={`tel:${SUPPORT_PHONE}`}
          className="rounded-2xl p-5 shadow-sm hover:shadow-lg transition group bg-emerald-600"
        >
          <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <Phone className="h-5 w-5 text-white" />
          </div>
          <div className="text-white font-extrabold">Call Us</div>
          <div className="text-white/80 text-xs mt-0.5">9 AM - 9 PM PKT</div>
        </a>

        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=Nafaa Support`}
          className="rounded-2xl p-5 shadow-sm hover:shadow-lg transition group bg-violet-600"
        >
          <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <Mail className="h-5 w-5 text-white" />
          </div>
          <div className="text-white font-extrabold">Email</div>
          <div className="text-white/80 text-xs mt-0.5">24h response</div>
        </a>

        <a
          href={SUPPORT_WEBSITE}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl p-5 shadow-sm hover:shadow-lg transition group bg-cyan-600"
        >
          <div className="h-11 w-11 rounded-2xl bg-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div className="text-white font-extrabold">Website</div>
          <div className="text-white/80 text-xs mt-0.5">nafaa.pk</div>
        </a>
      </section>

      {/* Contact Info Card */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Send className="h-4 w-4 text-emerald-600" />
          Contact Details
        </h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Phone className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Phone</div>
              <div className="text-sm font-bold text-slate-900 truncate">{SUPPORT_PHONE}</div>
            </div>
            <ExternalLink className="h-4 w-4 text-slate-400" />
          </a>

          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition"
          >
            <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Mail className="h-5 w-5 text-violet-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Email</div>
              <div className="text-sm font-bold text-slate-900 truncate">{SUPPORT_EMAIL}</div>
            </div>
            <ExternalLink className="h-4 w-4 text-slate-400" />
          </a>

          <a
            href={SUPPORT_WEBSITE}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition"
          >
            <div className="h-10 w-10 rounded-xl bg-cyan-100 flex items-center justify-center">
              <Globe className="h-5 w-5 text-cyan-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Website</div>
              <div className="text-sm font-bold text-slate-900 truncate">nafaa.pk</div>
            </div>
            <ExternalLink className="h-4 w-4 text-slate-400" />
          </a>
        </div>
      </section>

      {/* FAQs */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <h3 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h3>
        </div>

        <div className="space-y-2">
          {faqs.map((faq) => {
            const Icon = faq.icon;
            const isOpen = expanded === faq.id;
            return (
              <div
                key={faq.id}
                className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition"
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
                  {isOpen ? (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 pt-1 border-t border-slate-100">
                    <p className="text-sm text-slate-700 leading-6">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Still Need Help */}
      <section>
        <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-200 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="h-5 w-5 text-amber-800" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-extrabold text-amber-900">Aur madad chahiye?</h4>
              <p className="text-xs text-amber-800 mt-1 leading-5">
                Hamari support team Urdu, English aur Roman Urdu mein available hai. Fastest reply ke liye WhatsApp use karein.
              </p>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%2C%20I%20need%20help`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 h-10 px-4 rounded-xl text-white font-bold text-xs"
                style={{ backgroundColor: '#25D366' }}
              >
                <MessageCircle className="h-4 w-4" />
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
