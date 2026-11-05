'use client';

/**
 * Mobile menu sheet (own chunk, loaded by MobileMenuButton on demand).
 *
 * It reads its links from the desktop navigation already in the page
 * (render.ts), so the menu is not sent a second time as props. Sections are
 * native <details> sharing one name, so only one is open at a time and they
 * work by keyboard and screen reader without extra code. Plain colours, no
 * blur and one short transform keep it smooth on low-end phones.
 *
 * Portalled to <body> (the sticky header would otherwise contain the fixed
 * sheet); the rest of the page is made inert while it is open.
 */
import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { shellStrings } from '@/lib/i18n/shell';
import { useSiteLocale } from '../LocaleGate';
import { ICON_SPRITE, LOGO_SPRITE } from './assets';
import { Preferences } from './HeaderBehavior';

export interface SheetCta {
  label: string;
  href: string;
}

export interface SheetProps {
  id: string;
  onClose: () => void;
  trial: SheetCta;
  demo: SheetCta;
  login: SheetCta;
  whatsapp: SheetCta | null;
  home: SheetCta;
  paired: readonly string[];
}

interface MLink {
  href: string;
  label: string;
  description?: string;
  icon?: string;
  badge?: string;
}
interface MGroup {
  label: string;
  kind: string;
  links: MLink[];
}
interface MSection {
  key: string;
  label: string;
  groups: MGroup[];
  overview?: MLink;
  featured?: MLink;
}

/** Order on small screens: what people look for first. */
const ORDER = ['products', 'industries', 'solutions', 'resources'];

function readLink(a: HTMLAnchorElement): MLink {
  let label = '';
  a.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) label += node.textContent;
  });
  return {
    href: a.getAttribute('href') ?? '/',
    label: label.trim() || (a.querySelector('b')?.textContent ?? ''),
    description: a.querySelector(':scope > span')?.textContent ?? undefined,
    icon: a.dataset.i,
    badge: a.querySelector(':scope > em')?.textContent ?? undefined,
  };
}

function readNav(): { sections: MSection[]; links: MLink[] } {
  const sections: MSection[] = [];
  const links: MLink[] = [];
  document.querySelectorAll<HTMLElement>('[data-site-header] [data-mega-root] .hn > .hi').forEach((li) => {
    const trigger = li.firstElementChild;
    if (trigger instanceof HTMLAnchorElement) {
      links.push(readLink(trigger));
      return;
    }
    const groups: MGroup[] = Array.from(li.querySelectorAll<HTMLElement>('.hg')).map((g) => ({
      label: g.querySelector(':scope > p')?.textContent ?? '',
      kind: g.dataset.k ?? 'rich',
      links: Array.from(g.querySelectorAll<HTMLAnchorElement>(':scope > a')).map(readLink),
    }));
    const strip = li.querySelector<HTMLElement>('.hx');
    const stripLinks = strip ? Array.from(strip.querySelectorAll<HTMLAnchorElement>(':scope > a:not(.ho)')).map(readLink) : [];
    if (stripLinks.length) groups.push({ label: strip?.querySelector('p')?.textContent ?? '', kind: 'compact', links: stripLinks });
    const overview = li.querySelector<HTMLAnchorElement>('.hx > a.ho');
    const featured = li.querySelector<HTMLAnchorElement>('a.hf');
    sections.push({
      key: li.dataset.p ?? '',
      label: trigger?.textContent ?? '',
      groups,
      overview: overview ? readLink(overview) : undefined,
      featured: featured
        ? { href: featured.getAttribute('href') ?? '/', label: featured.querySelector('b')?.textContent ?? '', description: featured.querySelector('span')?.textContent ?? undefined }
        : undefined,
    });
  });
  const rank = (key: string) => (ORDER.includes(key) ? ORDER.indexOf(key) : ORDER.length);
  sections.sort((a, b) => rank(a.key) - rank(b.key));
  return { sections, links };
}

function Icon({ name }: { name: string }) {
  return (
    <svg className="mt" aria-hidden="true">
      <use href={`${ICON_SPRITE}#${name}`} />
    </svg>
  );
}

