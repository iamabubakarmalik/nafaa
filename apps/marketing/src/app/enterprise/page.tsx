'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Shield, Users, Server, HeadphonesIcon, Award,
  ArrowRight, Check, Loader2, Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { cn } from '@/lib/cn';

const capabilities = [
  { icon: Server, title: 'Dedicated infrastructure', desc: 'Your own isolated environment with 99.99% SLA' },
  { icon: Shield, title: 'SOC 2 + ISO 27001', desc: 'Enterprise-grade security compliance' },
  { icon: Users, title: 'Unlimited users & shops', desc: 'No caps, no per-seat pricing surprises' },
  { icon: HeadphonesIcon, title: 'Named account manager', desc: '24/7 direct line to a dedicated human' },
  { icon: Award, title: 'Custom SLAs', desc: 'Response times and uptime tailored to your business' },
  { icon: Building2, title: 'On-premise option', desc: 'Deploy in your own data center if required' },
];

const trustedBy = ['National Retail Chain', 'Pakistan Bakers Assn', 'Karachi Mall Group', 'Lahore Traders Alliance'];

export default function EnterprisePage() {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', size: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setSent(true);
    toast.success('Received — our enterprise team will reach out within 4 hours.');
  };

  const inputCls = 'w-full h-12 px-4 rounded-xl bg-white dark:bg-ink-900 ring-1 ring-inset ring-ink-200 dark:ring-ink-700 focus:ring-2 focus:ring-brand-500 outline-none transition placeholder:text-ink-400';

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-16">
          <AuroraBackground variant="brand" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative">
            <div className="max-w-4xl">
              <Badge variant="pk" size="md" pulse>
                <Building2 className="h-3.5 w-3.5" /> Enterprise
              </Badge>
              <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight text-balance">
                <span className="block text-ink-900 dark:text-white">Enterprise power with</span>
                <GradientText variant="pk">Pakistani roots</GradientText>
              </h1>
              <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-3xl">
                For nationwide chains, manufacturers, and organizations that need dedicated infrastructure, custom SLAs, on-premise options, and a real human on the phone. Built in Pakistan, engineered for scale.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button size="xl" href="#contact" rightIcon={<ArrowRight className="h-5 w-5" />}>
                  Talk to enterprise sales
                </Button>
                <Button size="xl" variant="secondary" href="/demo">Book a personalized demo</Button>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-ink-500">
                <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-brand-600" /> Response within 4 hours</span>
                <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-brand-600" /> Named account manager</span>
              </div>
            </div>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container>
            <div className="text-center mb-12">
              <Eyebrow variant="brand">Enterprise capabilities</Eyebrow>
              <h2 className="mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight">
                Everything you need at scale
              </h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {capabilities.map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.title} className="rounded-2xl bg-white dark:bg-ink-800 p-7 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:-translate-y-1 hover:shadow-card-hover transition-all">
                    <div className="h-12 w-12 rounded-xl bg-gradient-brand flex items-center justify-center text-white shadow-lg">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-display font-bold text-lg">{c.title}</h3>
                    <p className="mt-2 text-sm text-ink-600 dark:text-ink-300 leading-relaxed">{c.desc}</p>
                  </div>
                );
              })}
            </div>
          </Container>
        </Section>

        <Section variant="subtle" spacing="md">
          <Container>
            <div className="text-center mb-8">
              <Eyebrow variant="mono">Trusted by enterprise leaders</Eyebrow>
            </div>
            <div className="flex flex-wrap justify-center gap-8">
              {trustedBy.map((t) => (
                <div key={t} className="text-lg font-display font-extrabold text-ink-500 dark:text-ink-400">
                  {t}
                </div>
              ))}
            </div>
          </Container>
        </Section>

        <Section variant="default" spacing="lg" id="contact">
          <Container size="md">
            <div className="text-center mb-10">
              <Eyebrow variant="brand">Get in touch</Eyebrow>
              <h2 className="mt-4 font-display font-extrabold text-3xl lg:text-4xl">Speak with enterprise sales</h2>
              <p className="mt-3 text-ink-600 dark:text-ink-300">Response guaranteed within 4 hours during business days.</p>
            </div>

            {sent ? (
              <div className="rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-800/50 p-12 text-center">
                <Check className="h-16 w-16 mx-auto text-emerald-500" />
                <h3 className="mt-4 font-display font-extrabold text-2xl text-emerald-700 dark:text-emerald-300">Message received</h3>
                <p className="mt-2 text-emerald-700/80 dark:text-emerald-400">Our enterprise team will reach out within 4 hours.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="rounded-3xl bg-white dark:bg-ink-800 p-8 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <input required placeholder="Your full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
                  <input required placeholder="Company name" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={inputCls} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <input required type="email" placeholder="Work email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
                  <input placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
                </div>
                <select value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} className={inputCls} required>
                  <option value="">Number of shops / locations</option>
                  <option value="10-25">10 - 25 locations</option>
                  <option value="26-50">26 - 50 locations</option>
                  <option value="51-100">51 - 100 locations</option>
                  <option value="100+">100+ locations</option>
                </select>
                <textarea required rows={4} placeholder="Tell us about your business and requirements..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={cn(inputCls, 'h-auto py-3 resize-none')} />
                <Button type="submit" size="lg" fullWidth loading={loading} rightIcon={!loading ? <Send className="h-4 w-4" /> : undefined}>
                  {loading ? 'Sending...' : 'Contact enterprise sales'}
                </Button>
              </form>
            )}
          </Container>
        </Section>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
