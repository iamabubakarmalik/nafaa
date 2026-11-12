/**
 * Content sections: image_with_text, banner_cta, testimonials, faq,
 * trust_badges, newsletter, gallery, brand_logos, rich_text.
 */
import Link from 'next/link';
import { BadgeCheck, Banknote, ChevronDown, Gift, Headset, Leaf, Quote, RotateCcw, ShieldCheck, Sparkles, Star, Truck } from 'lucide-react';
import { href } from '@/lib/format';
import { t, type MessageKey } from '@/lib/i18n';
import { reader, visibleBlocks } from '@/lib/settings';
import { Img } from '../ui/Img';
import { RichText } from '../ui/RichText';
import { Stars } from '../ui/Stars';
import { SocialIcon, WhatsAppIcon } from '../ui/brand-icons';
import { NewsletterForm } from '../layout/Newsletter';
import { HEIGHTS, HEIGHT_KEYS } from './Hero';
import { SectionHeading } from './SectionHeading';
import type { SectionProps } from './types';

export function ImageWithText({ section, ctx }: SectionProps) {
  const r = reader(section, ctx.lang);
  const image = r.image('image');
  const right = r.pick('imagePosition', ['left', 'right'] as const, 'left') === 'right';
  const surface = r.raw('background') === 'surface';
  const label = r.text('buttonLabel');
  return (
    <section className={surface ? 'bg-surface' : ''}>
      <div className="page grid items-center gap-8 py-12 md:grid-cols-2 md:gap-16 md:py-20">
        <div className={`relative aspect-[4/5] overflow-hidden rounded-card bg-bg md:aspect-[5/6] ${right ? 'md:order-2' : ''}`}>
          {image ? <Img src={image} alt={r.text('heading')} sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" /> : <span className="absolute inset-0 bg-gradient-to-br from-primary/15 via-surface to-accent/25" />}
        </div>
        <div className="max-w-lg">
          {r.text('eyebrow') && <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">{r.text('eyebrow')}</p>}
          <h2 className="h-section !text-3xl md:!text-[2.6rem]">{r.text('heading')}</h2>
          <RichText html={r.text('text')} className="mt-5 text-[16px]" />
          {label && (
            <Link href={href(ctx.lang, r.text('buttonLink', '/'))} className="btn btn-outline mt-8">
              {label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export function BannerCta({ section, ctx }: SectionProps) {
  const r = reader(section, ctx.lang);
  const image = r.image('image');
  const height = r.pick('height', HEIGHT_KEYS, 'small');
  const align = r.pick('align', ['left', 'center', 'right'] as const, 'center');
  const overlay = Math.max(0, Math.min(80, r.num('overlay', 40)));
  const label = r.text('buttonLabel');
  const pos = align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-end' : 'items-start text-start';
  return (
    <section className="section-y">
      <div className="page">
        <div className={`relative isolate flex overflow-hidden rounded-card ${image ? 'bg-neutral-900 text-white' : 'scheme-accent'} ${HEIGHTS[height === 'full' ? 'large' : height]}`}>
          {image && <Img src={image} alt={r.text('heading')} sizes="(min-width: 1280px) 1280px, 100vw" className="-z-10 object-cover" />}
          {image && <div className="absolute inset-0 -z-10" style={{ ['--o' as string]: overlay / 100, background: 'linear-gradient(90deg, rgb(0 0 0 / calc(var(--o) + 0.2)), rgb(0 0 0 / calc(var(--o) * 0.3)))' }} />}
          <div className={`flex w-full flex-col justify-center gap-4 p-7 md:p-14 ${pos} ${image ? 'text-white' : ''}`}>
            <h2 className="h-display max-w-xl text-3xl font-semibold leading-tight md:text-5xl">{r.text('heading')}</h2>
            {(r.text('subheading') || r.text('text')) && <p className="max-w-lg text-[16px] opacity-90 md:text-lg">{r.text('subheading') || r.text('text')}</p>}
            {label && (
              <Link href={href(ctx.lang, r.text('buttonLink', '/collections/all'))} className={`btn btn-lg mt-2 ${image ? 'btn-light' : 'btn-primary'}`}>
                {label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Testimonials({ section, ctx }: SectionProps) {
  const r = reader(section, ctx.lang);
  const items = visibleBlocks(section).map((b) => reader(b, ctx.lang));
  if (!items.length) return null;
  const rv = ctx.boot.reviews;
  const nafaa = r.bool('fromNafaa', true) && rv.enabled && rv.count > 0 && rv.average;
  return (
    <section className="section-y bg-surface">
      <div className="page">
        <SectionHeading title={r.text('heading')} text={r.text('text')} center />
        {nafaa ? (
          <p className="-mt-3 mb-8 flex items-center justify-center gap-2 text-[14px] text-muted">
            <Stars value={rv.average!} size={16} /> <b className="text-fg">{rv.average!.toFixed(1)}</b> · {t(ctx.lang, 'product.reviewsCount', { n: rv.count })}
          </p>
        ) : null}
        <div className="snap-row -mx-4 gap-4 px-4 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0">
          {items.map((q, i) => (
            <figure key={i} className="card flex w-[84%] shrink-0 snap-start flex-col gap-4 bg-bg p-6 shadow-card md:w-auto md:p-8">
              <div className="flex items-center justify-between">
                <Stars value={q.num('rating', 5)} size={16} />
                <Quote size={26} className="text-fg/10" />
              </div>
              <blockquote className="flex-1 text-[15.5px] leading-relaxed text-fg/90">“{q.text('quote')}”</blockquote>
              <figcaption className="flex items-center gap-3">
                {q.image('image') ? (
                  <span className="relative h-10 w-10 overflow-hidden rounded-full bg-surface">
                    <Img src={q.image('image')!} alt="" sizes="40px" className="object-cover" />
                  </span>
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 font-semibold text-primary">{q.text('author').slice(0, 1)}</span>
                )}
                <span>
                  <span className="block text-[14px] font-semibold">{q.text('author')}</span>
                  {q.text('city') && <span className="block text-[12.5px] text-muted">{q.text('city')}</span>}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Faq({ section, ctx }: SectionProps) {
  const r = reader(section, ctx.lang);
  const items = visibleBlocks(section).map((b) => reader(b, ctx.lang));
  if (!items.length) return null;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((q) => ({ '@type': 'Question', name: q.text('question'), acceptedAnswer: { '@type': 'Answer', text: q.text('answer').replace(/<[^>]+>/g, ' ') } })),
  };
  return (
    <section className="section-y">
      <div className="page max-w-3xl">
        <SectionHeading title={r.text('heading')} text={r.text('text')} center />
        <div className="divide-y divide-line border-y border-line">
          {items.map((q, i) => (
            <details key={i} className="group py-1" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-medium [&::-webkit-details-marker]:hidden">
                {q.text('question')}
                <ChevronDown size={20} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <RichText html={q.text('answer')} className="pb-5 text-[15px]" />
            </details>
          ))}
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </section>
  );
}

const ICONS: Record<string, (p: { size: number; className?: string }) => React.ReactNode> = {
  cod: (p) => <Banknote {...p} />,
  truck: (p) => <Truck {...p} />,
  returns: (p) => <RotateCcw {...p} />,
  return: (p) => <RotateCcw {...p} />,
  shield: (p) => <ShieldCheck {...p} />,
  original: (p) => <BadgeCheck {...p} />,
  support: (p) => <Headset {...p} />,
  whatsapp: (p) => <WhatsAppIcon size={p.size} className={p.className} />,
  star: (p) => <Star {...p} />,
  gift: (p) => <Gift {...p} />,
  leaf: (p) => <Leaf {...p} />,
  sparkles: (p) => <Sparkles {...p} />,
};

const DEFAULT_BADGES: Array<[string, MessageKey, MessageKey]> = [
  ['cod', 'trust.cod', 'trust.codText'],
  ['truck', 'trust.delivery', 'trust.deliveryText'],
  ['returns', 'trust.returns', 'trust.returnsText'],
  ['shield', 'trust.secure', 'trust.secureText'],
];

export function TrustBadges({ section, ctx }: SectionProps) {
  const r = reader(section, ctx.lang);
  const blocks = visibleBlocks(section);
  const items = blocks.length
    ? blocks.map((b) => {
        const br = reader(b, ctx.lang);
        return { icon: br.text('icon', 'cod'), image: br.image('image'), title: br.text('title'), text: br.text('text') };
      })
    : DEFAULT_BADGES.map(([icon, a, b]) => ({ icon, image: null as string | null, title: t(ctx.lang, a), text: t(ctx.lang, b) }));
  return (
    <section className="border-y border-line">
      <div className="page">
        {r.text('heading') && <h2 className="h-section pt-10 text-center">{r.text('heading')}</h2>}
        <div className={`grid grid-cols-2 gap-x-4 gap-y-6 py-7 md:py-9 ${items.length >= 4 ? 'lg:grid-cols-4' : items.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          {items.map((b, i) => (
            <div key={i} className="flex flex-col items-center gap-2.5 text-center md:flex-row md:items-center md:gap-4 md:text-start">
              <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-primary">{b.icon === 'custom' && b.image ? <Img src={b.image} alt="" sizes="48px" className="object-contain p-2.5" /> : (ICONS[b.icon] ?? ICONS.cod!)({ size: 22 })}</span>
              <span>
                <span className="block text-[14px] font-semibold leading-tight md:text-[15px]">{b.title}</span>
                {b.text && <span className="mt-0.5 block text-[12.5px] text-muted md:text-[13.5px]">{b.text}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function NewsletterSection({ section, ctx }: SectionProps) {
  const r = reader(section, ctx.lang);
  const nl = ctx.boot.settings.newsletter;
  if (!nl.enabled) return null;
  const collect = r.pick('collect', ['whatsapp', 'email', 'both'] as const, r.pick('mode', ['whatsapp', 'email'] as const, nl.mode === 'email' ? 'email' : 'whatsapp'));
  const mode = collect === 'email' ? 'email' : 'whatsapp';
  return (
    <section className="section-y">
      <div className="page">
        <div className="card scheme-accent flex flex-col items-center gap-5 px-6 py-12 text-center md:py-16">
          {mode === 'whatsapp' && (
            <span className="grid h-14 w-14 place-items-center rounded-full bg-white/15">
              <WhatsAppIcon size={28} />
            </span>
          )}
          <h2 className="h-section max-w-xl">{r.text('heading')}</h2>
          {(r.text('subheading') || r.text('text')) && <p className="max-w-lg text-[15.5px] opacity-90">{r.text('subheading') || r.text('text')}</p>}
          <NewsletterForm mode={mode} source="section" dark buttonLabel={r.text('buttonLabel')} />
        </div>
      </div>
    </section>
  );
}

export function Gallery({ section, ctx }: SectionProps) {
  const r = reader(section, ctx.lang);
  const items = visibleBlocks(section)
    .map((b) => reader(b, ctx.lang))
    .map((b) => ({ image: b.image('image'), link: b.text('link') }))
    .filter((x) => x.image);
  if (!items.length) return null;
  const handle = r.text('handle');
  const link = r.text('link') || ctx.boot.settings.social.instagram || null;
  const cols = Math.max(3, Math.min(8, r.num('columns', 6)));
  const colCls = ({ 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5', 6: 'md:grid-cols-6', 7: 'md:grid-cols-7', 8: 'md:grid-cols-8' } as Record<number, string>)[cols];
  return (
    <section className="section-y">
      <div className="page">
        <SectionHeading title={r.text('heading')} text={handle} center />
        <div className={`grid grid-cols-3 gap-1.5 md:gap-3 ${colCls}`}>
          {items.map((g, i) => {
            const inner = (
              <>
                <Img src={g.image!} alt="" sizes="(min-width: 768px) 16vw, 33vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
                  <SocialIcon name="instagram" size={22} />
                </span>
              </>
            );
            return g.link || link ? (
              <a key={i} href={g.link || link!} target="_blank" rel="noopener noreferrer" className="group relative aspect-square overflow-hidden rounded-[calc(var(--r-card)*0.5)] bg-surface">
                {inner}
              </a>
            ) : (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-[calc(var(--r-card)*0.5)] bg-surface">
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function BrandLogos({ section, ctx }: SectionProps) {
  const r = reader(section, ctx.lang);
  const items = visibleBlocks(section).map((b) => reader(b, ctx.lang));
  if (!items.length) return null;
  const grey = r.bool('grayscale', true);
  return (
    <section className="section-y">
      <div className="page">
        {r.text('heading') && <p className="mb-6 text-center text-[13px] font-semibold uppercase tracking-[0.16em] text-muted">{r.text('heading')}</p>}
        <div className="grid grid-cols-3 items-center gap-x-6 gap-y-6 md:grid-cols-6">
          {items.map((b, i) => {
            const img = b.image('image');
            const body = img ? (
              <span className="relative block h-10 w-full">
                <Img src={img} alt={b.text('name')} sizes="160px" className={`object-contain transition ${grey ? 'opacity-60 grayscale hover:opacity-100 hover:grayscale-0' : ''}`} />
              </span>
            ) : (
              <span className="block text-center font-heading text-xl font-bold tracking-tight text-fg/40 transition hover:text-fg/80">{b.text('name')}</span>
            );
            return b.text('link') ? (
              <a key={i} href={b.text('link')} target="_blank" rel="noopener noreferrer">
                {body}
              </a>
            ) : (
              <div key={i}>{body}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function RichTextSection({ section, ctx }: SectionProps) {
  const r = reader(section, ctx.lang);
  const center = r.pick('align', ['left', 'center'] as const, 'center') === 'center';
  return (
    <section className="section-y">
      <div className={`page max-w-3xl ${center ? 'text-center' : ''}`}>
        {r.text('heading') && <h2 className="h-section mb-4">{r.text('heading')}</h2>}
        <RichText html={r.text('text')} className="text-[16.5px]" />
        {r.text('buttonLabel') && (
          <Link href={href(ctx.lang, r.text('buttonLink', '/'))} className="btn btn-primary mt-7">
            {r.text('buttonLabel')}
          </Link>
        )}
      </div>
    </section>
  );
}
