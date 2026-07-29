'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { MapPin, TrendingUp, ArrowRight } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { LiveDot } from '@/components/primitives/LiveDot';
import { cities } from '@/lib/data/cities';
import { cn } from '@/lib/cn';

// Simplified Pakistan outline + city coordinates (SVG viewBox 0-1000 x 0-800)
const cityPositions: Record<string, { x: number; y: number }> = {
  karachi:    { x: 280, y: 640 },
  lahore:     { x: 640, y: 300 },
  islamabad:  { x: 590, y: 180 },
  rawalpindi: { x: 585, y: 190 },
  faisalabad: { x: 570, y: 340 },
  multan:     { x: 490, y: 420 },
  peshawar:   { x: 500, y: 150 },
  quetta:     { x: 220, y: 400 },
  gujranwala: { x: 660, y: 265 },
  sialkot:    { x: 680, y: 250 },
  hyderabad:  { x: 290, y: 590 },
  bahawalpur: { x: 470, y: 470 },
};

export function PakistanMap() {
  const { locale } = useLocale();
  const [hovered, setHovered] = useState<string | null>(null);
  const isUr = locale === 'ur';

  const total = cities.reduce((s, c) => s + c.activeShops, 0);

  return (
    <Section variant="default" spacing="lg" className="relative overflow-hidden">
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Eyebrow variant="pk" icon={<LiveDot color="emerald" size="sm" />}>
            {isUr ? 'پاکستان بھر میں لائیو' : 'Live across Pakistan'}
          </Eyebrow>
          <h2 className={cn('mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance', isUr && 'font-urdu leading-snug')}>
            {isUr ? 'ہر شہر، ہر گلی، ہر دکان' : 'Every city, every street, every shop'}
          </h2>
          <p className={cn('mt-4 text-lg text-ink-600 dark:text-ink-300', isUr && 'font-urdu text-xl leading-loose')}>
            {isUr
              ? `${total.toLocaleString()}+ کاروبار ۴۷ شہروں میں نفع پر — نقشے پر کوئی شہر منتخب کریں`
              : `${total.toLocaleString()}+ businesses across 47 cities running on Nafaa — hover any city on the map`}
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8 items-center">
          {/* SVG Map */}
          <div className="relative aspect-[4/3] rounded-3xl bg-gradient-to-br from-ink-50 to-white dark:from-ink-900 dark:to-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 p-6 overflow-hidden">
            {/* Grid background */}
            <div className="absolute inset-0 bg-grid mask-radial opacity-30" />

            <svg viewBox="0 0 1000 800" className="relative w-full h-full">
              <defs>
                <linearGradient id="pak-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#12b76a" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#01411c" stopOpacity="0.08" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Simplified Pakistan outline */}
              <path
                d="M 200 150 L 320 100 L 460 90 L 540 100 L 620 130 L 700 180 L 760 230 L 780 300 L 760 380 L 700 440 L 640 500 L 580 560 L 520 620 L 440 680 L 360 700 L 280 690 L 220 650 L 180 580 L 160 490 L 170 400 L 180 310 L 190 230 Z"
                fill="url(#pak-fill)"
                stroke="#12b76a"
                strokeWidth="2"
                strokeOpacity="0.4"
                strokeLinejoin="round"
              />

              {/* City dots */}
              {cities.map((city, i) => {
                const pos = cityPositions[city.slug];
                if (!pos) return null;
                const isHovered = hovered === city.slug;
                const radius = 6 + (city.activeShops / 2000);

                return (
                  <g key={city.slug}
                    onMouseEnter={() => setHovered(city.slug)}
                    onMouseLeave={() => setHovered(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Pulse ring */}
                    <motion.circle
                      cx={pos.x} cy={pos.y} r={radius}
                      fill="#12b76a" opacity="0.3"
                      animate={{ r: [radius, radius + 12, radius], opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                    />
                    {/* Main dot */}
                    <motion.circle
                      cx={pos.x} cy={pos.y} r={isHovered ? radius + 4 : radius}
                      fill={isHovered ? '#f4c531' : '#12b76a'}
                      filter="url(#glow)"
                      animate={{ scale: isHovered ? 1.3 : 1 }}
                    />
                    {/* City label */}
                    <text x={pos.x} y={pos.y - radius - 8}
                      textAnchor="middle"
                      className={cn(
                        'fill-ink-700 dark:fill-white font-bold pointer-events-none transition-all',
                        isHovered ? 'text-base' : 'text-xs',
                      )}
                      style={{ fontSize: isHovered ? 16 : 11 }}
                    >
                      {isUr ? city.nameUr : city.nameEn}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Corner stats */}
            <div className="absolute top-6 left-6 rounded-2xl bg-white/90 dark:bg-ink-900/90 backdrop-blur-md p-3 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
              <div className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-500">
                {isUr ? 'کل شہر' : 'Total cities'}
              </div>
              <div className="text-2xl font-display font-extrabold text-gradient-brand">47</div>
            </div>
            <div className="absolute top-6 right-6 rounded-2xl bg-white/90 dark:bg-ink-900/90 backdrop-blur-md p-3 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
              <div className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-500">
                {isUr ? 'فعال دکانیں' : 'Active shops'}
              </div>
              <div className="text-2xl font-display font-extrabold text-gradient-brand tabular-nums">
                {total.toLocaleString()}+
              </div>
            </div>
          </div>

          {/* City detail panel */}
          <div className="space-y-3">
            <div className={cn('text-eyebrow font-mono text-brand-600', isUr && 'font-urdu text-sm')}>
              {hovered ? (isUr ? 'شہر کی تفصیل' : 'City details') : (isUr ? 'اوپر کے شہر' : 'Top cities')}
            </div>

            {hovered ? (
              (() => {
                const c = cities.find((c) => c.slug === hovered)!;
                return (
                  <motion.div
                    key={c.slug}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-3xl bg-gradient-to-br from-brand-600 to-emerald-800 p-8 text-white shadow-brand-glow"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-5 w-5" />
                      <span className="text-xs font-mono uppercase tracking-widest font-bold opacity-80">{c.province}</span>
                    </div>
                    <h3 className={cn('font-display font-extrabold text-4xl', isUr && 'font-urdu')}>
                      {isUr ? c.nameUr : c.nameEn}
                    </h3>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="font-display font-extrabold text-5xl tabular-nums">{c.activeShops.toLocaleString()}</span>
                      <span className={cn('text-sm text-white/80', isUr && 'font-urdu text-base')}>
                        {isUr ? 'فعال کاروبار' : 'active businesses'}
                      </span>
                    </div>
                    <div className="mt-6">
                      <div className="text-xs font-mono uppercase tracking-widest font-bold opacity-80 mb-2">
                        {isUr ? 'مقبول صنعتیں' : 'Top industries'}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {c.topIndustries.map((i) => (
                          <span key={i} className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                            {i}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Link
                      href={`/${c.slug}/${c.topIndustries[0]}`}
                      className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold hover:gap-2.5 transition-all"
                    >
                      {isUr ? `${c.nameUr} میں دیکھیں` : `Explore ${c.nameEn}`}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </motion.div>
                );
              })()
            ) : (
              <div className="space-y-2">
                {cities.filter((c) => c.featured).map((c) => (
                  <div key={c.slug}
                    onMouseEnter={() => setHovered(c.slug)}
                    className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:ring-brand-400 hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    <div>
                      <div className={cn('font-bold', isUr && 'font-urdu text-lg')}>
                        {isUr ? c.nameUr : c.nameEn}
                      </div>
                      <div className="text-xs text-ink-500">{c.province}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display font-extrabold text-brand-600 dark:text-brand-400 tabular-nums">
                        {c.activeShops.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-ink-500 flex items-center gap-1 justify-end">
                        <TrendingUp className="h-3 w-3" />
                        {isUr ? 'دکانیں' : 'shops'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
