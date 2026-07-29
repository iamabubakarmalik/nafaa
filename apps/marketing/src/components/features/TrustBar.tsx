'use client';

import { motion } from 'framer-motion';
import { Award, Shield, Zap, Star, Building2 } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { cn } from '@/lib/cn';

const pressLogos = [
  'Dawn', 'Express Tribune', 'ProPakistani', 'Business Recorder',
  'Geo News', 'ARY News', 'The News', 'Profit',
];

const certs = [
  { icon: Shield, label: 'FBR Certified Partner', color: '#01411c' },
  { icon: Award, label: 'ISO 27001', color: '#0284c7' },
  { icon: Zap, label: 'PCI DSS Compliant', color: '#8b5cf6' },
  { icon: Star, label: 'Google Cloud Partner', color: '#f59e0b' },
  { icon: Building2, label: 'DRAP Certified', color: '#12b76a' },
];

export function TrustBar() {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  return (
    <Section variant="subtle" spacing="md">
      <Container>
        <div className="text-center mb-8">
          <Eyebrow variant="mono">
            {isUr ? 'میں چھپا اور تصدیق شدہ' : 'Featured in & certified by'}
          </Eyebrow>
        </div>

        {/* Press logos */}
        <div className="flex flex-wrap justify-center gap-8 lg:gap-12 mb-10">
          {pressLogos.map((logo, i) => (
            <motion.div
              key={logo}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="text-lg lg:text-xl font-display font-extrabold text-ink-400 dark:text-ink-500 hover:text-ink-700 dark:hover:text-ink-200 transition-colors grayscale hover:grayscale-0"
            >
              {logo}
            </motion.div>
          ))}
        </div>

        {/* Certifications */}
        <div className="pt-8 border-t border-ink-100 dark:border-ink-800">
          <div className="flex flex-wrap justify-center gap-3">
            {certs.map((c, i) => {
              const Icon = c.icon;
              return (
                <motion.div
                  key={c.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:shadow-md transition-shadow"
                >
                  <Icon className="h-4 w-4" style={{ color: c.color }} />
                  <span className="text-sm font-bold">{c.label}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Container>
    </Section>
  );
}
