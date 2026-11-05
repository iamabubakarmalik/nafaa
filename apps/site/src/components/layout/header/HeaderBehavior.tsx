'use client';

/**
 * Header islands. The navigation itself is server HTML (render.ts); these
 * add behaviour around it and keep the first-load JS small:
 *
 * - HeaderBehavior (renders nothing): mega menu hover intent, click/tap,
 *   keyboard (arrows, Home/End, Escape), outside click, client-side
 *   navigation and hover prefetch for menu links, icons and feature images
 *   on first use, and the sticky header's scrolled / hide-on-scroll state.
 * - HeaderTools: the compact language and theme menu.
 * - MobileMenuButton: opens the mobile sheet (a separate chunk, loaded when
 *   the finger or pointer reaches the button).
 *
 * State lives in data attributes (header.css): `data-open` on the open item,
 * `data-instant` on the nav while moving between open panels, and
 * `data-scrolled`, `data-hidden` and `data-menu` on the header.
 */
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { track } from '@/lib/analytics/track';
import { cmsPathOf, pathIn, shellStrings, type SiteLocale } from '@/lib/i18n/shell';
import { useSiteLocale, useUrduLive } from '../LocaleGate';
import { ICON_SPRITE } from './assets';
import type { SheetProps } from './MobileSheet';

const OPEN_DELAY = 90;
const CLOSE_DELAY = 220;

function closest<T extends Element>(target: EventTarget | null, selector: string): T | null {
  return target instanceof Element ? target.closest<T>(selector) : null;
}

/** Adds the sprite icon to every link that names one (once per page). */
export function addIcons(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-i]:not([data-iok])').forEach((el) => {
    el.setAttribute('data-iok', '');
    el.insertAdjacentHTML('afterbegin', `<svg class="mt" aria-hidden="true"><use href="${ICON_SPRITE}#${el.dataset.i}"></use></svg>`);
  });
}

