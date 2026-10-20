/**
 * Contact PAGE template (/contact, /demo): hero → contact channels →
 * leadForm (contact, demo or quote; S2's form island posts to the existing
 * /public/marketing endpoints). Title: the page's `{title}`.
 * Schema: ContactPage (graph.ts).
 *
 * The channels come from settings only: WhatsApp (`site.whatsapp`), email
 * and phone (`entity.contact`) and real offices (`entity.offices`). A
 * channel that is not set is not shown.
 */
import { whatsappHref } from '@/components/layout/nav';
import type { PublicEntity, PublicEntry, SiteSettings } from '@/lib/cms/contract/cms-contract';
import { CmsIcon } from '@/lib/icons';
import { loadEntity, loadSite } from '../core/data';
import { PageFrame } from '../core/frame';
import { StandardBody } from '../core/Standard';
import { Arrow } from '../core/ui';

function Channels({ site, entity }: { site: SiteSettings; entity: PublicEntity | null }) {
  const wa = whatsappHref(site);
  const channels = [
    wa ? { icon: 'message-circle', label: 'WhatsApp', value: 'Chat with the team', href: wa, track: 'whatsapp_click' } : null,
    entity?.contact.email ? { icon: 'mail', label: 'Email', value: entity.contact.email, href: `mailto:${entity.contact.email}` } : null,
    entity?.contact.phone ? { icon: 'phone', label: 'Phone', value: entity.contact.phone, href: `tel:${entity.contact.phone.replace(/[^+\d]/g, '')}` } : null,
  ].filter((c): c is { icon: string; label: string; value: string; href: string; track?: string } => c !== null);
  const offices = entity?.offices ?? [];
  if (!channels.length && !offices.length) return null;

  return (
    <section aria-labelledby="contact-channels" className="pb-4">
      <div className="mx-auto box-content max-w-container px-gutter">
        <h2 id="contact-channels" className="sr-only">
          Ways to reach us
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {channels.map((c) => (
            <li key={c.label}>
              <a
                href={c.href}
                data-track={c.track}
                className="group flex h-full items-center gap-4 rounded-xl border border-line bg-surface p-5 shadow-e1 transition-[border-color,box-shadow,transform] duration-base ease-out hover:-translate-y-0.5 hover:border-line-strong hover:shadow-e2 ink:shadow-none"
              >
                <span aria-hidden className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/15 ink:bg-brand-400/10 ink:text-brand-300">
                  <CmsIcon name={c.icon} size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-eyebrow uppercase text-fg-subtle">{c.label}</span>
                  <span className="mt-0.5 block truncate text-body font-medium text-fg-strong">{c.value}</span>
                </span>
                <Arrow className="text-fg-subtle transition-transform duration-fast group-hover:translate-x-0.5" />
              </a>
            </li>
          ))}
        </ul>
        {offices.length ? (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {offices.map((o) => (
              <li key={o.label} className="rounded-xl border border-line bg-surface-2 p-5">
                <p className="text-h4 text-fg-strong">{o.label}</p>
                <address className="mt-1 text-small not-italic text-fg-muted">
                  {o.street}, {o.city}, {o.region}
                  {o.postalCode ? ` ${o.postalCode}` : ''}
                </address>
                {o.phone ? <p className="mt-1 text-small text-fg-muted">{o.phone}</p> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

export async function ContactTemplate({ entry }: { entry: PublicEntry }) {
  const [site, entity] = await Promise.all([loadSite(entry.locale), loadEntity(entry.locale)]);
  return (
    <PageFrame entry={entry}>
      <StandardBody entry={entry} showUpdated={false} afterHero={<Channels site={site} entity={entity} />} />
    </PageFrame>
  );
}
