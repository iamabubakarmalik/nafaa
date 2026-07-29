'use client';

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cities } from '@/lib/data/cities';
import { LiveDot } from '@/components/primitives/LiveDot';
import { cn } from '@/lib/cn';

export function GeoWelcome() {
  const { locale } = useLocale();
  const [city, setCity] = useState<typeof cities[0] | null>(null);
  const isUr = locale === 'ur';

  useEffect(() => {
    // Simulated geo-detection — in production, use IP-based service
    // For now, rotate through featured cities
    const featured = cities.filter((c) => c.featured);
    const randomCity = featured[Math.floor(Math.random() * featured.length)];
    const timer = setTimeout(() => setCity(randomCity), 400);
    return () => clearTimeout(timer);
  }, []);

  if (!city) {
    return (
      <div className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-ink-100/60 dark:bg-ink-800/60 animate-pulse">
        <div className="h-2 w-2 rounded-full bg-ink-300 dark:bg-ink-600" />
        <div className="h-3 w-32 bg-ink-200 dark:bg-ink-700 rounded" />
      </div>
    );
  }

  const shopCount = city.activeShops.toLocaleString(isUr ? 'ur-PK' : 'en-PK');

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 h-8 rounded-full',
        'bg-white/70 dark:bg-ink-800/60 backdrop-blur-md',
        'ring-1 ring-inset ring-ink-200/60 dark:ring-ink-700/60',
        'text-sm font-semibold text-ink-700 dark:text-ink-200',
        'animate-in fade-in slide-in-from-top-2 duration-500',
      )}
    >
      <LiveDot color="emerald" size="sm" />
      <MapPin className="h-3.5 w-3.5 text-brand-600" />
      <span className={isUr ? 'font-urdu' : ''}>
        {isUr
          ? `${city.nameUr} میں ${shopCount}+ کاروبار ابھی فعال`
          : `${shopCount}+ businesses active in ${city.nameEn}`}
      </span>
    </div>
  );
}
