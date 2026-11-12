/** `video` and `countdown`. */
import Link from 'next/link';
import { href } from '@/lib/format';
import { t } from '@/lib/i18n';
import { reader } from '@/lib/settings';
import { Img } from '../ui/Img';
import { CountdownTimer } from './CountdownTimer';
import { LiteVideo } from './LiteVideo';
import { SectionHeading } from './SectionHeading';
import type { SectionProps } from './types';

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1]! : null;
}

export function Video({ section, ctx }: SectionProps) {
  const r = reader(section, ctx.lang);
  const url = r.text('videoUrl') || r.text('url');
  if (!url) return null;
  const yt = youtubeId(url);
  const vimeo = url.match(/vimeo\.com\/(\d+)/)?.[1] ?? null;
  return (
    <section className="section-y">
      <div className={r.pick('width', ['page', 'full'] as const, 'page') === 'full' ? '' : 'page'}>
        <SectionHeading title={r.text('heading')} text={r.text('text')} center />
        <LiteVideo
          autoplay={r.bool('autoplay', false)}
          embed={yt ? `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0` : vimeo ? `https://player.vimeo.com/video/${vimeo}?autoplay=1` : null}
          file={!yt && !vimeo ? url : null}
          poster={r.image('cover') ?? r.image('poster') ?? (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null)}
          title={r.text('heading', 'Video')}
        />
      </div>
    </section>
  );
}

export function Countdown({ section, ctx }: SectionProps) {
  const r = reader(section, ctx.lang);
  const ends = Date.parse(r.text('endsAt'));
  if (Number.isFinite(ends) && ends < Date.now() && r.bool('hideWhenOver', true)) return null;
  const image = r.image('image');
  const label = r.text('buttonLabel');
  const labels = { d: t(ctx.lang, 'countdown.days'), h: t(ctx.lang, 'countdown.hours'), m: t(ctx.lang, 'countdown.mins'), s: t(ctx.lang, 'countdown.secs'), ended: t(ctx.lang, 'countdown.ended') };
  return (
    <section className="section-y">
      <div className="page">
        <div className={`relative isolate overflow-hidden rounded-card ${image ? 'bg-neutral-900 text-white' : 'scheme-inverse'}`}>
          {image && <Img src={image} alt="" sizes="100vw" className="-z-10 object-cover opacity-35" />}
          <div className="flex flex-col items-center gap-5 px-6 py-14 text-center md:py-20">
            <span className="badge bg-sale text-white">{t(ctx.lang, 'product.sale')}</span>
            <h2 className="h-display max-w-2xl text-3xl font-semibold md:text-5xl">{r.text('heading')}</h2>
            {(r.text('subheading') || r.text('text')) && <p className="max-w-lg text-[16px] opacity-85">{r.text('subheading') || r.text('text')}</p>}
            {Number.isFinite(ends) && <CountdownTimer ends={ends} labels={labels} />}
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
