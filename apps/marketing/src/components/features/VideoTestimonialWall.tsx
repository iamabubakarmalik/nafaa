'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, MapPin } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { cn } from '@/lib/cn';

interface VideoStory {
  id: string;
  nameEn: string; nameUr: string;
  businessEn: string; businessUr: string;
  cityEn: string; cityUr: string;
  quoteEn: string; quoteUr: string;
  gradient: string;
  emoji: string;
  duration: string;
  industry: string;
}

const stories: VideoStory[] = [
  { id: 'v1', nameEn: 'Ahmad Raza', nameUr: 'احمد رضا', businessEn: 'Ahmad Sweets & Bakery', businessUr: 'احمد سویٹس اینڈ بیکری', cityEn: 'Lahore', cityUr: 'لاہور', quoteEn: 'Revenue jumped 42% in three months', quoteUr: 'تین ماہ میں ۴۲٪ آمدنی', gradient: 'from-amber-500 to-orange-600', emoji: '🍰', duration: '0:45', industry: 'bakery' },
  { id: 'v2', nameEn: 'Fatima Khan', nameUr: 'فاطمہ خان', businessEn: 'ZK Pharmacy', businessUr: 'زیڈ کے فارمیسی', cityEn: 'Karachi', cityUr: 'کراچی', quoteEn: 'Zero expired stock, ever', quoteUr: 'کبھی ایکسپائرڈ اسٹاک نہیں', gradient: 'from-blue-500 to-cyan-600', emoji: '💊', duration: '0:38', industry: 'pharmacy' },
  { id: 'v3', nameEn: 'Muhammad Bilal', nameUr: 'محمد بلال', businessEn: 'Bilal Mobile Centre', businessUr: 'بلال موبائل سینٹر', cityEn: 'Islamabad', cityUr: 'اسلام آباد', quoteEn: '3 branches, 1 dashboard', quoteUr: '۳ برانچز، ۱ ڈیش بورڈ', gradient: 'from-violet-500 to-purple-600', emoji: '📱', duration: '0:52', industry: 'mobile-shop' },
  { id: 'v4', nameEn: 'Sara Ahmed', nameUr: 'سارہ احمد', businessEn: 'Sara Boutique', businessUr: 'سارہ بوتیک', cityEn: 'Faisalabad', cityUr: 'فیصل آباد', quoteEn: '5x faster checkout', quoteUr: '۵ گنا تیز چیک آؤٹ', gradient: 'from-pink-500 to-rose-600', emoji: '👗', duration: '0:41', industry: 'garments' },
  { id: 'v5', nameEn: 'Imran Hussain', nameUr: 'عمران حسین', businessEn: 'Imran Kiryana', businessUr: 'عمران کریانہ', cityEn: 'Multan', cityUr: 'ملتان', quoteEn: 'Rs 80K udhaar recovered', quoteUr: '۸۰ ہزار ادھار وصولی', gradient: 'from-emerald-500 to-green-700', emoji: '🛒', duration: '0:36', industry: 'kiryana' },
  { id: 'v6', nameEn: 'Ayesha Tariq', nameUr: 'عائشہ طارق', businessEn: 'Ayesha Salon', businessUr: 'عائشہ سیلون', cityEn: 'Rawalpindi', cityUr: 'راولپنڈی', quoteEn: '68% more repeat customers', quoteUr: '۶۸٪ زیادہ گاہک واپس', gradient: 'from-purple-500 to-fuchsia-600', emoji: '💇', duration: '0:44', industry: 'salon' },
];

export function VideoTestimonialWall() {
  const { locale } = useLocale();
  const [playing, setPlaying] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const isUr = locale === 'ur';

  return (
    <Section variant="subtle" spacing="lg">
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Eyebrow variant="gold">{isUr ? 'اصلی چہرے، اصلی کہانیاں' : 'Real faces, real stories'}</Eyebrow>
          <h2 className={cn('mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance', isUr && 'font-urdu leading-snug')}>
            {isUr ? 'پاکستان بھر سے کاروباری کہانیاں' : 'Business stories from across Pakistan'}
          </h2>
          <p className={cn('mt-4 text-lg text-ink-600 dark:text-ink-300', isUr && 'font-urdu text-xl leading-loose')}>
            {isUr ? 'حقیقی دکاندار، حقیقی نتائج۔ ماؤس ہوور کریں سننے کے لیے۔' : 'Real shopkeepers, real results. Hover to hear the story.'}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {stories.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              onMouseEnter={() => setPlaying(s.id)}
              onMouseLeave={() => setPlaying(null)}
              className="group relative aspect-[9/16] rounded-3xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500"
            >
              {/* Gradient background (video placeholder) */}
              <div className={cn('absolute inset-0 bg-gradient-to-br', s.gradient)} />

              {/* Animated pattern */}
              <div className="absolute inset-0 opacity-30">
                <motion.div
                  animate={playing === s.id ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute top-1/4 left-1/2 -translate-x-1/2 text-[10rem]"
                >
                  {s.emoji}
                </motion.div>
              </div>

              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/30 to-transparent" />

              {/* Play indicator */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center">
                  {playing === s.id ? <Pause className="h-3.5 w-3.5 text-white" /> : <Play className="h-3.5 w-3.5 text-white ml-0.5" />}
                </div>
                <button onClick={(e) => { e.stopPropagation(); setMuted(!muted); }} className="h-8 w-8 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center">
                  {muted ? <VolumeX className="h-3.5 w-3.5 text-white" /> : <Volume2 className="h-3.5 w-3.5 text-white" />}
                </button>
              </div>

              {/* Duration */}
              <div className="absolute top-4 left-4 px-2 py-1 rounded-md bg-black/50 backdrop-blur-md text-white text-[10px] font-mono font-bold">
                {s.duration}
              </div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className={cn('text-2xl font-display font-extrabold leading-tight mb-2', isUr && 'font-urdu text-3xl')}>
                  &ldquo;{isUr ? s.quoteUr : s.quoteEn}&rdquo;
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <div className={cn('font-bold', isUr && 'font-urdu text-base')}>
                    {isUr ? s.nameUr : s.nameEn}
                  </div>
                  <span className="opacity-60">·</span>
                  <div className="flex items-center gap-1 opacity-80">
                    <MapPin className="h-3 w-3" />
                    <span className={cn('text-xs', isUr && 'font-urdu text-sm')}>
                      {isUr ? s.cityUr : s.cityEn}
                    </span>
                  </div>
                </div>
                <div className={cn('text-xs opacity-70 mt-0.5', isUr && 'font-urdu text-sm')}>
                  {isUr ? s.businessUr : s.businessEn}
                </div>
              </div>

              {/* Hover play overlay */}
              {playing === s.id && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
                >
                  <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center shadow-2xl">
                    <Play className="h-7 w-7 text-brand-600 ml-1" fill="currentColor" />
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
