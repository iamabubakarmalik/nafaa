import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Shield, Lock, ChevronRight, Mail, Calendar,
  CheckCircle2, Sparkles,
} from 'lucide-react';

type Tab = 'terms' | 'privacy';

const termsSections = [
  {
    title: '1. Acceptance of Terms',
    content:
      'Nafaa app use karne ke liye aap ye terms accept karte hain. Agar aap inn terms se ittefaq nahi karte to app use na karein. Hum waqtan-fawaqtan terms update kar sakte hain — bara change hone par aap ko notify karenge.',
  },
  {
    title: '2. Account Registration',
    content:
      'Account banane ke liye aap ki age 18 saal ya us se zyada honi chahiye. Aap apni account ki security ke khud zimmedaar hain — password kisi ke saath share na karein. Galat ya misleading information dena prohibited hai.',
  },
  {
    title: '3. Subscription & Billing',
    content:
      'Nafaa Free aur Paid plans offer karta hai. Paid plans monthly ya yearly basis pe billed hote hain. Subscription cancel karne pe aap ka data 90 din tak preserved rehta hai — uske baad permanently delete ho jaata hai. Refund 7 din ke andar request kar sakte hain.',
  },
  {
    title: '4. Acceptable Use',
    content:
      'Aap app ka use sirf legal business purposes ke liye karenge. Spam, fraud, illegal content, ya kisi bhi ghair-qanooni kaam ke liye app use karna prohibited hai. Hum koi bhi account jo terms violate kare suspend kar sakte hain.',
  },
  {
    title: '5. Data Ownership',
    content:
      'Aap apne business data ke malik hain — Nafaa sirf service provide karta hai. Aap kabhi bhi apna data export kar sakte hain (Backup feature se). Hum aap ke data ko sell nahi karte, aur na hi 3rd parties ke saath share karte hain.',
  },
  {
    title: '6. Service Availability',
    content:
      'Hum 99.9% uptime ka best effort karte hain, lekin guarantee nahi karte. Scheduled maintenance ke liye aap ko advance notice diya jaayega. Service interruption ki soorat mein hum responsible nahi hain kisi business loss ke liye.',
  },
  {
    title: '7. Limitation of Liability',
    content:
      'Nafaa aur uske developers maximum extent tak liability se exempt hain. Hum kisi indirect, incidental, consequential damages ke responsible nahi hain. Total liability subscription fees ke amount tak limited hai.',
  },
  {
    title: '8. Termination',
    content:
      'Aap kabhi bhi apna account delete kar sakte hain. Hum bhi terms violation ki soorat mein account terminate karne ka haq rakhte hain. Termination ke baad ke 90 din mein aap apna data download kar sakte hain.',
  },
];

const privacySections = [
  {
    title: '1. Information We Collect',
    content:
      'Hum sirf wo information collect karte hain jo zaroori hai service provide karne ke liye:\n\n• Account info: Name, email, phone, business details\n• Business data: Products, customers, sales, expenses\n• Device info: Device type, OS version, app version\n• Usage data: Feature usage patterns (anonymized)\n\nHum kabhi bhi customer\'s personal info external services ke saath share nahi karte.',
  },
  {
    title: '2. How We Use Your Data',
    content:
      'Aap ka data sirf in purposes ke liye use hota hai:\n\n• Service provide karna (POS, inventory, reporting)\n• Account aur subscription management\n• Customer support\n• App improve karna (anonymized analytics)\n• Important updates aur security alerts\n\nHum aap ka data marketing companies ya advertisers ko sell nahi karte.',
  },
  {
    title: '3. Data Storage & Security',
    content:
      'Aap ka data secure cloud servers pe stored hota hai with:\n\n• 256-bit AES encryption (data at rest)\n• TLS 1.3 encryption (data in transit)\n• Regular automated backups\n• Multi-tenant data isolation\n• Access logging aur audit trails\n\nServers AWS aur reliable cloud providers pe hain jin ka SOC 2 compliance hai.',
  },
  {
    title: '4. Data Sharing',
    content:
      'Hum aap ka data sirf in case mein share kar sakte hain:\n\n• Legal requirement (court order, law enforcement)\n• Payment processors (Stripe, JazzCash) — sirf billing ke liye\n• Cloud infrastructure providers (AWS, Google Cloud)\n\nKisi bhi advertising network, marketing company, ya data broker ke saath aap ka data share nahi hota.',
  },
  {
    title: '5. Your Rights',
    content:
      'Aap ke pas full control hai aap ke data ka:\n\n• Access: Apna data kabhi bhi download kar sakte hain\n• Update: Profile aur settings se information edit kar sakte hain\n• Delete: Account delete karne par 90 din mein permanent deletion\n• Portability: Standard JSON format mein export\n• Object: Specific data usage se opt-out\n\nKoi bhi request ke liye support@nafaa.pk pe email karein.',
  },
  {
    title: '6. Cookies & Tracking',
    content:
      'Web app pe hum essential cookies use karte hain authentication ke liye. Mobile app mein push notification tokens aur anonymized analytics events use hote hain. Hum advertising tracking ya cross-site tracking nahi karte.',
  },
  {
    title: '7. Children\'s Privacy',
    content:
      'Nafaa service 18 saal se kam age ke users ke liye intended nahi hai. Hum knowingly children ka data collect nahi karte. Agar aap ko lagey ke kisi minor ne account banaya hai, hamein contact karein — hum account remove kar denge.',
  },
  {
    title: '8. International Data Transfer',
    content:
      'Aap ka data primarily Pakistan aur regional cloud regions mein stored hota hai. Kuch processing US/EU servers pe ho sakti hai (payment processing, etc) — sab standard data protection agreements ke under.',
  },
  {
    title: '9. Changes to Privacy Policy',
    content:
      'Hum is policy ko update kar sakte hain. Bare changes hone par aap ko app aur email ke through notify kiya jaayega. Latest version hamesha is page pe available hogi.',
  },
  {
    title: '10. Contact Us',
    content:
      'Privacy ya data se related koi bhi sawal ho:\n\n• Email: privacy@nafaa.pk\n• Phone: +92 300 1234567\n• Website: nafaa.pk/privacy\n\nHum 7 working days ke andar respond karenge.',
  },
];