export function HeaderBehavior() {
  const router = useRouter();
  const pathname = usePathname();
  const api = useRef<{ close: () => void } | null>(null);

  useEffect(() => {
    api.current?.close();
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest('[data-mega-root]')) active.blur();
  }, [pathname]);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>('[data-site-header]');
    const nav = header?.querySelector<HTMLElement>('[data-mega-root]');
    if (!header || !nav) return;
    nav.setAttribute('data-ready', '');

    const items = Array.from(nav.querySelectorAll<HTMLElement>('.hi'));
    const triggerOf = (li: HTMLElement) => li.firstElementChild as HTMLElement;
    const hasPanel = (li: HTMLElement) => li.hasAttribute('data-p');
    let open: HTMLElement | null = null;
    let openedAt = 0;
    let openTimer = 0;
    let closeTimer = 0;
    let primed = false;
    const prefetched = new Set<string>();

    const clearTimers = () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(closeTimer);
    };
    const prime = () => {
      if (primed) return;
      primed = true;
      addIcons(nav);
    };
    const hide = () => {
      clearTimers();
      if (!open) return;
      open.removeAttribute('data-open');
      triggerOf(open).setAttribute('aria-expanded', 'false');
      open = null;
      header.removeAttribute('data-menu');
    };
    const show = (li: HTMLElement) => {
      clearTimers();
      if (open === li) return;
      prime();
      const swapping = open !== null;
      if (open) {
        open.removeAttribute('data-open');
        triggerOf(open).setAttribute('aria-expanded', 'false');
      }
      li.querySelectorAll<HTMLImageElement>('img[data-src]').forEach((img) => {
        img.src = img.dataset.src ?? '';
        img.removeAttribute('data-src');
      });
      nav.toggleAttribute('data-instant', swapping);
      li.setAttribute('data-open', '');
      triggerOf(li).setAttribute('aria-expanded', 'true');
      open = li;
      openedAt = Date.now();
      header.setAttribute('data-menu', '');
      header.removeAttribute('data-hidden');
    };
    api.current = { close: hide };

    const linksOf = (li: HTMLElement) => Array.from(li.querySelectorAll<HTMLElement>('.hp a'));
    const focusTrigger = (index: number) => {
      const li = items[(index + items.length) % items.length]!;
      triggerOf(li).focus();
      if (open && li !== open) {
        if (hasPanel(li)) show(li);
        else hide();
      }
    };

    const onEnter = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const li = event.currentTarget as HTMLElement;
      prime();
      window.clearTimeout(closeTimer);
      window.clearTimeout(openTimer);
      if (!hasPanel(li)) {
        if (open) closeTimer = window.setTimeout(hide, 120);
        return;
      }
      if (open) show(li);
      else openTimer = window.setTimeout(() => show(li), OPEN_DELAY);
    };
    const onLeave = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      window.clearTimeout(openTimer);
      if (open) closeTimer = window.setTimeout(hide, CLOSE_DELAY);
    };

    const onClick = (event: MouseEvent) => {
      const trigger = closest<HTMLButtonElement>(event.target, 'button.ht');
      if (trigger) {
        const li = trigger.parentElement as HTMLElement;
        // A hover-opened panel stays open when its trigger is clicked right after.
        if (open === li && Date.now() - openedAt > 400) hide();
        else show(li);
        return;
      }
      const link = closest<HTMLAnchorElement>(event.target, 'a');
      if (!link) return;
      hide();
      const href = link.getAttribute('href') ?? '';
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target ||
        !href.startsWith('/') ||
        href.startsWith('//')
      ) {
        return;
      }
      event.preventDefault();
      link.blur();
      router.push(href);
    };

    const onOver = (event: PointerEvent) => {
      const link = closest<HTMLAnchorElement>(event.target, 'a');
      const href = link?.getAttribute('href');
      if (!href || !href.startsWith('/') || href.startsWith('//') || prefetched.has(href)) return;
      prefetched.add(href);
      router.prefetch(href);
    };

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const li = target.closest<HTMLElement>('.hi');
      if (!li) return;
      const index = items.indexOf(li);
      const rtl = getComputedStyle(nav).direction === 'rtl';
      const onTrigger = target === triggerOf(li);
      const key = event.key;

      if (key === 'Escape') {
        if (!open) return;
        event.preventDefault();
        const current = open;
        hide();
        triggerOf(current).focus();
        return;
      }
      if (onTrigger) {
        if (key === 'ArrowRight' || key === 'ArrowLeft') {
          event.preventDefault();
          focusTrigger(index + ((key === 'ArrowRight') !== rtl ? 1 : -1));
        } else if (key === 'Home' || key === 'End') {
          event.preventDefault();
          focusTrigger(key === 'Home' ? 0 : items.length - 1);
        } else if (key === 'ArrowDown' && hasPanel(li)) {
          event.preventDefault();
          show(li);
          linksOf(li)[0]?.focus();
        }
        return;
      }
      const links = linksOf(li);
      const at = links.indexOf(target);
      if (at === -1) return;
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        event.preventDefault();
        const next = at + (key === 'ArrowDown' ? 1 : -1);
        if (next < 0) triggerOf(li).focus();
        else links[Math.min(next, links.length - 1)]?.focus();
      } else if (key === 'Home' || key === 'End') {
        event.preventDefault();
        links[key === 'Home' ? 0 : links.length - 1]?.focus();
      }
    };

    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget instanceof Node ? event.relatedTarget : null;
      if (open && !(next && open.contains(next))) {
        // Moving to another trigger keeps the menu open only when that item has a panel.
        const li = next instanceof Element ? next.closest<HTMLElement>('.hi') : null;
        if (li && nav.contains(li) && hasPanel(li) && next === triggerOf(li)) return;
        hide();
      }
    };

    const onDocPointer = (event: PointerEvent) => {
      if (open && !nav.contains(event.target as Node)) hide();
    };
    const onDocKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open && !nav.contains(event.target as Node)) hide();
    };

    // Sticky header: glass after the first pixels, hidden while scrolling down, back on the way up.
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        const y = Math.max(0, window.scrollY);
        header.toggleAttribute('data-scrolled', y > 4);
        const dy = y - lastY;
        if (Math.abs(dy) < 8 && y > 0) return;
        const hideNow =
          dy > 0 &&
          y > header.offsetHeight * 2 &&
          !open &&
          !header.contains(document.activeElement) &&
          !document.documentElement.hasAttribute('data-sheet');
        header.toggleAttribute('data-hidden', hideNow);
        lastY = y;
      });
    };
    onScroll();

    items.forEach((li) => {
      li.addEventListener('pointerenter', onEnter);
      li.addEventListener('pointerleave', onLeave);
    });
    nav.addEventListener('click', onClick);
    nav.addEventListener('pointerover', onOver);
    nav.addEventListener('keydown', onKey);
    nav.addEventListener('focusin', prime);
    nav.addEventListener('focusout', onFocusOut);
    document.addEventListener('pointerdown', onDocPointer);
    document.addEventListener('keydown', onDocKey);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      hide();
      items.forEach((li) => {
        li.removeEventListener('pointerenter', onEnter);
        li.removeEventListener('pointerleave', onLeave);
      });
      nav.removeEventListener('click', onClick);
      nav.removeEventListener('pointerover', onOver);
      nav.removeEventListener('keydown', onKey);
      nav.removeEventListener('focusin', prime);
      nav.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('pointerdown', onDocPointer);
      document.removeEventListener('keydown', onDocKey);
      window.removeEventListener('scroll', onScroll);
    };
  }, [router]);

  return null;
}

