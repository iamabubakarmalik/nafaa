/** `slideshow`: several hero slides (blocks of type `slide`) with autoplay. */
import { href } from '@/lib/format';
import { reader, visibleBlocks } from '@/lib/settings';
import { SlideshowClient, type Slide } from './SlideshowClient';
import type { SectionProps } from './types';

export function Slideshow({ section, ctx, index }: SectionProps) {
  const r = reader(section, ctx.lang);
  const slides: Slide[] = visibleBlocks(section).map((b) => {
    const s = reader(b, ctx.lang);
    return {
      id: b.id,
      image: s.image('image'),
      mobileImage: s.image('mobileImage'),
      heading: s.text('heading'),
      text: s.text('subheading') || s.text('text'),
      buttonLabel: s.text('buttonLabel'),
      buttonLink: href(ctx.lang, s.text('buttonLink', '/collections/all')),
      align: s.pick('align', ['left', 'center', 'right'] as const, 'center'),
      overlay: Math.max(0, Math.min(80, s.num('overlay', 20))),
    };
  });
  if (!slides.length) return null;
  return (
    <div className={r.pick('width', ['page', 'full'] as const, 'full') === 'page' ? 'page pt-4' : ''}>
      <SlideshowClient slides={slides} autoplay={r.bool('autoplay', true)} interval={Math.max(3, r.num('speed', r.num('interval', 5)))} height={r.pick('height', ['small', 'medium', 'large'] as const, 'medium')} priority={index === 0} rounded={r.pick('width', ['page', 'full'] as const, 'full') === 'page'} />
    </div>
  );
}
