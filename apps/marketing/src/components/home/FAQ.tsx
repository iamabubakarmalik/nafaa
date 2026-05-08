'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { buildJsonLdFAQ } from '@/lib/seo';
import Script from 'next/script';

const faqs = [
  {
    q: 'Nafaa kya hai aur kis ke liye hai?',
    a: 'Nafaa Pakistan ke shopkeepers ke liye banaya gaya all-in-one POS, inventory, aur accounting software hai. Bakery, kiryana store, mobile shop, pharmacy, restaurant — koi bhi retail business iska use kar sakta hai.',
  },
  {
    q: 'Kya internet zaroori hai chalane ke liye?',
    a: 'Nahi! Nafaa offline mode mein bhi kaam karta hai. Internet ke bina sales kar sakte hain, aur jab internet aaye to data automatically sync ho jata hai.',
  },
  {
    q: 'Kitne days ka free trial hai?',
    a: '7 din ka mufti trial hai — koi credit card nahi chahiye. Trial khatam hone ke baad aap koi bhi paid plan choose kar sakte hain.',
  },
  {
    q: 'Payment kaise karte hain?',
    a: 'Aap JazzCash, EasyPaisa, bank transfer, ya credit/debit card se payment kar sakte hain. Bank transfer ke liye admin manual approval karta hai.',
  },
  {
    q: 'Kya multiple shops manage kar sakte hain?',
    a: 'Haan! Pro aur Enterprise plans mein multi-shop support hai. Ek dashboard se 5, 10, ya 50 branches manage karein with role-based access.',
  },
  {
    q: 'Data ka backup kaise hota hai?',
    a: 'Aap ka data daily auto-backup hota hai cloud par. Aap manually bhi anytime Excel/PDF mein export kar sakte hain.',
  },
  {
    q: 'Customer support kaise milti hai?',
    a: 'WhatsApp, phone aur email se 24/7 support available hai. Pro aur Enterprise plans mein priority support milti hai.',
  },
  {
    q: 'Kya hardware (printer, scanner) chahiye?',
    a: 'Nahi, zaroori nahi. Aap mobile/tablet/laptop pe chala sakte hain. Lekin agar aap thermal printer ya barcode scanner use karna chahein, to fully supported hai.',
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  const jsonLd = buildJsonLdFAQ(faqs);

  return (
    <section className="section-padding bg-slate-50 dark:bg-slate-950/50">
      <Script
        id="faq-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="brand">💬 FAQs</Badge>
          <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Aap ke aksar puchhe jaane wale sawalat ke jawabaat
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={i}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <span>{f.q}</span>
                  <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {f.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
