/**
 * Site footer (section type `footer`). Columns come from the merchant's
 * blocks in order: menu (a navigation menu; nested items become their own
 * columns), text (about), contact, newsletter. With no blocks the footer
 * builds the same layout from the shop settings. Bottom bar: copyright,
 * policy links, "Report this store", payment marks and the Nafaa credit.
 * colorScheme "default" = the theme's dark footer.
 */
import Link from 'next/link';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import type { Block, MenuItem, Section } from '@/lib/api';
import { href } from '@/lib/format';
import { t } from '@/lib/i18n';
import { reader, schemeClass, visibleBlocks } from '@/lib/settings';
import type { SiteContext } from '@/lib/store';
import { PayMark, SocialIcon } from '../ui/brand-icons';
import { RichText } from '../ui/RichText';
import { NewsletterForm } from './Newsletter';
import { ReportStore } from './ReportStore';

const POLICY_KEY = { refund: 'policy.refund', privacy: 'policy.privacy', terms: 'policy.terms', shipping: 'policy.shipping' } as const;

const H = ({ children }: { children: React.ReactNode }) => <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.12em]">{children}</p>;

function LinkList({ items, ctx }: { items: MenuItem[]; ctx: SiteContext }) {
  return (
    <ul className="space-y-2.5 text-[14px] text-muted">
      {items.map((m) => (
        <li key={m.id}>
          <Link href={href(ctx.lang, m.url)} className="hover:text-fg hover:underline">
            {m.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Contact({ ctx, heading }: { ctx: SiteContext; heading: string }) {
  const c = ctx.boot.settings.contact;
  if (!c.phone && !c.whatsapp && !c.email && !c.address) return null;
  return (
    <div>
      <H>{heading}</H>
      <ul className="space-y-2.5 text-[14px] text-muted">
        {(c.phone || c.whatsapp) && (
          <li className="flex items-start gap-2">
            <Phone size={15} className="mt-1 shrink-0" />
            <a href={`tel:${c.phone || c.whatsapp}`} dir="ltr" className="hover:text-fg">
              {c.phone || c.whatsapp}
            </a>
          </li>
        )}
        {c.email && (
          <li className="flex items-start gap-2">
            <Mail size={15} className="mt-1 shrink-0" />
            <a href={`mailto:${c.email}`} className="hover:text-fg">
              {c.email}
            </a>
          </li>
        )}
        {c.address && (
          <li className="flex items-start gap-2">
            <MapPin size={15} className="mt-1 shrink-0" />
            <span>{c.address}</span>
          </li>
        )}
        {c.hours && (
          <li className="flex items-start gap-2">
            <Clock size={15} className="mt-1 shrink-0" />
            <span>{c.hours}</span>
          </li>
        )}
      </ul>
    </div>
  );
}

export function Footer({ section, ctx }: { section: Section; ctx: SiteContext }) {
  const r = reader(section, ctx.lang);
  const { settings, store, policies, payments } = ctx.boot;
  const social = Object.entries(settings.social ?? {}).filter(([k, v]) => v && k !== 'whatsapp');
  const showSocial = r.bool('showSocial', true) && social.length > 0;
  const nlMode = settings.newsletter.mode === 'email' ? 'email' : 'whatsapp';
  const year = new Date().getFullYear();

  const blocks: Block[] = visibleBlocks(section).length
    ? visibleBlocks(section)
    : [
        { id: 'f-text', type: 'text', settings: { heading: store.name, text: r.text('about', settings.tagline ?? '') } },
        { id: 'f-menu', type: 'menu', settings: { menu: r.text('menu', 'footer') } },
        { id: 'f-contact', type: 'contact', settings: {} },
        ...(r.bool('showNewsletter', true) ? [{ id: 'f-nl', type: 'newsletter', settings: {} }] : []),
      ];

  const cols = blocks.flatMap((b) => {
    const br = reader(b, ctx.lang);
    switch (b.type) {
      case 'text': {
        const text = br.text('text');
        return [
          <div key={b.id} className="max-w-sm">
            <p className="h-display font-heading text-2xl font-semibold">{br.text('heading', store.name)}</p>
            {text && (/<[a-z]/i.test(text) ? <RichText html={text} className="mt-3 !text-muted text-[14px]" /> : <p className="mt-3 text-[14px] leading-relaxed text-muted">{text}</p>)}
            {showSocial && (
              <div className="mt-5 flex gap-2">
                {social.map(([k, v]) => (
                  <a key={k} href={v} target="_blank" rel="noopener noreferrer" aria-label={k} className="grid h-10 w-10 place-items-center rounded-full bg-fg/10 transition hover:bg-fg/20">
                    <SocialIcon name={k} />
                  </a>
                ))}
              </div>
            )}
          </div>,
        ];
      }
      case 'menu': {
        const items = ctx.boot.menus[br.text('menu', 'footer')] ?? ctx.boot.menus.footer ?? [];
        const nested = items.filter((m) => m.children?.length);
        const flat = items.filter((m) => !m.children?.length);
        return [
          ...nested.map((m) => (
            <div key={`${b.id}-${m.id}`}>
              <H>{m.title}</H>
              <LinkList items={m.children} ctx={ctx} />
            </div>
          )),
          ...(flat.length
            ? [
                <div key={`${b.id}-flat`}>
                  <H>{br.text('heading', t(ctx.lang, 'nav.menu'))}</H>
                  <LinkList items={flat} ctx={ctx} />
                </div>,
              ]
            : []),
        ];
      }
      case 'contact':
        return [<Contact key={b.id} ctx={ctx} heading={br.text('heading', t(ctx.lang, 'footer.contact'))} />];
      case 'newsletter':
        return settings.newsletter.enabled
          ? [
              <div key={b.id} className="md:col-span-2 lg:col-span-1">
                <H>{br.text('heading', t(ctx.lang, 'footer.newsletter'))}</H>
                <NewsletterForm mode={nlMode} source="footer" />
              </div>,
            ]
          : [];
      default:
        return [];
    }
  });

  return (
    <footer className={`${schemeClass(r, 'inverse')} bg-bg text-fg`}>
      <div className="page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:py-16">{cols}</div>
      <div className="border-t border-line">
        <div className="page flex flex-col gap-4 py-6 text-[12.5px] md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted">
            <span>{r.text('copyright') || t(ctx.lang, 'footer.rights', { year, name: store.name })}</span>
            {r.bool('showPolicies', true) &&
              policies.map((p) => (
                <Link key={p.kind} href={href(ctx.lang, `/policies/${p.handle}`)} className="hover:text-fg hover:underline">
                  {t(ctx.lang, POLICY_KEY[p.kind])}
                </Link>
              ))}
            <ReportStore />
          </div>
          {r.bool('showPayments', true) && payments.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {payments.flatMap((p) => (p.code === 'SAFEPAY' ? ['VISA', 'MASTERCARD'] : [p.code])).map((code) => (
                <PayMark key={code} code={code} />
              ))}
            </div>
          )}
        </div>
        <div className="pb-6 text-center text-[11.5px] text-muted">
          <a href="https://nafaa.pk/stores" target="_blank" rel="noopener" className="hover:text-fg">
            {t(ctx.lang, 'footer.powered')}
          </a>
        </div>
      </div>
    </footer>
  );
}
