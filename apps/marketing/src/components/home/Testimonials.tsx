'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { useLocale } from '@/components/providers/LocaleProvider';

export function Testimonials() {
  const { t } = useLocale();

  const items = [
    {
      name: 'Ahmad Ali',
      role: 'Owner, Ahmad Bakery',
      city: 'Lahore',
      avatar: '👨‍🍳',
      stars: 5,
      quote:
        'Pehle hum sab kuch register par likhte the, ab sab kuch Nafaa pe hai. Daily nafaa ki report ek click pe milti hai. Bohot zabardast hai!',
    },
    {
      name: 'Fatima Khan',
      role: 'Manager, ZK Pharmacy',
      city: 'Karachi',
      avatar: '👩‍⚕️',
      stars: 5,
      quote:
        'Expiry tracking aur batch management bohot accha hai. Ab koi medicine waste nahi hoti. Customer ko receipt SMS bhi chala jata hai.',
    },
    {
      name: 'Muhammad Bilal',
      role: 'Owner, Bilal Mobile Centre',
      city: 'Islamabad',
      avatar: '👨‍💼',
      stars: 5,
      quote:
        'IMEI tracking, repair history, accessories — sab kuch perfect hai. Ab teen branches ek hi dashboard se manage karta hoon.',
    },
    {
      name: 'Sara Ahmed',
      role: 'Owner, Sara Garments',
      city: 'Faisalabad',
      avatar: '👩‍💼',
      stars: 5,
      quote:
        'Size aur color variants ka system zabardast hai. Stock ki tension khatam, customer hisaab bhi clear, sab kuch organized hai.',
    },
    {
      name: 'Imran Hussain',
      role: 'Owner, Imran Kiryana',
      city: 'Multan',
      avatar: '👨',
      stars: 5,
      quote:
        'Khata book digital hone se mera sara hisaab safe hai. Customers ko WhatsApp pe reminder chala jata hai. Wapsi zaroor hoti hai!',
    },
    {
      name: 'Ayesha Tariq',
      role: 'Owner, Ayesha Cosmetics',
      city: 'Rawalpindi',
      avatar: '👩',
      stars: 5,
      quote:
        'Loyalty points ka system hai jis se customers wapas aate hain. Discount codes bhi share karti hoon. Sales 40% barh gayi!',
    },
  ];

  return (
    <section className="section-padding">
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-14">
          <Badge variant="brand">⭐ Customer Stories</Badge>
          <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            {t('testimonials.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">{t('testimonials.subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((tt, i) => (
            <motion.div
              key={tt.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 hover:shadow-xl transition-shadow"
            >
              <Quote className="absolute top-5 right-5 h-8 w-8 text-brand-100 dark:text-brand-900/50" />
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: tt.stars }).map((_, idx) => (
                  <Star key={idx} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">"{tt.quote}"</p>
              <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand-100 to-emerald-100 dark:from-brand-900 dark:to-emerald-900 flex items-center justify-center text-xl">
                  {tt.avatar}
                </div>
                <div>
                  <div className="font-bold text-sm">{tt.name}</div>
                  <div className="text-xs text-slate-500">
                    {tt.role} • {tt.city}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
