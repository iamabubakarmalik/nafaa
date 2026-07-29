'use client';

import { useState } from 'react';
import { Calendar, Clock, Video, User, Check, ArrowRight } from 'lucide-react';
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
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { cn } from '@/lib/cn';

const slots = [
  { day: 'Today', date: 'Jul 29', times: ['3:00 PM', '5:00 PM'] },
  { day: 'Tomorrow', date: 'Jul 30', times: ['10:00 AM', '2:00 PM', '4:30 PM'] },
  { day: 'Friday', date: 'Jul 31', times: ['11:00 AM', '3:00 PM'] },
  { day: 'Saturday', date: 'Aug 1', times: ['12:00 PM', '4:00 PM'] },
];

export default function DemoPage() {
  const [selected, setSelected] = useState<{ day: string; time: string } | null>(null);
  const [step, setStep] = useState<'select' | 'form' | 'done'>('select');
  const [form, setForm] = useState({ name: '', email: '', company: '', lang: 'english' });

  const inputCls = 'w-full h-12 px-4 rounded-xl bg-white dark:bg-ink-900 ring-1 ring-inset ring-ink-200 dark:ring-ink-700 focus:ring-2 focus:ring-brand-500 outline-none';

  const book = async (e: React.FormEvent) => {
    e.preventDefault();
    await new Promise((r) => setTimeout(r, 800));
    setStep('done');
    toast.success('Demo booked — check your email for the calendar invite');
  };

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-14">
          <AuroraBackground variant="brand" intensity="base" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="brand" size="md" pulse>
              <Video className="h-3.5 w-3.5" /> 30-min personalized demo
            </Badge>
            <h1 className="mt-8 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto text-balance">
              <GradientText variant="brand">See Nafaa live, on your own screen</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              30 minutes with a Pakistani product expert. Your industry, your questions, your setup — walked through step by step.
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container size="md">
            {step === 'select' && (
              <div>
                <h2 className="font-display font-extrabold text-2xl mb-6 text-center">Pick a time that works</h2>
                <div className="space-y-4">
                  {slots.map((s) => (
                    <div key={s.day} className="rounded-2xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
                      <div className="flex items-center gap-3 mb-4">
                        <Calendar className="h-5 w-5 text-brand-600" />
                        <div>
                          <div className="font-display font-bold text-lg">{s.day}</div>
                          <div className="text-xs text-ink-500">{s.date}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {s.times.map((t) => (
                          <button
                            key={t}
                            onClick={() => { setSelected({ day: s.day, time: t }); setStep('form'); }}
                            className={cn(
                              'h-11 rounded-xl font-bold text-sm ring-1 ring-inset transition',
                              selected?.day === s.day && selected?.time === t
                                ? 'bg-gradient-brand text-white ring-transparent shadow-brand-glow'
                                : 'bg-white dark:bg-ink-900 ring-ink-200 dark:ring-ink-700 hover:ring-brand-400',
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 'form' && selected && (
              <div>
                <button onClick={() => setStep('select')} className="text-sm text-ink-500 hover:text-brand-600 mb-4">← Change time</button>
                <div className="rounded-2xl bg-brand-50 dark:bg-brand-950/40 p-4 mb-6 flex items-center gap-3">
                  <Clock className="h-5 w-5 text-brand-600" />
                  <div>
                    <div className="font-bold">{selected.day} · {selected.time}</div>
                    <div className="text-xs text-brand-700 dark:text-brand-400">30 minutes · Google Meet</div>
                  </div>
                </div>
                <form onSubmit={book} className="rounded-3xl bg-white dark:bg-ink-800 p-8 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 space-y-4">
                  <input required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
                  <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
                  <input placeholder="Business name (optional)" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={inputCls} />
                  <div>
                    <div className="text-sm font-bold mb-2">Preferred language</div>
                    <div className="grid grid-cols-2 gap-2">
                      {['english', 'urdu'].map((l) => (
                        <button key={l} type="button" onClick={() => setForm({ ...form, lang: l })}
                          className={cn('h-11 rounded-xl font-bold text-sm ring-1 ring-inset transition capitalize',
                            form.lang === l ? 'bg-gradient-brand text-white ring-transparent' : 'bg-white dark:bg-ink-900 ring-ink-200 dark:ring-ink-700')}>
                          {l === 'urdu' ? 'اردو' : l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" size="lg" fullWidth rightIcon={<ArrowRight className="h-4 w-4" />}>Confirm booking</Button>
                </form>
              </div>
            )}

            {step === 'done' && (
              <div className="rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-800/50 p-12 text-center">
                <Check className="h-20 w-20 mx-auto text-emerald-500" />
                <h3 className="mt-4 font-display font-extrabold text-3xl text-emerald-700 dark:text-emerald-300">You're booked!</h3>
                <p className="mt-3 text-emerald-700/80 dark:text-emerald-400 max-w-md mx-auto">
                  Calendar invite sent to {form.email}. See you {selected?.day} at {selected?.time}!
                </p>
              </div>
            )}
          </Container>
        </Section>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