// ─── Language and theme ───

type ThemePref = 'system' | 'light' | 'dark';
interface ThemeApi {
  get(): ThemePref;
  set(pref: ThemePref): void;
}
const themeApi = () => (window as unknown as { __nafaaTheme?: ThemeApi }).__nafaaTheme ?? null;
const THEMES: ThemePref[] = ['system', 'light', 'dark'];
const THEME_LABEL = { system: 'themeSystem', light: 'themeLight', dark: 'themeDark' } as const;

export interface LanguageOption {
  locale: SiteLocale;
  label: string;
  href: string | null;
  current: boolean;
}

/** The two language options for the current page (href null when the page has no translation). */
export function useLanguages(paired: readonly string[]): { options: LanguageOption[]; live: boolean; translated: boolean } {
  const current = useSiteLocale();
  const live = useUrduLive();
  const path = cmsPathOf(usePathname() ?? '/');
  const translated = live && paired.includes(path);
  const options: LanguageOption[] = [
    { locale: 'en', label: 'English', href: current === 'en' ? null : pathIn('en', path), current: current === 'en' },
    { locale: 'ur', label: 'اردو', href: current === 'ur' || !translated ? null : pathIn('ur', path), current: current === 'ur' },
  ];
  return { options, live, translated };
}

export function useThemePref(): [ThemePref, (pref: ThemePref) => void] {
  const [pref, setPref] = useState<ThemePref>('system');
  useEffect(() => {
    const sync = () => setPref(themeApi()?.get() ?? 'system');
    sync();
    window.addEventListener('nafaa:theme', sync);
    return () => window.removeEventListener('nafaa:theme', sync);
  }, []);
  const choose = useCallback((next: ThemePref) => {
    themeApi()?.set(next);
    setPref(next);
    track('theme_change', { theme: next });
  }, []);
  return [pref, choose];
}

/** Language and theme controls, shared by the header menu and the mobile sheet. */
export function Preferences({ paired }: { paired: readonly string[] }) {
  const locale = useSiteLocale();
  const t = shellStrings(locale);
  const { options, live, translated } = useLanguages(paired);
  const [pref, choose] = useThemePref();
  return (
    <div className="pf">
      <p>{t.language}</p>
      <div className="seg" dir="ltr">
        {options.map((o) =>
          o.href ? (
            <a
              key={o.locale}
              href={o.href}
              hrefLang={o.locale}
              lang={o.locale}
              data-track="language_switch"
              data-track-label={`Header language: ${o.locale === 'ur' ? 'Urdu' : 'English'}`}
            >
              {o.label}
            </a>
          ) : (
            <span key={o.locale} lang={o.locale} aria-current={o.current ? 'true' : undefined} aria-disabled={o.current ? undefined : 'true'}>
              {o.label}
            </span>
          ),
        )}
      </div>
      {!live ? <small>{t.urduSoon}</small> : !translated && locale === 'en' ? <small>{t.englishOnly}</small> : null}
      <p>{t.theme}</p>
      <div className="seg" role="radiogroup" aria-label={t.theme}>
        {THEMES.map((value) => (
          <button key={value} type="button" role="radio" aria-checked={pref === value} onClick={() => choose(value)}>
            {t[THEME_LABEL[value]]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function HeaderTools({ paired }: { paired: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const t = shellStrings(useSiteLocale());

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      root.current?.querySelector<HTMLButtonElement>('button')?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      ref={root}
      className="ut"
      onBlur={(event) => {
        if (open && !event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button type="button" className="ib" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)} title={t.preferences}>
        <span className="sr-only">{t.preferences}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" />
        </svg>
      </button>
      {open ? (
        <div id={id} className="ut-p" role="group" aria-label={t.preferences}>
          <Preferences paired={paired} />
        </div>
      ) : null}
    </div>
  );
}

// ─── Mobile ───

const loadSheet = () => import('./MobileSheet');
const Sheet = dynamic(loadSheet, { ssr: false });

export function MobileMenuButton(props: Omit<SheetProps, 'onClose' | 'id'>) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const t = shellStrings(useSiteLocale());

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (wasOpen.current && !open) button.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const close = useCallback(() => setOpen(false), []);
  const preload = () => void loadSheet();

  return (
    <>
      <button
        ref={button}
        type="button"
        className="ib mb"
        aria-expanded={open}
        aria-controls={id}
        onPointerEnter={preload}
        onTouchStart={preload}
        onFocus={preload}
        onClick={() => setOpen(true)}
      >
        <span className="sr-only">{t.openMenu}</span>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h10" />
        </svg>
      </button>
      {open ? <Sheet id={id} onClose={close} {...props} /> : null}
    </>
  );
}
