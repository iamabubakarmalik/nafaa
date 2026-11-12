/**
 * Site header (section type `header`). Two layouts from the theme: logo left
 * with the menu beside it, or logo centred with the menu below. Sticky by
 * default. Menus come from the shop's navigation (handle in settings.menu).
 * "See-through on the home page" (transparentOnHome): over a home page that
 * starts with a hero or slideshow the header sits on the picture and turns
 * solid on scroll; other pages always get the solid header (globals.css).
 */
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type { MenuItem, Section } from '@/lib/api';
import { href } from '@/lib/format';
import { reader, schemeClass } from '@/lib/settings';
import type { SiteContext } from '@/lib/store';
import { Logo } from './Logo';
import { HeaderActions, HeaderScroll, MobileMenuButton } from './HeaderClient';

function NavLink({ item, ctx }: { item: MenuItem; ctx: SiteContext }) {
  const url = href(ctx.lang, item.url);
  if (!item.children?.length) {
    return (
      <Link href={url} className="nav-link relative py-2 text-[14.5px] font-medium opacity-90 hover:opacity-100">
        {item.title}
      </Link>
    );
  }
  const mega = item.children.some((c) => c.children?.length);
  return (
    <div className="group relative">
      <Link href={url} className="flex items-center gap-1 py-2 text-[14.5px] font-medium opacity-90 hover:opacity-100">
        {item.title}
        <ChevronDown size={14} className="transition-transform group-hover:rotate-180" />
      </Link>
      <div className="invisible absolute start-1/2 top-full z-50 -translate-x-1/2 pt-3 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 rtl:translate-x-1/2">
        <div className={`rounded-card border border-line bg-bg p-2 text-fg shadow-pop ${mega ? 'grid min-w-[520px] grid-cols-3 gap-4 p-5' : 'min-w-[220px]'}`}>
          {item.children.map((c) =>
            mega ? (
              <div key={c.id}>
                <Link href={href(ctx.lang, c.url)} className="mb-2 block text-[13px] font-semibold uppercase tracking-wider">
                  {c.title}
                </Link>
                {c.children?.map((g) => (
                  <Link key={g.id} href={href(ctx.lang, g.url)} className="block py-1 text-[14px] text-muted hover:text-fg">
                    {g.title}
                  </Link>
                ))}
              </div>
            ) : (
              <Link key={c.id} href={href(ctx.lang, c.url)} className="block rounded-[8px] px-3 py-2 text-[14px] hover:bg-surface">
                {c.title}
              </Link>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

export function Header({ section, ctx }: { section: Section; ctx: SiteContext }) {
  const r = reader(section, ctx.lang);
  const menu = ctx.boot.menus[r.text('menu', 'main-menu')] ?? ctx.boot.menus['main-menu'] ?? [];
  const sticky = r.bool('sticky', true);
  const layout = r.pick('layout', ['logo_left', 'logo_center', 'logo_left_menu_left', 'auto'] as const, 'auto');
  const centered = layout === 'logo_center' || (layout === 'auto' && ctx.theme.layout.header === 'center');
  const menuCentered = layout === 'logo_left';
  const scheme = schemeClass(r, ctx.theme.layout.darkHeader ? 'inverse' : 'default');
  const s = ctx.boot.settings;
  const logo = <Logo name={ctx.boot.store.name} logoUrl={s.logoUrl} width={s.logoWidth} homeHref={href(ctx.lang, '/')} />;
  const actions = <HeaderActions showSearch={r.bool('showSearch', true)} showAccount={r.bool('showAccount', true)} />;
  const transparent = r.bool('transparentOnHome', false);
  // Header height, for pulling the hero up under a see-through header.
  const height = centered ? '[--nf-header-h:4rem] md:[--nf-header-h:5rem] lg:[--nf-header-h:8rem]' : '[--nf-header-h:4rem] md:[--nf-header-h:72px]';

  return (
    <header
      data-transparent={transparent ? '1' : undefined}
      className={`nf-header ${height} ${sticky ? 'sticky top-0' : 'relative'} ${scheme} z-40 border-b border-fg/10 bg-bg/95 text-fg backdrop-blur supports-[backdrop-filter]:bg-bg/85`}
    >
      {transparent && <HeaderScroll />}
      <div className="page">
        {centered ? (
          <>
            <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-20">
              <div className="flex items-center">
                <MobileMenuButton menu={menu} />
              </div>
              {logo}
              <div className="flex justify-end">{actions}</div>
            </div>
            <nav className="hidden h-12 items-center justify-center gap-8 lg:flex" aria-label="Main">
              {menu.map((m) => (
                <NavLink key={m.id} item={m} ctx={ctx} />
              ))}
            </nav>
          </>
        ) : (
          <div className="flex h-16 items-center gap-4 md:h-[72px]">
            <MobileMenuButton menu={menu} />
            {logo}
            <nav className={`ms-6 hidden flex-1 items-center gap-7 lg:flex ${menuCentered ? 'justify-center' : ''}`} aria-label="Main">
              {menu.map((m) => (
                <NavLink key={m.id} item={m} ctx={ctx} />
              ))}
            </nav>
            <div className="ms-auto">{actions}</div>
          </div>
        )}
      </div>
    </header>
  );
}
