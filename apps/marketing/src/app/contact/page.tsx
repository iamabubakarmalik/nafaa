import { Mail, Phone, MapPin, MessageCircle, Clock, Sparkles } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { ContactForm } from './ContactClient';
import { CTA } from '@/components/home/CTA';
import { buildMetadata } from '@/lib/seo';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'hello@nafaa.pk';
const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+923241772933';
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP || '+923241772933';

export const metadata = buildMetadata({
  title: 'Contact Us — Nafaa',
  description: 'Get in touch with Nafaa. We are available 24/7 to help Pakistani businesses grow.',
  path: '/contact',
});

const contacts = [
  { icon: Mail, label: 'Email', value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
  { icon: Phone, label: 'Phone', value: SUPPORT_PHONE, href: `tel:${SUPPORT_PHONE}` },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: WHATSAPP,
    href: `https://wa.me/${WHATSAPP.replace(/[^0-9]/g, '')}`,
    highlight: true,
  },
  { icon: MapPin, label: 'Office', value: 'Gujranwala, Pakistan', href: '#' },
];

export default function ContactPage() {
  return (
    <>
      <Header />

      <main>
        {/* Hero */}
        <section className="relative pt-20 pb-14 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-40" />

          <Container className="relative text-center">
            <Badge variant="gradient">💬 Support 24/7</Badge>

            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold">
              <span className="gradient-text">Talk to Nafaa Team</span>
            </h1>

            <p className="mt-5 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Sawal ho ya business grow karna ho — hum hamesha yahan hain.
            </p>
          </Container>
        </section>

        {/* Contact Cards */}
        <section className="py-10">
          <Container>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {contacts.map((c) => {
                const Icon = c.icon;

                return (
                  <a
                    key={c.label}
                    href={c.href}
                    target={c.label === 'WhatsApp' ? '_blank' : undefined}
                    className={`group rounded-3xl p-6 text-center transition-all duration-300 border
                    ${
                      c.highlight
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl scale-[1.03]'
                        : 'bg-white/80 dark:bg-slate-900/80 backdrop-blur border-slate-200 dark:border-slate-800 hover:shadow-2xl hover:-translate-y-1'
                    }`}
                  >
                    <div
                      className={`inline-flex h-14 w-14 rounded-2xl items-center justify-center shadow-lg
                      ${
                        c.highlight
                          ? 'bg-white/20 animate-pulse'
                          : 'bg-gradient-to-br from-brand-500 to-emerald-600'
                      }`}
                    >
                      <Icon className="text-white" />
                    </div>

                    <h3 className="mt-4 font-bold">{c.label}</h3>
                    <p
                      className={`text-sm mt-1 ${
                        c.highlight ? 'text-white/90' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {c.value}
                    </p>
                  </a>
                );
              })}
            </div>
          </Container>
        </section>

        {/* Form + Side */}
        <section className="py-16">
          <Container>
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              
              {/* Form */}
              <div>
                <Badge variant="accent">📨 Send Message</Badge>
                <h2 className="mt-5 text-3xl font-extrabold mb-6">
                  Hum aap ki madad ke liye ready hain
                </h2>

                <ContactForm />
              </div>

              {/* Side Info */}
              <div className="space-y-6 sticky top-24">
                
                {/* WhatsApp CTA */}
                <a
                  href={`https://wa.me/${WHATSAPP.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  className="block rounded-3xl bg-gradient-to-br from-green-500 to-emerald-600 p-7 text-white shadow-xl hover:scale-[1.02] transition"
                >
                  <MessageCircle className="mb-3" />
                  <h3 className="font-extrabold text-xl">Chat on WhatsApp</h3>
                  <p className="text-sm mt-2 text-white/90">
                    Sab se fast response ke liye WhatsApp par baat karein.
                  </p>
                </a>

                {/* Hours */}
                <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-emerald-700 p-7 text-white shadow-xl">
                  <Clock className="mb-3" />
                  <h3 className="font-extrabold text-xl">Working Hours</h3>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Mon - Fri</span>
                      <span className="font-bold">9 AM - 9 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Saturday</span>
                      <span className="font-bold">10 AM - 6 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sunday</span>
                      <span className="font-bold">Emergency</span>
                    </div>
                  </div>
                </div>

                {/* Trust */}
                <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-7 shadow">
                  <Sparkles className="text-brand-500 mb-3" />
                  <h3 className="font-extrabold text-lg">
                    Fast Response Guarantee
                  </h3>
                  <p className="text-sm mt-2 text-slate-600 dark:text-slate-400">
                    Hum 2–6 hours ke andar reply karte hain. Urgent cases ke liye WhatsApp best hai.
                  </p>
                </div>

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
