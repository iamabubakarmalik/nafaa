import { Mail, Phone, MapPin, MessageCircle, Clock } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { ContactForm } from './ContactClient';
import { buildMetadata } from '@/lib/seo';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'hello@nafaa.pk';
const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+923001234567';
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP || '+923001234567';

export const metadata = buildMetadata({
  title: 'Contact Us — Get in Touch',
  description: 'Contact Nafaa support team. WhatsApp, phone, and email — we\'re available 24/7 for our customers across Pakistan.',
  path: '/contact',
});

const contacts = [
  { icon: Mail, label: 'Email', value: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}`, color: 'from-blue-500 to-cyan-500' },
  { icon: Phone, label: 'Phone', value: SUPPORT_PHONE, href: `tel:${SUPPORT_PHONE}`, color: 'from-emerald-500 to-teal-500' },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: WHATSAPP,
    href: `https://wa.me/${WHATSAPP.replace(/[^0-9]/g, '')}`,
    color: 'from-green-500 to-green-600',
  },
  { icon: MapPin, label: 'Office', value: 'Lahore, Pakistan', href: '#', color: 'from-rose-500 to-pink-500' },
];

export default function ContactPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
          <Container className="relative text-center">
            <Badge variant="brand">💬 We're Here to Help</Badge>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              <span className="gradient-text">Get in Touch</span>
            </h1>
            <p className="mt-5 text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Sawal? Demo chahiye? Custom plan? Hum 24/7 available hain.
            </p>
          </Container>
        </section>

        {/* Contact options */}
        <section className="py-12">
          <Container>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {contacts.map((c) => {
                const Icon = c.icon;
                return (
                  <a
                    key={c.label}
                    href={c.href}
                    target={c.label === 'WhatsApp' ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-xl hover:-translate-y-1 transition-all text-center"
                  >
                    <div className={`inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br ${c.color} items-center justify-center shadow-lg`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="mt-4 font-bold">{c.label}</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 break-all">{c.value}</p>
                  </a>
                );
              })}
            </div>
          </Container>
        </section>

        {/* Form + Hours */}
        <section className="py-12 lg:py-20">
          <Container>
            <div className="grid lg:grid-cols-[1.5fr_1fr] gap-10">
              {/* Form */}
              <div>
                <Badge variant="accent">📨 Send a Message</Badge>
                <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold mb-7">
                  Hum aap se zaroor contact karenge
                </h2>
                <ContactForm />
              </div>

              {/* Hours + extra */}
              <div className="space-y-5">
                <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-emerald-700 p-7 text-white">
                  <Clock className="h-10 w-10 mb-4" />
                  <h3 className="text-xl font-extrabold">Working Hours</h3>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between border-b border-white/20 pb-2">
                      <span>Monday - Friday</span>
                      <span className="font-bold">9 AM - 9 PM</span>
                    </div>
                    <div className="flex justify-between border-b border-white/20 pb-2">
                      <span>Saturday</span>
                      <span className="font-bold">10 AM - 6 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sunday</span>
                      <span className="font-bold">Emergency Only</span>
                    </div>
                  </div>
                  <div className="mt-5 pt-5 border-t border-white/20 text-xs">
                    Pro & Enterprise customers ko 24/7 priority support milti hai.
                  </div>
                </div>

                <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-7">
                  <h3 className="text-lg font-extrabold">Quick Links</h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <a href="/help" className="block text-slate-700 dark:text-slate-300 hover:text-brand-600">
                      📚 Help Center & Guides
                    </a>
                    <a href="/blog" className="block text-slate-700 dark:text-slate-300 hover:text-brand-600">
                      📰 Blog & Tutorials
                    </a>
                    <a href="/api-docs" className="block text-slate-700 dark:text-slate-300 hover:text-brand-600">
                      🔌 API Documentation
                    </a>
                    <a href="/status" className="block text-slate-700 dark:text-slate-300 hover:text-brand-600">
                      ⚡ System Status Page
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
