import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="hidden lg:block border-t border-border bg-surface mt-16">
      <div className="container mx-auto py-10 grid grid-cols-2 md:grid-cols-5 gap-8">
        {/* Brand */}
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-brand flex items-center justify-center">
              <span className="text-white font-black">N</span>
            </div>
            <div>
              <div className="font-black text-content">Nafaa Bazaar</div>
              <div className="text-2xs text-content-muted">🇵🇰 Pakistan's #1 marketplace</div>
            </div>
          </div>
          <p className="text-sm text-content-muted leading-relaxed">
            Everything you need, delivered. Bargain, group buy, auctions, live shopping,
            AI assistant — all in one app.
          </p>
          <div className="flex gap-2 mt-4">
            {[
              { label: 'Facebook',  href: 'https://facebook.com/nafaabazaar',  svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
              { label: 'Instagram', href: 'https://instagram.com/nafaabazaar', svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/></svg> },
              { label: 'Twitter',   href: 'https://twitter.com/nafaabazaar',   svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
              { label: 'YouTube',   href: 'https://youtube.com/@nafaabazaar',  svg: <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> },
            ].map(({ label, href, svg }, i) => (
              <a
                key={i}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="h-9 w-9 rounded-xl bg-surface-muted hover:bg-brand-100 dark:hover:bg-brand-900/40 flex items-center justify-center transition text-content-muted hover:text-brand-600"
              >
                {svg}
              </a>
            ))}
          </div>
        </div>

        {/* Shop */}
        <div>
          <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-3">
            Shop
          </div>
          <ul className="space-y-2 text-sm">
            {[
              { label: 'All shops', href: '/shops' },
              { label: 'Categories', href: '/search' },
              { label: 'Group Buys', href: '/group-buys' },
              { label: 'Auctions', href: '/auctions' },
              { label: 'Live shopping', href: '/live' },
            ].map((l) => (
              <li key={l.href}>
                <Link to={l.href} className="text-content-muted hover:text-brand-600 transition">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div>
          <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-3">
            Company
          </div>
          <ul className="space-y-2 text-sm">
            {[
              { label: 'About us', href: '/about' },
              { label: 'For sellers', href: '/sell' },
              { label: 'Careers', href: '/careers' },
              { label: 'Blog', href: '/blog' },
            ].map((l) => (
              <li key={l.href}>
                <Link to={l.href} className="text-content-muted hover:text-brand-600 transition">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div>
          <div className="text-xs font-black text-content-muted uppercase tracking-wider mb-3">
            Support
          </div>
          <ul className="space-y-2 text-sm">
            {[
              { label: 'Help center', href: '/support' },
              { label: 'Terms', href: '/terms' },
              { label: 'Privacy', href: '/privacy' },
              { label: 'Contact', href: 'mailto:support@nafaa.pk' },
            ].map((l) => (
              <li key={l.href}>
                <Link to={l.href} className="text-content-muted hover:text-brand-600 transition">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border py-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="text-2xs text-content-muted">
            © 2026 Nafaa Bazaar. All rights reserved.
          </div>
          <div className="text-2xs text-content-muted flex items-center gap-1">
            Made with <Heart className="h-3 w-3 text-danger fill-danger" /> in Pakistan
          </div>
          <div className="flex items-center gap-3 text-2xs text-content-muted font-bold">
            <span>💳 Card</span>
            <span>📱 JazzCash</span>
            <span>💰 EasyPaisa</span>
            <span>⚡ Raast</span>
            <span>💵 COD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
