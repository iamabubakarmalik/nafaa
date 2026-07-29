'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { features } from '@/lib/data/features';
import { industries } from '@/lib/data/industries';
import { integrations } from '@/lib/data/integrations';
import { cn } from '@/lib/cn';

interface Props {
  activeMenu: string | null;
  onClose: () => void;
}

export function MegaMenu({ activeMenu, onClose }: Props) {
  const { t, locale, isRtl } = useLocale();
  const isUr = locale === 'ur';

  if (!activeMenu) return null;

  return (
    <div
      className={cn(
        'absolute top-full left-0 right-0 z-40',
        'animate-in fade-in slide-in-from-top-2 duration-300',
      )}
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-12 pt-2">
        <div className="glass-strong rounded-3xl shadow-card-hover overflow-hidden ring-1 ring-inset ring-ink-200/60 dark:ring-ink-700/60">
          {activeMenu === 'product' && <ProductPanel isUr={isUr} onClose={onClose} />}
          {activeMenu === 'industries' && <IndustriesPanel isUr={isUr} onClose={onClose} />}
          {activeMenu === 'integrations' && <IntegrationsPanel isUr={isUr} onClose={onClose} />}
          {activeMenu === 'resources' && <ResourcesPanel isUr={isUr} onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

/* ─── PRODUCT PANEL ─────────────────────────────── */
function ProductPanel({ isUr, onClose }: { isUr: boolean; onClose: () => void }) {
  const coreFeatures = features.filter((f) => f.category === 'core').slice(0, 6);
  const advancedFeatures = features.filter((f) => f.category === 'advanced').slice(0, 4);

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-0">
      {/* Featured column */}
      <div className="relative overflow-hidden bg-gradient-brand text-white p-8">
        <div className="absolute -top-8 -right-8 h-40 w-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ring-1 ring-white/20">
            <Sparkles className="h-3 w-3" />
            {isUr ? 'مکمل' : 'Complete'}
          </span>
          <h3 className={`mt-4 font-display font-extrabold text-2xl leading-tight ${isUr ? 'font-urdu text-3xl leading-snug' : ''}`}>
            {isUr ? 'ایک پلیٹ فارم، پورا کاروبار' : 'One platform, entire business'}
          </h3>
          <p className={`mt-3 text-sm text-white/85 leading-relaxed ${isUr ? 'font-urdu text-base leading-loose' : ''}`}>
            {isUr
              ? 'کاؤنٹر سے لے کر بورڈ روم تک، ہر ٹول جو آپ کو چاہیے۔'
              : 'From counter to boardroom, every tool you need in one place.'}
          </p>
          <Link
            href="/product/pos"
            onClick={onClose}
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-white hover:gap-2.5 transition-all"
          >
            {isUr ? 'دورہ شروع کریں' : 'Start the tour'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Features grid */}
      <div className="p-8">
        <div className="grid grid-cols-2 gap-1 mb-6">
          <div>
            <div className="text-eyebrow font-mono text-brand-600 dark:text-brand-400 mb-4">
              {isUr ? 'بنیادی' : 'Core'}
            </div>
            <div className="space-y-1">
              {coreFeatures.map((f) => (
                <MegaLink
                  key={f.slug}
                  href={`/product/${f.slug}`}
                  title={isUr ? f.nameUr : f.nameEn}
                  desc={isUr ? f.taglineUr : f.taglineEn}
                  isUr={isUr}
                  onClose={onClose}
                />
              ))}
            </div>
          </div>
          <div>
            <div className="text-eyebrow font-mono text-aurora-purple mb-4">
              {isUr ? 'ذہانت اور جدید' : 'Intelligence & advanced'}
            </div>
            <div className="space-y-1">
              {advancedFeatures.map((f) => (
                <MegaLink
                  key={f.slug}
                  href={`/product/${f.slug}`}
                  title={isUr ? f.nameUr : f.nameEn}
                  desc={isUr ? f.taglineUr : f.taglineEn}
                  isUr={isUr}
                  onClose={onClose}
                />
              ))}
              <MegaLink
                href="/product/ai-assistant"
                title={isUr ? 'اے آئی معاون' : 'AI Assistant'}
                desc={isUr ? 'عام زبان میں کاروباری سوالات' : 'Ask anything in plain language'}
                badge={isUr ? 'نیا' : 'NEW'}
                isUr={isUr}
                onClose={onClose}
              />
            </div>
          </div>
        </div>
        <div className="pt-5 border-t border-ink-100 dark:border-ink-700/60 flex items-center justify-between text-sm">
          <Link
            href="/product"
            onClick={onClose}
            className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
          >
            {isUr ? 'تمام خصوصیات دیکھیں' : 'See all features'} →
          </Link>
          <Link
            href="/pricing"
            onClick={onClose}
            className="text-ink-600 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white"
          >
            {isUr ? 'قیمتیں دیکھیں' : 'View pricing'} →
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── INDUSTRIES PANEL ──────────────────────────── */
function IndustriesPanel({ isUr, onClose }: { isUr: boolean; onClose: () => void }) {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-eyebrow font-mono text-brand-600 dark:text-brand-400">
            {isUr ? 'اٹھارہ صنعتیں' : 'Eighteen industries'}
          </div>
          <h3 className={`mt-1 font-display font-bold text-xl ${isUr ? 'font-urdu text-2xl' : ''}`}>
            {isUr ? 'ہر صنعت کے لیے مخصوص' : 'Purpose-built for your industry'}
          </h3>
        </div>
        <Link
          href="/industries"
          onClick={onClose}
          className="text-sm text-brand-600 dark:text-brand-400 font-semibold hover:underline"
        >
          {isUr ? 'سب دیکھیں' : 'View all'} →
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {industries.slice(0, 12).map((ind) => (
          <Link
            key={ind.slug}
            href={`/industries/${ind.slug}`}
            onClick={onClose}
            className="group flex items-start gap-3 rounded-xl p-3 hover:bg-ink-100/70 dark:hover:bg-ink-800/70 transition-colors"
          >
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-xl shrink-0"
              style={{ backgroundColor: ind.color + '18', color: ind.color }}
            >
              {ind.emoji}
            </div>
            <div className="min-w-0">
              <div className={`font-semibold text-sm truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors ${isUr ? 'font-urdu text-base' : ''}`}>
                {isUr ? ind.nameUr : ind.nameEn}
              </div>
              <div className={`text-xs text-ink-500 dark:text-ink-400 line-clamp-1 mt-0.5 ${isUr ? 'font-urdu text-sm' : ''}`}>
                {isUr ? ind.tagUr : ind.tagEn}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── INTEGRATIONS PANEL ────────────────────────── */
function IntegrationsPanel({ isUr, onClose }: { isUr: boolean; onClose: () => void }) {
  const groups: Array<{ label: string; labelUr: string; cat: any }> = [
    { label: 'Sales channels', labelUr: 'سیلز چینلز', cat: 'sales' },
    { label: 'Payments', labelUr: 'ادائیگیاں', cat: 'payment' },
    { label: 'Couriers', labelUr: 'کوریئر', cat: 'courier' },
    { label: 'Government', labelUr: 'حکومتی', cat: 'government' },
  ];

  return (
    <div className="p-8">
      <div className="grid grid-cols-4 gap-6">
        {groups.map((g) => {
          const list = integrations.filter((i) => i.category === g.cat).slice(0, 5);
          return (
            <div key={g.cat}>
              <div className="text-eyebrow font-mono text-ink-500 dark:text-ink-400 mb-3">
                {isUr ? g.labelUr : g.label}
              </div>
              <div className="space-y-1">
                {list.map((it) => (
                  <Link
                    key={it.slug}
                    href={`/integrations/${it.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-ink-100/70 dark:hover:bg-ink-800/70 transition-colors"
                  >
                    <span className="text-lg">{it.logo}</span>
                    <span className={`text-sm font-medium ${isUr ? 'font-urdu text-base' : ''}`}>
                      {isUr ? it.nameUr : it.name}
                    </span>
                    {it.status === 'soon' && (
                      <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-gold/10 text-amber-600">
                        {isUr ? 'جلد' : 'SOON'}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 pt-5 border-t border-ink-100 dark:border-ink-700/60">
        <Link
          href="/integrations"
          onClick={onClose}
          className="text-sm text-brand-600 dark:text-brand-400 font-semibold hover:underline"
        >
          {isUr ? 'تمام انضمام دیکھیں' : 'Explore all integrations'} →
        </Link>
      </div>
    </div>
  );
}

/* ─── RESOURCES PANEL ───────────────────────────── */
function ResourcesPanel({ isUr, onClose }: { isUr: boolean; onClose: () => void }) {
  const links = [
    { href: '/blog', en: 'Blog', ur: 'بلاگ', desc: 'Product news, growth tips, industry insights', descUr: 'پروڈکٹ خبریں، ترقی کے مشورے' },
    { href: '/guides', en: 'Guides', ur: 'گائیڈز', desc: 'Deep how-tos for every feature', descUr: 'ہر خصوصیت کے لیے تفصیلی رہنمائی' },
    { href: '/help', en: 'Help Center', ur: 'مدد گاہ', desc: 'Answers, tutorials, and support', descUr: 'جوابات، ٹیوٹوریلز اور مدد' },
    { href: '/api-docs', en: 'API Documentation', ur: 'اے پی آئی دستاویزات', desc: 'REST API and webhooks', descUr: 'REST اے پی آئی اور ویب ہکس' },
    { href: '/changelog', en: 'Changelog', ur: 'تبدیلیوں کا ریکارڈ', desc: 'What we shipped recently', descUr: 'حالیہ اپ ڈیٹس' },
    { href: '/glossary', en: 'Glossary', ur: 'اصطلاحات', desc: 'One hundred plus retail terms explained', descUr: 'سو سے زائد ریٹیل اصطلاحات' },
  ];

  return (
    <div className="p-8">
      <div className="grid grid-cols-2 gap-2">
        {links.map((l) => (
          <MegaLink
            key={l.href}
            href={l.href}
            title={isUr ? l.ur : l.en}
            desc={isUr ? l.descUr : l.desc}
            isUr={isUr}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Shared link ───────────────────────────────── */
function MegaLink({
  href, title, desc, badge, isUr, onClose,
}: {
  href: string; title: string; desc: string; badge?: string; isUr: boolean; onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="group flex items-start gap-3 rounded-xl p-2.5 hover:bg-ink-100/70 dark:hover:bg-ink-800/70 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-semibold text-sm group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors ${isUr ? 'font-urdu text-base' : ''}`}>
            {title}
          </span>
          {badge && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gradient-brand text-white">
              {badge}
            </span>
          )}
        </div>
        <div className={`mt-0.5 text-xs text-ink-500 dark:text-ink-400 line-clamp-1 ${isUr ? 'font-urdu text-sm' : ''}`}>
          {desc}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-ink-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all mt-1" />
    </Link>
  );
}