export default function LegalPage() {
  const [tab, setTab] = useState<Tab>('terms');

  const sections = tab === 'terms' ? termsSections : privacySections;
  const tabConfig = {
    terms: { icon: FileText, color: '#2563eb', bg: '#dbeafe' },
    privacy: { icon: Shield, color: '#16a34a', bg: '#dcfce7' },
  };
  const cfg = tabConfig[tab];
  const Icon = cfg.icon;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section
        className="rounded-3xl text-white p-6 shadow-soft transition-colors"
        style={{
          background:
            tab === 'terms'
              ? 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%)'
              : 'linear-gradient(135deg, #0f172a 0%, #064e3b 50%, #16a34a 100%)',
        }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              {tab === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
            </div>
            <h2 className="mt-3 text-3xl font-bold">
              {tab === 'terms' ? 'Nafaa Terms' : 'Your Privacy Matters'}
            </h2>
            <div className="flex items-center gap-1 mt-2 text-white/80 text-sm">
              <Calendar className="h-3.5 w-3.5" />
              Last updated: 1 May 2026
            </div>
          </div>
          <div className="h-16 w-16 rounded-3xl bg-white/20 flex items-center justify-center">
            <Icon className="h-8 w-8 text-white" />
          </div>
        </div>

        {tab === 'privacy' && (
          <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-2 text-sm text-white/90">
            <Lock className="h-4 w-4" />
            Aap ka data secure aur encrypted hai. Hum aap ki privacy ka khayal rakhte hain.
          </div>
        )}
      </section>

      {/* Tabs */}
      <section className="flex gap-2">
        <button
          onClick={() => setTab('terms')}
          className={`flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 border-2 transition font-bold text-sm ${
            tab === 'terms'
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <FileText className="h-4 w-4" />
          Terms of Service
        </button>
        <button
          onClick={() => setTab('privacy')}
          className={`flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 border-2 transition font-bold text-sm ${
            tab === 'privacy'
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Shield className="h-4 w-4" />
          Privacy Policy
        </button>
      </section>

      {/* Sections */}
      <section className="space-y-3">
        {sections.map((section, idx) => (
          <div
            key={idx}
            className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 hover:shadow-md transition"
          >
            <h3 className="text-base font-extrabold text-slate-900 mb-2">
              {section.title}
            </h3>
            <p className="text-sm text-slate-700 leading-7 whitespace-pre-line">
              {section.content}
            </p>
          </div>
        ))}
      </section>

      {/* Acceptance Banner */}
      <section
        className="rounded-2xl p-5 border-2"
        style={{
          backgroundColor: cfg.bg,
          borderColor: cfg.color,
        }}
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 flex-shrink-0" style={{ color: cfg.color }} />
          <div>
            <h4 className="text-sm font-extrabold" style={{ color: cfg.color }}>
              {tab === 'terms' ? 'Agreement' : 'Your Trust Matters'}
            </h4>
            <p className="text-xs mt-1 leading-5" style={{ color: cfg.color }}>
              {tab === 'terms'
                ? 'Nafaa app use karke aap inn terms se agree karte hain. Koi sawal ho to support contact karein.'
                : 'Hamari priority hai aap ka data secure rakhna aur aap ki privacy respect karna. Agar koi concern ho to fauran hamein contact karein.'}
            </p>
          </div>
        </div>
      </section>

      {/* Contact for Questions */}
      <Link
        to="/help"
        className="block rounded-2xl bg-white border border-slate-200 shadow-sm p-4 hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="font-extrabold text-slate-900">Have questions?</div>
            <div className="text-xs text-slate-500 mt-0.5">Contact our support team</div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </div>
      </Link>

      {/* Footer */}
      <div className="text-center pt-4">
        <div className="text-[11px] text-slate-400 font-semibold">
          © 2026 Nafaa. All rights reserved.
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          Made in Pakistan 🇵🇰 with ❤️
        </div>
      </div>
    </div>
  );
}
