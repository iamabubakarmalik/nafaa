/**
 * `hero`: one full-width image with heading, text and up to two buttons.
 * The first section on the page loads its image with priority (LCP).
 */
import Link from 'next/link';
import { href } from '@/lib/format';
import { reader } from '@/lib/settings';
import { Img } from '../ui/Img';
import type { SectionProps } from './types';

export const HEIGHTS = {
  small: 'min-h-[340px] md:min-h-[420px]',
  medium: 'min-h-[440px] md:min-h-[560px]',
  large: 'min-h-[520px] md:min-h-[680px]',
  full: 'min-h-[calc(100svh-100px)]',
} as const;

export type Height = keyof typeof HEIGHTS;
export const HEIGHT_KEYS = ['small', 'medium', 'large', 'full'] as const;

export function Hero({ section, ctx, index }: SectionProps) {
  const r = reader(section, ctx.lang);
  const image = r.image('image');
  const mobile = r.image('mobileImage');
  const align = r.pick('align', ['left', 'center', 'right'] as const, 'center');
  const height = r.pick('height', HEIGHT_KEYS, 'medium');
  const overlay = Math.max(0, Math.min(80, r.num('overlay', 20)));
  const dark = r.pick('textColor', ['light', 'dark'] as const, 'light') === 'dark';
  const heading = r.text('heading');
  const text = r.text('subheading') || r.text('text');
  const b1 = r.text('buttonLabel');
  const b2 = r.text('secondaryLabel');
  const pos = align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-end' : 'items-start text-start';
  return (
    <section className={`relative isolate flex overflow-hidden ${image ? 'bg-surface' : 'bg-gradient-to-br from-primary/15 via-surface to-accent/20'} ${HEIGHTS[height]}`}>
      {image && (
        <div className={`absolute inset-0 -z-10 ${mobile ? 'hidden md:block' : ''}`}>
          <Img src={image} alt={heading} priority={index === 0} sizes="100vw" className="object-cover" />
        </div>
      )}
      {mobile && (
        <div className="absolute inset-0 -z-10 md:hidden">
          <Img src={mobile} alt={heading} priority={index === 0} sizes="100vw" className="object-cover" />
        </div>
      )}
      {image && !dark && (
        <div className="absolute inset-0 -z-10" style={{ ['--o' as string]: overlay / 100, background: 'linear-gradient(90deg, rgb(0 0 0 / calc(var(--o) + 0.15)) 0%, rgb(0 0 0 / var(--o)) 45%, rgb(0 0 0 / calc(var(--o) * 0.4)) 100%)' }} />
      )}
      {image && dark && <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/70 via-white/30 to-transparent" />}
      <div className={`page flex w-full flex-col justify-end pb-12 pt-24 md:justify-center md:pb-16 ${pos}`}>
        <div className={`max-w-xl animate-rise ${image && !dark ? 'text-white' : 'text-fg'}`}>
          {heading && <h1 className="h-display text-[2.4rem] font-semibold leading-[1.05] md:text-6xl">{heading}</h1>}
          {text && <p className="mt-4 text-[16px] leading-relaxed opacity-90 md:text-lg">{text}</p>}
          {(b1 || b2) && (
            <div className={`mt-7 flex flex-wrap gap-3 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : ''}`}>
              {b1 && (
                <Link href={href(ctx.lang, r.text('buttonLink', '/collections/all'))} className={`btn btn-lg ${image && !dark ? 'btn-light' : 'btn-primary'}`}>
                  {b1}
                </Link>
              )}
              {b2 && (
                <Link href={href(ctx.lang, r.text('secondaryLink', '/collections/all'))} className={`btn btn-lg ${image && !dark ? 'btn-on-dark' : 'btn-outline'}`}>
                  {b2}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
