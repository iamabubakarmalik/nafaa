'use client';

/**
 * Mobile navigation button (island, below the lg breakpoint). The sheet
 * itself (MobileNavSheet) is a separate chunk: it starts loading when the
 * finger or pointer reaches the button and renders on tap, so the first-load
 * bundle only carries this button. Navigation closes the sheet, and focus
 * returns to the button.
 */
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { shellStrings } from '@/lib/i18n/shell';
import { MenuGlyph } from './glyphs';
import { useSiteLocale } from './LocaleGate';
import type { HeaderCta } from './MobileNavSheet';
import type { NavItem } from './nav';

export type { HeaderCta };

const loadSheet = () => import('./MobileNavSheet');
const Sheet = dynamic(loadSheet, { ssr: false });

export function MobileNav({ items, ctas }: { items: NavItem[]; ctas: HeaderCta[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const sheetId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const t = shellStrings(useSiteLocale());
  const wasOpen = useRef(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (wasOpen.current && !open) buttonRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const close = useCallback(() => setOpen(false), []);
  const preload = () => void loadSheet();

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={sheetId}
        onPointerEnter={preload}
        onTouchStart={preload}
        onFocus={preload}
        onClick={() => setOpen(true)}
        className="inline-flex size-10 items-center justify-center rounded-md text-fg-strong hover:bg-surface-3"
      >
        <span className="sr-only">{t.openMenu}</span>
        <MenuGlyph size={22} />
      </button>
      {open ? <Sheet id={sheetId} items={items} ctas={ctas} onClose={close} /> : null}
    </div>
  );
}
