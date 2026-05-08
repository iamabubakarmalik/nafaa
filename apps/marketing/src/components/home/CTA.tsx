'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { useLocale } from '@/components/providers/LocaleProvider';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173';

export function CTA() {
  const { t } = useLocale();

  return (
    <section className="section-padding">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-[2rem] overflow-hidden p-10 sm:p-14 lg:p-20 text-center"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-700" />
          <div className="absolute inset-0 bg-grid-pattern opacity-20" />
          <div className="absolute -top-20 -left-20 h-72 w-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-72 w-72 bg-amber-400/20 rounded-full blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-4 py-1.5 text-xs font-semibold text-white">
              <Sparkles className="h-3.5 w-3.5" />
              Limited Time: 7 days free
            </div>
            <h2 className="mt-6 text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white text-balance">
              {t('cta.title')}
            </h2>
            <p className="mt-5 text-lg lg:text-xl text-white/90 max-w-2xl mx-auto">
              {t('cta.subtitle')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Button
                size="xl"
                href={`${APP_URL}/register`}
                className="!bg-white !text-brand-700 hover:!bg-slate-100 hover:!text-brand-800 !shadow-2xl"
              >
                {t('cta.button')}
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button
                size="xl"
                variant="ghost"
                href="/contact"
                className="!text-white hover:!bg-white/10"
              >
                Talk to Sales
              </Button>
            </div>
            <p className="mt-6 text-sm text-white/80">
              ✓ No credit card required &nbsp;•&nbsp; ✓ Setup in 5 mins &nbsp;•&nbsp; ✓ Cancel anytime
            </p>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
