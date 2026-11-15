'use client';

/**
 * Header search dialog (own chunk, loaded when the search button or the "/"
 * key is first used). A native modal <dialog>: the browser traps focus,
 * closes it on Escape and returns focus to the button.
 */
import { useEffect, useRef } from 'react';
import type { SiteLocale } from '@/lib/i18n/shell';
import { searchStrings } from '@/lib/i18n/search';
import { SearchPanel } from './SearchPanel';
import styles from './search.module.css';

export default function SearchDialog({ locale, onClose }: { locale: SiteLocale; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = searchStrings(locale);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
    // No close() here: unmounting removes the dialog, and a close event would
    // reach onClose after a remount (React strict mode runs effects twice).
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-label={t.label}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop (the dialog box itself, outside the panel) closes it.
        if (event.target === event.currentTarget) ref.current?.close();
      }}
    >
      <div className={styles.dialogInner}>
        <SearchPanel locale={locale} variant="dialog" onNavigate={() => ref.current?.close()} />
        <button type="button" className={styles.closeBtn} onClick={() => ref.current?.close()}>
          <span className="sr-only">{t.close}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </dialog>
  );
}