export default function MobileSheet({ id, onClose, trial, demo, login, whatsapp, home, paired }: SheetProps) {
  const locale = useSiteLocale();
  const t = shellStrings(locale);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const { sections, links } = useMemo(readNav, []);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    root.setAttribute('data-sheet', '');
    const others = Array.from(document.body.children).filter((el) => el !== sheetRef.current && !el.hasAttribute('inert'));
    others.forEach((el) => el.setAttribute('inert', ''));
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      root.style.overflow = previous;
      root.removeAttribute('data-sheet');
      others.forEach((el) => el.removeAttribute('inert'));
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const item = (link: MLink, kind: string) => (
    <li key={link.href + link.label}>
      <Link href={link.href} prefetch={false} onClick={onClose} data-k={kind}>
        {kind === 'grid' && link.icon ? <Icon name={link.icon} /> : null}
        <span>
          {link.label}
          {link.badge ? <em>{link.badge}</em> : null}
        </span>
        {kind === 'rich' && link.description ? <small>{link.description}</small> : null}
      </Link>
    </li>
  );

  return createPortal(
    <div ref={sheetRef} id={id} role="dialog" aria-modal="true" aria-label={t.menu} className="msh" data-track-area="mobile-nav">
      <div className="msh-top">
        <Link href={home.href} onClick={onClose} aria-label={home.label} className="msh-logo">
          <svg viewBox="0 0 377.6 120" width="88" height="28" aria-hidden="true">
            <use href={LOGO_SPRITE} />
          </svg>
        </Link>
        <button ref={closeRef} type="button" onClick={onClose} className="ib">
          <span className="sr-only">{t.closeMenu}</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <nav className="msh-body" aria-label={t.mainNav}>
        {sections.map((section) => (
          <details
            key={section.key}
            name="msh"
            className="msa"
            onToggle={(event) => {
              // Opening a section closes the one above it; keep the opened heading in view.
              const el = event.currentTarget;
              if (el.open) el.scrollIntoView({ block: 'nearest' });
            }}
          >
            <summary>{section.label}</summary>
            <div className="msa-in">
              {section.groups.map((group) => (
                <div key={group.label + group.kind} className="msg" data-k={group.kind}>
                  {group.label ? <p>{group.label}</p> : null}
                  <ul>{group.links.map((link) => item(link, group.kind))}</ul>
                </div>
              ))}
              {section.featured ? (
                <Link href={section.featured.href} prefetch={false} onClick={onClose} className="msf">
                  <b>{section.featured.label}</b>
                  {section.featured.description ? <span>{section.featured.description}</span> : null}
                </Link>
              ) : null}
              {section.overview ? (
                <Link href={section.overview.href} prefetch={false} onClick={onClose} className="msa-ov">
                  {section.overview.label}
                </Link>
              ) : null}
            </div>
          </details>
        ))}
        <ul className="msq">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} prefetch={false} onClick={onClose}>
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href={demo.href} prefetch={false} onClick={onClose} data-track="cta_click" data-track-label="Mobile nav: Book a demo">
              {demo.label}
            </Link>
          </li>
          <li>
            <a href={login.href} data-track="cta_click" data-track-label="Mobile nav: Log in">
              {login.label}
            </a>
          </li>
        </ul>
        <Preferences paired={paired} />
      </nav>
      <div className="msh-cta">
        <a href={trial.href} className="btn-trial" data-track-label="Mobile nav: Start free trial">
          {trial.label}
        </a>
        {whatsapp ? (
          <a href={whatsapp.href} rel="noopener" target="_blank" className="btn-wa" data-track="whatsapp_click" data-track-label="Mobile nav: WhatsApp">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.93.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.24-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.23 9.43-9.44 9.43m8.03-17.46A11.3 11.3 0 0 0 12.05.72C5.79.72.69 5.81.69 12.08c0 2 .52 3.96 1.52 5.68L.6 23.64l6.02-1.58a11.3 11.3 0 0 0 5.43 1.38h.01c6.26 0 11.36-5.1 11.36-11.36 0-3.04-1.18-5.89-3.33-8.04" />
            </svg>
            {t.whatsappUs}
          </a>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
